const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSellerAnalytics', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userId = request.query.get('sellerId'); 
            const days = parseInt(request.query.get('days')) || 30; 
            
            if (!userId) return { status: 400, body: "UserId is required" };

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 CLEANER SQL: Split into two distinct queries. 
            // No more CAST to VARCHAR or dummy 'RowType' columns needed!
            const query = `
                DECLARE @sId INT;
                SELECT @sId = SellerId FROM Sellers WHERE UserId = @uId;

                IF @sId IS NOT NULL
                BEGIN
                    -- RECORDSET 0: Summary Stats
                    SELECT 'TotalShopViews' as Label, COUNT(*) as Value 
                    FROM TrafficLogs WHERE SellerId = @sId AND PageType = 'Shop' AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                    
                    UNION ALL
                    SELECT 'TotalProductViews', COUNT(*) 
                    FROM TrafficLogs WHERE SellerId = @sId AND PageType = 'Product' AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                    
                    UNION ALL
                    SELECT 'UniqueShoppers', COUNT(DISTINCT UserId) 
                    FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                    
                    UNION ALL
                    SELECT 'MobileUsers', COUNT(DISTINCT CASE WHEN DeviceType = 'Mobile' THEN UserId END) 
                    FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE())
                    
                    UNION ALL
                    SELECT 'DesktopUsers', COUNT(DISTINCT CASE WHEN DeviceType = 'Desktop' THEN UserId END) 
                    FROM TrafficLogs WHERE SellerId = @sId AND CreatedAt >= DATEADD(day, -@days, GETDATE());

                    -- RECORDSET 1: Item Level Product Stats
                    -- Added aliases (as name, as views, as category) to match your React frontend automatically
                    SELECT p.Name as name, COUNT(t.LogId) as views, p.Category as category
                    FROM TrafficLogs t
                    JOIN Products p ON t.ProductId = p.ProductId
                    WHERE t.SellerId = @sId AND t.PageType = 'Product' AND t.CreatedAt >= DATEADD(day, -@days, GETDATE())
                    GROUP BY p.Name, p.Category;
                END
            `;

            const dbResult = await pool.request()
                .input('uId', sql.Int, parseInt(userId))
                .input('days', sql.Int, days)
                .query(query);

            const result = { summary: {}, productStats: [] };

            // If the seller exists, mssql will return our two recordsets
            if (dbResult.recordsets && dbResult.recordsets.length >= 2) {
                
                // 1. Map the Summary Stats
                dbResult.recordsets[0].forEach(row => {
                    result.summary[row.Label] = row.Value || 0;
                });

                // 2. Map the Product Stats directly (SQL aliases handle the formatting)
                result.productStats = dbResult.recordsets[1];
            }

            return { status: 200, jsonBody: result };

        } catch (error) {
            context.error("Seller Analytics Error:", error);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});