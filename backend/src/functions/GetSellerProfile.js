const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetSellerProfile', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userId = request.query.get('userId');

            if (!userId) {
                return { status: 400, body: "Missing userId" };
            }

            // Connect using your centralized environment variable
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // 🔥 UPDATED: Using SQL Aliases (AS camelCaseName) and ISNULL to handle all the 
            // empty string fallbacks natively in the database.
            const query = `
                SELECT 
                    ISNULL(StoreName, '') AS storeName, 
                    ISNULL(Description, '') AS description, 
                    ISNULL(SupportEmail, '') AS supportEmail, 
                    ISNULL(SupportPhone, '') AS supportPhone, 
                    ISNULL(PickupAddress, '') AS pickupAddress, 
                    ISNULL(GSTIN, '') AS gstin, 
                    ISNULL(BankAccount, '') AS bankAccount, 
                    ISNULL(IFSC, '') AS ifsc, 
                    ISNULL(StoreLogo, '') AS storeLogo, 
                    ISNULL(StoreBanner, '') AS storeBanner, 
                    ISNULL(VerificationDoc, '') AS verificationDoc,
                    ISNULL(SubscriptionPlan, 'Starter') AS [plan],
                    ISNULL(CommissionRate, 0.10) AS commissionRate,
                    ISNULL(PAN, '') AS pan, 
                    ISNULL(Aadhar, '') AS aadhar, 
                    ISNULL(PanDocUrl, '') AS panDoc, 
                    ISNULL(GstDocUrl, '') AS gstDoc, 
                    ISNULL(ChequeDocUrl, '') AS chequeDoc, 
                    ISNULL(SignatureUrl, '') AS signature
                FROM Sellers 
                WHERE UserId = @userId
            `;

            const result = await pool.request()
                .input('userId', sql.Int, parseInt(userId))
                .query(query);

            // Check if we actually found a profile
            if (result.recordset.length === 0) {
                return { status: 404, body: "Profile not found" };
            }

            // Because of our SQL aliases, recordset[0] is already the perfect JSON object
            return { status: 200, jsonBody: result.recordset[0] };

        } catch (error) {
            context.error("GetSellerProfile Error:", error);
            return { status: 500, body: "Database Error: " + error.message };
        }
    }
});