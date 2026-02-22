const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const sellerId = request.query.get('sellerId');
            
            // 1. Connect using your shared connection string
            await sql.connect(process.env.SQL_CONNECTION);

            // 2. Query with Security Check (JOIN Sellers)
            // 🔥 Kept your original aliases (as id, as name) so React doesn't crash!
            let query = `
                SELECT 
                    p.ProductId as id, 
                    p.Name as name, 
                    p.Price as price, 
                    p.Stock as qty, 
                    p.ImageUrl as imageUrl, 
                    p.Description as description, 
                    p.OriginalPrice as originalPrice, 
                    p.Category as category, 
                    p.Brand as brand, 
                    p.Weight as weight, 
                    p.SKU as sku,
                    p.SellerId as sellerId
                FROM Products p
                INNER JOIN Sellers s ON p.SellerId = s.SellerId
                WHERE p.IsActive = 1 
                  AND s.IsApproved = 1
                  AND (p.IsArchived = 0 OR p.IsArchived IS NULL) -- 🔥 Hides Admin "Take Down" products
                  AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)   -- 🔥 Hides Deleted Seller products
            `;

            // 3. Add specific seller filter if requested
            if (sellerId) {
                query += ` AND p.SellerId = ${parseInt(sellerId)}`;
            }

            const result = await sql.query(query);
            return { status: 200, jsonBody: result.recordset };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error loading products: " + err.message };
        }
    }
});