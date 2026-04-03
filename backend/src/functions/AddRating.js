const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('AddRating', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { productId, userId, rating } = await request.json();
            
            if (!rating || rating < 1 || rating > 5) {
                return { status: 400, body: "Rating must be between 1 and 5." };
            }

            await sql.connect(process.env.SQL_CONNECTION);
            
            // Check if user already rated this product
            const checkReq = new sql.Request();
            checkReq.input('productId', sql.Int, productId);
            checkReq.input('userId', sql.Int, userId);
            const checkRes = await checkReq.query(`SELECT RatingId FROM ProductRatings WHERE ProductId = @productId AND UserId = @userId`);
            
            const dbReq = new sql.Request();
            dbReq.input('productId', sql.Int, productId);
            dbReq.input('userId', sql.Int, userId);
            dbReq.input('rating', sql.Int, rating);

            if (checkRes.recordset.length > 0) {
                // If they already rated it, UPDATE their existing rating
                await dbReq.query(`UPDATE ProductRatings SET Rating = @rating, CreatedAt = GETDATE() WHERE ProductId = @productId AND UserId = @userId`);
            } else {
                // If it's their first time, INSERT a new rating
                await dbReq.query(`INSERT INTO ProductRatings (ProductId, UserId, Rating) VALUES (@productId, @userId, @rating)`);
            }
            
            return { status: 200, jsonBody: { message: "Rating saved successfully!" } };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error saving rating: " + err.message };
        }
    }
});