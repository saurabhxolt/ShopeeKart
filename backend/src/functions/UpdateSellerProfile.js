const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');
const { BlobServiceClient } = require('@azure/storage-blob');

const config = {
    server: 'localhost',
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('UpdateSellerProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            let { userId, storeName, description, supportEmail, supportPhone, pickupAddress, gstin, bankAccount, ifsc, storeLogo, storeBanner } = body;

            if (!userId) {
                return { status: 400, body: "Missing userId" };
            }

            // --- 1. AZURE BLOB STORAGE LOGIC ---
            const connectionString = process.env.AzureWebJobsStorage;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("seller-images");
            await containerClient.createIfNotExists({ access: 'blob' });

            // Helper to upload Base64 specifically for sellers
            const uploadToBlob = async (base64Str, prefix) => {
                if (!base64Str || base64Str.startsWith('http')) return base64Str; // Already URL or empty
                
                const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) return base64Str;

                const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                
                const blobName = `${Date.now()}-${prefix}-user${userId}.${extension}`;
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);

                await blockBlobClient.uploadData(buffer, {
                    blobHTTPHeaders: { blobContentType: `image/${extension}` }
                });

                return blockBlobClient.url;
            };

            // Process the logo and banner (converts Base64 to Azurite URLs)
            storeLogo = await uploadToBlob(storeLogo, 'logo');
            storeBanner = await uploadToBlob(storeBanner, 'banner');


            // --- 2. SQL DATABASE UPDATE ---
            return new Promise((resolve) => {
                const connection = new Connection(config);
                
                connection.on('connect', (err) => {
                    if (err) return resolve({ status: 500, body: "Database connection failed" });

                    const query = `
                        UPDATE Sellers 
                        SET StoreName = @storeName, 
                            Description = @description, 
                            SupportEmail = @supportEmail, 
                            SupportPhone = @supportPhone, 
                            PickupAddress = @pickupAddress, 
                            GSTIN = @gstin, 
                            BankAccount = @bankAccount, 
                            IFSC = @ifsc,
                            StoreLogo = @storeLogo,
                            StoreBanner = @storeBanner,
                            IsApproved = 0 
                        WHERE UserId = @userId
                    `;

                    const req = new Request(query, (err) => {
                        connection.close();
                        if (err) return resolve({ status: 500, body: "Failed to update profile: " + err.message });
                        resolve({ status: 200, body: "Profile updated successfully" });
                    });

                    req.addParameter('userId', TYPES.Int, parseInt(userId));
                    req.addParameter('storeName', TYPES.VarChar, storeName || null);
                    req.addParameter('description', TYPES.NVarChar, description || null);
                    req.addParameter('supportEmail', TYPES.VarChar, supportEmail || null);
                    req.addParameter('supportPhone', TYPES.VarChar, supportPhone || null);
                    req.addParameter('pickupAddress', TYPES.NVarChar, pickupAddress || null);
                    req.addParameter('gstin', TYPES.VarChar, gstin || null);
                    req.addParameter('bankAccount', TYPES.VarChar, bankAccount || null);
                    req.addParameter('ifsc', TYPES.VarChar, ifsc || null);
                    req.addParameter('storeLogo', TYPES.VarChar, storeLogo || null); 
                    req.addParameter('storeBanner', TYPES.VarChar, storeBanner || null);

                    connection.execSql(req);
                });

                connection.connect();
            });
        } catch (error) {
            context.error("Function Error:", error);
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});