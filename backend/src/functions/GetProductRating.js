const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetProductRating', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const productId = request.query.get('productId');
            if (!productId || isNaN(productId)) return { status: 400, body: "Invalid Product ID" };

            await sql.connect(process.env.SQL_CONNECTION);
            
            // This query asks SQL to do the math for us: Average the stars and count total votes
            const query = `
                SELECT 
                    ISNULL(AVG(CAST(Rating AS FLOAT)), 0) as avgRating,
                    COUNT(RatingId) as totalRatings
                FROM ProductRatings
                WHERE ProductId = @productId
            `;
            
            const dbReq = new sql.Request();
            dbReq.input('productId', sql.Int, parseInt(productId));
            const result = await dbReq.query(query);
            
            return { 
                status: 200, 
                jsonBody: {
                    avgRating: result.recordset[0].avgRating.toFixed(1), // Formats to e.g., "4.2"
                    totalRatings: result.recordset[0].totalRatings
                } 
            };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error fetching rating: " + err.message };
        }
    }
});