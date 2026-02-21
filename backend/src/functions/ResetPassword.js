const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');
const bcrypt = require('bcryptjs');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('ResetPassword', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const { email, otp, newPassword } = await request.json();

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', async (err) => {
                if (err) return resolve({ status: 500, body: "DB Error" });

                // 1. Verify OTP
                const checkQuery = `SELECT 1 FROM SignupOTPs WHERE Email = @email AND OTP = @otp AND ExpiresAt > GETUTCDATE()`;
                const checkReq = new Request(checkQuery, async (err, rowCount) => {
                    if (err || rowCount === 0) {
                        connection.close();
                        return resolve({ status: 400, body: "Invalid or expired OTP" });
                    }

                    // 2. Hash New Password
                    const hashedPassword = await bcrypt.hash(newPassword, 10);

                    // 3. Update User Password
                    const updateQuery = `UPDATE Users SET PasswordHash = @pass WHERE Email = @email`;
                    const updateReq = new Request(updateQuery, (err) => {
                        connection.close();
                        if (err) return resolve({ status: 500, body: "Update Failed" });
                        resolve({ status: 200, body: "Password Updated" });
                    });

                    updateReq.addParameter('pass', TYPES.VarChar, hashedPassword);
                    updateReq.addParameter('email', TYPES.VarChar, email);
                    connection.execSql(updateReq);
                });

                checkReq.addParameter('email', TYPES.VarChar, email);
                checkReq.addParameter('otp', TYPES.VarChar, otp);
                connection.execSql(checkReq);
            });
            connection.connect();
        });
    }
});