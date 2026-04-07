const { app } = require('@azure/functions');
const sql = require('mssql');
const crypto = require('crypto');

// Helper function to generate a strict 12-digit Transaction ID
function generateTransactionId() {
    let transId;
    do {
        const randomBuffer = crypto.randomBytes(6); 
        const randomInt = parseInt(randomBuffer.toString('hex'), 16);
        transId = (randomInt % 1000000000000).toString().padStart(12, '0');
    } while (transId.length !== 12); 
    return transId;
}

app.http('PlaceOrder', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const connectionString = process.env.SQL_CONNECTION; 

            if (!connectionString) {
                return { status: 500, body: "Server Error: SQL_CONNECTION is missing in settings." };
            }

            const body = await request.json();
            const { userId, address, cartItems, totalAmount, isBuyNow, paymentMethod } = body;

            if (!userId || !cartItems || cartItems.length === 0) {
                return { status: 400, body: "Invalid Order Data" };
            }

            let newTransactionId = null;
            if (paymentMethod !== 'COD') {
                newTransactionId = generateTransactionId();
            }

           const pool = await sql.connect(connectionString);
            
            // 🔥 NEW: PRE-FLIGHT STOCK CHECK
            // We check stock before starting the transaction so we can return a clean JSON object to React
            for (const item of cartItems) {
                const varId = item.variationId || null;
                const stockCheckQuery = varId
                    ? `SELECT ISNULL(Stock, 0) as AvailableStock FROM ProductVariations WHERE VariationId = ${varId}`
                    : `SELECT ISNULL(Stock, 0) as AvailableStock FROM Products WHERE ProductId = ${item.id}`;

                const stockRes = await pool.request().query(stockCheckQuery);
                const availableStock = stockRes.recordset.length > 0 ? stockRes.recordset[0].AvailableStock : 0;

                if (availableStock < item.qty) {
                    return {
                        status: 409,
                        jsonBody: {
                            code: 'INSUFFICIENT_STOCK',
                            itemId: item.id,
                            variationId: varId,
                            availableQty: availableStock,
                            requestedQty: item.qty,
                            name: item.name
                        }
                    };
                }
            }
           
            // --- SECURITY CHECK & STORE PREFIX / COMMISSION FETCH ---
            const sellerIdToCheck = cartItems[0].sellerId;
            let storePrefix = "ORD"; 
            let currentSellerCommission = 0.10; 
            
            if (sellerIdToCheck) {
                const sellerCheck = await sql.query(`
                    SELECT IsApproved, StoreName, ISNULL(CommissionRate, 0.10) AS CommissionRate 
                    FROM Sellers 
                    WHERE SellerId = ${sellerIdToCheck}
                `);

                if (sellerCheck.recordset.length === 0 || !sellerCheck.recordset[0].IsApproved) {
                    return { 
                        status: 403, 
                        body: "⛔ ORDER FAILED: This seller is currently banned or inactive. You cannot purchase from them." 
                    };
                }

                const rawStoreName = sellerCheck.recordset[0].StoreName || "STORE";
                storePrefix = rawStoreName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
                
                currentSellerCommission = sellerCheck.recordset[0].CommissionRate;
            }

            const transaction = new sql.Transaction();
            await transaction.begin();

            try {
                // A. Insert into Orders Table
                const orderRequest = new sql.Request(transaction);
                const orderResult = await orderRequest
                    .input('UserId', sql.Int, userId)
                    .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
                    .input('Address', sql.NVarChar, address)
                    .input('TransactionId', sql.VarChar(50), newTransactionId) 
                    .input('PaymentMethod', sql.VarChar(20), paymentMethod || 'COD') 
                    .query(`
                        INSERT INTO Orders (UserId, TotalAmount, ShippingAddress, TransactionId, PaymentMethod, OrderDate, Status)
                        OUTPUT INSERTED.OrderId
                        VALUES (@UserId, @TotalAmount, @Address, @TransactionId, @PaymentMethod, GETDATE(), 'Placed');
                    `);

                const newOrderId = orderResult.recordset[0].OrderId;

                // B. Loop through items (🔥 UPGRADED FOR VARIATIONS)
                for (const item of cartItems) {
                    const varId = item.variationId || null;
                    // Stringify the chosen attributes (e.g. {"Size":"L", "Color":"Red"}) so the seller can see them
                    const attrs = item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 
                        ? JSON.stringify(item.selectedAttributes) 
                        : null;

                    const itemRequest = new sql.Request(transaction);
                    await itemRequest
                        .input('OrderId', sql.Int, newOrderId)
                        .input('ProductId', sql.Int, item.id)      
                        .input('SellerId', sql.Int, item.sellerId) 
                        .input('VariationId', sql.Int, varId)
                        .input('VariationAttributes', sql.NVarChar, attrs)
                        .input('Qty', sql.Int, item.qty || 1)
                        .input('Price', sql.Decimal(18, 2), item.price)
                        .input('CommissionRate', sql.Decimal(4, 2), currentSellerCommission) 
                        .query(`
                            -- 🔥 1. SMART STOCK DEDUCTION (NULL-Proof)
                            IF @VariationId IS NOT NULL 
                            BEGIN
                                UPDATE ProductVariations 
                                SET Stock = ISNULL(Stock, 0) - @Qty 
                                WHERE VariationId = @VariationId AND ISNULL(Stock, 0) >= @Qty;

                                IF @@ROWCOUNT = 0
                                BEGIN
                                    THROW 51000, 'Out of stock! Someone just bought the last unit of this specific size/color.', 1;
                                END
                            END
                            ELSE 
                            BEGIN
                                UPDATE Products 
                                SET Stock = ISNULL(Stock, 0) - @Qty 
                                WHERE ProductId = @ProductId AND ISNULL(Stock, 0) >= @Qty;

                                IF @@ROWCOUNT = 0
                                BEGIN
                                    THROW 51000, 'Out of stock! Someone just bought the last unit of an item in your cart.', 1;
                                END
                            END

                            -- 2. Grab the product's CURRENT tax rate & HSN Code
                            DECLARE @CurrentGST DECIMAL(4,2), @CurrentHSN VARCHAR(20);
                            SELECT @CurrentGST = GSTPercentage, @CurrentHSN = HSNCode 
                            FROM Products 
                            WHERE ProductId = @ProductId;

                            -- 3. Insert order item WITH Variation Tracking!
                            INSERT INTO OrderItems (OrderId, ProductId, SellerId, VariationId, VariationAttributes, Qty, Price, CommissionRate, GSTPercentage, HSNCode)
                            VALUES (@OrderId, @ProductId, @SellerId, @VariationId, @VariationAttributes, @Qty, @Price, @CommissionRate, ISNULL(@CurrentGST, 0.18), @CurrentHSN);
                        `);
                }

                // C. Clear Cart & Destroy Lock (ONLY IF NOT BUY NOW)
                if (!isBuyNow) {
                    const clearCartRequest = new sql.Request(transaction);
                    await clearCartRequest.input('UserId', sql.Int, userId)
                        .query(`
                            DECLARE @CartId INT;
                            SELECT @CartId = CartId FROM Carts WHERE UserId = @UserId;
                            
                            IF @CartId IS NOT NULL BEGIN
                                DELETE FROM CartItems WHERE CartId = @CartId;
                                DELETE FROM Carts WHERE CartId = @CartId; -- Destroy the lock!
                            END
                        `);
                }

                await transaction.commit();

                const displayOrderId = `${storePrefix}-${newOrderId}`;

                return {
                    status: 200,
                    jsonBody: { 
                        message: "Success", 
                        orderId: displayOrderId, 
                        transactionId: newTransactionId
                    }
                };

            } catch (err) {
                await transaction.rollback();
                throw err;
            }

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Order Failed: " + err.message };
        }
    }
});