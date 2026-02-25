const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const sellerIdParam = request.query.get('sellerId');
            const parsedSellerId = parseInt(sellerIdParam);
            
            // 1. Connect using your shared connection string
            await sql.connect(process.env.SQL_CONNECTION);

            // 2. Query with Security Check (JOIN Sellers)
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
                  AND (p.IsArchived = 0 OR p.IsArchived IS NULL)
                  AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
            `;

            const dbRequest = new sql.Request();

            // 3. 🔥 FIX: Only add filter if it is a valid number!
            if (sellerIdParam && !isNaN(parsedSellerId)) {
                query += ` AND p.SellerId = @sellerId`;
                dbRequest.input('sellerId', sql.Int, parsedSellerId);
            }

            const result = await dbRequest.query(query);
            return { status: 200, jsonBody: result.recordset };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error loading products: " + err.message };
        }
    }
});