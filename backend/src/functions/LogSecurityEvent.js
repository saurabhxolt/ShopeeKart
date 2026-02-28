const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

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

            return new Promise((resolve) => {
                const connection = new Connection(config);
                connection.on('connect', (err) => {
                    if (err) return resolve({ status: 500, body: "DB Error" });

                    // 🔥 THE FIX: Added DeviceData to the INSERT query
                    const query = `
                        INSERT INTO LoginLogs (UserId, EmailAttempt, IPAddress, Action, DeviceData)
                        VALUES (@uid, @email, @ip, @action, @device)
                    `;

                    const req = new Request(query, (err) => {
                        connection.close();
                        if (err) return resolve({ status: 500, body: "Insert Error" });
                        resolve({ status: 200, body: "Logged" });
                    });

                    req.addParameter('uid', TYPES.Int, userId || null);
                    req.addParameter('email', TYPES.VarChar, email || '');
                    req.addParameter('ip', TYPES.VarChar, ipAddress);
                    req.addParameter('action', TYPES.VarChar, action);
                    req.addParameter('device', TYPES.VarChar, deviceData); // Bind the new parameter

                    connection.execSql(req);
                });
                connection.connect();
            });
        } catch (error) {
            return { status: 400, body: "Invalid payload" };
        }
    }
});