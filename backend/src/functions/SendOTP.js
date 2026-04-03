const { app } = require('@azure/functions');
const sql = require('mssql');
const nodemailer = require('nodemailer');

// Define transporter once outside the handler
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'saurabhsonwal24@gmail.com', pass: 'siwhxzyqlmxeoskv' },
    tls: { rejectUnauthorized: false }
});

app.http('SendOTP', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { email, isReset } = await request.json();

            if (!email) {
                return { status: 400, body: "Email is required" };
            }

            // Connect to SQL using your environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 1. CHECK IF USER EXISTS
            const userCheck = await pool.request()
                .input('email', sql.VarChar, email)
                .query(`SELECT 1 FROM Users WHERE Email = @email`);

            const userExists = userCheck.recordset.length > 0;

            // CASE A: Registering (!isReset) but email is already taken
            if (!isReset && userExists) {
                return { status: 409, body: "Email already registered. Please login." };
            }

            // CASE B: Resetting password (isReset) but email doesn't exist
            if (isReset && !userExists) {
                return { status: 404, body: "Email not found. Please register." };
            }

            // 2. GENERATE OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // 3. UPSERT OTP (Insert or Update if exists)
            const upsertQuery = `
                IF EXISTS (SELECT 1 FROM SignupOTPs WHERE Email = @email)
                    UPDATE SignupOTPs SET OTP = @otp, ExpiresAt = DATEADD(minute, 10, GETUTCDATE()) WHERE Email = @email
                ELSE
                    INSERT INTO SignupOTPs (Email, OTP, ExpiresAt) VALUES (@email, @otp, DATEADD(minute, 10, GETUTCDATE()))
            `;

            await pool.request()
                .input('email', sql.VarChar, email)
                .input('otp', sql.VarChar, otp)
                .query(upsertQuery);

            // 4. SEND EMAIL
            await transporter.sendMail({
                from: '"ArivKart Support" <saurabhsonwal24@gmail.com>',
                to: email,
                subject: isReset ? 'Reset Your Password' : 'Your Verification Code',
                text: `Your code is: ${otp}. It expires in 10 minutes.`
            });

            return { status: 200, body: "OTP Sent" };

        } catch (error) {
            context.error("SendOTP Error:", error);
            return { status: 500, body: "Internal Server Error: " + error.message };
        }
    }
});