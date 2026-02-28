const { app } = require('@azure/functions');
const { Connection, Request } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetMarketplaceIntelligence', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, jsonBody: { error: "DB Error" } });

                const query = `
                    SELECT 
                        p.Name as ProductName,
                        s.StoreName,
                        p.Category,
                        COUNT(DISTINCT t.LogId) as TotalViews,
                        COUNT(DISTINCT t.UserId) as UniqueShoppers,
                        ISNULL(sales.PurchaseCount, 0) as TotalPurchases
                    FROM Products p
                    JOIN Sellers s ON p.SellerId = s.SellerId
                    LEFT JOIN TrafficLogs t ON p.ProductId = t.ProductId 
                        AND t.CreatedAt >= DATEADD(day, -90, GETDATE())
                    LEFT JOIN (
                        -- 🔥 THE FIX: Changed SUM(Quantity) to SUM(Qty) to match your schema!
                        SELECT ProductId, SUM(Qty) as PurchaseCount
                        FROM OrderItems oi
                        JOIN Orders o ON oi.OrderId = o.OrderId
                        WHERE o.Status != 'Cancelled' AND o.OrderDate >= DATEADD(day, -90, GETDATE())
                        GROUP BY ProductId
                    ) sales ON p.ProductId = sales.ProductId
                    GROUP BY p.Name, s.StoreName, p.Category, sales.PurchaseCount
                    ORDER BY TotalPurchases DESC, TotalViews DESC
                `;

                const results = [];
                const req = new Request(query, (err) => {
                    connection.close();
                    if (err) {
                        context.error("Query Error:", err.message);
                        return resolve({ status: 500, jsonBody: { error: "Query Error" } });
                    }
                    resolve({ status: 200, jsonBody: results });
                });

                req.on('row', (columns) => {
                    results.push({
                        productName: columns[0].value,
                        storeName: columns[1].value,
                        category: columns[2].value,
                        views: columns[3].value || 0,
                        shoppers: columns[4].value || 0,
                        // This grabs the TotalPurchases column and sends it to your React table
                        purchases: columns[5].value || 0 
                    });
                });

                connection.execSql(req);
            });
            connection.connect();
        });
    }
});