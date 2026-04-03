const { app } = require('@azure/functions');
const sql = require('mssql');

// 🔥 Runs daily at 3:00 AM
app.timer('AnonymizeTrafficLogs', {
    schedule: '0 0 3 * * *', 
    handler: async (myTimer, context) => {
        context.log('Starting Daily 90-Day Traffic Aggregation & Cleanup...');

        try {
            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

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
            
            // Execute the transaction
            await pool.request().query(rollupQuery);
            
            context.log("Successfully rolled up old traffic data and cleared the logs!");

        } catch (err) {
            context.error("Failed to rollup and clean traffic logs:", err);
            // Since this is a timer, we just log the error to Application Insights 
            // instead of returning an HTTP response.
        }
    }
});