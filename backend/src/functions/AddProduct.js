const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');
const { BlobServiceClient } = require('@azure/storage-blob'); 

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('AddProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { 
                userId, name, price, stock, images, 
                description, originalPrice, category, brand, weight, sku 
            } = await request.json();

            // --- 1. AZURE BLOB STORAGE UPLOAD LOGIC ---
            const connectionString = process.env.AzureWebJobsStorage;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("product-images");
            
            await containerClient.createIfNotExists({ access: 'blob' });

            const uploadedUrls = [];
            
            if (images && Array.isArray(images)) {
                for (let i = 0; i < images.length; i++) {
                    const base64Image = images[i];
                    
                    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                    if (!matches || matches.length !== 3) continue;

                    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const buffer = Buffer.from(matches[2], 'base64');
                    
                    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    const blobName = `${Date.now()}-${safeName}-${i}.${extension}`;
                    
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    
                    await blockBlobClient.uploadData(buffer, {
                        blobHTTPHeaders: { blobContentType: `image/${extension}` }
                    });

                    uploadedUrls.push(blockBlobClient.url);
                }
            }

            const finalImageUrlString = JSON.stringify(uploadedUrls);


            // --- 2. SQL DATABASE INSERTION LOGIC ---
            return new Promise((resolve) => {
                const connection = new Connection(config);
                
                connection.on('connect', (err) => {
                    if (err) return resolve({ status: 500, jsonBody: { error: "DB Connection Error: " + err.message } });

                    let sellerId = null;

                    const getSellerIdQuery = `SELECT SellerId FROM Sellers WHERE UserId = @uid`;
                    const reqSeller = new Request(getSellerIdQuery, (err) => {
                        if (err || !sellerId) {
                            connection.close();
                            return resolve({ status: 403, jsonBody: { error: "Seller Account Not Found" } });
                        }

                        const insertProduct = `
                            INSERT INTO Products (
                                SellerId, Name, Price, Stock, ImageUrl, 
                                Description, OriginalPrice, Category, Brand, Weight, SKU, IsActive
                            ) 
                            VALUES (
                                @sid, @name, @price, @stock, @img, 
                                @desc, @origPrice, @cat, @brand, @weight, @sku, 1
                            )
                        `;
                        
                        const reqInsert = new Request(insertProduct, (err) => {
                            connection.close();
                            if (err) return resolve({ status: 500, jsonBody: { error: "Insert Error: " + err.message } });
                            resolve({ status: 200, jsonBody: { message: "Product Added Successfully" } });
                        });

                        reqInsert.addParameter('sid', TYPES.Int, sellerId);
                        reqInsert.addParameter('name', TYPES.VarChar, name);
                        reqInsert.addParameter('price', TYPES.Decimal, price);
                        reqInsert.addParameter('stock', TYPES.Int, stock);
                        reqInsert.addParameter('img', TYPES.NVarChar, finalImageUrlString); 
                        reqInsert.addParameter('desc', TYPES.NVarChar, description || null);
                        reqInsert.addParameter('origPrice', TYPES.Decimal, originalPrice || null);
                        reqInsert.addParameter('cat', TYPES.VarChar, category || null);
                        reqInsert.addParameter('brand', TYPES.VarChar, brand || null);
                        reqInsert.addParameter('weight', TYPES.Decimal, weight || null);
                        reqInsert.addParameter('sku', TYPES.VarChar, sku || null);

                        connection.execSql(reqInsert);
                    });

                    reqSeller.on('row', (columns) => { sellerId = columns[0].value; });
                    reqSeller.addParameter('uid', TYPES.Int, userId);
                    connection.execSql(reqSeller);
                });
                
                connection.connect();
            });

        } catch (error) {
            // 🔥 FIXED: Updated from context.log.error to context.error for Azure Functions v4
            context.error("Function Error:", error);
            return { status: 500, jsonBody: { error: "Server Error: " + error.message } };
        }
    }
});