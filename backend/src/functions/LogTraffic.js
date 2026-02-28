const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('LogTraffic', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { userId, sellerId, productId, pageType, deviceType } = await request.json();

            // Extract IP from Azure headers
            const ipAddress = request.headers.get('x-forwarded-for')?.split(':')[0] || '0.0.0.0';

            return new Promise((resolve) => {
                const connection = new Connection(config);

                connection.on('connect', (err) => {
                    if (err) {
                        context.error("DB Connection Error:", err.message);
                        // Resolve with 200 so the buyer's frontend doesn't crash if logging fails
                        return resolve({ status: 200, jsonBody: { message: "Silent fail on connection" } });
                    }

                    const query = `
                        INSERT INTO TrafficLogs (UserId, SellerId, ProductId, PageType, IPAddress, DeviceType, CreatedAt)
                        VALUES (@uId, @sId, @pId, @pType, @ip, @dType, GETDATE())
                    `;

                    const req = new Request(query, (err) => {
                        connection.close();
                        if (err) {
                            context.error("Insert Error:", err.message);
                            return resolve({ status: 200, jsonBody: { message: "Silent fail on insert" } });
                        }
                        resolve({ status: 200, jsonBody: { message: "Traffic Logged" } });
                    });

                    // Add Parameters matching your SQL table schema
                    req.addParameter('uId', TYPES.Int, userId || null);
                    req.addParameter('sId', TYPES.Int, sellerId || null);
                    req.addParameter('pId', TYPES.Int, productId || null);
                    req.addParameter('pType', TYPES.VarChar, pageType);
                    req.addParameter('ip', TYPES.VarChar, ipAddress);
                    req.addParameter('dType', TYPES.VarChar, deviceType);

                    connection.execSql(req);
                });

                connection.connect();
            });

        } catch (error) {
            context.error("Function Error:", error);
            // Always return 200 for traffic logging to ensure Buyer UI remains smooth
            return { status: 200, jsonBody: { error: "Logging bypassed" } };
        }
    }
});