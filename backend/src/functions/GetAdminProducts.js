const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetAdminProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            await sql.connect(process.env.SQL_CONNECTION);
            
            const query = `
                SELECT 
                    p.ProductId, 
                    p.Name, 
                    p.Description,
                    p.OriginalPrice,
                    p.Price, 
                    c.Name AS Category, -- 🔥 THE FIX: Get name from Categories table
                    p.Stock AS StockQuantity, 
                    p.IsArchived, 
                    p.AdminMessage,
                    p.ImageUrl AS MainImage,
                    p.FixSubmitted AS fixSubmitted, -- Aliased for React compatibility
                    s.StoreName, 
                    s.IsDeleted AS SellerIsDeleted,
                    u.Email as SellerEmail
                FROM Products p
                INNER JOIN Sellers s ON p.SellerId = s.SellerId
                INNER JOIN Users u ON s.UserId = u.UserId
                LEFT JOIN Categories c ON p.CategoryId = c.CategoryId -- 🔥 THE FIX: Join the new table
                ORDER BY p.ProductId DESC
            `;

            const result = await sql.query(query);
            
            return { 
                status: 200, 
                headers: { 'Cache-Control': 'no-cache' },
                jsonBody: result.recordset 
            };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error fetching admin products: " + err.message };
        }
    }
});