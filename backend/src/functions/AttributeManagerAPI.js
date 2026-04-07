const { app } = require('@azure/functions');
const sql = require('mssql');

// 1. GET ALL ATTRIBUTES & MAPPINGS
app.http('GetMasterAttributes', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const categoryId = request.query.get('categoryId');
            const pool = await sql.connect(process.env.SQL_CONNECTION);

            const attrResult = await pool.request().query('SELECT * FROM Attributes WHERE IsActive = 1');
            // Fetch HexCode from DB
            const optResult = await pool.request().query('SELECT AttributeId, Value, HexCode FROM AttributeOptions WHERE IsActive = 1');
            
            const attributes = attrResult.recordset.map(attr => ({
                ...attr,
                options: optResult.recordset.filter(opt => opt.AttributeId === attr.AttributeId)
            }));

            let mappings = [];
            if (categoryId) {
                const mapResult = await pool.request()
                    .input('cid', sql.Int, parseInt(categoryId))
                    .query('SELECT AttributeId, IsRequired FROM CategoryAttributeMapping WHERE CategoryId = @cid');
                mappings = mapResult.recordset;
            }

            return { status: 200, jsonBody: { attributes, mappings } };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});

// 2. CREATE NEW MASTER ATTRIBUTE
app.http('CreateAttribute', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { name, inputType, options, allowMultiple } = await request.json(); 
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const attrRes = await new sql.Request(transaction)
                    .input('name', sql.NVarChar, name)
                    .input('type', sql.VarChar, inputType)
                    .input('allowMulti', sql.Bit, allowMultiple ? 1 : 0)
                    .query(`INSERT INTO Attributes (Name, InputType, AllowMultiple, IsActive) 
                            OUTPUT INSERTED.AttributeId VALUES (@name, @type, @allowMulti, 1)`);
                
                const newAttrId = attrRes.recordset[0].AttributeId;

                if (options && options.length > 0) {
                    for (let i = 0; i < options.length; i++) {
                        const opt = options[i];
                        // Handle both simple strings and objects {value, hexCode}
                        const val = typeof opt === 'object' ? opt.value : opt;
                        const hex = typeof opt === 'object' ? opt.hexCode : null;

                        await new sql.Request(transaction)
                            .input('aid', sql.Int, newAttrId)
                            .input('val', sql.NVarChar, val.trim())
                            .input('hex', sql.VarChar, hex || null)
                            .input('sort', sql.Int, i + 1)
                            .query(`INSERT INTO AttributeOptions (AttributeId, Value, HexCode, SortOrder, IsActive) 
                                    VALUES (@aid, @val, @hex, @sort, 1)`);
                    }
                }

                await transaction.commit();
                return { status: 201, body: "Attribute created successfully!" };
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});

// 3. SAVE CATEGORY MAPPING (No changes needed)
app.http('SaveCategoryMapping', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { categoryId, mappedAttributes } = await request.json();
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                await new sql.Request(transaction).input('cid', sql.Int, categoryId).query(`DELETE FROM CategoryAttributeMapping WHERE CategoryId = @cid`);
                for (const map of mappedAttributes) {
                    await new sql.Request(transaction).input('cid', sql.Int, categoryId).input('aid', sql.Int, map.attributeId).input('req', sql.Bit, map.isRequired ? 1 : 0).query(`INSERT INTO CategoryAttributeMapping (CategoryId, AttributeId, IsRequired) VALUES (@cid, @aid, @req)`);
                }
                await transaction.commit();
                return { status: 200, body: "Category rules updated!" };
            } catch (err) { await transaction.rollback(); throw err; }
        } catch (error) { return { status: 500, body: error.message }; }
    }
});

