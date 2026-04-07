const { app } = require('@azure/functions');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('UpdateSellerProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            let { 
                userId, storeName, description, supportEmail, supportPhone, 
                pickupAddress, gstin, bankAccount, ifsc, storeLogo, storeBanner, 
                verificationDoc, pan, aadhar, panDoc, gstDoc, chequeDoc, signature,
                shopCategories 
            } = body;

            if (!userId) return { status: 400, body: "Missing userId" };

            // --- 1. AZURE BLOB STORAGE LOGIC ---
            const connectionString = process.env.AzureWebJobsStorage;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("seller-images");
            await containerClient.createIfNotExists({ access: 'blob' });

            const uploadToBlob = async (base64Str, prefix) => {
                if (!base64Str || base64Str.startsWith('http')) return base64Str; 
                const matches = base64Str.match(/^data:(.*);base64,(.+)$/);
                if (!matches || matches.length !== 3) return base64Str;

                const mimeType = matches[1];
                let extension = mimeType.split('/')[1];
                if (extension === 'jpeg') extension = 'jpg';
                if (mimeType === 'application/pdf') extension = 'pdf';

                const buffer = Buffer.from(matches[2], 'base64');
                const blobName = `${Date.now()}-${prefix}-user${userId}.${extension}`;
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);

                await blockBlobClient.uploadData(buffer, {
                    blobHTTPHeaders: { blobContentType: mimeType, blobContentDisposition: 'inline' }
                });

                return blockBlobClient.url;
            };

            storeLogo = await uploadToBlob(storeLogo, 'logo');
            storeBanner = await uploadToBlob(storeBanner, 'banner');
            panDoc = await uploadToBlob(panDoc, 'kyc-pan');
            gstDoc = await uploadToBlob(gstDoc, 'kyc-gst');
            chequeDoc = await uploadToBlob(chequeDoc, 'kyc-cheque');
            signature = await uploadToBlob(signature, 'kyc-signature');

            let finalKycUrls = [];
            if (verificationDoc && Array.isArray(verificationDoc)) {
                for (let i = 0; i < verificationDoc.length; i++) {
                    const uploadedUrl = await uploadToBlob(verificationDoc[i], `kyc-legacy-${i}`);
                    if (uploadedUrl) finalKycUrls.push(uploadedUrl);
                }
            }
            const verificationDocString = JSON.stringify(finalKycUrls);

            // --- 2. SQL DATABASE UPDATE ---
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            let categoriesArray = [];
            try { categoriesArray = typeof shopCategories === 'string' ? JSON.parse(shopCategories) : shopCategories; } 
            catch (e) { categoriesArray = []; }

            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const updateQuery = `
                    UPDATE Sellers 
                    SET StoreName = @storeName, Description = @description, SupportEmail = @supportEmail, 
                        SupportPhone = @supportPhone, PickupAddress = @pickupAddress, GSTIN = @gstin, 
                        BankAccount = @bankAccount, IFSC = @ifsc, StoreLogo = @storeLogo, StoreBanner = @storeBanner, 
                        VerificationDoc = @verificationDoc, PAN = @pan, Aadhar = @aadhar, PanDocUrl = @panDoc,
                        GstDocUrl = @gstDoc, ChequeDocUrl = @chequeDoc, SignatureUrl = @signature,
                        IsApproved = 0
                    OUTPUT INSERTED.SellerId
                    WHERE UserId = @userId
                `;

                const updateRes = await new sql.Request(transaction)
                    .input('userId', sql.Int, parseInt(userId))
                    .input('storeName', sql.VarChar, storeName || null)
                    .input('description', sql.NVarChar, description || null)
                    .input('supportEmail', sql.VarChar, supportEmail || null)
                    .input('supportPhone', sql.VarChar, supportPhone || null)
                    .input('pickupAddress', sql.NVarChar, pickupAddress || null)
                    .input('gstin', sql.VarChar, gstin || null)
                    .input('bankAccount', sql.VarChar, bankAccount || null)
                    .input('ifsc', sql.VarChar, ifsc || null)
                    .input('storeLogo', sql.VarChar, storeLogo || null)
                    .input('storeBanner', sql.VarChar, storeBanner || null)
                    .input('verificationDoc', sql.NVarChar, verificationDocString)
                    .input('pan', sql.VarChar, pan || null)
                    .input('aadhar', sql.VarChar, aadhar || null)
                    .input('panDoc', sql.NVarChar, panDoc || null)
                    .input('gstDoc', sql.NVarChar, gstDoc || null)
                    .input('chequeDoc', sql.NVarChar, chequeDoc || null)
                    .input('signature', sql.NVarChar, signature || null)
                    .query(updateQuery);

                if (updateRes.recordset.length === 0) throw new Error("Seller record not found for this User ID.");

                const sellerId = updateRes.recordset[0].SellerId;

                await new sql.Request(transaction)
                    .input('sid', sql.Int, sellerId)
                    .query(`DELETE FROM SellerCategories WHERE SellerId = @sid`);

                // 🔥 THE FIX IS RIGHT HERE 🔥
                if (categoriesArray && categoriesArray.length > 0) {
                    for (let cat of categoriesArray) {
                        const numericCatId = parseInt(cat, 10);

                        // If it's a legacy string like "clothing", skip it to prevent NULL crashes
                        if (isNaN(numericCatId)) {
                            context.log(`Skipped invalid/legacy category format: ${cat}`);
                            continue; 
                        }

                        await new sql.Request(transaction)
                            .input('sid', sql.Int, sellerId)
                            .input('cid', sql.Int, numericCatId) 
                            .query(`INSERT INTO SellerCategories (SellerId, CategoryId) VALUES (@sid, @cid)`);
                    }
                }

                await transaction.commit();
                return { status: 200, body: "Profile updated successfully" };

            } catch (dbError) {
                context.error("🚨 REAL SQL ERROR:", dbError.message);
                try { await transaction.rollback(); } catch (e) { /* ignore EABORT */ }
                return { status: 500, body: "Database Error: " + dbError.message };
            }

        } catch (error) {
            context.error("UpdateSellerProfile Error:", error);
            return { status: 500, body: "Server Error: " + error.message };
        }
    }
});