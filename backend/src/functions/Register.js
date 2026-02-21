const { app } = require('@azure/functions');
const { Connection, Request } = require('tedious');
const bcrypt = require('bcryptjs');

const config = {
    server: 'localhost', 
    authentication: { type: 'default', options: { userName: 'ecommerce_user', password: 'password123' } },
    options: { encrypt: false, database: 'EcommerceDB', trustServerCertificate: true }
};

app.http('Register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const { fullName, email, password, role, storeName } = await request.json();

        if (!email || !password) return { status: 400, body: "Missing fields" };

        const hashedPassword = await bcrypt.hash(password, 10);

        // SMART SQL: Check if exists first, then insert
        const query = `
            IF EXISTS (SELECT 1 FROM Users WHERE Email = @email)
            BEGIN
                SELECT 'DUPLICATE' AS Result;
            END
            ELSE
            BEGIN
                INSERT INTO Users (FullName, Email, PasswordHash, Role) 
                OUTPUT INSERTED.UserId 
                VALUES (@name, @email, @pwd, @role);
                
                -- If it's a seller, add to Sellers table too
                IF (@role = 'SELLER')
                BEGIN
                    DECLARE @NewId INT = SCOPE_IDENTITY();
                    INSERT INTO Sellers (UserId, StoreName, IsApproved)
                    VALUES (@NewId, @store, 0);
                END
            END
        `;

        return new Promise((resolve) => {
            const connection = new Connection(config);
            connection.on('connect', (err) => {
                if (err) { resolve({ status: 500, body: "DB Connection Error" }); return; }

                const req = new Request(query, (err) => {
                    if (err) resolve({ status: 500, body: "Query Failed" });
                    connection.close();
                });

                req.addParameter('name', require('tedious').TYPES.NVarChar, fullName);
                req.addParameter('email', require('tedious').TYPES.NVarChar, email);
                req.addParameter('pwd', require('tedious').TYPES.NVarChar, hashedPassword);
                req.addParameter('role', require('tedious').TYPES.NVarChar, role || 'BUYER');
                req.addParameter('store', require('tedious').TYPES.NVarChar, storeName || 'My Store');

                req.on('row', (columns) => {
                    const result = columns[0].value;
                    
                    if (result === 'DUPLICATE') {
                        // Return 409 (Conflict) so the frontend knows what to say
                        resolve({ status: 409, body: "This email is already registered." });
                    } else {
                        resolve({ status: 201, body: { message: "User Created", userId: result } });
                    }
                });

                connection.execSql(req);
            });
            connection.connect();
        });
    }
});