const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('AddToCart', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const { userId, productId } = await request.json();

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

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) return resolve({ status: 500, body: "DB Error" });
                const req = new Request(query, (err) => { connection.close(); });
                
                req.addParameter('userId', TYPES.Int, userId);
                req.addParameter('productId', TYPES.Int, productId);

                req.on('row', (columns) => {
                    const status = columns[0].value;
                    if (status === 'LOCKED') {
                        resolve({ status: 403, body: "You can only buy from one seller at a time. Clear your cart first!" });
                    } else {
                        resolve({ status: 200, body: "Added to cart!" });
                    }
                });
                connection.execSql(req);
            });
            connection.connect();
        });
    }
});