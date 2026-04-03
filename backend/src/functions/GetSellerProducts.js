const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSellerProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userId = request.query.get('userId');

            if (!userId) {
                return { status: 400, body: "UserId is required" };
            }

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // Step 1: Find the SellerId
            const sellerResult = await pool.request()
                .input('uid', sql.Int, parseInt(userId))
                .query(`SELECT SellerId FROM Sellers WHERE UserId = @uid`);

            if (sellerResult.recordset.length === 0) {
                return { status: 200, jsonBody: [] }; // No seller found, return empty array
            }

            const foundSellerId = sellerResult.recordset[0].SellerId;

            // Step 2: Get the Products
            // 🔥 UPDATED: Using SQL aliases (as camelCaseName) to auto-format the JSON
            const prodQuery = `
                SELECT 
                    ProductId as id, 
                    Name as name, 
                    Price as price, 
                    Stock as qty, 
                    ImageUrl as imageUrl, 
                    Description as description, 
                    OriginalPrice as originalPrice, 
                    Category as category, 
                    Brand as brand, 
                    Weight as weight, 
                    SKU as sku, 
                    IsActive as isActive, 
                    IsArchived as isArchived, 
                    AdminMessage as adminMessage,
                    GSTPercentage as gstPercentage, 
                    HSNCode as hsnCode, 
                    IsDeleted as isDeleted
                FROM Products 
                WHERE SellerId = @sid
                ORDER BY ProductId DESC
            `;

            const prodResult = await pool.request()
                .input('sid', sql.Int, foundSellerId)
                .query(prodQuery);

            // Because of the aliases, recordset is perfectly formatted for React!
            return { status: 200, jsonBody: prodResult.recordset };

        } catch (error) {
            context.error("GetSellerProducts Error:", error);
            return { status: 500, body: "Database Error: " + error.message };
        }
    }
});