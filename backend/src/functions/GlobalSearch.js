const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GlobalSearch', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const searchTerm = request.query.get('q');
            if (!searchTerm) return { status: 200, jsonBody: [] };

            await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 FIX: Join using p.SellerId to match your DB schema
            // 🔥 UPDATED JOIN AND FILTERS
const result = await sql.query`
    SELECT 
        p.ProductId as id, 
        p.Name, 
        p.Price, 
        p.OriginalPrice, 
        p.ImageUrl, 
        p.Category, 
        p.Brand, 
        p.Stock as qty, 
        s.StoreName,
        s.SellerId as sellerId  -- Join on SellerId to be safe
    FROM Products p
    JOIN Sellers s ON p.SellerId = s.SellerId
    WHERE (p.Name LIKE ${'%' + searchTerm + '%'} 
        OR p.Category LIKE ${'%' + searchTerm + '%'} 
        OR p.Brand LIKE ${'%' + searchTerm + '%'})
    AND p.IsActive = 1 
    AND p.IsArchived = 0
    -- ⚠️ Note: If testing with an unapproved account, change 1 to 0 temporarily below:
    AND s.IsApproved = 1 
`;

            return { status: 200, jsonBody: result.recordset };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Search failed: " + err.message };
        }
    }
});