const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('PlaceOrder', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // 1. READ THE CORRECT VARIABLE
            const connectionString = process.env.SQL_CONNECTION; 

            if (!connectionString) {
                return { status: 500, body: "Server Error: SQL_CONNECTION is missing in settings." };
            }

            // 2. Parse Input
            const body = await request.json();
            const { userId, address, cartItems, totalAmount, isBuyNow } = body;

            if (!userId || !cartItems || cartItems.length === 0) {
                return { status: 400, body: "Invalid Order Data" };
            }

            // 3. Connect to Database
            await sql.connect(connectionString);
            
            // --- SECURITY CHECK: IS SELLER BANNED? ---
            const sellerIdToCheck = cartItems[0].sellerId;
            
            if (sellerIdToCheck) {
                const sellerCheck = await sql.query(`
                    SELECT IsApproved FROM Sellers WHERE SellerId = ${sellerIdToCheck}
                `);

                if (sellerCheck.recordset.length === 0 || !sellerCheck.recordset[0].IsApproved) {
                    return { 
                        status: 403, 
                        body: "⛔ ORDER FAILED: This seller is currently banned or inactive. You cannot purchase from them." 
                    };
                }
            }
            // -----------------------------------------

            const transaction = new sql.Transaction();
            await transaction.begin();

            try {
                // A. Insert into Orders Table
                const orderRequest = new sql.Request(transaction);
                const orderResult = await orderRequest
                    .input('UserId', sql.Int, userId)
                    .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
                    .input('Address', sql.NVarChar, address)
                    .query(`
                        INSERT INTO Orders (UserId, TotalAmount, ShippingAddress, OrderDate, Status)
                        OUTPUT INSERTED.OrderId
                        VALUES (@UserId, @TotalAmount, @Address, GETDATE(), 'Placed');
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
                        .query(`
                            -- 🔥 FINAL BACKEND VERIFICATION: Only update if enough stock exists
                            UPDATE Products 
                            SET Stock = Stock - @Qty 
                            WHERE ProductId = @ProductId AND Stock >= @Qty;

                            -- If no rows were updated, it means stock was too low!
                            IF @@ROWCOUNT = 0
                            BEGIN
                                THROW 51000, 'Out of stock! Someone just bought the last unit of an item in your cart.', 1;
                            END

                            -- Only insert order item if the stock update was successful
                            INSERT INTO OrderItems (OrderId, ProductId, SellerId, Qty, Price)
                            VALUES (@OrderId, @ProductId, @SellerId, @Qty, @Price);
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

                return {
                    status: 200,
                    jsonBody: { message: "Success", orderId: newOrderId }
                };

            } catch (err) {
                // If the stock check THROWs an error, it gets caught here and reverses the whole order
                await transaction.rollback();
                throw err;
            }

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Order Failed: " + err.message };
        }
    }
});