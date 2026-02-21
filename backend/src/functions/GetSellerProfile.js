const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost',
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('GetSellerProfile', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const userId = request.query.get('userId');

        if (!userId) {
            return { status: 400, body: "Missing userId" };
        }

        return new Promise((resolve) => {
            const connection = new Connection(config);
            
            connection.on('connect', (err) => {
                if (err) {
                    resolve({ status: 500, body: "Database connection failed" });
                    return;
                }

                // 🔥 FIX: Added StoreLogo and StoreBanner to the SELECT statement
                const query = `
                    SELECT StoreName, Description, SupportEmail, SupportPhone, PickupAddress, GSTIN, BankAccount, IFSC, StoreLogo, StoreBanner 
                    FROM Sellers 
                    WHERE UserId = @userId
                `;

                const req = new Request(query, (err, rowCount) => {
                    if (err || rowCount === 0) {
                        resolve({ status: 404, body: "Profile not found" });
                    }
                    connection.close();
                });

                req.addParameter('userId', TYPES.Int, parseInt(userId));

                let profile = {};
                req.on('row', (columns) => {
                    profile = {
                        storeName: columns[0].value || '',
                        description: columns[1].value || '',
                        supportEmail: columns[2].value || '',
                        supportPhone: columns[3].value || '',
                        pickupAddress: columns[4].value || '',
                        gstin: columns[5].value || '',
                        bankAccount: columns[6].value || '',
                        ifsc: columns[7].value || '',
                        storeLogo: columns[8].value || '',      // 🔥 FIX: Now maps the Logo
                        storeBanner: columns[9].value || ''     // 🔥 FIX: Now maps the Banner
                    };
                });

                req.on('requestCompleted', () => {
                    resolve({ status: 200, jsonBody: profile });
                });

                connection.execSql(req);
            });

            connection.connect();
        });
    }
});