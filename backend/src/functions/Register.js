const { app } = require('@azure/functions');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

app.http('Register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { fullName, email, password, role, storeName } = await request.json();

            if (!email || !password) {
                return { status: 400, body: "Missing required fields" };
            }

            // Hash the password before it ever touches the database
            const hashedPassword = await bcrypt.hash(password, 10);

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // SMART SQL: Check if exists first, then insert
            // We use OUTPUT INSERTED.UserId to get the new ID back immediately
            const query = `
                IF EXISTS (SELECT 1 FROM Users WHERE Email = @email)
                BEGIN
                    SELECT 'DUPLICATE' AS Result;
                END
                ELSE
                BEGIN
                    INSERT INTO Users (FullName, Email, PasswordHash, Role) 
                    OUTPUT INSERTED.UserId AS Result
                    VALUES (@name, @email, @pwd, @role);
                    
                    DECLARE @NewUserId INT = SCOPE_IDENTITY();

                    -- If it's a seller, add to Sellers table too
                    IF (@role = 'SELLER')
                    BEGIN
                        INSERT INTO Sellers (UserId, StoreName, IsApproved)
                        VALUES (@NewUserId, @store, 0);
                    END
                END
            `;

            const dbResult = await pool.request()
                .input('name', sql.NVarChar, fullName)
                .input('email', sql.NVarChar, email)
                .input('pwd', sql.NVarChar, hashedPassword)
                .input('role', sql.NVarChar, role || 'BUYER')
                .input('store', sql.NVarChar, storeName || 'My Store')
                .query(query);

            const result = dbResult.recordset[0].Result;

            if (result === 'DUPLICATE') {
                return { status: 409, body: "This email is already registered." };
            } else {
                return { 
                    status: 201, 
                    jsonBody: { 
                        message: "User Created Successfully", 
                        userId: result 
                    } 
                };
            }

        } catch (error) {
            context.error("Registration Error:", error);
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});