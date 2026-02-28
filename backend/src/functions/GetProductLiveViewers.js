const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetProductLiveViewers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const productId = request.query.get('productId');
        if (!productId) return { status: 400, body: "ProductId is required" };

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, jsonBody: { error: err.message } });

                // Count unique visitors in the last 24 hours
                const query = `
                    SELECT COUNT(DISTINCT IPAddress) as ViewerCount
                    FROM TrafficLogs
                    WHERE ProductId = @pId AND PageType = 'Product' AND CreatedAt >= DATEADD(hour, -24, GETDATE())
                `;

                const req = new Request(query, (err) => {
                    connection.close();
                    if (err) return resolve({ status: 500, jsonBody: { error: err.message } });
                });

                req.addParameter('pId', TYPES.Int, productId);

                req.on('row', (columns) => {
                    resolve({ status: 200, jsonBody: { viewers: columns[0].value } });
                });

                connection.execSql(req);
            });
            connection.connect();
        });
    }
});