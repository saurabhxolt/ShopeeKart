const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');
const bcrypt = require('bcryptjs');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('VerifyOTP', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const { email, otp, fullName, password, role, storeName } = await request.json();

        return new Promise((resolve) => {
            const connection = new Connection(config);
            
            connection.on('connect', async (err) => {
                if (err) return resolve({ status: 500, body: "DB Connection Error" });

                // 1. Check OTP (using GETUTCDATE for timezone fix)
                const checkQuery = `SELECT 1 FROM SignupOTPs WHERE Email = @email AND OTP = @otp AND ExpiresAt > GETUTCDATE()`;
                
                const checkReq = new Request(checkQuery, async (err, rowCount) => {
                    if (err || rowCount === 0) {
                        connection.close();
                        return resolve({ status: 400, body: "Invalid or expired OTP." });
                    }

                    // 2. Hash Password
                    const hashedPassword = await bcrypt.hash(password, 10);

                    // 3. Insert User
                    const registerQuery = `
                        INSERT INTO Users (FullName, Email, PasswordHash, Role, IsVerified) 
                        OUTPUT INSERTED.UserId
                        VALUES (@name, @email, @pass, @role, 1);
                    `;

                    let newUserId = null;

                    const regReq = new Request(registerQuery, (err) => {
                        if (err) {
                            connection.close();
                            if (err.message.includes('Violation of UNIQUE KEY')) {
                                return resolve({ status: 409, body: "Email already registered." });
                            }
                            return resolve({ status: 500, body: "Registration DB Error." });
                        }

                        if (!newUserId) {
                            connection.close();
                            return resolve({ status: 500, body: "Registration failed: No ID returned." });
                        }

                        // --- CHANGE 1: PREPARE USER DATA FOR AUTO-LOGIN ---
                        const userData = { 
                            userId: newUserId, 
                            name: fullName, 
                            role: role 
                        };

                        // 4. If Seller, create Seller Profile
                        if (role === 'SELLER') {
                            const sellerQuery = `INSERT INTO Sellers (UserId, StoreName, IsApproved) VALUES (@uId, @sName, 0)`;
                            const sellerReq = new Request(sellerQuery, (err) => {
                                if (err) {
                                    connection.close();
                                    return resolve({ status: 500, body: "Failed to create Seller profile." });
                                }
                                // PASS userData HERE
                                finishRequest(connection, email, resolve, userData);
                            });
                            sellerReq.addParameter('uId', TYPES.Int, newUserId);
                            sellerReq.addParameter('sName', TYPES.VarChar, storeName);
                            connection.execSql(sellerReq);
                        } else {
                            // PASS userData HERE
                            finishRequest(connection, email, resolve, userData);
                        }
                    });

                    // Capture the New UserId
                    regReq.on('row', (columns) => {
                        newUserId = columns[0].value;
                    });

                    regReq.addParameter('name', TYPES.VarChar, fullName);
                    regReq.addParameter('email', TYPES.VarChar, email);
                    regReq.addParameter('pass', TYPES.VarChar, hashedPassword);
                    regReq.addParameter('role', TYPES.VarChar, role);
                    
                    connection.execSql(regReq);
                });

                checkReq.addParameter('email', TYPES.VarChar, email);
                checkReq.addParameter('otp', TYPES.VarChar, otp);
                connection.execSql(checkReq);
            });
            connection.connect();
        });
    }
});

// --- CHANGE 2: UPDATE HELPER TO RETURN JSON ---
function finishRequest(connection, email, resolve, userData) {
    const deleteOtpQuery = `DELETE FROM SignupOTPs WHERE Email = @email`;
    const delReq = new Request(deleteOtpQuery, () => {
        connection.close();
        
        // Return JSON with User Data (Auto-Login)
        resolve({ 
            status: 200, 
            jsonBody: {
                message: "Verified & Registered!",
                userId: userData.userId,
                name: userData.name,
                role: userData.role,
                token: "dummy-jwt-token" 
            } 
        });
    });
    delReq.addParameter('email', TYPES.VarChar, email);
    connection.execSql(delReq);
}