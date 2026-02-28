const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetAdminAnalytics', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return new Promise((resolve) => {
            const connection = new Connection(config);

            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, jsonBody: { error: err.message } });

                const query = `
                    -- 1. Summary Stats (Last 24 Hours)
                    SELECT 'TotalHits' as StatType, COUNT(*) as Value FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    UNION ALL
                    SELECT 'UniqueShoppers', COUNT(DISTINCT UserId) FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    UNION ALL
                    SELECT 'MobileUsers', COUNT(*) FROM TrafficLogs WHERE DeviceType = 'Mobile' AND CreatedAt >= DATEADD(day, -1, GETDATE())
                    UNION ALL
                    SELECT 'DesktopUsers', COUNT(*) FROM TrafficLogs WHERE DeviceType = 'Desktop' AND CreatedAt >= DATEADD(day, -1, GETDATE());

                    -- 2. Top 5 Shops by Traffic (Last 7 Days)
                    SELECT TOP 5 s.StoreName, COUNT(t.LogId) as ViewCount
                    FROM TrafficLogs t
                    JOIN Sellers s ON t.SellerId = s.SellerId
                    WHERE t.CreatedAt >= DATEADD(day, -7, GETDATE())
                    GROUP BY s.StoreName
                    ORDER BY ViewCount DESC;

                    -- 3. 🔥 NEW: List of Unique Shoppers (Last 24 Hours)
                    SELECT DISTINCT u.FullName, u.Email, u.UserId
                    FROM TrafficLogs t
                    JOIN Users u ON t.UserId = u.UserId
                    WHERE t.CreatedAt >= DATEADD(day, -1, GETDATE());
                `;

                const result = { summary: {}, topShops: [], shoppers: [] };
                const req = new Request(query, (err) => {
                    connection.close();
                    if (err) return resolve({ status: 500, jsonBody: { error: err.message } });
                    resolve({ status: 200, jsonBody: result });
                });

                let recordsetIndex = 0;
                req.on('row', (columns) => {
                    if (recordsetIndex === 0) {
                        result.summary[columns[0].value] = columns[1].value;
                    } else if (recordsetIndex === 1) {
                        result.topShops.push({ name: columns[0].value, views: columns[1].value });
                    } else {
                        // 🔥 Map the third result set
                        result.shoppers.push({ name: columns[0].value, email: columns[1].value, id: columns[2].value });
                    }
                });

                req.on('doneInProc', () => { recordsetIndex++; });
                connection.execSql(req);
            });
            connection.connect();
        });
    }
});