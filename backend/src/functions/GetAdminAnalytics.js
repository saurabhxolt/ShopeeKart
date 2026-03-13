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
                    -- 1. Global Summary Stats (Last 24 Hours)
                    -- Total Hits
                    SELECT 'TotalHits' as StatType, COUNT(*) as Value FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    UNION ALL
                    -- Unique Human Shoppers
                    SELECT 'UniqueShoppers', COUNT(DISTINCT UserId) FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    UNION ALL
                    -- 🔥 FIX: Unique Mobile Humans
                    SELECT 'MobileUsers', COUNT(DISTINCT CASE WHEN DeviceType = 'Mobile' THEN UserId END) 
                    FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE())
                    UNION ALL
                    -- 🔥 FIX: Unique Desktop Humans
                    SELECT 'DesktopUsers', COUNT(DISTINCT CASE WHEN DeviceType = 'Desktop' THEN UserId END) 
                    FROM TrafficLogs WHERE CreatedAt >= DATEADD(day, -1, GETDATE());

                    -- 2. Top 5 Shops by Traffic (Last 7 Days)
                    -- 🔥 Ranked by Unique Visitors for better business insight
                    SELECT TOP 5 s.StoreName, COUNT(DISTINCT t.UserId) as UniqueVisitors, COUNT(t.LogId) as RawViews
                    FROM TrafficLogs t
                    JOIN Sellers s ON t.SellerId = s.SellerId
                    WHERE t.CreatedAt >= DATEADD(day, -7, GETDATE())
                    GROUP BY s.StoreName
                    ORDER BY UniqueVisitors DESC;

                    -- 3. List of Active Shoppers (Last 24 Hours)
                    -- 🔥 Added MAX(CreatedAt) so Admin can see most recent activity
                    SELECT u.FullName, u.Email, u.UserId, MAX(t.CreatedAt) as LastActive
                    FROM TrafficLogs t
                    JOIN Users u ON t.UserId = u.UserId
                    WHERE t.CreatedAt >= DATEADD(day, -1, GETDATE())
                    GROUP BY u.FullName, u.Email, u.UserId
                    ORDER BY LastActive DESC;
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
                        result.topShops.push({ 
                            name: columns[0].value, 
                            uniqueVisitors: columns[1].value,
                            totalViews: columns[2].value 
                        });
                    } else {
                        result.shoppers.push({ 
                            name: columns[0].value, 
                            email: columns[1].value, 
                            id: columns[2].value,
                            lastSeen: columns[3].value 
                        });
                    }
                });

                // TSQL uses 'doneInProc' to signal the end of one SELECT statement in a batch
                req.on('doneInProc', () => { recordsetIndex++; });
                connection.execSql(req);
            });
            connection.connect();
        });
    }
});