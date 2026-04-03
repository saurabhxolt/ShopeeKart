const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('UpdateProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { userId, fullName, phone } = await request.json();

            if (!userId || !fullName) {
                return { status: 400, body: "UserId and FullName are required." };
            }

            await sql.connect(process.env.SQL_CONNECTION);
            
            // 🔥 UPDATED: Now saves the Phone number as well
            const query = `
                UPDATE Users 
                SET FullName = @fullName,
                    Phone = @phone
                WHERE UserId = @userId
            `;
            
            const dbReq = new sql.Request();
            dbReq.input('fullName', sql.NVarChar, fullName);
            // Pass the phone number, or NULL if the user left it blank
            dbReq.input('phone', sql.NVarChar, phone ? phone : null); 
            dbReq.input('userId', sql.Int, parseInt(userId));
            
            await dbReq.query(query);

            return { status: 200, jsonBody: { message: "Profile updated successfully!" } };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error updating profile: " + err.message };
        }
    }
});