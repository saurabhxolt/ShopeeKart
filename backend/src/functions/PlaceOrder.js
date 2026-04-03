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

            await sql.connect(connectionString);
            
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

                // B. Loop through items
                for (const item of cartItems) {
                    const itemRequest = new sql.Request(transaction);
                    await itemRequest
                        .input('OrderId', sql.Int, newOrderId)
                        .input('ProductId', sql.Int, item.id)      
                        .input('SellerId', sql.Int, item.sellerId) 
                        .input('Qty', sql.Int, item.qty || 1)
                        .input('Price', sql.Decimal(18, 2), item.price)
                        .input('CommissionRate', sql.Decimal(4, 2), currentSellerCommission) 
                        .query(`
                            -- FINAL BACKEND VERIFICATION: Only update if enough stock exists
                            UPDATE Products 
                            SET Stock = Stock - @Qty 
                            WHERE ProductId = @ProductId AND Stock >= @Qty;

                            -- If no rows were updated, it means stock was too low!
                            IF @@ROWCOUNT = 0
                            BEGIN
                                THROW 51000, 'Out of stock! Someone just bought the last unit of an item in your cart.', 1;
                            END

                            -- 🔥 NEW: Grab the product's CURRENT tax rate & HSN Code
                            DECLARE @CurrentGST DECIMAL(4,2), @CurrentHSN VARCHAR(20);
                            SELECT @CurrentGST = GSTPercentage, @CurrentHSN = HSNCode 
                            FROM Products 
                            WHERE ProductId = @ProductId;

                            -- 🔥 NEW: Insert order item WITH the CommissionRate AND the GST data
                            INSERT INTO OrderItems (OrderId, ProductId, SellerId, Qty, Price, CommissionRate, GSTPercentage, HSNCode)
                            VALUES (@OrderId, @ProductId, @SellerId, @Qty, @Price, @CommissionRate, ISNULL(@CurrentGST, 0.18), @CurrentHSN);
                        `);
                }

                // C. Clear Cart (ONLY IF NOT BUY NOW)
                if (!isBuyNow) {
                    const clearCartRequest = new sql.Request(transaction);
                    await clearCartRequest.input('UserId', sql.Int, userId)
                        .query(`
                            DELETE FROM CartItems 
                            WHERE CartId IN (SELECT CartId FROM Carts WHERE UserId = @UserId)
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