const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('RestoreProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { productId, userId } = await request.json();

            if (!productId || !userId) {
                return { status: 400, body: "Missing productId or userId" };
            }

            const query = `
                UPDATE p
                SET p.IsDeleted = 0
                FROM Products p
                JOIN Sellers s ON p.SellerId = s.SellerId
                WHERE p.ProductId = @pId AND s.UserId = @uId
            `;

            return new Promise((resolve) => {
                const connection = new Connection(config);
                
                connection.on('connect', (err) => {
                    if (err) return resolve({ status: 500, body: "Database connection failed" });

                    const req = new Request(query, (err, rowCount) => { 
                        connection.close(); 
                        if (err) return resolve({ status: 500, body: "Failed to restore: " + err.message });
                        if (rowCount === 0) return resolve({ status: 403, body: "Unauthorized or Product not found" });
                        
                        resolve({ status: 200, body: "Product restored successfully" }); 
                    });
                    
                    req.addParameter('pId', TYPES.Int, parseInt(productId));
                    req.addParameter('uId', TYPES.Int, parseInt(userId));
                    
                    connection.execSql(req);
                });
                
                connection.connect();
            });
        } catch (error) {
            context.error("Function Error:", error);
            return { status: 500, body: "Server Error" };
        }
    }
});