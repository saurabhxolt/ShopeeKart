const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('RestoreProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { productId, userId } = await request.json();

            if (!productId || !userId) {
                return { status: 400, body: "Missing productId or userId" };
            }

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 THE LOGIC: Set IsDeleted back to 0
            const query = `
                UPDATE p
                SET p.IsDeleted = 0
                FROM Products p
                JOIN Sellers s ON p.SellerId = s.SellerId
                WHERE p.ProductId = @pId AND s.UserId = @uId
            `;

            const result = await pool.request()
                .input('pId', sql.Int, parseInt(productId))
                .input('uId', sql.Int, parseInt(userId))
                .query(query);

            // Check if any row was actually updated
            if (result.rowsAffected[0] === 0) {
                return { status: 403, body: "Unauthorized or Product not found" };
            }

            return { status: 200, body: "Product restored successfully" };

        } catch (error) {
            context.error("RestoreProduct Error:", error);
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});