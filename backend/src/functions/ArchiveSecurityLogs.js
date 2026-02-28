const { app } = require('@azure/functions');
const { Connection, Request } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('ArchiveSecurityLogs', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, body: "DB Error" });

                // 🔥 SMARTER QUERY: Added DeviceData back in
                // 🔥 CHANGED to >= (Greater than or equal to 180 days ago) and added ORDER BY
const selectQuery = `SELECT LogId, UserId, EmailAttempt, IPAddress, Action, CreatedAt, DeviceData 
                     FROM LoginLogs 
                     WHERE CreatedAt >= DATEADD(day, -180, GETDATE()) 
                     ORDER BY CreatedAt DESC`;
                
                const logs = [];
                const requestSelect = new Request(selectQuery, (err) => {
                    if (err) {
                        connection.close();
                        return resolve({ status: 500, body: "Query Error" });
                    }

                    if (logs.length === 0) {
                        connection.close();
                        return resolve({ status: 200, body: "NO_LOGS", headers: { 'Content-Type': 'text/plain' } });
                    }

                    // 🔥 Added DeviceData to the CSV Header
                    let csv = "LogId,UserId,EmailAttempt,IPAddress,Action,CreatedAt,DeviceData\n";
                    logs.forEach(log => {
                        // Protect against commas in the Device string
                        const safeDeviceData = log.DeviceData ? `"${log.DeviceData.replace(/"/g, '""')}"` : '"Unknown"';
                        csv += `${log.LogId},${log.UserId || 'N/A'},${log.EmailAttempt},${log.IPAddress},${log.Action},${log.CreatedAt},${safeDeviceData}\n`;
                    });

                    connection.close(); // 🔥 Close immediately, no deletion!

                    // Return the CSV file to the browser
                    resolve({ 
                        status: 200, 
                        body: csv, 
                        headers: { 
                            'Content-Type': 'text/csv',
                            'Content-Disposition': 'attachment; filename="security_export.csv"'
                        } 
                    });
                });

                requestSelect.on('row', (columns) => {
                    logs.push({
                        LogId: columns[0].value,
                        UserId: columns[1].value,
                        EmailAttempt: columns[2].value || '',
                        IPAddress: columns[3].value || '0.0.0.0',
                        Action: columns[4].value || '',
                        CreatedAt: columns[5].value ? columns[5].value.toISOString() : '',
                        DeviceData: columns[6].value || '' // 🔥 Map the device data
                    });
                });

                connection.execSql(requestSelect);
            });
            connection.connect();
        });
    }
});