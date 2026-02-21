const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('CancelOrderItem', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { orderId, productId, price, qty } = await request.json();
            await sql.connect(process.env.SQL_CONNECTION);
            
            const transaction = new sql.Transaction();
            await transaction.begin();

            try {
                // 1. Mark the specific ITEM as Cancelled
                const request1 = new sql.Request(transaction);
                await request1.query(`
                    UPDATE OrderItems 
                    SET ItemStatus = 'Cancelled' 
                    WHERE OrderId = ${orderId} AND ProductId = ${productId}
                `);

                // 2. Restore Stock for that item
                const request2 = new sql.Request(transaction);
                await request2.query(`
                    UPDATE Products 
                    SET Stock = Stock + ${qty} 
                    WHERE ProductId = ${productId}
                `);

                // 3. Subtract cost from the Main Order Total
                const refundAmount = price * qty;
                const request3 = new sql.Request(transaction);
                await request3.query(`
                    UPDATE Orders 
                    SET TotalAmount = TotalAmount - ${refundAmount} 
                    WHERE OrderId = ${orderId}
                `);

                // 4. Check if ALL items are cancelled. If yes, cancel the whole order.
                const checkReq = new sql.Request(transaction);
                const result = await checkReq.query(`
                    SELECT COUNT(*) as ActiveCount 
                    FROM OrderItems 
                    WHERE OrderId = ${orderId} AND ItemStatus != 'Cancelled'
                `);

                if (result.recordset[0].ActiveCount === 0) {
                    await new sql.Request(transaction).query(`
                        UPDATE Orders SET Status = 'Cancelled' WHERE OrderId = ${orderId}
                    `);
                }

                await transaction.commit();
                return { status: 200, body: "Item Cancelled & Refunded" };

            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (err) {
            return { status: 500, body: err.message };
        }
    }
});