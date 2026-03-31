const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSecurityLogs', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 SMARTER QUERY: Use SQL Aliases (as camelCaseName) to let the database 
            // do the formatting work for you!
            const query = `
                SELECT TOP 100 
                    LogId as logId, 
                    UserId as userId, 
                    EmailAttempt as email, 
                    IPAddress as ip, 
                    Action as action, 
                    CreatedAt as date, 
                    DeviceData as device
                FROM LoginLogs 
                ORDER BY CreatedAt DESC
            `;
            
            const result = await pool.request().query(query);

            // Because of the aliases above, result.recordset is already perfectly 
            // formatted for your frontend. No mapping required!
            return { status: 200, jsonBody: result.recordset };

        } catch (error) {
            context.error("Security Logs Error:", error.message);
            return { status: 500, jsonBody: { error: "Failed to fetch security logs" } };
        }
    }
});