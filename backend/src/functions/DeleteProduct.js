const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('DeleteProduct', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const productId = request.query.get('productId');
            const userId = request.query.get('userId');

            if (!productId || !userId) {
                return { status: 400, body: "Missing productId or userId" };
            }

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 THE FIX: Soft Delete using UPDATE instead of a hard DELETE
            const query = `
                UPDATE p
                SET p.IsDeleted = 1
                FROM Products p
                JOIN Sellers s ON p.SellerId = s.SellerId
                WHERE p.ProductId = @pId AND s.UserId = @uId
            `;

            const result = await pool.request()
                .input('pId', sql.Int, parseInt(productId))
                .input('uId', sql.Int, parseInt(userId))
                .query(query);

            // result.rowsAffected[0] tells us how many rows were actually updated
            if (result.rowsAffected[0] === 0) {
                return { status: 403, body: "Unauthorized or Product not found" };
            }

            return { status: 200, body: "Moved to trash successfully" };

        } catch (error) {
            context.error("DeleteProduct Error:", error);
            return { status: 500, body: "Failed to move to trash: " + error.message };
        }
    }
});