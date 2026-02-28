const { app } = require('@azure/functions');
const { Connection, Request } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

// 🔥 Runs daily at 3:00 AM
app.timer('AnonymizeTrafficLogs', {
    schedule: '0 0 3 * * *', 
    handler: async (myTimer, context) => {
        context.log('Starting Daily 90-Day Traffic Aggregation & Cleanup...');

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', async (err) => {
                if (err) {
                    context.error("DB Connection Error:", err);
                    return resolve();
                }

                // 🔥 THE PROPER WAY: Rollup and Delete
                const rollupQuery = `
                    BEGIN TRANSACTION;

                    -- 1. Add the old view counts to the Products table
                    UPDATE p
                    SET p.HistoricalViews = ISNULL(p.HistoricalViews, 0) + old_traffic.ViewCount
                    FROM Products p
                    INNER JOIN (
                        SELECT ProductId, COUNT(*) as ViewCount
                        FROM TrafficLogs
                        WHERE CreatedAt < DATEADD(day, -90, GETDATE())
                        GROUP BY ProductId
                    ) old_traffic ON p.ProductId = old_traffic.ProductId;

                    -- 2. Safely DELETE the raw rows now that their counts are saved
                    DELETE FROM TrafficLogs 
                    WHERE CreatedAt < DATEADD(day, -90, GETDATE());

                    COMMIT TRANSACTION;
                `;
                
                const requestRollup = new Request(rollupQuery, (err) => {
                    if (err) {
                        context.error("Failed to rollup and clean traffic logs:", err);
                    } else {
                        context.log("Successfully rolled up old traffic data and cleared the logs!");
                    }
                    
                    connection.close();
                    resolve();
                });

                connection.execSql(requestRollup);
            });
            connection.connect();
        });
    }
});