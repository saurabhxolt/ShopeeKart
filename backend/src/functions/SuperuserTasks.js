const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('SuperuserTasks', {
    methods: ['POST'],
    route: 'super-task',
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { action, targetId, message } = await request.json();

            await sql.connect(process.env.SQL_CONNECTION);

            // ==========================================
            // 🔥 NEW: Advanced Transaction for Order Cancellation
            // ==========================================
            if (action === 'FORCE_CANCEL_ORDER') {
                const transaction = new sql.Transaction();
                await transaction.begin();

                try {
                    // 1. Get all active items in this order
                    const req1 = new sql.Request(transaction);
                    req1.input('oId', sql.Int, parseInt(targetId));
                    const items = await req1.query(`
                        SELECT ProductId, Qty 
                        FROM OrderItems 
                        WHERE OrderId = @oId AND ItemStatus != 'Cancelled' AND ItemStatus != 'Cancelled by Admin'
                    `);

                    // 2. Loop through items and restore the exact Stock quantities
                    for (const item of items.recordset) {
                        const req2 = new sql.Request(transaction);
                        req2.input('qty', sql.Int, parseInt(item.Qty));
                        req2.input('pId', sql.Int, parseInt(item.ProductId));
                        await req2.query(`
                            UPDATE Products 
                            SET Stock = Stock + @qty 
                            WHERE ProductId = @pId
                        `);
                    }

                    // 3. Mark the items as cancelled by admin
                    const req3 = new sql.Request(transaction);
                    req3.input('oId', sql.Int, parseInt(targetId));
                    await req3.query(`
                        UPDATE OrderItems 
                        SET ItemStatus = 'Cancelled by Admin' 
                        WHERE OrderId = @oId
                    `);

                    // 4. Mark the main order as cancelled by admin
                    const req4 = new sql.Request(transaction);
                    req4.input('oId', sql.Int, parseInt(targetId));
                    await req4.query(`
                        UPDATE Orders 
                        SET Status = 'Cancelled by Admin' 
                        WHERE OrderId = @oId
                    `);

                    await transaction.commit();
                    return { status: 200, body: "Order Cancelled & Stock Restored" };
                } catch (err) {
                    await transaction.rollback();
                    throw err; // Send to main catch block
                }
            }

            // ==========================================
            // STANDARD SINGLE-QUERY ACTIONS
            // ==========================================
            const dbRequest = new sql.Request();
            dbRequest.input('id', sql.Int, targetId);
            dbRequest.input('message', sql.NVarChar, message || null);

            let query = "";

            if (action === 'APPROVE') {
                query = `UPDATE Sellers SET IsApproved = 1 WHERE SellerId = @id`;
            }
            else if (action === 'BAN') {
                query = `UPDATE Sellers SET IsApproved = 0 WHERE SellerId = @id`;
            }
            else if (action === 'BAN_USER') {
                query = `UPDATE Users SET IsBanned = 1 WHERE UserId = @id`;
            }
            else if (action === 'UNBAN_USER') {
                query = `UPDATE Users SET IsBanned = 0 WHERE UserId = @id`;
            }
            else if (action === 'DELETE_USER') {
                query = `
                    BEGIN TRANSACTION;
                    UPDATE Users SET IsDeleted = 1 WHERE UserId = @id;
                    UPDATE Sellers SET IsDeleted = 1, IsApproved = 0 WHERE UserId = @id;
                    UPDATE Products SET IsArchived = 1 WHERE SellerId IN (SELECT SellerId FROM Sellers WHERE UserId = @id);
                    COMMIT TRANSACTION;
                `;
            }
            else if (action === 'TOGGLE_PRODUCT') {
                query = `
                    UPDATE Products 
                    SET 
                        IsArchived = CASE WHEN IsArchived = 1 THEN 0 ELSE 1 END,
                        AdminMessage = CASE WHEN IsArchived = 1 THEN NULL ELSE @message END,
                        FixSubmitted = 0
                    WHERE ProductId = @id
                `;
            }

            if (query) {
                await dbRequest.query(query);
                return { status: 200, body: "Operation Successful" };
            } else {
                return { status: 400, body: "Invalid Action" };
            }

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});