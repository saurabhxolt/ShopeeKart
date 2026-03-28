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

                // 🔥 UPDATED: Added PAN, Aadhar, and the 4 KYC Document URL columns
                const query = `
                    SELECT 
                        StoreName, Description, SupportEmail, SupportPhone, PickupAddress, 
                        GSTIN, BankAccount, IFSC, StoreLogo, StoreBanner, VerificationDoc,
                        ISNULL(SubscriptionPlan, 'Starter') AS SubscriptionPlan,
                        ISNULL(CommissionRate, 0.10) AS CommissionRate,
                        PAN, Aadhar, PanDocUrl, GstDocUrl, ChequeDocUrl, SignatureUrl
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
                        storeLogo: columns[8].value || '',      
                        storeBanner: columns[9].value || '',    
                        verificationDoc: columns[10].value || '',
                        plan: columns[11].value,
                        commissionRate: columns[12].value,
                        // 🔥 NEW: Mapped the KYC data to the frontend state variables
                        pan: columns[13].value || '',
                        aadhar: columns[14].value || '',
                        panDoc: columns[15].value || '',
                        gstDoc: columns[16].value || '',
                        chequeDoc: columns[17].value || '',
                        signature: columns[18].value || ''
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