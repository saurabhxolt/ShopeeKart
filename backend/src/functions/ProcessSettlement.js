const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('ProcessSettlement', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { sellerId } = body;

            if (!sellerId) {
                return { status: 400, body: "Seller ID is required" };
            }

            await sql.connect(process.env.SQL_CONNECTION);

            // Update ONLY the delivered items for this specific seller to 'Settled'
            const query = `
                UPDATE oi
                SET oi.SettlementStatus = 'Settled'
                FROM OrderItems oi
                JOIN Orders o ON oi.OrderId = o.OrderId
                WHERE oi.SellerId = @sellerId 
                  AND o.Status = 'Delivered' 
                  AND oi.SettlementStatus = 'Pending';
            `;

            const requestSql = new sql.Request();
            requestSql.input('sellerId', sql.Int, sellerId);
            
            const result = await requestSql.query(query);

            return { 
                status: 200, 
                jsonBody: { message: `Successfully settled ${result.rowsAffected[0]} items for Seller ${sellerId}` } 
            };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Failed to process settlement: " + err.message };
        }
    }
});