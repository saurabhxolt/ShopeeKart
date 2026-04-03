const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('ArchiveSecurityLogs', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 SMARTER QUERY: Added DeviceData back in
            // 🔥 CHANGED to >= (Greater than or equal to 180 days ago) and added ORDER BY
            const selectQuery = `
                SELECT LogId, UserId, EmailAttempt, IPAddress, Action, CreatedAt, DeviceData 
                FROM LoginLogs 
                WHERE CreatedAt >= DATEADD(day, -180, GETDATE()) 
                ORDER BY CreatedAt DESC
            `;
            
            const result = await pool.request().query(selectQuery);
            const logs = result.recordset;

            // If no logs found
            if (logs.length === 0) {
                return { 
                    status: 200, 
                    body: "NO_LOGS", 
                    headers: { 'Content-Type': 'text/plain' } 
                };
            }

            // 🔥 Added DeviceData to the CSV Header
            let csv = "LogId,UserId,EmailAttempt,IPAddress,Action,CreatedAt,DeviceData\n";
            
            logs.forEach(log => {
                // Protect against commas in the Device string
                const safeDeviceData = log.DeviceData ? `"${log.DeviceData.replace(/"/g, '""')}"` : '"Unknown"';
                
                // Ensure date is formatted properly if it exists
                const createdAtStr = log.CreatedAt ? log.CreatedAt.toISOString() : '';

                csv += `${log.LogId},${log.UserId || 'N/A'},${log.EmailAttempt || ''},${log.IPAddress || '0.0.0.0'},${log.Action || ''},${createdAtStr},${safeDeviceData}\n`;
            });

            // Return the CSV file to the browser
            return { 
                status: 200, 
                body: csv, 
                headers: { 
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="security_export.csv"'
                } 
            };

        } catch (error) {
            context.error("Function Error:", error);
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});