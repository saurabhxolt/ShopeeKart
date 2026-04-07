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

            const pool = await sql.connect(process.env.SQL_CONNECTION);

            // --- 1. Fetch Basic Seller Info ---
            const sellerQuery = `
                SELECT 
                    SellerId, 
                    UserId AS userId, 
                    IsApproved AS isApproved,
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

            const sellerResult = await pool.request()
                .input('userId', sql.Int, parseInt(userId))
                .query(sellerQuery);

            if (sellerResult.recordset.length === 0) {
                return { status: 404, body: "Profile not found" };
            }

            const sellerProfile = sellerResult.recordset[0];

            // --- 2. Fetch Normalized Categories ---
            const catQuery = `
                SELECT CategoryId 
                FROM SellerCategories 
                WHERE SellerId = @sellerId
            `;

            const catResult = await pool.request()
                .input('sellerId', sql.Int, sellerProfile.SellerId)
                .query(catQuery);

            // 🔥 Map to Numbers so React checkboxes work perfectly
            sellerProfile.shopCategories = catResult.recordset.map(row => parseInt(row.CategoryId, 10));

            // Clean up the SellerId so we don't expose primary keys unnecessarily
            delete sellerProfile.SellerId;

            return { status: 200, jsonBody: sellerProfile };

        } catch (error) {
            context.error("GetSellerProfile Error:", error);
            return { status: 500, body: "Database Error: " + error.message };
        }
    }
});