const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GlobalSearch', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const searchTerm = request.query.get('q');
            if (!searchTerm) return { status: 200, jsonBody: [] };

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            
            const query = `
                SELECT 
                    p.ProductId as id, 
                    p.Name, 
                    p.Price, 
                    p.ImageUrl, 
                    p.SellerId as sellerId, 
                    s.StoreName,
                    leaf.Name as SubCategory,
                    main.Name as MainCategory,
                    -- 🔥 SELLER DETAILS FOR PROFILE
                    s.SupportPhone as sellerPhone,
                    s.SupportEmail as sellerEmail,
                    s.PickupAddress as pickupAddress,
                    s.StoreLogo as storeLogo,
                    s.StoreBanner as storeBanner,
                    s.Description as storeDescription -- SQL column is 'Description'
                FROM Products p
                INNER JOIN Sellers s ON p.SellerId = s.SellerId
                LEFT JOIN Categories leaf ON p.CategoryId = leaf.CategoryId
                LEFT JOIN Categories lvl3 ON leaf.ParentId = lvl3.CategoryId
                LEFT JOIN Categories lvl2 ON lvl3.ParentId = lvl2.CategoryId
                LEFT JOIN Categories main ON lvl2.ParentId = main.CategoryId
                WHERE 
                    (p.Name LIKE @term OR 
                     p.Description LIKE @term OR 
                     leaf.Name LIKE @term OR 
                     main.Name LIKE @term OR
                     s.StoreName LIKE @term)
                  AND p.IsActive = 1
                  AND s.IsApproved = 1
                  AND (p.IsArchived = 0 OR p.IsArchived IS NULL)
                  AND (p.IsDeleted = 0 OR p.IsDeleted IS NULL)
                  AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
                ORDER BY p.ProductId DESC
            `;

            const result = await pool.request()
                .input('term', sql.VarChar, `%${searchTerm}%`)
                .query(query);

            return { status: 200, jsonBody: result.recordset };
        } catch (error) {
            context.error("GlobalSearch Error:", error);
            return { status: 500, body: "Search Error: " + error.message };
        }
    }
});