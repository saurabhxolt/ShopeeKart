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
                const items = await new sql.Request(transaction).query(`SELECT ProductId, Qty FROM OrderItems WHERE OrderId = ${orderId}`);

                // 2. Restore Stock
                for (const item of items.recordset) {
                    await new sql.Request(transaction).query(`UPDATE Products SET Stock = Stock + ${item.Qty} WHERE ProductId = ${item.ProductId}`);
                }

                // 3. Update Status
                await new sql.Request(transaction).query(`UPDATE Orders SET Status = 'Cancelled' WHERE OrderId = ${orderId}`);

                await transaction.commit();
                return { status: 200, body: "Order Cancelled" };
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (err) {
            return { status: 500, body: err.message };
        }
    }
});