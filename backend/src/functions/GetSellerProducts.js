const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetSellerProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const userId = request.query.get('userId');

        return new Promise((resolve) => {
            const connection = new Connection(config);
            
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, body: "DB Connection Error" });

                let foundSellerId = null;

                const findSellerQuery = `SELECT SellerId FROM Sellers WHERE UserId = @uid`;
                const reqSeller = new Request(findSellerQuery, (err) => {
                    if (err || !foundSellerId) {
                        connection.close();
                        return resolve({ status: err ? 500 : 200, jsonBody: [] }); 
                    }

                    const products = [];
                    // 🔥 UPDATED: Added IsArchived and AdminMessage with correct commas
                    const prodQuery = `
                        SELECT 
                            ProductId, Name, Price, Stock, ImageUrl, 
                            Description, OriginalPrice, Category, Brand, Weight, SKU, IsActive, IsArchived, AdminMessage 
                        FROM Products 
                        WHERE SellerId = ${foundSellerId}
                    `;
                    
                    const reqProd = new Request(prodQuery, (err) => {
                        connection.close();
                        if (err) return resolve({ status: 500, body: "Product Query Error" });
                        resolve({ status: 200, jsonBody: products });
                    });

                    reqProd.on('row', (columns) => {
                        products.push({
                            id: columns[0].value,
                            name: columns[1].value,
                            price: columns[2].value,
                            qty: columns[3].value,
                            imageUrl: columns[4].value,
                            description: columns[5].value,
                            originalPrice: columns[6].value,
                            category: columns[7].value,
                            brand: columns[8].value,
                            weight: columns[9].value,
                            sku: columns[10].value,
                            isActive: columns[11].value,
                            isArchived: columns[12].value,   // 🔥 Mapped
                            adminMessage: columns[13].value // 🔥 Mapped
                        });
                    });

                    connection.execSql(reqProd);
                });

                reqSeller.on('row', (cols) => { foundSellerId = cols[0].value; });
                reqSeller.addParameter('uid', TYPES.Int, userId);
                connection.execSql(reqSeller);
            });
            connection.connect();
        });
    }
});