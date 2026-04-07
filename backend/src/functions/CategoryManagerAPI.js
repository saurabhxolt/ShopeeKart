const { app } = require('@azure/functions');
const sql = require('mssql');

// ============================================================================
// 1. SMART ADD CATEGORY (Handles both Single and Bulk Array inserts)
// ============================================================================
app.http('AddCategory', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const parentId = body.parentId;
            
            // Normalize inputs: convert single 'name' into an array, or use 'names' array
            let namesToProcess = [];
            if (body.names && Array.isArray(body.names)) {
                namesToProcess = body.names;
            } else if (body.name && typeof body.name === 'string') {
                namesToProcess = [body.name];
            }

            if (namesToProcess.length === 0) {
                return { status: 400, body: "Please provide a 'name' (string) or 'names' (array)." };
            }

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                let categoryLevel = 1;
                
                // Calculate Level & Update Parent
                if (parentId) {
                    const parentRes = await new sql.Request(transaction)
                        .input('pid', sql.Int, parentId)
                        .query(`SELECT CategoryLevel FROM Categories WHERE CategoryId = @pid`);
                    
                    if (parentRes.recordset.length > 0) {
                        categoryLevel = parentRes.recordset[0].CategoryLevel + 1;
                        
                        // Update Parent: It is no longer a "Leaf" because it now has children
                        await new sql.Request(transaction)
                            .input('pid', sql.Int, parentId)
                            .query(`UPDATE Categories SET IsLeaf = 0 WHERE CategoryId = @pid`);
                    }
                }

                // Loop through the array and insert
                for (const catName of namesToProcess) {
                    const cleanName = catName.trim();
                    if (!cleanName) continue;

                    await new sql.Request(transaction)
                        .input('name', sql.NVarChar, cleanName)
                        .input('pid', sql.Int, parentId || null)
                        .input('level', sql.Int, categoryLevel)
                        .query(`
                            INSERT INTO Categories (Name, ParentId, IsActive, CategoryLevel, IsLeaf)
                            VALUES (@name, @pid, 1, @level, 1)
                        `);
                }

                await transaction.commit();
                return { status: 201, body: `Successfully added ${namesToProcess.length} category/categories.` };

            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            context.error("AddCategory Error:", error);
            return { status: 500, body: error.message };
        }
    }
});

// ============================================================================
// 2. GET CATEGORIES
// ============================================================================
app.http('GetCategories', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const result = await pool.request().query(`
                SELECT CategoryId as categoryId, Name as name, ParentId as parentId, 
                       CategoryLevel as categoryLevel, IsLeaf as isLeaf 
                FROM Categories 
                WHERE IsActive = 1
                ORDER BY CategoryLevel ASC, Name ASC
            `);
            
            return { status: 200, jsonBody: result.recordset };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});

// ============================================================================
// 3. UPDATE CATEGORY (Rename or Change Active Status)
// ============================================================================
app.http('UpdateCategory', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { categoryId, name, isActive } = await request.json();

            if (!categoryId || !name) {
                return { status: 400, body: "CategoryId and Name are required." };
            }

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            await pool.request()
                .input('cid', sql.Int, categoryId)
                .input('name', sql.NVarChar, name.trim())
                .input('isActive', sql.Bit, isActive !== undefined ? isActive : 1)
                .query(`
                    UPDATE Categories 
                    SET Name = @name, IsActive = @isActive 
                    WHERE CategoryId = @cid
                `);

            return { status: 200, body: "Category updated successfully." };
        } catch (error) {
            context.error("UpdateCategory Error:", error);
            return { status: 500, body: error.message };
        }
    }
});

