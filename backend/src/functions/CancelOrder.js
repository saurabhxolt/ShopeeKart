const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('CancelOrder', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { orderId } = await request.json();
            await sql.connect(process.env.SQL_CONNECTION);
            
            const transaction = new sql.Transaction();
            await transaction.begin();

            try {
                // 1. Get items to restore stock
                const req1 = new sql.Request(transaction);
                req1.input('oId', sql.Int, parseInt(orderId));
                const items = await req1.query(`
                    SELECT ProductId, Qty 
                    FROM OrderItems 
                    WHERE OrderId = @oId AND ItemStatus != 'Cancelled'
                `);

                // 2. Restore Stock
                for (const item of items.recordset) {
                    const req2 = new sql.Request(transaction);
                    req2.input('qty', sql.Int, parseInt(item.Qty));
                    req2.input('pId', sql.Int, parseInt(item.ProductId));
                    await req2.query(`
                        UPDATE Products 
                        SET Stock = Stock + @qty 
                        WHERE ProductId = @pId
                    `);
                }

                // 3. Mark all items as cancelled (to keep records clean)
                const req3 = new sql.Request(transaction);
                req3.input('oId', sql.Int, parseInt(orderId));
                await req3.query(`
                    UPDATE OrderItems 
                    SET ItemStatus = 'Cancelled' 
                    WHERE OrderId = @oId
                `);

                // 4. Update Status of the main order
                const req4 = new sql.Request(transaction);
                req4.input('oId', sql.Int, parseInt(orderId));
                await req4.query(`
                    UPDATE Orders 
                    SET Status = 'Cancelled' 
                    WHERE OrderId = @oId
                `);

                await transaction.commit();
                return { status: 200, body: "Order Cancelled" };
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (err) {
            context.error("CancelOrder Error:", err);
            return { status: 500, body: err.message };
        }
    }
});