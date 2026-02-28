const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetLiveProductViews', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const productId = request.query.get('productId');
        if (!productId) return { status: 400, jsonBody: { error: "Product ID required" } };

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, jsonBody: { error: "DB Error" } });

                // Count unique users who viewed this exact product in the last 24 hours
                const query = `
                    SELECT COUNT(DISTINCT UserId) as ActiveViews 
                    FROM TrafficLogs 
                    WHERE ProductId = @pId AND CreatedAt >= DATEADD(hour, -24, GETDATE())
                `;

                let activeViews = 0;

                const req = new Request(query, (err) => {
                    connection.close();
                    if (err) {
                        context.error("Live View Query Error:", err.message);
                        return resolve({ status: 500, jsonBody: { error: "Query Error" } });
                    }
                    // 🔥 Successfully resolve with the parsed number
                    resolve({ status: 200, jsonBody: { views: activeViews } });
                });

                // 🔥 THE FIX: Properly extract the row data just like our other APIs
                req.on('row', (columns) => {
                    activeViews = columns[0].value || 0;
                });

                req.addParameter('pId', TYPES.Int, parseInt(productId, 10));
                connection.execSql(req);
            });
            connection.connect();
        });
    }
});