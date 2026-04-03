const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('DeleteAddress', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const data = await request.json();
            
            if (!data.addressId || !data.userId) {
                return { status: 400, body: "Missing required IDs." };
            }

            await sql.connect(process.env.SQL_CONNECTION);
            
            const query = `DELETE FROM SavedAddresses WHERE AddressId = @addressId AND UserId = @userId`;
            
            const dbReq = new sql.Request();
            dbReq.input('addressId', sql.Int, parseInt(data.addressId));
            dbReq.input('userId', sql.Int, parseInt(data.userId));
            
            await dbReq.query(query);
            return { status: 200, jsonBody: { message: "Address deleted successfully!" } };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error deleting address: " + err.message };
        }
    }
});