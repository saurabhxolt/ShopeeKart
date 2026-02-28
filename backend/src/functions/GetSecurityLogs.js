const { app } = require('@azure/functions');
const { Connection, Request } = require('tedious');

const config = {
    server: 'localhost', authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetSecurityLogs', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, jsonBody: { error: err.message } });

                // 🔥 UPDATED: Added DeviceData to the SELECT statement
                const query = `SELECT TOP 100 LogId, UserId, EmailAttempt, IPAddress, Action, CreatedAt, DeviceData 
                               FROM LoginLogs ORDER BY CreatedAt DESC`;
                
                const logs = [];
                const req = new Request(query, (err) => {
                    connection.close();
                    resolve({ status: 200, jsonBody: logs });
                });

                req.on('row', (columns) => {
                    logs.push({
                        logId: columns[0].value, 
                        userId: columns[1].value, 
                        email: columns[2].value,
                        ip: columns[3].value, 
                        action: columns[4].value, 
                        date: columns[5].value,
                        device: columns[6].value // 🔥 UPDATED: Map the 7th column to 'device'
                    });
                });
                connection.execSql(req);
            });
            connection.connect();
        });
    }
});