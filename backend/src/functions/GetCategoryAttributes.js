const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetCategoryAttributes', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const categoryId = request.query.get('categoryId');
            if (!categoryId) return { status: 400, body: "Missing categoryId" };

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            
            // 1. Fetch mapped attributes including AllowMultiple
            const attrResult = await pool.request()
                .input('cid', sql.Int, parseInt(categoryId))
                .query(`
                    SELECT a.AttributeId, a.Name, a.InputType, a.AllowMultiple, cam.IsRequired 
                    FROM Attributes a 
                    INNER JOIN CategoryAttributeMapping cam ON a.AttributeId = cam.AttributeId 
                    WHERE cam.CategoryId = @cid AND a.IsActive = 1
                `);
                
            const attributes = attrResult.recordset;
            
            // 2. Attach options for Dropdowns and ColorSwatches
            for (let attr of attributes) {
                if (attr.InputType === 'Dropdown' || attr.InputType === 'ColorSwatch') {
                    const optRes = await pool.request()
                        .input('aid', sql.Int, attr.AttributeId)
                        // 🔥 FIX: Added HexCode to the SELECT statement below
                        .query(`SELECT Value, HexCode FROM AttributeOptions WHERE AttributeId = @aid AND IsActive = 1 ORDER BY SortOrder`);
                    attr.options = optRes.recordset;
                } else {
                    attr.options = [];
                }
            }
            
            return { status: 200, jsonBody: attributes };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});