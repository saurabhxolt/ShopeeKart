const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const sellerIdParam = request.query.get('sellerId');
            const parsedSellerId = parseInt(sellerIdParam);
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            let query = `
                SELECT 
                    p.ProductId as id, 
                    p.Name as name, 
                    p.Price as price, 
                    p.Stock as qty, 
                    p.ImageUrl as imageUrl, 
                    p.Description as description, 
                    p.OriginalPrice as originalPrice, 
                    p.Brand as brand, 
                    p.Weight as weight, 
                    p.SKU as sku,
                    p.SellerId as sellerId,
                    s.StoreName as storeName,
                    -- 🔥 MATCHED TO YOUR EXACT SCHEMA:
                    s.SupportPhone as sellerPhone,
                    s.SupportEmail as sellerEmail,
                    s.PickupAddress as pickupAddress,
                    s.StoreLogo as storeLogo,
                    s.StoreBanner as storeBanner,
                    s.Description as storeDescription, -- SQL column is 'Description'
                    p.GSTPercentage as gstPercentage, 
                    p.HSNCode as hsnCode,
                    p.CategoryId as categoryId,
                    p.ProductAttributes as attributes,
                    leaf.Name as subCategory,
                    main.Name as mainCategory 
                FROM Products p
                INNER JOIN Sellers s ON p.SellerId = s.SellerId
                LEFT JOIN Categories leaf ON p.CategoryId = leaf.CategoryId
                LEFT JOIN Categories lvl3 ON leaf.ParentId = lvl3.CategoryId
                LEFT JOIN Categories lvl2 ON lvl3.ParentId = lvl2.CategoryId
                LEFT JOIN Categories main ON lvl2.ParentId = main.CategoryId
                WHERE p.IsActive = 1 
                  AND s.IsApproved = 1
                  AND (p.IsArchived = 0 OR p.IsArchived IS NULL)
                  AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
                  AND (p.IsDeleted = 0 OR p.IsDeleted IS NULL)
            `;

            const dbRequest = pool.request();
            if (sellerIdParam && !isNaN(parsedSellerId)) {
                query += ` AND p.SellerId = @sellerId`;
                dbRequest.input('sellerId', sql.Int, parsedSellerId);
            }
            query += ` ORDER BY p.ProductId DESC`;

            const result = await dbRequest.query(query);

            let products = result.recordset.map(p => {
                let parsedImg = p.imageUrl;
                try { 
                    if (typeof p.imageUrl === 'string' && p.imageUrl.startsWith('[')) {
                        parsedImg = JSON.parse(p.imageUrl); 
                    } else if (p.imageUrl) {
                        parsedImg = [p.imageUrl]; 
                    }
                } catch(e) { parsedImg = []; }
                
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

            if (products.length > 0) {
                const productIds = products.map(p => p.id).join(',');
                const varRes = await pool.request().query(`
                    SELECT VariationId AS id, ProductId AS productId, VariationAttributes AS attributes, 
                           PriceOverride AS priceOverride, Stock AS stock, SKU AS sku
                    FROM ProductVariations WHERE ProductId IN (${productIds})
                `);

                varRes.recordset.forEach(v => {
                    let parsedVAttr = v.attributes;
                    try { if (typeof v.attributes === 'string') parsedVAttr = JSON.parse(v.attributes); } catch(e) { parsedVAttr = {}; }
                    v.attributes = parsedVAttr || {};
                    const parentProduct = products.find(p => p.id === v.productId);
                    if (parentProduct) parentProduct.variations.push(v);
                });
            }

            return { status: 200, jsonBody: products };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error loading products: " + err.message };
        }
    }
});