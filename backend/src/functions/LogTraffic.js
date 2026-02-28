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
            const { userId, sellerId, productId, deviceType } = await request.json();

            // 🔥 ENFORCE THE STRICT RULE: Reject if there is no Product OR no Logged-In User
            if (!productId || !userId) {
                // We return 200 so the frontend doesn't throw a console error, but we do NOT log it.
                return { status: 200, jsonBody: { message: "Ignored: User must be registered and viewing a product." } }; 
            }

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

                    // We now hardcode 'Product' as the PageType to ensure perfect data
                    const query = `
                        INSERT INTO TrafficLogs (UserId, SellerId, ProductId, PageType, IPAddress, DeviceType, CreatedAt)
                        VALUES (@uId, @sId, @pId, 'Product', @ip, @dType, GETDATE())
                    `;

                    const req = new Request(query, (err) => {
                        connection.close();
                        if (err) {
                            context.error("Insert Error:", err.message);
                            return resolve({ status: 200, jsonBody: { message: "Silent fail on insert" } });
                        }
                        resolve({ status: 200, jsonBody: { message: "Product View Logged" } });
                    });

                    // Add Parameters matching your SQL table schema
                    req.addParameter('uId', TYPES.Int, userId);
                    req.addParameter('sId', TYPES.Int, sellerId || null);
                    req.addParameter('pId', TYPES.Int, productId);
                    req.addParameter('ip', TYPES.VarChar, ipAddress);
                    req.addParameter('dType', TYPES.VarChar, deviceType || 'Desktop');

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