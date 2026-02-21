const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSellers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            await sql.connect(process.env.SQL_CONNECTION);
            
            const showAll = request.query.get('all') === 'true';

            let query = `
                SELECT 
                    s.SellerId, 
                    s.UserId, 
                    s.StoreName,      -- <--- CORRECT COLUMN NAME
                    s.Description, 
                    s.IsApproved,
                    s.IsDeleted,
                    u.FullName, 
                    u.Email
                FROM Sellers s
                INNER JOIN Users u ON s.UserId = u.UserId
            `;

            if (!showAll) {
                query += " WHERE s.IsApproved = 1 AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)";
            }

            query += " ORDER BY s.SellerId DESC";

            const result = await sql.query(query);
            
            return { 
                status: 200, 
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                jsonBody: result.recordset 
            };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error fetching sellers: " + err.message };
        }
    }
});