const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetSellerAnalytics', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const userId = request.query.get('sellerId'); 
        const days = parseInt(request.query.get('days')) || 30; 
        if (!userId) return { status: 400, body: "UserId is required" };

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, jsonBody: { error: err.message } });

                const query = `
                    DECLARE @sId INT;
                    SELECT @sId = SellerId FROM Sellers WHERE UserId = @uId;

                    IF @sId IS NOT NULL
                    BEGIN
                        -- 🔥 1. Total Views (Replaces redundant Store/Product view split)
                        SELECT 'SUMMARY' as RowType, 'TotalHits' as Label, CAST(COUNT(*) AS VARCHAR) as Value, '' as Extra 
                        FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL
                        
                        -- 🔥 2. Unique Shoppers (Strictly using verified UserIds now)
                        SELECT 'SUMMARY', 'UniqueShoppers', CAST(COUNT(DISTINCT UserId) AS VARCHAR), '' 
                        FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL

                        -- 🔥 3. Mobile Users (Feeds the new 3rd UI Card)
                        SELECT 'SUMMARY', 'MobileUsers', CAST(ISNULL(SUM(CASE WHEN DeviceType = 'Mobile' THEN 1 ELSE 0 END), 0) AS VARCHAR), ''
                        FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL
                        
                        -- 🔥 4. Item Level Product Stats
                        SELECT 'PRODUCT', p.Name, CAST(COUNT(t.LogId) AS VARCHAR), p.Category
                        FROM TrafficLogs t
                        JOIN Products p ON t.ProductId = p.ProductId
                        WHERE t.SellerId = @sId AND t.CreatedAt >= DATEADD(day, -@days, GETDATE())
                        GROUP BY p.Name, p.Category;
                    END
                `;

                const result = { summary: {}, productStats: [] };
                const req = new Request(query, (err) => {
                    connection.close();
                    if (err) return resolve({ status: 500, jsonBody: { error: err.message } });
                    resolve({ status: 200, jsonBody: result });
                });

                req.addParameter('uId', TYPES.Int, userId);
                req.addParameter('days', TYPES.Int, days);

                req.on('row', (columns) => {
                    const rowType = columns[0].value;
                    const label = columns[1].value;
                    const val = columns[2].value;
                    const extra = columns[3].value;

                    if (rowType === 'SUMMARY') {
                        result.summary[label] = parseInt(val) || 0;
                    } else if (rowType === 'PRODUCT') {
                        result.productStats.push({ name: label, views: parseInt(val) || 0, category: extra });
                    }
                });

                connection.execSql(req);
            });
            connection.connect();
        });
    }
});