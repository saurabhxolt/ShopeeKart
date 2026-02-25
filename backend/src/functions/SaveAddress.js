const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('SaveAddress', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const data = await request.json();
            
            if (!data.userId || !data.fullName || !data.addressLine) {
                return { status: 400, body: "Missing required fields." };
            }

            await sql.connect(process.env.SQL_CONNECTION);
            
            const query = `
                INSERT INTO SavedAddresses (UserId, FullName, Phone, Pincode, AddressLine, City, District, State)
                VALUES (@userId, @fullName, @phone, @pincode, @addressLine, @city, @district, @state)
            `;
            
            const dbReq = new sql.Request();
            dbReq.input('userId', sql.Int, parseInt(data.userId));
            dbReq.input('fullName', sql.NVarChar, data.fullName);
            dbReq.input('phone', sql.NVarChar, data.phone);
            dbReq.input('pincode', sql.NVarChar, data.pincode);
            dbReq.input('addressLine', sql.NVarChar, data.addressLine);
            dbReq.input('city', sql.NVarChar, data.city);
            dbReq.input('district', sql.NVarChar, data.district);
            dbReq.input('state', sql.NVarChar, data.state);
            
            await dbReq.query(query);

            return { status: 200, jsonBody: { message: "Address saved successfully!" } };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error saving address: " + err.message };
        }
    }
});