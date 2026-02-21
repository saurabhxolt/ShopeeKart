const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetOrders', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            await sql.connect(process.env.SQL_CONNECTION);
            
            const paramId = request.query.get('sellerId') || request.query.get('sellerUserId');
            const isSellerRequest = request.query.get('isBuyer') !== 'true';

            if (!paramId) return { status: 400, body: "Error: No User ID provided." };

            let query = "";

            if (isSellerRequest) {
                // --- SELLER QUERY ---
                query = `
                    SELECT 
                        o.OrderId, 
                        o.OrderDate, 
                        o.TotalAmount, 
                        o.ShippingAddress, 
                        o.Status,
                        u.FullName as BuyerName,
                        u.Email as BuyerEmail,      -- <--- ADDED EMAIL HERE
                        (
                            SELECT 
                                p.ProductId, p.Name, p.ImageUrl, 
                                oi.Qty, oi.Price, oi.ItemStatus 
                            FROM OrderItems oi
                            JOIN Products p ON oi.ProductId = p.ProductId
                            JOIN Sellers s ON oi.SellerId = s.SellerId
                            WHERE oi.OrderId = o.OrderId AND s.UserId = ${paramId}
                            FOR JSON PATH
                        ) AS ItemsJson
                    FROM Orders o
                    JOIN OrderItems oi_main ON o.OrderId = oi_main.OrderId
                    JOIN Sellers s_main ON oi_main.SellerId = s_main.SellerId
                    JOIN Users u ON o.UserId = u.UserId
                    WHERE s_main.UserId = ${paramId}
                    -- CRITICAL: Must include u.Email in GROUP BY
                    GROUP BY o.OrderId, o.OrderDate, o.TotalAmount, o.ShippingAddress, o.Status, u.FullName, u.Email 
                    ORDER BY o.OrderDate DESC
                `;
            } else {
                // --- BUYER QUERY ---
                query = `
                    SELECT 
                        o.OrderId, 
                        o.OrderDate, 
                        o.TotalAmount, 
                        o.ShippingAddress, 
                        o.Status,
                        u.FullName as BuyerName,
                        u.Email as BuyerEmail,      -- <--- ADDED EMAIL HERE
                        (
                            SELECT 
                                p.ProductId, p.Name, p.ImageUrl, 
                                oi.Qty, oi.Price, oi.ItemStatus
                            FROM OrderItems oi
                            JOIN Products p ON oi.ProductId = p.ProductId
                            WHERE oi.OrderId = o.OrderId
                            FOR JSON PATH
                        ) AS ItemsJson
                    FROM Orders o
                    JOIN Users u ON o.UserId = u.UserId
                    WHERE o.UserId = ${paramId}
                    ORDER BY o.OrderDate DESC
                `;
            }

            const result = await sql.query(query);
            return { status: 200, jsonBody: result.recordset };
        } catch (err) {
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});