const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetAdminOrders', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            await sql.connect(process.env.SQL_CONNECTION);
            
            // 🔥 Uses Subqueries to fetch StoreName from OrderItems without duplicating the Order row
            const query = `
                SELECT 
                    o.OrderId, 
                    o.OrderDate, 
                    o.Status, 
                    o.TotalAmount, 
                    u.FullName as BuyerName, 
                    u.Email as BuyerEmail,
                    (SELECT TOP 1 s.StoreName FROM OrderItems oi INNER JOIN Sellers s ON oi.SellerId = s.SellerId WHERE oi.OrderId = o.OrderId) as StoreName,
                    (SELECT TOP 1 s.SupportPhone FROM OrderItems oi INNER JOIN Sellers s ON oi.SellerId = s.SellerId WHERE oi.OrderId = o.OrderId) as SellerPhone,
                    DATEDIFF(HOUR, o.OrderDate, GETDATE()) as HoursSincePlaced
                FROM Orders o
                INNER JOIN Users u ON o.UserId = u.UserId
                ORDER BY o.OrderDate DESC
            `;

            const result = await sql.query(query);
            return { status: 200, jsonBody: result.recordset };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error fetching orders: " + err.message };
        }
    }
});