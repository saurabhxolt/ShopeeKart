const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetMarketplaceIntelligence', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

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

            const dbResult = await pool.request().query(query);

            // Map the SQL columns to the exact camelCase keys your React frontend expects
            const results = dbResult.recordset.map(row => ({
                productName: row.ProductName,
                storeName: row.StoreName,
                category: row.Category,
                views: row.TotalViews || 0,
                shoppers: row.UniqueShoppers || 0,
                // This grabs the TotalPurchases column and sends it to your React table
                purchases: row.TotalPurchases || 0 
            }));

            return { status: 200, jsonBody: results };

        } catch (error) {
            context.error("Intelligence Query Error:", error.message);
            return { status: 500, jsonBody: { error: "Failed to load marketplace intelligence." } };
        }
    }
});