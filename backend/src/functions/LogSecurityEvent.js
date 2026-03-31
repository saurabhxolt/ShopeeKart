const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('LogSecurityEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { email, userId, action } = body;

            // Extract IP Address
            const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('client-ip') || '0.0.0.0';
            
            // 🔥 THE FIX: Extract the Device/Browser data from the request headers
            const deviceData = request.headers.get('user-agent') || 'Unknown Device';

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 THE FIX: Added DeviceData to the INSERT query
            const query = `
                INSERT INTO LoginLogs (UserId, EmailAttempt, IPAddress, Action, DeviceData)
                VALUES (@uid, @email, @ip, @action, @device)
            `;

            // Execute the insert with secure parameter binding
            await pool.request()
                .input('uid', sql.Int, userId || null)
                .input('email', sql.VarChar, email || '')
                .input('ip', sql.VarChar, ipAddress)
                .input('action', sql.VarChar, action)
                .input('device', sql.VarChar, deviceData)
                .query(query);

            return { status: 200, body: "Logged" };

        } catch (error) {
            context.error("LogSecurityEvent Error:", error);
            // We return 500 here if it's a true server/DB error, instead of masking 
            // everything as a 400 "Invalid payload" like the old catch block did.
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});