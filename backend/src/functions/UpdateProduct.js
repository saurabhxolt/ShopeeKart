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
                description, originalPrice, brand, weight, sku, isActive, 
                gstPercentage, hsnCode,
                categoryId, attributes,
                variations
            } = await request.json();

            if (!productId) {
                return { status: 400, jsonBody: { error: "Missing productId" } };
            }

            // --- 1. AZURE BLOB STORAGE LOGIC ---
            const connectionString = process.env.AzureWebJobsStorage;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("product-images");
            await containerClient.createIfNotExists({ access: 'blob' });

            let imagesArray = [];
            if (Array.isArray(imageUrl)) {
                imagesArray = imageUrl;
            } else if (typeof imageUrl === 'string') {
                try {
                    imagesArray = imageUrl.startsWith('[') ? JSON.parse(imageUrl) : [imageUrl];
                } catch (e) {
                    imagesArray = [imageUrl];
                }
            }

            const finalUrls = [];
            for (let i = 0; i < imagesArray.length; i++) {
                const imgStr = imagesArray[i];
                if (!imgStr || typeof imgStr !== 'string') continue; 

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
            const dynamicAttributesJSON = attributes ? JSON.stringify(attributes) : null;

            // --- 2. SQL DATABASE UPDATE LOGIC ---
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 Calculate total stock accurately 
            let totalStock = parseInt(stock) || 0;
            if (Array.isArray(variations)) {
                if (variations.length > 0) {
                    totalStock = variations.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
                } else {
                    totalStock = parseInt(stock) || 0;
                }
            }

            // 🔥 BEGIN TRANSACTION
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                // Step 2a: Update the PARENT Product
                const updateQuery = `
                    UPDATE Products 
                    SET Name = @name, 
                        Price = @price, 
                        Stock = @totalStock,
                        ImageUrl = @img,
                        Description = @desc,
                        OriginalPrice = @origPrice,
                        CategoryId = @catId,             
                        ProductAttributes = @prodAttr,   
                        Brand = @brand,
                        Weight = @weight,
                        SKU = @sku,
                        IsActive = @active,
                        GSTPercentage = @gst,
                        HSNCode = @hsn,
                        UpdatedAt = GETDATE(),           
                        FixSubmitted = CASE WHEN IsArchived = 1 THEN 1 ELSE FixSubmitted END
                    WHERE ProductId = @pid
                `;

                await new sql.Request(transaction)
                    .input('pid', sql.Int, productId)
                    .input('name', sql.VarChar, name)
                    .input('price', sql.Decimal(18, 2), price)
                    .input('totalStock', sql.Int, totalStock)
                    .input('img', sql.NVarChar, finalImageUrlString)
                    .input('desc', sql.NVarChar, description || null)
                    .input('origPrice', sql.Decimal(18, 2), originalPrice || null)
                    .input('catId', sql.Int, categoryId || null)               
                    .input('prodAttr', sql.NVarChar(sql.MAX), dynamicAttributesJSON) 
                    .input('brand', sql.VarChar, brand || null)
                    .input('weight', sql.Decimal(10, 2), weight || null)
                    .input('sku', sql.VarChar, sku || null)
                    .input('active', sql.Bit, isActive !== undefined ? isActive : 1)
                    .input('gst', sql.Decimal(4, 2), gstPercentage !== undefined ? parseFloat(gstPercentage) : 0.18)
                    .input('hsn', sql.VarChar, hsnCode || null)
                    .query(updateQuery);

                // Step 2b: 🔥 SMART VARIATION SYNC (UPSERT)
                // Only touch variations if the frontend explicitly sent an array
                if (Array.isArray(variations)) {
                    
                    // 1. Fetch existing variations from DB
                    const existingRes = await new sql.Request(transaction)
                        .input('pid', sql.Int, productId)
                        .query(`SELECT VariationId, VariationAttributes FROM ProductVariations WHERE ProductId = @pid`);
                    const existingVars = existingRes.recordset;

                    // Helper to normalize JSON keys (so {"Size":"L", "Color":"Red"} matches {"Color":"Red", "Size":"L"})
                    const getNormKey = (obj) => {
                        if (!obj) return "";
                        let target = obj;
                        if (typeof obj === 'string') { try { target = JSON.parse(obj); } catch(e){} }
                        return Object.keys(target).sort().map(k => `${k.toLowerCase()}:${String(target[k]).toLowerCase()}`).join('|');
                    };

                    const incomingKeys = variations.map(v => getNormKey(v.attributes));

                    // 2. DELETE variations that the seller removed
                    for (const ev of existingVars) {
                        if (!incomingKeys.includes(getNormKey(ev.VariationAttributes))) {
                            await new sql.Request(transaction)
                                .input('vid', sql.Int, ev.VariationId)
                                .query(`DELETE FROM ProductVariations WHERE VariationId = @vid`);
                        }
                    }

                    // 3. INSERT or UPDATE incoming variations
                    for (let variant of variations) {
                        const normKey = getNormKey(variant.attributes);
                        const match = existingVars.find(ev => getNormKey(ev.VariationAttributes) === normKey);
                        const variantAttrStr = JSON.stringify(variant.attributes || {});

                        if (match) {
                            // Update existing variation (Preserves the VariationId so carts don't break!)
                            await new sql.Request(transaction)
                                .input('vid', sql.Int, match.VariationId)
                                .input('vPrice', sql.Decimal(18, 2), variant.priceOverride || null)
                                .input('vStock', sql.Int, variant.stock || 0)
                                .input('vSku', sql.VarChar, variant.sku || null)
                                .query(`
                                    UPDATE ProductVariations 
                                    SET PriceOverride = @vPrice, Stock = @vStock, SKU = @vSku
                                    WHERE VariationId = @vid
                                `);
                        } else {
                            // Insert brand new variation
                            await new sql.Request(transaction)
                                .input('pid', sql.Int, productId)
                                .input('vAttr', sql.NVarChar(sql.MAX), variantAttrStr)
                                .input('vPrice', sql.Decimal(18, 2), variant.priceOverride || null)
                                .input('vStock', sql.Int, variant.stock || 0)
                                .input('vSku', sql.VarChar, variant.sku || null)
                                .query(`
                                    INSERT INTO ProductVariations (ProductId, VariationAttributes, PriceOverride, Stock, SKU)
                                    VALUES (@pid, @vAttr, @vPrice, @vStock, @vSku)
                                `);
                        }
                    }
                }

                // 🔥 COMMIT TRANSACTION
                await transaction.commit();
                return { status: 200, jsonBody: { message: "Product Updated Successfully" } };

            } catch (dbError) {
                await transaction.rollback();
                context.error("Database Update Failed, Rolling Back:", dbError);
                return { status: 500, jsonBody: { error: "Database save failed: " + dbError.message } };
            }

        } catch (error) {
            context.error("UpdateProduct Error:", error);
            return { status: 500, jsonBody: { error: "Server Error: " + error.message } };
        }
    }
});