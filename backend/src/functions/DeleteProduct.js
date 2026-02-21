const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('DeleteProduct', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const productId = request.query.get('productId');
        const userId = request.query.get('userId');

        const query = `
            DELETE p FROM Products p
            JOIN Sellers s ON p.SellerId = s.SellerId
            WHERE p.ProductId = @pId AND s.UserId = @uId
        `;

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                const req = new Request(query, (err) => { 
                    connection.close(); 
                    resolve({ status: 200, body: "Deleted" }); 
                });
                req.addParameter('pId', TYPES.Int, productId);
                req.addParameter('uId', TYPES.Int, userId);
                connection.execSql(req);
            });
            connection.connect();
        });
    }
});