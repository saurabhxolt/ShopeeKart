const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetWishlist', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userId = request.query.get('userId');

            if (!userId || userId === 'undefined') {
                return { status: 400, body: "User ID required" };
            }

            const parsedUserId = parseInt(userId);
            if (isNaN(parsedUserId)) return { status: 400, body: "Invalid User ID format" };

            await sql.connect(process.env.SQL_CONNECTION);
            
            // 🔥 NEW: Added p.SellerId and JOINed Sellers to get the StoreName
            const query = `
                SELECT 
                    w.WishlistId, 
                    p.ProductId as id, 
                    p.Name as name, 
                    p.Price as price, 
                    p.OriginalPrice as originalPrice, 
                    p.ImageUrl as imageUrl, 
                    p.Stock as qty,
                    p.SellerId as sellerId,
                    s.StoreName as storeName
                FROM Wishlist w
                JOIN Products p ON w.ProductId = p.ProductId
                LEFT JOIN Sellers s ON p.SellerId = s.SellerId
                WHERE w.UserId = @uId
                ORDER BY w.AddedDate DESC
            `;
            
            const dbReq = new sql.Request();
            dbReq.input('uId', sql.Int, parsedUserId);
            const result = await dbReq.query(query);

            return { status: 200, jsonBody: result.recordset };
        } catch (err) {
            context.error("--> GetWishlist Error:", err.message);
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});