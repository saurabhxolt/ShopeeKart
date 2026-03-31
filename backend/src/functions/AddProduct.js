const { app } = require('@azure/functions');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('AddProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { 
                userId, name, price, stock, images, 
                description, originalPrice, category, brand, weight, sku,
                gstPercentage, hsnCode 
            } = await request.json();

            // --- 1. AZURE BLOB STORAGE LOGIC ---
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
            // Automatically uses the environment variable like your GetSellers.js file
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // Step 2a: Get the SellerId
            const getSellerResult = await pool.request()
                .input('uid', sql.Int, userId)
                .query(`SELECT SellerId FROM Sellers WHERE UserId = @uid`);

            if (getSellerResult.recordset.length === 0) {
                return { status: 403, jsonBody: { error: "Seller Account Not Found" } };
            }

            const sellerId = getSellerResult.recordset[0].SellerId;

            // Step 2b: Insert the Product
            const insertQuery = `
                INSERT INTO Products (
                    SellerId, Name, Price, Stock, ImageUrl, 
                    Description, OriginalPrice, Category, Brand, Weight, SKU, IsActive,
                    GSTPercentage, HSNCode
                ) 
                VALUES (
                    @sid, @name, @price, @stock, @img, 
                    @desc, @origPrice, @cat, @brand, @weight, @sku, 1,
                    @gst, @hsn
                )
            `;

            await pool.request()
                .input('sid', sql.Int, sellerId)
                .input('name', sql.VarChar, name)
                .input('price', sql.Decimal(18, 2), price)
                .input('stock', sql.Int, stock)
                .input('img', sql.NVarChar, finalImageUrlString)
                .input('desc', sql.NVarChar, description || null)
                .input('origPrice', sql.Decimal(18, 2), originalPrice || null)
                .input('cat', sql.VarChar, category || null)
                .input('brand', sql.VarChar, brand || null)
                .input('weight', sql.Decimal(10, 2), weight || null)
                .input('sku', sql.VarChar, sku || null)
                .input('gst', sql.Decimal(4, 2), gstPercentage !== undefined ? parseFloat(gstPercentage) : 0.18)
                .input('hsn', sql.VarChar, hsnCode || null)
                .query(insertQuery);

            return { status: 200, jsonBody: { message: "Product Added Successfully" } };

        } catch (error) {
            context.error("Function Error:", error);
            return { status: 500, jsonBody: { error: "Server Error: " + error.message } };
        }
    }
});