// 4. ADD NEW OPTIONS TO AN EXISTING ATTRIBUTE
app.http('UpdateAttributeOptions', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { attributeId, newOptions } = await request.json();
            if (!attributeId || !newOptions || newOptions.length === 0) return { status: 400, body: "Missing data" };

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const sortRes = await new sql.Request(transaction).input('aid', sql.Int, attributeId).query(`SELECT ISNULL(MAX(SortOrder), 0) as MaxSort FROM AttributeOptions WHERE AttributeId = @aid`);
                let currentSort = sortRes.recordset[0].MaxSort;

                for (const opt of newOptions) {
                    // 🔥 FIX: Handle objects {value, hexCode} or strings
                    const val = typeof opt === 'object' ? opt.value : opt;
                    const hex = typeof opt === 'object' ? opt.hexCode : null;

                    if (val && val.trim() !== '') {
                        currentSort++;
                        await new sql.Request(transaction)
                            .input('aid', sql.Int, attributeId)
                            .input('val', sql.NVarChar, val.trim())
                            .input('hex', sql.VarChar, hex || null)
                            .input('sort', sql.Int, currentSort)
                            .query(`INSERT INTO AttributeOptions (AttributeId, Value, HexCode, SortOrder, IsActive) 
                                    VALUES (@aid, @val, @hex, @sort, 1)`);
                    }
                }
                await transaction.commit();
                return { status: 200, body: "Options added!" };
            } catch (err) { await transaction.rollback(); throw err; }
        } catch (error) { return { status: 500, body: error.message }; }
    }
});

// 5. EDIT AN EXISTING OPTION
app.http('EditAttributeOption', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { attributeId, oldValue, newValue, hexCode } = await request.json();
            if (!attributeId || !oldValue || !newValue) return { status: 400, body: "Missing data" };

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            
            // 🔥 UPDATE: Now saves HexCode during edit
            await pool.request()
                .input('aid', sql.Int, attributeId)
                .input('oldVal', sql.NVarChar, oldValue)
                .input('newVal', sql.NVarChar, newValue)
                .input('hex', sql.VarChar, hexCode || null)
                .query(`UPDATE AttributeOptions 
                        SET Value = @newVal, HexCode = @hex 
                        WHERE AttributeId = @aid AND Value = @oldVal`);

            return { status: 200, body: "Option updated successfully!" };
        } catch (error) { return { status: 500, body: error.message }; }
    }
});

// 6. DELETE AN OPTION (No changes needed)
app.http('DeleteAttributeOption', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { attributeId, value } = await request.json();
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            await pool.request().input('aid', sql.Int, attributeId).input('val', sql.NVarChar, value).query(`DELETE FROM AttributeOptions WHERE AttributeId = @aid AND Value = @val`);
            return { status: 200, body: "Option removed" };
        } catch (error) { return { status: 500, body: error.message }; }
    }
});

// 7. UPDATE MASTER ATTRIBUTE (No changes needed)
app.http('UpdateMasterAttribute', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { attributeId, name, allowMultiple } = await request.json();
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            await pool.request().input('aid', sql.Int, attributeId).input('name', sql.NVarChar, name).input('multi', sql.Bit, allowMultiple ? 1 : 0).query(`UPDATE Attributes SET Name = @name, AllowMultiple = @multi WHERE AttributeId = @aid`);
            return { status: 200, body: "Attribute updated" };
        } catch (error) { return { status: 500, body: error.message }; }
    }
});

// 8. DELETE MASTER ATTRIBUTE (No changes needed)
app.http('DeleteMasterAttribute', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const id = request.query.get('id');
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const check = await pool.request().input('id', sql.Int, id).query(`SELECT COUNT(*) as count FROM CategoryAttributeMapping WHERE AttributeId = @id`);
            if (check.recordset[0].count > 0) return { status: 400, body: "Attribute is in use." };
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                await new sql.Request(transaction).input('id', sql.Int, id).query(`DELETE FROM AttributeOptions WHERE AttributeId = @id`);
                await new sql.Request(transaction).input('id', sql.Int, id).query(`DELETE FROM Attributes WHERE AttributeId = @id`);
                await transaction.commit();
                return { status: 200, body: "Attribute deleted" };
            } catch (e) { await transaction.rollback(); throw e; }
        } catch (error) { return { status: 500, body: error.message }; }
    }
});