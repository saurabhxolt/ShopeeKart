const { app } = require('@azure/functions');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('AddProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { 
                userId, name, price, stock, images, 
                description, originalPrice, category, brand, weight, sku,
                gstPercentage, hsnCode, 
                categoryId, attributes,
                variations 
            } = body;

            // --- 1. INPUT VALIDATION ---
            if (!userId) return { status: 400, jsonBody: { error: "Missing userId" } };
            
            // Ensure categoryId is a valid number
            const targetCategoryId = parseInt(categoryId);
            if (!targetCategoryId || isNaN(targetCategoryId)) {
                return { status: 400, jsonBody: { error: "Please select a valid Sub-Category." } };
            }

            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // --- 2. SECURITY CHECK: CATEGORY AUTHORIZATION (STRICT NUMERIC) ---
            // Fetch authorized numeric IDs from the new junction table
            const sellerResult = await pool.request()
                .input('uid', sql.Int, userId)
                .query(`
                    SELECT sc.CategoryId 
                    FROM SellerCategories sc
                    INNER JOIN Sellers s ON sc.SellerId = s.SellerId
                    WHERE s.UserId = @uid
                `);

            if (sellerResult.recordset.length === 0) {
                return { status: 403, jsonBody: { error: "Authorization failed: No categories assigned to your store profile." } };
            }

            // Convert DB results into a clean array of numbers: [5, 6]
            const authorizedCategoryIds = sellerResult.recordset.map(row => parseInt(row.CategoryId));

            // Use Recursive CTE to find the Root (Level 1) Category ID for the product being added
            const hierarchyCheck = await pool.request()
                .input('cid', sql.Int, targetCategoryId)
                .query(`
                    WITH CategoryPath AS (
                        SELECT CategoryId, ParentId, Name, CategoryLevel
                        FROM Categories
                        WHERE CategoryId = @cid
                        UNION ALL
                        SELECT c.CategoryId, c.ParentId, c.Name, c.CategoryLevel
                        FROM Categories c
                        INNER JOIN CategoryPath cp ON c.CategoryId = cp.ParentId
                    )
                    SELECT TOP 1 CategoryId, Name FROM CategoryPath WHERE CategoryLevel = 1
                `);

            if (hierarchyCheck.recordset.length === 0) {
                return { status: 400, jsonBody: { error: "The selected category is invalid or disconnected from the main hierarchy." } };
            }

            const rootCategoryId = parseInt(hierarchyCheck.recordset[0].CategoryId);
            const rootCategoryName = hierarchyCheck.recordset[0].Name;

            // 🔥 THE GATEKEEPER: Check if the product's root ID is in the seller's authorized list
            if (!authorizedCategoryIds.includes(rootCategoryId)) {
                return { 
                    status: 403, 
                    jsonBody: { error: `Unauthorized: Your shop is not registered to sell in '${rootCategoryName}'.` } 
                };
            }

            // --- 3. AZURE BLOB STORAGE LOGIC ---
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
            const dynamicAttributesJSON = attributes ? JSON.stringify(attributes) : null;

            // --- 4. SQL SAVE LOGIC ---
            let totalStock = parseInt(stock) || 0;
            if (variations && variations.length > 0) {
                totalStock = variations.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
            }

            // Get the SellerId for insertion
            const sidResult = await pool.request().input('uid', sql.Int, userId).query('SELECT SellerId FROM Sellers WHERE UserId = @uid');
            const sellerId = sidResult.recordset[0].SellerId;

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const insertQuery = `
                    INSERT INTO Products (
                        SellerId, Name, Price, Stock, ImageUrl, 
                        Description, OriginalPrice, CategoryId, ProductAttributes, Brand, Weight, SKU, IsActive,
                        GSTPercentage, HSNCode
                    ) 
                    OUTPUT INSERTED.ProductId
                    VALUES (
                        @sid, @name, @price, @totalStock, @img, 
                        @desc, @origPrice, @catId, @prodAttr, @brand, @weight, @sku, @isActive,
                        @gst, @hsn
                    )
                `;

                const productResult = await new sql.Request(transaction)
                    .input('sid', sql.Int, sellerId)
                    .input('name', sql.VarChar, name)
                    .input('price', sql.Decimal(18, 2), price)
                    .input('totalStock', sql.Int, totalStock) 
                    .input('img', sql.NVarChar, finalImageUrlString)
                    .input('desc', sql.NVarChar, description || null)
                    .input('origPrice', sql.Decimal(18, 2), originalPrice || null)
                    .input('catId', sql.Int, targetCategoryId)               
                    .input('prodAttr', sql.NVarChar(sql.MAX), dynamicAttributesJSON) 
                    .input('brand', sql.VarChar, brand || null)
                    .input('weight', sql.Decimal(10, 2), weight || null)
                    .input('sku', sql.VarChar, sku || null)
                    .input('isActive', sql.Bit, body.isActive ? 1 : 0)
                    .input('gst', sql.Decimal(4, 2), gstPercentage !== undefined ? parseFloat(gstPercentage) : 0.18)
                    .input('hsn', sql.VarChar, hsnCode || null)
                    .query(insertQuery);

                const newProductId = productResult.recordset[0].ProductId;

                if (variations && variations.length > 0) {
                    for (let variant of variations) {
                        const variantAttrJSON = JSON.stringify(variant.attributes || {});
                        await new sql.Request(transaction)
                            .input('pid', sql.Int, newProductId)
                            .input('vAttr', sql.NVarChar(sql.MAX), variantAttrJSON)
                            .input('vPrice', sql.Decimal(18, 2), variant.priceOverride || null)
                            .input('vStock', sql.Int, variant.stock || 0)
                            .input('vSku', sql.VarChar, variant.sku || null)
                            .query(`
                                INSERT INTO ProductVariations (ProductId, VariationAttributes, PriceOverride, Stock, SKU)
                                VALUES (@pid, @vAttr, @vPrice, @vStock, @vSku)
                            `);
                    }
                }

                await transaction.commit();
                return { status: 200, jsonBody: { message: "Product Added Successfully", productId: newProductId } };

            } catch (dbError) {
                await transaction.rollback();
                throw dbError;
            }

        } catch (error) {
            context.error("AddProduct Error:", error);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});