const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('ToggleWishlist', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            // 1. Force strict integer types to prevent ID mismatches
            const userId = parseInt(body.userId);
            const productId = parseInt(body.productId);

            if (isNaN(userId) || isNaN(productId)) {
                return { status: 400, body: "Invalid User ID or Product ID." };
            }

            await sql.connect(process.env.SQL_CONNECTION);
            
            // 2. Use a Request object with Inputs (Safe from SQL Injection)
            const dbReq = new sql.Request();
            dbReq.input('uId', sql.Int, userId);
            dbReq.input('pId', sql.Int, productId);

            // 3. Check if it's already in the wishlist
            const checkQuery = `SELECT * FROM Wishlist WHERE UserId = @uId AND ProductId = @pId`;
            const check = await dbReq.query(checkQuery);
            
            if (check.recordset.length > 0) {
                // 4. Remove it using Parameters
                const deleteQuery = `DELETE FROM Wishlist WHERE UserId = @uId AND ProductId = @pId`;
                await dbReq.query(deleteQuery);
                return { status: 200, jsonBody: { isWishlisted: false, message: "Removed" } };
            } else {
                // 5. Add it using Parameters
                const insertQuery = `INSERT INTO Wishlist (UserId, ProductId) VALUES (@uId, @pId)`;
                await dbReq.query(insertQuery);
                return { status: 200, jsonBody: { isWishlisted: true, message: "Added" } };
            }
        } catch (err) {
            context.error("Wishlist Toggle Error:", err.message);
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});