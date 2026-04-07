import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [newName, setNewName] = useState('');
    const [parentId, setParentId] = useState(''); // Used for the "Add" form
    const [isBulk, setIsBulk] = useState(false);
    const [loading, setLoading] = useState(false);

    // 🔥 NEW: State for the "Move" operation
    const [movingCategory, setMovingCategory] = useState(null);

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('http://localhost:7071/api/GetCategories');
            setCategories(res.data);
        } catch (err) { console.error(err); }
    };

    // --- API HANDLERS ---

    const handleAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = isBulk 
                ? { names: newName.split(/[,\n]/).map(n => n.trim()).filter(n => n !== ""), parentId: parentId ? parseInt(parentId) : null }
                : { name: newName, parentId: parentId ? parseInt(parentId) : null };

            await axios.post(`http://localhost:7071/api/AddCategory`, payload);
            setNewName('');
            fetchCategories();
        } catch (err) { alert(err.response?.data || err.message); }
        finally { setLoading(false); }
    };

    const handleRename = async (id, oldName) => {
        const name = window.prompt(`Rename "${oldName}" to:`, oldName);
        if (!name || name.trim() === oldName) return;
        try {
            await axios.post(`http://localhost:7071/api/UpdateCategory`, { categoryId: id, name: name.trim() });
            fetchCategories();
        } catch (err) { alert(err.response?.data || err.message); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`🚨 Are you sure you want to delete "${name}"?`)) return;
        try {
            // Using POST to send body data, mapping to your updated backend API
            await axios.post(`http://localhost:7071/api/DeleteCategory`, { categoryId: id });
            fetchCategories();
        } catch (err) { alert(err.response?.data || err.message); }
    };

    const handleMoveSubmit = async (newParentId) => {
        try {
            await axios.post(`http://localhost:7071/api/MoveCategory`, { 
                categoryId: movingCategory.categoryId, 
                newParentId: newParentId === 'ROOT' ? null : newParentId 
            });
            setMovingCategory(null);
            fetchCategories();
        } catch (err) { alert(err.response?.data || err.message); }
    };

    // --- UI HELPERS ---

    // Build the full tree for the Right Column Explorer
    const fullTree = useMemo(() => {
        const buildTree = (pid) => categories
            .filter(c => String(c.parentId) === String(pid) || (pid === null && !c.parentId))
            .map(c => ({ ...c, children: buildTree(c.categoryId) }));
        return buildTree(null);
    }, [categories]);

    // Safety check to prevent moving a folder into itself or its own children
    const isInvalidMoveTarget = (targetId, movingId) => {
        if (targetId === movingId) return true;
        let current = categories.find(c => c.categoryId === targetId);
        while (current) {
            if (current.parentId === movingId) return true;
            current = categories.find(c => c.categoryId === current.parentId);
        }
        return false;
    };

    // 🔥 RECURSIVE COMPONENT: The Interactive Tree Node with Minimize Support
    const TreeNode = ({ node }) => {
        // 🔥 FIX: Changed from true to false so it is collapsed by default!
        const [isExpanded, setIsExpanded] = useState(false); 
        
        const invalidTarget = movingCategory && isInvalidMoveTarget(node.categoryId, movingCategory.categoryId);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div style={{ marginLeft: '20px', borderLeft: '1px solid #ccc', paddingLeft: '10px', marginTop: '8px' }}>
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '8px 10px', background: 'white', border: '1px solid #eee', 
                    borderRadius: '6px', opacity: invalidTarget ? 0.5 : 1 
                }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Expand/Collapse Chevron (Only visible if it has children) */}
                        {hasChildren ? (
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#666', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {isExpanded ? '▼' : '▶'}
                            </button>
                        ) : (
                            <span style={{ width: '16px' }}></span> // Alignment spacer for leaves
                        )}

                        <span style={{ fontSize: '16px' }}>{node.isLeaf ? '🍃' : '📁'}</span>
                        
                        {/* Name - Also clickable to expand/collapse if it's a folder */}
                        <strong 
                            onClick={() => hasChildren && setIsExpanded(!isExpanded)}
                            style={{ color: node.isLeaf ? '#555' : '#007bff', cursor: hasChildren ? 'pointer' : 'default', userSelect: 'none' }}
                        >
                            {node.name}
                        </strong>
                        <span style={{ fontSize: '10px', color: '#999', background: '#f1f1f1', padding: '2px 6px', borderRadius: '10px' }}>Lvl {node.categoryLevel}</span>
                    </div>

                    {/* Actions Menu */}
                    {movingCategory ? (
                        <button 
                            disabled={invalidTarget}
                            onClick={() => handleMoveSubmit(node.categoryId)}
                            style={{ ...actionBtn, background: invalidTarget ? '#eee' : '#28a745', color: invalidTarget ? '#aaa' : 'white', border: 'none' }}>
                            {invalidTarget ? 'Invalid Target' : 'Move Here 🎯'}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => handleRename(node.categoryId, node.name)} title="Rename" style={actionBtn}>✏️</button>
                            <button onClick={() => setMovingCategory(node)} title="Move Category" style={actionBtn}>🚚</button>
                            <button onClick={() => handleDelete(node.categoryId, node.name)} title="Delete Category" style={{ ...actionBtn, color: '#dc3545' }}>🗑️</button>
                        </div>
                    )}
                </div>

                {/* Only render children if the folder is expanded */}
                {hasChildren && isExpanded && (
                    <div style={{ marginTop: '5px', animation: 'fadeIn 0.2s ease-in-out' }}>
                        {node.children.map(child => <TreeNode key={child.categoryId} node={child} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            
            {/* 🔥 MOVE MODE BANNER */}
            {movingCategory && (
                <div style={{ background: '#fff3cd', border: '2px solid #ffeeba', padding: '15px 25px', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#856404' }}>🚚 Move Mode Active</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Click a <b>"Move Here 🎯"</b> button in the directory to assign a new parent for <strong>{movingCategory.name}</strong>.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleMoveSubmit('ROOT')} style={{ padding: '10px 15px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Move to Root Level (Make Main)</button>
                        <button onClick={() => setMovingCategory(null)} style={{ padding: '10px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel Move</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '30px' }}>
                
                {/* --- LEFT COLUMN: ADD PANEL --- */}
                <div style={{ opacity: movingCategory ? 0.4 : 1, pointerEvents: movingCategory ? 'none' : 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, color: '#333' }}>➕ Add Categories</h2>
                        <button onClick={() => setIsBulk(!isBulk)} style={toggleBtn(isBulk)}>{isBulk ? '⚡ BULK MODE' : 'Single'}</button>
                    </div>

                    <form onSubmit={handleAdd} style={cardStyle}>
                        <label style={labelStyle}>Assign to Parent</label>
                        <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={inputStyle}>
                            <option value="">-- Main Root Level --</option>
                            {/* Flattened visual list for the dropdown */}
                            {categories.map(c => (
                                <option key={c.categoryId} value={c.categoryId}>
                                    {'\u00A0'.repeat((c.categoryLevel - 1) * 3)} {c.isLeaf ? '└ ' : '├ '} {c.name}
                                </option>
                            ))}
                        </select>

                        <label style={{ ...labelStyle, marginTop: '20px' }}>
                            {isBulk ? "Sub-Categories (Comma separated)" : "New Category Name"}
                        </label>
                        {isBulk ? (
                            <textarea placeholder="e.g. Cotton, Silk, Linen..." value={newName} onChange={(e) => setNewName(e.target.value)} style={{ ...inputStyle, height: '120px' }} required />
                        ) : (
                            <input placeholder="e.g. Premium Ethnic" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} required />
                        )}

                        <button type="submit" disabled={loading} style={saveBtn}>
                            {loading ? 'Creating...' : isBulk ? '🚀 Bulk Create Categories' : 'Create Category'}
                        </button>
                    </form>
                </div>

                {/* --- RIGHT COLUMN: LIVE DIRECTORY EXPLORER --- */}
                <div style={{ background: '#f8f9fa', borderRadius: '12px', border: '1px solid #ddd', padding: '25px', minHeight: '600px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
                    <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🌲 Directory Explorer</h2>
                    
                    {categories.length === 0 ? (
                        <p style={{ color: '#aaa', fontStyle: 'italic' }}>No categories found. Start building your hierarchy on the left.</p>
                    ) : (
                        <div style={{ background: 'white', padding: '20px 20px 20px 0', borderRadius: '8px', border: '1px solid #eee' }}>
                            {fullTree.map(rootNode => <TreeNode key={rootNode.categoryId} node={rootNode} />)}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Optional subtle keyframes for a smoother expand effect */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

// --- STYLES ---
const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '8px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
const saveBtn = { marginTop: '25px', width: '100%', padding: '14px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' };
const toggleBtn = (active) => ({ padding: '6px 12px', background: active ? '#28a745' : '#6c757d', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' });
const actionBtn = { background: '#f8f9fa', border: '1px solid #ddd', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease' };

export default CategoryManager;