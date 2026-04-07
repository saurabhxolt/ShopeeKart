const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('ManageCart', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // Action can be: 'ADD', 'UPDATE_QTY', 'REMOVE', 'CLEAR'
            const { userId, action, productId, variationId, qty } = await request.json();
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            
            // 1. Execute the requested action
            let actionQuery = `DECLARE @CartId INT; SELECT @CartId = CartId FROM Carts WHERE UserId = @userId;`;

            if (action === 'CLEAR') {
                actionQuery += `
                    IF @CartId IS NOT NULL BEGIN
                        DELETE FROM CartItems WHERE CartId = @CartId;
                        DELETE FROM Carts WHERE CartId = @CartId;
                    END
                `;
            } 
            else if (action === 'REMOVE') {
                actionQuery += `
        IF @CartId IS NOT NULL BEGIN
            -- 1. Delete the item
            DELETE FROM CartItems 
            WHERE CartId = @CartId AND ProductId = @productId 
            AND ISNULL(VariationId, 0) = ISNULL(@varId, 0);

            -- 2. NEW: Cleanup - If no items are left, delete the Cart lock too
            IF NOT EXISTS (SELECT 1 FROM CartItems WHERE CartId = @CartId)
            BEGIN
                DELETE FROM Carts WHERE CartId = @CartId;
            END
        END
    `;
            }
            else if (action === 'UPDATE_QTY') {
                actionQuery += `
                    IF @CartId IS NOT NULL BEGIN
                        UPDATE CartItems SET Quantity = @qty
                        WHERE CartId = @CartId AND ProductId = @productId 
                        AND ISNULL(VariationId, 0) = ISNULL(@varId, 0);
                    END
                `;
            }
            else if (action === 'ADD') {
                actionQuery += `
                    -- (Includes your existing Lock-to-Seller and Smart Upsert logic here)
                    DECLARE @TargetSellerId INT;
                    SELECT @TargetSellerId = SellerId FROM Products WHERE ProductId = @productId;
                    
                    IF @CartId IS NULL BEGIN
                        INSERT INTO Carts (UserId, LockedSellerId) VALUES (@userId, @TargetSellerId);
                        SET @CartId = SCOPE_IDENTITY();
                    END

                    IF EXISTS (SELECT 1 FROM CartItems WHERE CartId = @CartId AND ProductId = @productId AND ISNULL(VariationId, 0) = ISNULL(@varId, 0))
                    BEGIN
                        UPDATE CartItems SET Quantity = Quantity + @qty 
                        WHERE CartId = @CartId AND ProductId = @productId AND ISNULL(VariationId, 0) = ISNULL(@varId, 0);
                    END
                    ELSE BEGIN
                        INSERT INTO CartItems (CartId, ProductId, VariationId, Quantity) 
                        VALUES (@CartId, @productId, @varId, @qty);
                    END
                `;
            }
            else if (action === 'FETCH') {
                // We don't need to do anything here! 
                // The SELECT query at the bottom of your function will 
                // automatically grab the items and send them back.
            }

            await pool.request()
                .input('userId', sql.Int, userId)
                .input('productId', sql.Int, productId || null)
                .input('varId', sql.Int, variationId || null)
                .input('qty', sql.Int, qty || 1)
                .query(actionQuery);

            // 2. Fetch the newly computed cart from the DB to send back to React
            const freshCart = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT 
                        ci.ProductId as id, 
                        ci.VariationId as variationId, 
                        ci.Quantity as qty, 
                        p.Name as name, 
                        p.Price as price, 
                        p.ImageUrl as imageUrl, 
                        p.SellerId as sellerId,
                        pv.VariationAttributes as selectedAttributes -- 🔥 FIX: Fetch the attributes!
                    FROM CartItems ci
                    JOIN Carts c ON ci.CartId = c.CartId
                    JOIN Products p ON ci.ProductId = p.ProductId
                    LEFT JOIN ProductVariations pv ON ci.VariationId = pv.VariationId -- 🔥 FIX: Join Variations table
                    WHERE c.UserId = @userId
                `);

            // 🔥 FIX: Safely parse the stringified JSON from SQL into a real Object for React
            const parsedCart = freshCart.recordset.map(item => {
                let attr = item.selectedAttributes;
                try {
                    if (typeof attr === 'string') attr = JSON.parse(attr);
                } catch(e) { attr = {}; }
                
                return {
                    ...item,
                    selectedAttributes: attr || {}
                };
            });

            return { status: 200, jsonBody: { cart: parsedCart } };

        } catch (error) {
            context.error("ManageCart Error:", error);
            return { status: 500, body: error.message };
        }
    }
});