// ============================================================================
// 4. SMART DELETE CATEGORY (With 3-Layer Safety Guards)
// ============================================================================
app.http('DeleteCategory', {
    methods: ['DELETE', 'POST'], 
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const categoryId = request.query.get('id') || (request.body ? (await request.json()).categoryId : null);
            if (!categoryId) return { status: 400, body: "CategoryId is required." };

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                // Get Parent Info
                const catInfoRes = await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .query(`SELECT ParentId FROM Categories WHERE CategoryId = @cid`);
                
                if (catInfoRes.recordset.length === 0) {
                    await transaction.rollback();
                    return { status: 404, body: "Category not found." };
                }
                const parentId = catInfoRes.recordset[0].ParentId;

                // 🛡️ GUARD 1: Prevent deleting if it has Sub-Categories
                const childCheck = await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .query(`SELECT COUNT(*) as count FROM Categories WHERE ParentId = @cid`);
                if (childCheck.recordset[0].count > 0) {
                    await transaction.rollback();
                    return { status: 400, body: "Cannot delete: This category contains sub-categories." };
                }

                // 🛡️ GUARD 2: Prevent deleting if it has Master Attributes mapped to it
                const mappingCheck = await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .query(`SELECT COUNT(*) as count FROM CategoryAttributeMapping WHERE CategoryId = @cid`);
                if (mappingCheck.recordset[0].count > 0) {
                    await transaction.rollback();
                    return { status: 400, body: "Cannot delete: Unmap all EAV attributes from this category first." };
                }

                // 🛡️ GUARD 3: Prevent deleting if Sellers have active Products in it
                const productCheck = await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .query(`SELECT COUNT(*) as count FROM Products WHERE CategoryId = @cid`);
                if (productCheck.recordset[0].count > 0) {
                    await transaction.rollback();
                    return { status: 400, body: `Cannot delete: There are ${productCheck.recordset[0].count} products currently in this category. Reassign or delete them first.` };
                }

                // Proceed with Deletion
                await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .query(`DELETE FROM Categories WHERE CategoryId = @cid`);

                // Smart Parent Cleanup: If parent is now empty, turn it back into a Leaf!
                if (parentId) {
                    const siblingCheck = await new sql.Request(transaction)
                        .input('pid', sql.Int, parentId)
                        .query(`SELECT COUNT(*) as count FROM Categories WHERE ParentId = @pid`);
                    
                    if (siblingCheck.recordset[0].count === 0) {
                        await new sql.Request(transaction)
                            .input('pid', sql.Int, parentId)
                            .query(`UPDATE Categories SET IsLeaf = 1 WHERE CategoryId = @pid`);
                    }
                }

                await transaction.commit();
                return { status: 200, body: "Category deleted successfully." };

            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            context.error("DeleteCategory Error:", error);
            return { status: 500, body: error.message };
        }
    }
});

// ============================================================================
// 5. MOVE CATEGORY (Recursive Tree Re-parenting)
// ============================================================================
app.http('MoveCategory', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const { categoryId, newParentId } = await request.json();
            
            if (!categoryId) return { status: 400, body: "CategoryId is required to move." };
            if (categoryId === newParentId) return { status: 400, body: "Cannot move a category into itself." };

            const pool = await sql.connect(process.env.SQL_CONNECTION);
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                // 1. Get current info and new parent info
                const currentRes = await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .query(`SELECT ParentId, CategoryLevel FROM Categories WHERE CategoryId = @cid`);
                
                let newLevel = 1;
                if (newParentId) {
                    const newParentRes = await new sql.Request(transaction)
                        .input('npid', sql.Int, newParentId)
                        .query(`SELECT CategoryLevel FROM Categories WHERE CategoryId = @npid`);
                    if (newParentRes.recordset.length > 0) {
                        newLevel = newParentRes.recordset[0].CategoryLevel + 1;
                    }
                }

                if (currentRes.recordset.length === 0) throw new Error("Category not found");
                
                const oldParentId = currentRes.recordset[0].ParentId;
                const levelOffset = newLevel - currentRes.recordset[0].CategoryLevel;

                // 2. Update the category and ALL its descendants' levels recursively
                await new sql.Request(transaction)
                    .input('cid', sql.Int, categoryId)
                    .input('npid', sql.Int, newParentId || null)
                    .input('offset', sql.Int, levelOffset)
                    .query(`
                        UPDATE Categories 
                        SET ParentId = @npid, 
                            CategoryLevel = CategoryLevel + @offset 
                        WHERE CategoryId = @cid;

                        WITH Descendants AS (
                            SELECT CategoryId FROM Categories WHERE ParentId = @cid
                            UNION ALL
                            SELECT c.CategoryId FROM Categories c 
                            INNER JOIN Descendants d ON c.ParentId = d.CategoryId
                        )
                        UPDATE Categories 
                        SET CategoryLevel = CategoryLevel + @offset 
                        WHERE CategoryId IN (SELECT CategoryId FROM Descendants);
                    `);

                // 3. Mark New Parent as NOT a leaf
                if (newParentId) {
                    await new sql.Request(transaction)
                        .input('npid', sql.Int, newParentId)
                        .query(`UPDATE Categories SET IsLeaf = 0 WHERE CategoryId = @npid`);
                }

                // 4. Check if Old Parent is now empty (make it a leaf again)
                if (oldParentId) {
                    const childCount = await new sql.Request(transaction)
                        .input('opid', sql.Int, oldParentId)
                        .query(`SELECT COUNT(*) as count FROM Categories WHERE ParentId = @opid`);
                    
                    if (childCount.recordset[0].count === 0) {
                        await new sql.Request(transaction)
                            .input('opid', sql.Int, oldParentId)
                            .query(`UPDATE Categories SET IsLeaf = 1 WHERE CategoryId = @opid`);
                    }
                }

                await transaction.commit();
                return { status: 200, body: "Category moved successfully." };
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            context.error("MoveCategory Error:", error);
            return { status: 500, body: error.message };
        }
    }
});