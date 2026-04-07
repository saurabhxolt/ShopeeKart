const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSellerProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userId = request.query.get('userId');

            if (!userId) {
                return { status: 400, body: "UserId is required" };
            }

            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // Step 1: Find the SellerId
            const sellerResult = await pool.request()
                .input('uid', sql.Int, parseInt(userId))
                .query(`SELECT SellerId FROM Sellers WHERE UserId = @uid`);

            if (sellerResult.recordset.length === 0) {
                return { status: 200, jsonBody: [] }; 
            }

            const foundSellerId = sellerResult.recordset[0].SellerId;

            // Step 2: Get Products + Full Category Hierarchy
            // We use a linear JOIN chain to prevent "fan-out" duplication errors.
            const prodQuery = `
                SELECT 
                    p.ProductId as id, 
                    p.Name as name, 
                    p.Price as price, 
                    p.Stock as stock, 
                    p.ImageUrl as imageUrl, 
                    p.Description as description, 
                    p.OriginalPrice as originalPrice, 
                    p.CategoryId as categoryId,          
                    p.ProductAttributes as attributes,   
                    p.Brand as brand, 
                    p.Weight as weight, 
                    p.SKU as sku, 
                    p.IsActive as isActive, 
                    p.IsArchived as isArchived, 
                    p.AdminMessage as adminMessage,
                    p.GSTPercentage as gstPercentage, 
                    p.HSNCode as hsnCode, 
                    p.IsDeleted as isDeleted,
                    -- 🔥 HIERARCHY FIELDS
                    leaf.Name as subCategory,      -- Level 4 (e.g., Sarees)
                    lvl3.Name as categoryGroup,    -- Level 3 (e.g., Ethnic Wear)
                    lvl2.Name as targetGender,     -- Level 2 (e.g., Women)
                    main.Name as mainCategory      -- Level 1 (e.g., Clothing)
                FROM Products p
                INNER JOIN Categories leaf ON p.CategoryId = leaf.CategoryId
                LEFT JOIN Categories lvl3 ON leaf.ParentId = lvl3.CategoryId
                LEFT JOIN Categories lvl2 ON lvl3.ParentId = lvl2.CategoryId
                LEFT JOIN Categories main ON lvl2.ParentId = main.CategoryId
                WHERE p.SellerId = @sid
                ORDER BY p.ProductId DESC
            `;

            const prodResult = await pool.request()
                .input('sid', sql.Int, foundSellerId)
                .query(prodQuery);

            let products = prodResult.recordset.map(p => {
                // Safely handle Image JSON
                let parsedImg = p.imageUrl;
                try { 
                    if (typeof p.imageUrl === 'string' && p.imageUrl.startsWith('[')) {
                        parsedImg = JSON.parse(p.imageUrl); 
                    } else if (p.imageUrl) {
                        parsedImg = [p.imageUrl];
                    }
                } catch(e) { parsedImg = []; }
                
                // Safely handle Attributes JSON
                let parsedAttr = p.attributes;
                try { 
                    if (typeof p.attributes === 'string') parsedAttr = JSON.parse(p.attributes); 
                } catch(e) { parsedAttr = {}; }

                return { 
                    ...p, 
                    imageUrl: parsedImg, 
                    attributes: parsedAttr || {}, 
                    variations: [] 
                };
            });

            // Step 3: Fetch all Variations for these products
            if (products.length > 0) {
                const productIds = products.map(p => p.id).join(',');
                
                const varRes = await pool.request().query(`
                    SELECT 
                        VariationId AS id, 
                        ProductId AS productId, 
                        VariationAttributes AS attributes, 
                        PriceOverride AS priceOverride, 
                        Stock AS stock, 
                        SKU AS sku
                    FROM ProductVariations
                    WHERE ProductId IN (${productIds})
                `);

                varRes.recordset.forEach(v => {
                    let parsedVAttr = v.attributes;
                    try { 
                        if (typeof v.attributes === 'string') parsedVAttr = JSON.parse(v.attributes); 
                    } catch(e) { parsedVAttr = {}; }
                    v.attributes = parsedVAttr || {};
                    
                    const parentProduct = products.find(p => p.id === v.productId);
                    if (parentProduct) {
                        parentProduct.variations.push(v);
                    }
                });
            }

            return { status: 200, jsonBody: products };

        } catch (error) {
            context.error("GetSellerProducts Error:", error);
            return { status: 500, jsonBody: { error: "Database Error", details: error.message } };
        }
    }
});