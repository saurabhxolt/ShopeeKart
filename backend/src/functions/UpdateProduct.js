const { app } = require('@azure/functions');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('UpdateProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { 
                productId, name, price, stock, imageUrl, 
                description, originalPrice, category, brand, weight, sku, isActive,
                gstPercentage, hsnCode 
            } = await request.json();

            // --- 1. AZURE BLOB STORAGE LOGIC ---
            const connectionString = process.env.AzureWebJobsStorage;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("product-images");
            await containerClient.createIfNotExists({ access: 'blob' });

            let imagesArray = [];
            try {
                // If it's already a JSON string from the frontend, parse it
                imagesArray = typeof imageUrl === 'string' && imageUrl.startsWith('[') 
                    ? JSON.parse(imageUrl) 
                    : [imageUrl];
            } catch (e) {
                imagesArray = [imageUrl];
            }

            const finalUrls = [];

            for (let i = 0; i < imagesArray.length; i++) {
                const imgStr = imagesArray[i];

                if (!imgStr) continue;

                // If it's already a hosted URL, just keep it
                if (imgStr.startsWith('http')) {
                    finalUrls.push(imgStr);
                } 
                // If it's a new Base64 upload, save it to Blob Storage
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
            const pool = await sql.connect(process.env.SQL_CONNECTION);

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
                    IsActive = @active,
                    GSTPercentage = @gst,
                    HSNCode = @hsn,
                    FixSubmitted = CASE WHEN IsArchived = 1 THEN 1 ELSE FixSubmitted END
                WHERE ProductId = @pid
            `;

            await pool.request()
                .input('pid', sql.Int, productId)
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
                .input('active', sql.Bit, isActive !== undefined ? isActive : 1)
                .input('gst', sql.Decimal(4, 2), gstPercentage !== undefined ? parseFloat(gstPercentage) : 0.18)
                .input('hsn', sql.VarChar, hsnCode || null)
                .query(query);

            return { status: 200, jsonBody: { message: "Product Updated Successfully" } };

        } catch (error) {
            context.error("UpdateProduct Error:", error);
            return { status: 500, jsonBody: { error: "Server Error: " + error.message } };
        }
    }
});