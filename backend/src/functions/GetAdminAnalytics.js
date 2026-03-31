const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetAdminAnalytics', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            const query = `
                -- QUERY 1: Global Summary Stats (Last 24 Hours)
                SELECT 'TotalHits' as StatType, COUNT(*) as Value FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                UNION ALL
                SELECT 'UniqueShoppers', COUNT(DISTINCT UserId) FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                UNION ALL
                SELECT 'MobileUsers', COUNT(DISTINCT CASE WHEN DeviceType = 'Mobile' THEN UserId END) FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                UNION ALL
                SELECT 'DesktopUsers', COUNT(DISTINCT CASE WHEN DeviceType = 'Desktop' THEN UserId END) FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE());

                -- QUERY 2: Top 5 Shops by Traffic (Last 7 Days)
                SELECT TOP 5 s.StoreName, COUNT(DISTINCT t.UserId) as UniqueVisitors, COUNT(t.LogId) as RawViews
                FROM TrafficLogs t
                JOIN Sellers s ON t.SellerId = s.SellerId
                WHERE t.CreatedAt >= DATEADD(day, -7, GETDATE())
                GROUP BY s.StoreName
                ORDER BY UniqueVisitors DESC;

                -- QUERY 3: List of Active Shoppers (Last 24 Hours)
                SELECT u.FullName as name, u.Email as email, u.UserId as id, MAX(t.CreatedAt) as lastSeen
                FROM TrafficLogs t
                JOIN Users u ON t.UserId = u.UserId
                WHERE t.CreatedAt >= DATEADD(day, -1, GETDATE())
                GROUP BY u.FullName, u.Email, u.UserId
                ORDER BY lastSeen DESC;
            `;

            const dbResult = await pool.request().query(query);

            // Because mssql automatically splits multiple SELECT statements into an array of arrays:
            // dbResult.recordsets[0] = Summary Stats
            // dbResult.recordsets[1] = Top Shops
            // dbResult.recordsets[2] = Active Shoppers

            const result = { summary: {}, topShops: [], shoppers: [] };

            // Map the Summary Stats (Query 1) into an object
            dbResult.recordsets[0].forEach(row => {
                result.summary[row.StatType] = row.Value;
            });

            // Map the Top Shops (Query 2)
            result.topShops = dbResult.recordsets[1].map(row => ({
                name: row.StoreName,
                uniqueVisitors: row.UniqueVisitors,
                totalViews: row.RawViews
            }));

            // Active Shoppers (Query 3) already has the right column aliases in the SQL
            result.shoppers = dbResult.recordsets[2];

            return { status: 200, jsonBody: result };

        } catch (error) {
            context.error("Analytics Error:", error);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});