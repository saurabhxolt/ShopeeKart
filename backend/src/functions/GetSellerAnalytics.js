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
                        -- 🔥 1. Total Shop Visits (Top of Funnel - People hitting the storefront)
                        SELECT 'SUMMARY' as RowType, 'TotalShopViews' as Label, CAST(COUNT(*) AS VARCHAR) as Value, '' as Extra 
                        FROM TrafficLogs WHERE SellerId = @sId AND PageType = 'Shop' AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL
                        
                        -- 🔥 2. Total Product Clicks (Bottom of Funnel - People clicking into items)
                        SELECT 'SUMMARY', 'TotalProductViews', CAST(COUNT(*) AS VARCHAR), '' 
                        FROM TrafficLogs WHERE SellerId = @sId AND PageType = 'Product' AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL
                        
                        -- 🔥 3. Unique Shoppers (Distinct user IDs)
                        SELECT 'SUMMARY', 'UniqueShoppers', CAST(COUNT(DISTINCT UserId) AS VARCHAR), '' 
                        FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL

                        -- 🔥 4. Device Breakdown (Distinct Users by Device)
                        SELECT 'SUMMARY', 'MobileUsers', CAST(COUNT(DISTINCT CASE WHEN DeviceType = 'Mobile' THEN UserId END) AS VARCHAR), ''
                        FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL

                        SELECT 'SUMMARY', 'DesktopUsers', CAST(COUNT(DISTINCT CASE WHEN DeviceType = 'Desktop' THEN UserId END) AS VARCHAR), ''
                        FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                        
                        UNION ALL
                        
                        -- 🔥 5. Item Level Product Stats (List for the table)
                        SELECT 'PRODUCT', p.Name, CAST(COUNT(t.LogId) AS VARCHAR), p.Category
                        FROM TrafficLogs t
                        JOIN Products p ON t.ProductId = p.ProductId
                        WHERE t.SellerId = @sId AND t.PageType = 'Product' AND t.CreatedAt >= DATEADD(day, -@days, GETDATE())
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