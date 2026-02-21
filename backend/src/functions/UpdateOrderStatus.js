const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('UpdateOrderStatus', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { orderId, newStatus } = await request.json();
            await sql.connect(process.env.SQL_CONNECTION);
            
            // Update the main order status
            await sql.query(`UPDATE Orders SET Status = '${newStatus}' WHERE OrderId = ${orderId}`);
            
            return { status: 200, body: "Status updated successfully" };
        } catch (err) {
            return { status: 500, body: err.message };
        }
    }
});