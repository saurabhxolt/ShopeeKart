const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

// 🔥 Changed endpoint to LogTrafficBatch to match the frontend App.js fetch call
app.http('LogTrafficBatch', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // 1. Expect an ARRAY of logs instead of a single object
            const logs = await request.json();

            if (!Array.isArray(logs) || logs.length === 0) {
                return { status: 200, jsonBody: { message: "Ignored: Empty or invalid payload." } };
            }

            // Extract IP from Azure headers
            const ipAddress = request.headers.get('x-forwarded-for')?.split(':')[0] || '0.0.0.0';

            // 2. Filter out invalid logs
            // We now accept logs if they have a userId AND either a sellerId (Shop View) or productId (Product View)
            const validLogs = logs.filter(log => log.userId && (log.sellerId || log.productId));

            if (validLogs.length === 0) {
                return { status: 200, jsonBody: { message: "Ignored: No valid logs in batch." } };
            }

            return new Promise((resolve) => {
                const connection = new Connection(config);

                connection.on('connect', (err) => {
                    if (err) {
                        context.error("DB Connection Error:", err.message);
                        // Resolve with 200 so the buyer's frontend doesn't crash
                        return resolve({ status: 200, jsonBody: { message: "Silent fail on connection" } });
                    }

                    // 3. Dynamically build a single multi-row INSERT query
                    // This creates: VALUES (@uId0, ...), (@uId1, ...), (@uId2, ...)
                    let valuePlaceholders = [];
                    validLogs.forEach((_, i) => {
                        valuePlaceholders.push(`(@uId${i}, @sId${i}, @pId${i}, @pType${i}, @ip${i}, @dType${i}, @cAt${i})`);
                    });

                    const query = `
                        INSERT INTO TrafficLogs (UserId, SellerId, ProductId, PageType, IPAddress, DeviceType, CreatedAt)
                        VALUES ${valuePlaceholders.join(', ')}
                    `;

                    const req = new Request(query, (err) => {
                        connection.close();
                        if (err) {
                            context.error("Insert Error:", err.message);
                            return resolve({ status: 200, jsonBody: { message: "Silent fail on insert" } });
                        }
                        resolve({ status: 200, jsonBody: { message: `Successfully logged ${validLogs.length} events` } });
                    });

                    // 4. Safely attach parameters for every individual item in the batch
                    validLogs.forEach((log, i) => {
                        req.addParameter(`uId${i}`, TYPES.Int, log.userId);
                        req.addParameter(`sId${i}`, TYPES.Int, log.sellerId || null);
                        req.addParameter(`pId${i}`, TYPES.Int, log.productId || null); 
                        req.addParameter(`pType${i}`, TYPES.VarChar, log.pageType || 'Unknown'); // Now uses the dynamic type ('Shop' or 'Product')
                        req.addParameter(`ip${i}`, TYPES.VarChar, ipAddress);
                        req.addParameter(`dType${i}`, TYPES.VarChar, log.deviceType || 'Desktop');
                        req.addParameter(`cAt${i}`, TYPES.DateTime, new Date(log.timestamp || Date.now()));
                    });

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