const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('SuperuserTasks', {
    methods: ['POST'],
    route: 'super-task',
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            // 🔥 Added 'message' to capture the Admin's reason
            const { action, targetId, message } = await request.json();

            await sql.connect(process.env.SQL_CONNECTION);

            const dbRequest = new sql.Request();
            dbRequest.input('id', sql.Int, targetId);
            dbRequest.input('message', sql.NVarChar, message || null); // Bind parameter safely

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
            // 🔥 UPDATED: Save AdminMessage when archiving, clear it when restoring
            else if (action === 'TOGGLE_PRODUCT') {
                query = `
                    UPDATE Products 
                    SET 
                        IsArchived = CASE WHEN IsArchived = 1 THEN 0 ELSE 1 END,
                        AdminMessage = CASE WHEN IsArchived = 1 THEN NULL ELSE @message END,
                        FixSubmitted = 0 -- 🔥 ALWAYS RESET TO 0 WHEN ADMIN ACTIONS THE PRODUCT
                    WHERE ProductId = @id
                `;
            }
            else if (action === 'FORCE_CANCEL_ORDER') {
                query = `
                    UPDATE Orders 
                    SET Status = 'Cancelled' 
                    WHERE OrderId = @id;
                    
                    UPDATE OrderItems 
                    SET ItemStatus = 'Cancelled' 
                    WHERE OrderId = @id;
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