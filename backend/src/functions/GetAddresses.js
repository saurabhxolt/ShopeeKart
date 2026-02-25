const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetAddresses', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const userId = request.query.get('userId');
            
            if (!userId) {
                return { status: 400, body: "User ID is required." };
            }

            await sql.connect(process.env.SQL_CONNECTION);
            
            const query = `
                SELECT AddressId, FullName, Phone, Pincode, AddressLine, City, District, State 
                FROM SavedAddresses 
                WHERE UserId = @userId
                ORDER BY AddressId DESC
            `;
            
            const dbReq = new sql.Request();
            dbReq.input('userId', sql.Int, parseInt(userId));
            const result = await dbReq.query(query);

            return { status: 200, jsonBody: result.recordset };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error fetching addresses: " + err.message };
        }
    }
});