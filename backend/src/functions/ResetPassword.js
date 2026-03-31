const { app } = require('@azure/functions');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

app.http('ResetPassword', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { email, otp, newPassword } = await request.json();

            if (!email || !otp || !newPassword) {
                return { status: 400, body: "Missing required fields" };
            }

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 1. Verify OTP
            const checkQuery = `
                SELECT 1 
                FROM SignupOTPs 
                WHERE Email = @email 
                  AND OTP = @otp 
                  AND ExpiresAt > GETUTCDATE()
            `;
            
            const checkResult = await pool.request()
                .input('email', sql.VarChar, email)
                .input('otp', sql.VarChar, otp)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                return { status: 400, body: "Invalid or expired OTP" };
            }

            // 2. Hash New Password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // 3. Update User Password
            const updateQuery = `
                UPDATE Users 
                SET PasswordHash = @pass 
                WHERE Email = @email
            `;
            
            await pool.request()
                .input('pass', sql.VarChar, hashedPassword)
                .input('email', sql.VarChar, email)
                .query(updateQuery);

            return { status: 200, body: "Password Updated Successfully" };

        } catch (err) {
            context.error("ResetPassword Error:", err);
            return { status: 500, body: "Server Error: " + err.message };
        }
    }
});