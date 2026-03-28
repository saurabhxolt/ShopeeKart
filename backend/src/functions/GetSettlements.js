const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSettlements', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            await sql.connect(process.env.SQL_CONNECTION);

            const query = `
                SELECT 
                    s.SellerId,
                    s.StoreName,
                    s.BankAccount,
                    s.IFSC,
                    ISNULL(oi.CommissionRate, 0.10) AS CommissionRate, -- 🔥 Grabbed directly from the OrderItem history!
                    SUM(oi.Price * oi.Qty) AS TotalOwed,
                    COUNT(oi.ProductId) AS TotalItemsDelivered,
                    STRING_AGG(o.OrderId, ', ') AS OrderIds
                FROM OrderItems oi
                JOIN Orders o ON oi.OrderId = o.OrderId
                JOIN Sellers s ON oi.SellerId = s.SellerId
                WHERE o.Status = 'Delivered' 
                  AND oi.SettlementStatus = 'Pending'
                  AND o.PaymentMethod != 'COD' 
                -- 🔥 Group by CommissionRate so if a seller changed plans mid-month, they get split into two separate accurate payouts!
                GROUP BY s.SellerId, s.StoreName, s.BankAccount, s.IFSC, oi.CommissionRate
                ORDER BY TotalOwed DESC;
            `;

            const result = await sql.query(query);

            return { status: 200, jsonBody: result.recordset };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Failed to fetch settlements: " + err.message };
        }
    }
});