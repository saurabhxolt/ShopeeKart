const { app } = require('@azure/functions');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

app.http('Login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { email, password } = await request.json();

            // 1. Connect to Database
            await sql.connect(process.env.SQL_CONNECTION);
            
            // 2. Query User (Checking Role, Ban Status, and Soft Delete)
            const result = await sql.query`
                SELECT 
                    u.UserId, 
                    u.Role, 
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.PasswordHash, 
                    u.IsBanned, 
                    s.IsApproved
                FROM Users u
                LEFT JOIN Sellers s ON u.UserId = s.UserId
                WHERE u.Email = ${email} 
                AND (u.IsDeleted = 0 OR u.IsDeleted IS NULL)
            `;

            const user = result.recordset[0];

            // 3. User Not Found Logic
            if (!user) {
                return { status: 404, body: "User not found or account deleted." };
            }

            // 4. Security Checks
            // Check if Banned - We still block banned users entirely
            if (user.IsBanned) {
                return { status: 403, body: "🚫 Your account has been banned. Contact Admin." };
            }

            // 🔥 UPDATED: Removed the block for Unapproved Sellers. 
            // We now allow them to login so they can modify their details.

            // 5. Verify Password
            const isMatch = await bcrypt.compare(password, user.PasswordHash);
            
            if (!isMatch) {
                return { status: 401, body: "Invalid Credentials" };
            }

            // 6. Success - Return User Data
            return {
                status: 200,
                jsonBody: {
                    userId: user.UserId,
                    role: user.Role,
                    name: user.FullName,
                    email: user.Email,
                    phone: user.Phone,
                    // 🔥 Pass the approval status to the frontend so we can show a warning bar
                    isApproved: user.IsApproved === 1 || user.IsApproved === true,
                    token: "dummy-jwt-token" 
                }
            };

        } catch (err) {
            context.error(err);
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});