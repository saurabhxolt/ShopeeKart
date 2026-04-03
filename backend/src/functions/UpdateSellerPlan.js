const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('UpdateSellerPlan', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { userId, planName, commissionRate } = body;

            if (!userId || !planName || commissionRate === undefined) {
                return { status: 400, body: "Missing required fields." };
            }

            await sql.connect(process.env.SQL_CONNECTION);

            const query = `
                UPDATE Sellers 
                SET SubscriptionPlan = @planName, 
                    CommissionRate = @commissionRate 
                WHERE UserId = @userId
            `;

            const requestSql = new sql.Request();
            requestSql.input('planName', sql.VarChar(50), planName);
            requestSql.input('commissionRate', sql.Decimal(4,2), commissionRate);
            requestSql.input('userId', sql.Int, userId);
            
            await requestSql.query(query);

            return { status: 200, jsonBody: { message: "Plan updated successfully!" } };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Failed to update plan: " + err.message };
        }
    }
});