const { app } = require('@azure/functions');
const sql = require('mssql');
const fs = require('fs').promises;
const path = require('path');

// 🔥 Weekly Schedule: Runs every Sunday at 2:00 AM
app.timer('AutoArchiveSecurityLogs', {
    schedule: '0 0 2 * * 0', 
    handler: async (myTimer, context) => {
        context.log('Starting WEEKLY 180-day security log archiving...');

        try {
            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 REAL WORLD LOGIC: Only target logs older than 180 days
            const selectQuery = `
                SELECT LogId, UserId, EmailAttempt, IPAddress, Action, CreatedAt, DeviceData 
                FROM LoginLogs 
                WHERE CreatedAt < DATEADD(day, -180, GETDATE())
            `;
            
            const result = await pool.request().query(selectQuery);
            const logs = result.recordset;

            if (logs.length === 0) {
                context.log('No logs older than 180 days found this week. Skipping archive.');
                return; // Exit early, no data to process
            }

            // 1. Build the CSV String
            let csv = "LogId,UserId,EmailAttempt,IPAddress,Action,CreatedAt,DeviceData\n";
            logs.forEach(log => {
                const safeDeviceData = log.DeviceData ? `"${log.DeviceData.replace(/"/g, '""')}"` : '"Unknown"';
                const createdAtStr = log.CreatedAt ? log.CreatedAt.toISOString() : '';
                
                csv += `${log.LogId},${log.UserId || 'N/A'},${log.EmailAttempt || ''},${log.IPAddress || '0.0.0.0'},${log.Action || ''},${createdAtStr},${safeDeviceData}\n`;
            });

            // 2. Save CSV to the local server folder
            const dateString = new Date().toISOString().split('T')[0];
            const folderPath = path.join(__dirname, '../../archives'); 
            const filePath = path.join(folderPath, `SecurityLogs_WeeklyArchive_${dateString}.csv`);
            
            await fs.mkdir(folderPath, { recursive: true });
            await fs.writeFile(filePath, csv);
            context.log(`Successfully saved weekly archive to: ${filePath}`);

            // 3. Delete the archived logs from the database
            // Only runs if the file save above was successful!
            const deleteQuery = `
                DELETE FROM LoginLogs 
                WHERE CreatedAt < DATEADD(day, -180, GETDATE())
            `;
            await pool.request().query(deleteQuery);
            context.log("Successfully purged old logs from SQL.");

        } catch (error) {
            context.error("Weekly Archive Task Failed:", error);
        }
    }
});