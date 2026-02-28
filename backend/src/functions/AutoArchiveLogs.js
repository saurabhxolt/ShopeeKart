const { app } = require('@azure/functions');
const { Connection, Request } = require('tedious');
const fs = require('fs').promises;
const path = require('path');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

// 🔥 Weekly Schedule: Runs every Sunday at 2:00 AM
app.timer('AutoArchiveSecurityLogs', {
    schedule: '0 0 2 * * 0', 
    handler: async (myTimer, context) => {
        context.log('Starting WEEKLY 180-day security log archiving...');

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', async (err) => {
                if (err) {
                    context.error("DB Connection Error:", err); // 🔥 FIXED
                    return resolve();
                }

                // 🔥 REAL WORLD LOGIC: Only target logs older than 180 days
                const selectQuery = `SELECT LogId, UserId, EmailAttempt, IPAddress, Action, CreatedAt, DeviceData 
                                     FROM LoginLogs WHERE CreatedAt < DATEADD(day, -180, GETDATE())`;
                
                const logs = [];
                const requestSelect = new Request(selectQuery, async (err) => {
                    if (err) {
                        context.error("Query Error:", err); // 🔥 FIXED
                        connection.close();
                        return resolve();
                    }

                    if (logs.length === 0) {
                        context.log('No logs older than 180 days found this week. Skipping archive.');
                        connection.close();
                        return resolve();
                    }

                    // 1. Build the CSV String
                    let csv = "LogId,UserId,EmailAttempt,IPAddress,Action,CreatedAt,DeviceData\n";
                    logs.forEach(log => {
                        const safeDeviceData = log.DeviceData ? `"${log.DeviceData.replace(/"/g, '""')}"` : '"Unknown"';
                        csv += `${log.LogId},${log.UserId || 'N/A'},${log.EmailAttempt},${log.IPAddress},${log.Action},${log.CreatedAt},${safeDeviceData}\n`;
                    });

                    // 2. Save CSV to the local server folder
                    try {
                        const dateString = new Date().toISOString().split('T')[0];
                        const folderPath = path.join(__dirname, '../../archives'); 
                        const filePath = path.join(folderPath, `SecurityLogs_WeeklyArchive_${dateString}.csv`);
                        
                        await fs.mkdir(folderPath, { recursive: true });
                        await fs.writeFile(filePath, csv);
                        context.log(`Successfully saved weekly archive to: ${filePath}`);

                        // 3. Delete the archived logs from the database
                        const deleteQuery = `DELETE FROM LoginLogs WHERE CreatedAt < DATEADD(day, -180, GETDATE())`;
                        const requestDelete = new Request(deleteQuery, (err) => {
                            if (err) context.error("Failed to delete archived logs:", err); // 🔥 FIXED
                            else context.log("Successfully purged old logs from SQL.");
                            
                            connection.close();
                            resolve();
                        });
                        connection.execSql(requestDelete);

                    } catch (fsErr) {
                        context.error("Failed to save CSV file to disk:", fsErr); // 🔥 FIXED
                        connection.close();
                        resolve();
                    }
                });

                requestSelect.on('row', (columns) => {
                    logs.push({
                        LogId: columns[0].value,
                        UserId: columns[1].value,
                        EmailAttempt: columns[2].value || '',
                        IPAddress: columns[3].value || '0.0.0.0',
                        Action: columns[4].value || '',
                        CreatedAt: columns[5].value ? columns[5].value.toISOString() : '',
                        DeviceData: columns[6].value || ''
                    });
                });

                connection.execSql(requestSelect);
            });
            connection.connect();
        });
    }
});