const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('AddToCart', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { userId, productId } = await request.json();

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // SQL Logic: 
            // 1. Get SellerId of the product.
            // 2. Check if user has a cart and if it's locked to a different seller.
            const query = `
                DECLARE @TargetSellerId INT;
                DECLARE @CurrentLockedSellerId INT;
                DECLARE @CartId INT;

                SELECT @TargetSellerId = SellerId FROM Products WHERE ProductId = @productId;
                
                SELECT @CartId = CartId, @CurrentLockedSellerId = LockedSellerId 
                FROM Carts WHERE UserId = @userId;

                IF @CartId IS NULL
                BEGIN
                    -- Create new cart locked to this seller
                    INSERT INTO Carts (UserId, LockedSellerId) VALUES (@userId, @TargetSellerId);
                    SET @CartId = SCOPE_IDENTITY();
                END
                ELSE IF @CurrentLockedSellerId != @TargetSellerId
                BEGIN
                    -- Block the addition
                    SELECT 'LOCKED' as Status;
                    RETURN;
                END

                -- Add item to cart
                INSERT INTO CartItems (CartId, ProductId, Quantity) VALUES (@CartId, @productId, 1);
                SELECT 'SUCCESS' as Status;
            `;

            // Execute the query with secure parameter binding
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('productId', sql.Int, productId)
                .query(query);

            // Extract the status from the returned row
            const status = result.recordset[0].Status;

            if (status === 'LOCKED') {
                return { status: 403, body: "You can only buy from one seller at a time. Clear your cart first!" };
            } else {
                return { status: 200, body: "Added to cart!" };
            }

        } catch (error) {
            context.error("Function Error:", error);
            return { status: 500, body: "DB Error: " + error.message };
        }
    }
});