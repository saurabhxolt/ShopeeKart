const { app } = require('@azure/functions');
const { Connection, Request, TYPES } = require('tedious');
const nodemailer = require('nodemailer');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'saurabhsonwal24@gmail.com', pass: 'siwhxzyqlmxeoskv' },
    tls: { rejectUnauthorized: false }
});

app.http('SendOTP', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        // 1. GET THE isReset FLAG
        const { email, isReset } = await request.json();

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', async (err) => {
                if (err) return resolve({ status: 500, body: "DB Error" });

                // --- HELPER FUNCTION: GENERATE & SEND OTP ---
                // We define this here so we can call it from two different places below
                const sendOtpLogic = () => {
                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    
                    const query = `
                        IF EXISTS (SELECT 1 FROM SignupOTPs WHERE Email = @email)
                            UPDATE SignupOTPs SET OTP = @otp, ExpiresAt = DATEADD(minute, 10, GETUTCDATE()) WHERE Email = @email
                        ELSE
                            INSERT INTO SignupOTPs (Email, OTP, ExpiresAt) VALUES (@email, @otp, DATEADD(minute, 10, GETUTCDATE()))
                    `;

                    const saveReq = new Request(query, async (err) => {
                        connection.close();
                        if (err) return resolve({ status: 500, body: "SQL Error" });

                        try {
                            await transporter.sendMail({
                                from: '"My Marketplace" <saurabhsonwal24@gmail.com>',
                                to: email,
                                subject: isReset ? 'Reset Your Password' : 'Your Verification Code',
                                text: `Your code is: ${otp}. It expires in 10 minutes.`
                            });
                            resolve({ status: 200, body: "OTP Sent" });
                        } catch (mailErr) {
                            console.error(mailErr);
                            resolve({ status: 500, body: "Email failed." });
                        }
                    });

                    saveReq.addParameter('email', TYPES.VarChar, email);
                    saveReq.addParameter('otp', TYPES.VarChar, otp);
                    connection.execSql(saveReq);
                };

                // --- 2. LOGIC BRANCHING ---
                
                // CASE A: REGISTERING (isReset is false/undefined) -> Block existing users
                if (!isReset) {
                    const checkUserQuery = `SELECT 1 FROM Users WHERE Email = @email`;
                    const checkReq = new Request(checkUserQuery, (err, rowCount) => {
                        if (rowCount > 0) {
                            connection.close();
                            return resolve({ status: 409, body: "Email already registered. Please login." });
                        }
                        // User is new, proceed
                        sendOtpLogic();
                    });
                    checkReq.addParameter('email', TYPES.VarChar, email);
                    connection.execSql(checkReq);
                } 
                
                // CASE B: RESET PASSWORD (isReset is true) -> Must be an existing user
                else {
                    const checkUserQuery = `SELECT 1 FROM Users WHERE Email = @email`;
                    const checkReq = new Request(checkUserQuery, (err, rowCount) => {
                        if (rowCount === 0) {
                            connection.close();
                            // Don't let people reset passwords for emails that don't exist!
                            return resolve({ status: 404, body: "Email not found. Please register." });
                        }
                        // User exists, allow reset OTP
                        sendOtpLogic();
                    });
                    checkReq.addParameter('email', TYPES.VarChar, email);
                    connection.execSql(checkReq);
                }
            });
            connection.connect();
        });
    }
});