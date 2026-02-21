const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            await sql.connect(process.env.SQL_CONNECTION);
            
            // Query all users, including the new 'IsDeleted' column
            const result = await sql.query(`
                SELECT 
                    UserId, 
                    FullName, 
                    Email, 
                    Role, 
                    CreatedAt, 
                    IsBanned, 
                    IsDeleted 
                FROM Users 
                ORDER BY UserId DESC
            `);
            
            // Map the results to clean JSON objects
            const users = result.recordset.map(u => ({
                UserId: u.UserId,
                FullName: u.FullName,
                Email: u.Email,
                Role: u.Role,
                IsBanned: u.IsBanned,
                IsDeleted: u.IsDeleted
            }));
            
            return { status: 200, jsonBody: users };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});