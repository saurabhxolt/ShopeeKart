const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');
const { BlobServiceClient } = require('@azure/storage-blob'); 

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('UpdateProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { 
                productId, name, price, stock, imageUrl, 
                description, originalPrice, category, brand, weight, sku, isActive 
            } = await request.json();

            // --- 1. AZURE BLOB STORAGE LOGIC ---
            const connectionString = process.env.AzureWebJobsStorage;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("product-images");
            await containerClient.createIfNotExists({ access: 'blob' });

            let imagesArray = [];
            try {
                imagesArray = JSON.parse(imageUrl);
                if (!Array.isArray(imagesArray)) imagesArray = [imageUrl];
            } catch (e) {
                imagesArray = [imageUrl];
            }

            const finalUrls = [];

            for (let i = 0; i < imagesArray.length; i++) {
                const imgStr = imagesArray[i];

                if (imgStr.startsWith('http')) {
                    finalUrls.push(imgStr);
                } 
                else if (imgStr.startsWith('data:image')) {
                    const matches = imgStr.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                    if (!matches || matches.length !== 3) continue;

                    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const buffer = Buffer.from(matches[2], 'base64');
                    
                    const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    const blobName = `${Date.now()}-${safeName}-edit-${i}.${extension}`;
                    
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

                    await blockBlobClient.uploadData(buffer, {
                        blobHTTPHeaders: { blobContentType: `image/${extension}` }
                    });

                    finalUrls.push(blockBlobClient.url);
                }
            }

            const finalImageUrlString = JSON.stringify(finalUrls);


            // --- 2. SQL DATABASE UPDATE ---
            return new Promise((resolve) => {
                const connection = new Connection(config);
                connection.on('connect', (err) => {
                    if (err) return resolve({ status: 500, jsonBody: { error: "DB Connection Error: " + err.message } });

                    const query = `
                        UPDATE Products 
                        SET Name = @name, 
                            Price = @price, 
                            Stock = @stock, 
                            ImageUrl = @img,
                            Description = @desc,
                            OriginalPrice = @origPrice,
                            Category = @cat,
                            Brand = @brand,
                            Weight = @weight,
                            SKU = @sku,
                            IsActive = @active
                        WHERE ProductId = @pid
                    `;

                    const req = new Request(query, (err) => {
                        connection.close();
                        if (err) return resolve({ status: 500, jsonBody: { error: "Update Error: " + err.message } });
                        resolve({ status: 200, jsonBody: { message: "Product Updated Successfully" } });
                    });

                    req.addParameter('pid', TYPES.Int, productId);
                    req.addParameter('name', TYPES.VarChar, name);
                    req.addParameter('price', TYPES.Decimal, price);
                    req.addParameter('stock', TYPES.Int, stock);
                    req.addParameter('img', TYPES.NVarChar, finalImageUrlString); 
                    req.addParameter('desc', TYPES.NVarChar, description || null);
                    req.addParameter('origPrice', TYPES.Decimal, originalPrice || null);
                    req.addParameter('cat', TYPES.VarChar, category || null);
                    req.addParameter('brand', TYPES.VarChar, brand || null);
                    req.addParameter('weight', TYPES.Decimal, weight || null);
                    req.addParameter('sku', TYPES.VarChar, sku || null);
                    req.addParameter('active', TYPES.Bit, isActive !== undefined ? isActive : 1);

                    connection.execSql(req);
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