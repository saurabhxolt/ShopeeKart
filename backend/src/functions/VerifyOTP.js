const { app } = require('@azure/functions');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

app.http('VerifyOTP', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { email, otp, fullName, password, role, storeName } = await request.json();

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 1. CHECK OTP (using GETUTCDATE for timezone consistency)
            const checkQuery = `
                SELECT 1 
                FROM SignupOTPs 
                WHERE Email = @email AND OTP = @otp AND ExpiresAt > GETUTCDATE()
            `;
            
            const checkResult = await pool.request()
                .input('email', sql.VarChar, email)
                .input('otp', sql.VarChar, otp)
                .query(checkQuery);

            if (checkResult.recordset.length === 0) {
                return { status: 400, body: "Invalid or expired OTP." };
            }

            // 2. HASH PASSWORD
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3. INSERT USER & GET NEW ID
            const registerQuery = `
                INSERT INTO Users (FullName, Email, PasswordHash, Role, IsVerified) 
                OUTPUT INSERTED.UserId
                VALUES (@name, @email, @pass, @role, 1);
            `;

            let newUserId;
            try {
                const regResult = await pool.request()
                    .input('name', sql.VarChar, fullName)
                    .input('email', sql.VarChar, email)
                    .input('pass', sql.VarChar, hashedPassword)
                    .input('role', sql.VarChar, role)
                    .query(registerQuery);
                
                newUserId = regResult.recordset[0].UserId;
            } catch (regErr) {
                if (regErr.message.includes('Violation of UNIQUE KEY')) {
                    return { status: 409, body: "Email already registered." };
                }
                throw regErr;
            }

            // 4. IF SELLER, CREATE SELLER PROFILE
            if (role === 'SELLER') {
                const sellerQuery = `
                    INSERT INTO Sellers (UserId, StoreName, IsApproved) 
                    VALUES (@uId, @sName, 0)
                `;
                await pool.request()
                    .input('uId', sql.Int, newUserId)
                    .input('sName', sql.VarChar, storeName)
                    .query(sellerQuery);
            }

            // 5. CLEANUP: DELETE THE USED OTP
            await pool.request()
                .input('email', sql.VarChar, email)
                .query(`DELETE FROM SignupOTPs WHERE Email = @email`);

            // 6. RETURN SUCCESS WITH AUTO-LOGIN DATA
            return { 
                status: 200, 
                jsonBody: {
                    message: "Verified & Registered!",
                    userId: newUserId,
                    name: fullName,
                    role: role,
                    token: "dummy-jwt-token" // Ready for your JWT implementation later
                } 
            };

        } catch (error) {
            context.error("VerifyOTP Error:", error);
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});