const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('LogTrafficBatch', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // 1. Expect an ARRAY of logs
            const logs = await request.json();

            if (!Array.isArray(logs) || logs.length === 0) {
                return { status: 200, jsonBody: { message: "Ignored: Empty or invalid payload." } };
            }

            // Extract IP from Azure headers
            const ipAddress = request.headers.get('x-forwarded-for')?.split(':')[0] || '0.0.0.0';

            // 2. Filter out invalid logs
            const validLogs = logs.filter(log => log.userId && (log.sellerId || log.productId));

            if (validLogs.length === 0) {
                return { status: 200, jsonBody: { message: "Ignored: No valid logs in batch." } };
            }

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            
            // 3. Use a Request object to build the batch insert
            const req = pool.request();

            let valuePlaceholders = [];
            validLogs.forEach((log, i) => {
                // Safely attach parameters for every individual item
                req.input(`uId${i}`, sql.Int, log.userId);
                req.input(`sId${i}`, sql.Int, log.sellerId || null);
                req.input(`pId${i}`, sql.Int, log.productId || null);
                req.input(`pType${i}`, sql.VarChar, log.pageType || 'Unknown');
                req.input(`ip${i}`, sql.VarChar, ipAddress);
                req.input(`dType${i}`, sql.VarChar, log.deviceType || 'Desktop');
                req.input(`cAt${i}`, sql.DateTime, new Date(log.timestamp || Date.now()));

                valuePlaceholders.push(`(@uId${i}, @sId${i}, @pId${i}, @pType${i}, @ip${i}, @dType${i}, @cAt${i})`);
            });

            const query = `
                INSERT INTO TrafficLogs (UserId, SellerId, ProductId, PageType, IPAddress, DeviceType, CreatedAt)
                VALUES ${valuePlaceholders.join(', ')}
            `;

            await req.query(query);

            return { status: 200, jsonBody: { message: `Successfully logged ${validLogs.length} events` } };

        } catch (error) {
            context.error("Traffic Logging Error:", error);
            // Always return 200 for traffic logging to ensure the Frontend remains smooth 
            // even if logging fails temporarily.
            return { status: 200, jsonBody: { error: "Logging bypassed due to server error" } };
        }
    }
});