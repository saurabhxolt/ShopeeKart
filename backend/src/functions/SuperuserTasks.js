const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('SuperuserTasks', {
    methods: ['POST'],
    route: 'super-task',
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { action, targetId } = await request.json();
            
            // Connect to database
            await sql.connect(process.env.SQL_CONNECTION);
            
            const dbRequest = new sql.Request();
            // Securely add the ID parameter
            dbRequest.input('id', sql.Int, targetId);

            let query = "";

            // 1. SHOP APPROVAL LOGIC
            if (action === 'APPROVE') {
                query = `UPDATE Sellers SET IsApproved = 1 WHERE SellerId = @id`;
            } 
            else if (action === 'BAN') {
                query = `UPDATE Sellers SET IsApproved = 0 WHERE SellerId = @id`;
            } 
            
            // 2. BUYER BANNING LOGIC
            else if (action === 'BAN_USER') {
                query = `UPDATE Users SET IsBanned = 1 WHERE UserId = @id`;
            } 
            else if (action === 'UNBAN_USER') {
                query = `UPDATE Users SET IsBanned = 0 WHERE UserId = @id`;
            }

            // 3. SOFT DELETE LOGIC (The New Safe Version)
            else if (action === 'DELETE_USER') {
                query = `
                    BEGIN TRANSACTION;

                    -- 1. Deactivate the User Account (Stops Login)
                    UPDATE Users SET IsDeleted = 1 WHERE UserId = @id;

                    -- 2. Deactivate Seller Profile (Stops Selling)
                    UPDATE Sellers SET IsDeleted = 1, IsApproved = 0 WHERE UserId = @id;

                    -- 3. Archive Products (Hides from Search)
                    UPDATE Products 
                    SET IsArchived = 1 
                    WHERE SellerId IN (SELECT SellerId FROM Sellers WHERE UserId = @id);

                    COMMIT TRANSACTION;
                `;
            }

            // Execute the query
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