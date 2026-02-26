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
                request1.input('oId', sql.Int, parseInt(orderId));
                request1.input('pId', sql.Int, parseInt(productId));
                await request1.query(`
                    UPDATE OrderItems 
                    SET ItemStatus = 'Cancelled' 
                    WHERE OrderId = @oId AND ProductId = @pId
                `);

                // 2. Restore Stock for that item
                const request2 = new sql.Request(transaction);
                request2.input('qty', sql.Int, parseInt(qty));
                request2.input('pId', sql.Int, parseInt(productId));
                await request2.query(`
                    UPDATE Products 
                    SET Stock = Stock + @qty 
                    WHERE ProductId = @pId
                `);

                // 3. Subtract cost from the Main Order Total
                const refundAmount = parseFloat(price) * parseInt(qty);
                const request3 = new sql.Request(transaction);
                request3.input('refund', sql.Decimal(18, 2), refundAmount);
                request3.input('oId', sql.Int, parseInt(orderId));
                await request3.query(`
                    UPDATE Orders 
                    SET TotalAmount = TotalAmount - @refund 
                    WHERE OrderId = @oId
                `);

                // 4. Check if ALL items are cancelled. If yes, cancel the whole order.
                const checkReq = new sql.Request(transaction);
                checkReq.input('oId', sql.Int, parseInt(orderId));
                const result = await checkReq.query(`
                    SELECT COUNT(*) as ActiveCount 
                    FROM OrderItems 
                    WHERE OrderId = @oId AND ItemStatus != 'Cancelled'
                `);

                if (result.recordset[0].ActiveCount === 0) {
                    const finalReq = new sql.Request(transaction);
                    finalReq.input('oId', sql.Int, parseInt(orderId));
                    await finalReq.query(`
                        UPDATE Orders SET Status = 'Cancelled' WHERE OrderId = @oId
                    `);
                }

                await transaction.commit();
                return { status: 200, body: "Item Cancelled & Refunded" };

            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (err) {
            context.error("CancelOrderItem Error:", err);
            return { status: 500, body: err.message };
        }
    }
});