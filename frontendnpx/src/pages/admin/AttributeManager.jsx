import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const AttributeManager = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [masterAttributes, setMasterAttributes] = useState([]);
    const [categoryMappings, setCategoryMappings] = useState([]);
    
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('Dropdown');
    const [newOptions, setNewOptions] = useState(''); 
    const [newAllowMultiple, setNewAllowMultiple] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get('http://localhost:7071/api/GetCategories')
            .then(res => setCategories(res.data))
            .catch(err => console.error(err));
    }, []);

    // 🔥 NEW: Build the nested tree instead of a flat list
    const fullTree = useMemo(() => {
        if (!categories.length) return [];
        const buildTree = (pid) => categories
            .filter(c => String(c.parentId) === String(pid) || (pid === null && !c.parentId))
            .map(c => ({ ...c, children: buildTree(c.categoryId) }));
        return buildTree(null);
    }, [categories]);

    const fetchData = async () => {
        if (!selectedCategoryId) return;
        setLoading(true);
        try {
            const url = `http://localhost:7071/api/GetMasterAttributes?categoryId=${selectedCategoryId}`;
            const res = await axios.get(url);
            setMasterAttributes(res.data.attributes);
            setCategoryMappings(res.data.mappings.map(m => m.AttributeId));
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    // Also fetch raw master attributes when no category is selected just to populate the right side
    const fetchAllAttributes = async () => {
        try {
            const res = await axios.get('http://localhost:7071/api/GetMasterAttributes');
            setMasterAttributes(res.data.attributes);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { 
        if (selectedCategoryId) fetchData(); 
        else fetchAllAttributes();
    }, [selectedCategoryId]);

    // --- ACTIONS ---

    const handleCreateAttribute = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const optionsArray = ['Dropdown', 'ColorSwatch'].includes(newType) ? newOptions.split(',').filter(o => o.trim() !== '') : [];
            await axios.post('http://localhost:7071/api/CreateAttribute', {
                name: newName, inputType: newType, options: optionsArray, allowMultiple: newAllowMultiple 
            });
            setNewName(''); setNewOptions(''); setNewAllowMultiple(false);
            selectedCategoryId ? fetchData() : fetchAllAttributes(); 
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    };

    const handleRenameAttribute = async (id, oldName, multi) => {
        const name = window.prompt(`Rename Attribute "${oldName}":`, oldName);
        if (!name || name === oldName) return;
        try {
            await axios.post('http://localhost:7071/api/UpdateMasterAttribute', { attributeId: id, name, allowMultiple: multi });
            selectedCategoryId ? fetchData() : fetchAllAttributes();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteAttribute = async (id, name) => {
        if (!window.confirm(`PERMANENT DELETE: "${name}"? This will remove all options. (Will fail if mapped to categories)`)) return;
        try {
            await axios.delete(`http://localhost:7071/api/DeleteMasterAttribute?id=${id}`);
            selectedCategoryId ? fetchData() : fetchAllAttributes();
        } catch (err) { alert(err.response?.data || err.message); }
    };

    const handleEditOption = async (attributeId, oldValue, currentHex, inputType) => {
        const newValue = window.prompt(`Edit name for "${oldValue}":`, oldValue);
        if (!newValue) return;

        let newHex = currentHex;
        if (inputType === 'ColorSwatch') {
            newHex = window.prompt(`Edit Hex Code for "${newValue}":`, currentHex || "#000000");
            if (!newHex) return;
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:7071/api/EditAttributeOption', { 
                attributeId, oldValue, newValue: newValue.trim(), hexCode: newHex 
            });
            selectedCategoryId ? fetchData() : fetchAllAttributes();
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    };

    const handleDeleteOption = async (attributeId, value) => {
        if (!window.confirm(`Remove "${value}" from the list?`)) return;
        try {
            await axios.post('http://localhost:7071/api/DeleteAttributeOption', { attributeId, value });
            selectedCategoryId ? fetchData() : fetchAllAttributes();
        } catch (err) { alert(err.message); }
    };

    const handleAddMoreOptions = async (attributeId, attributeName, inputType) => {
        const input = window.prompt(inputType === 'ColorSwatch' 
            ? `Enter NEW Color Name (e.g. Maroon):` 
            : `Add more options to "${attributeName}" (Comma separated):`);
        
        if (!input) return;

        let optionsToSend = [];
        if (inputType === 'ColorSwatch') {
            const hex = window.prompt(`Enter Hex Code for "${input}" (e.g. #800000):`, "#000000");
            if (!hex) return;
            optionsToSend = [{ value: input.trim(), hexCode: hex.trim() }];
        } else {
            optionsToSend = input.split(',').map(o => o.trim());
        }

        try {
            await axios.post('http://localhost:7071/api/UpdateAttributeOptions', { attributeId, newOptions: optionsToSend });
            selectedCategoryId ? fetchData() : fetchAllAttributes(); 
        } catch (err) { alert(err.message); }
    };

    const handleToggleMulti = async (id, name, currentMulti) => {
        const newMulti = !currentMulti;
        try {
            await axios.post('http://localhost:7071/api/UpdateMasterAttribute', { attributeId: id, name: name, allowMultiple: newMulti });
            selectedCategoryId ? fetchData() : fetchAllAttributes();
        } catch (err) { alert(err.message); }
    };

    const handleSaveRules = async () => {
        if (!selectedCategoryId) return alert("Select a category first!");
        setLoading(true);
        try {
            const payload = categoryMappings.map(id => ({ attributeId: id, isRequired: true }));
            await axios.post('http://localhost:7071/api/SaveCategoryMapping', {
                categoryId: parseInt(selectedCategoryId),
                mappedAttributes: payload
            });
            alert("✅ Category Rules Saved Successfully!");
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    };

    const toggleMapping = (id) => setCategoryMappings(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // 🔥 RECURSIVE COMPONENT: Interactive Tree Directory
    const TreeNode = ({ node }) => {
        const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = String(node.categoryId) === String(selectedCategoryId);

        return (
            <div style={{ marginLeft: '12px', borderLeft: '1px solid #e0e0e0', paddingLeft: '8px', marginTop: '6px' }}>
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    padding: '6px 10px', borderRadius: '6px', 
                    background: isSelected ? '#e7f3ff' : 'transparent',
                    border: isSelected ? '1px solid #b8daff' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                }}>
                    
                    {/* Expand/Collapse Chevron */}
                    {hasChildren ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#666', padding: '0 4px' }}
                        >
                            {isExpanded ? '▼' : '▶'}
                        </button>
                    ) : (
                        <span style={{ width: '14px' }}></span> 
                    )}

                    {/* Icon */}
                    <span 
                        onClick={() => node.isLeaf && setSelectedCategoryId(node.categoryId)}
                        style={{ fontSize: '14px', cursor: node.isLeaf ? 'pointer' : 'default' }}
                    >
                        {node.isLeaf ? '🍃' : '📁'}
                    </span>
                    
                    {/* Category Name */}
                    <strong 
                        onClick={() => {
                            if (node.isLeaf) {
                                setSelectedCategoryId(node.categoryId);
                            } else {
                                setIsExpanded(!isExpanded);
                            }
                        }}
                        style={{ color: node.isLeaf ? '#333' : '#007bff', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}
                    >
                        {node.name}
                    </strong>
                </div>

                {hasChildren && isExpanded && (
                    <div style={{ marginTop: '2px', animation: 'fadeIn 0.2s ease-in-out' }}>
                        {node.children.map(child => <TreeNode key={child.categoryId} node={child} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2>⚙️ Category Rules Engine (EAV)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
                
                {/* SELECTOR (Tree View) */}
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', height: 'fit-content' }}>
                    <h4 style={{ marginTop: 0, color: '#333' }}>1. Select Target Category</h4>
                    <div style={{ background: 'white', border: '1px solid #ccc', borderRadius: '8px', padding: '15px 15px 15px 5px', minHeight: '400px', maxHeight: '600px', overflowY: 'auto', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.02)' }}>
                        {fullTree.length === 0 ? (
                            <p style={{ color: '#aaa', textAlign: 'center', marginTop: '50px' }}>Loading hierarchy...</p>
                        ) : (
                            fullTree.map(rootNode => <TreeNode key={rootNode.categoryId} node={rootNode} />)
                        )}
                    </div>
                </div>

                {/* MANAGER */}
                <div>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #ddd', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, color: '#007bff' }}>
                                2. Mapping: {categories.find(c => String(c.categoryId) === String(selectedCategoryId))?.name || "Global Attributes"}
                            </h4>
                            {selectedCategoryId && <button onClick={handleSaveRules} disabled={loading} style={{ background: '#28a745', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>💾 Save Mappings</button>}
                        </div>
                        
                        {!selectedCategoryId && <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: '13px' }}>Note: Showing all attributes. Select a leaf category (🍃) on the left to map specific rules.</p>}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxHeight: '500px', overflowY: 'auto', padding: '10px', background: '#f8f9fa', borderRadius: '8px', border: '1px inset #ccc' }}>
                            {masterAttributes.map(attr => (
                                <div key={attr.AttributeId} style={{ display: 'flex', flexDirection: 'column', background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #eee' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                                            {/* Only show checkbox if a category is selected */}
                                            {selectedCategoryId && (
                                                <input type="checkbox" checked={categoryMappings.includes(attr.AttributeId)} onChange={() => toggleMapping(attr.AttributeId)} />
                                            )}
                                            <strong style={{ fontSize: '14px' }}>{attr.Name}</strong>
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {['Dropdown', 'ColorSwatch'].includes(attr.InputType) && (
                                                <button onClick={() => handleToggleMulti(attr.AttributeId, attr.Name, attr.AllowMultiple)} style={{ background: attr.AllowMultiple ? '#d4edda' : '#f8d7da', border: '1px solid #ccc', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer' }}>
                                                    {attr.AllowMultiple ? '☑ Multi' : '☐ Single'}
                                                </button>
                                            )}
                                            <button onClick={() => handleRenameAttribute(attr.AttributeId, attr.Name, attr.AllowMultiple)} style={iconBtn}>✏️</button>
                                            <button onClick={() => handleDeleteAttribute(attr.AttributeId, attr.Name)} style={iconBtn}>🗑️</button>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                                        <div style={{ fontSize: '11px', color: '#555', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                            {['Dropdown', 'ColorSwatch'].includes(attr.InputType) ? (
                                                attr.options.map(o => (
                                                    <span key={o.Value} style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        {attr.InputType === 'ColorSwatch' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: o.HexCode || '#ccc', border: '1px solid #999' }} />}
                                                        <span onClick={() => handleEditOption(attr.AttributeId, o.Value, o.HexCode, attr.InputType)} style={{ cursor: 'pointer' }}>{o.Value}</span>
                                                        <span onClick={() => handleDeleteOption(attr.AttributeId, o.Value)} style={{ cursor: 'pointer', color: '#dc3545' }}>×</span>
                                                    </span>
                                                ))
                                            ) : <span>Free Text Input</span>}
                                        </div>
                                        {['Dropdown', 'ColorSwatch'].includes(attr.InputType) && <button onClick={() => handleAddMoreOptions(attr.AttributeId, attr.Name, attr.InputType)} style={addBtnSmall}>+</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CREATE FORM */}
                    <div style={{ background: '#fff8e1', padding: '25px', borderRadius: '12px', border: '1px solid #ffe082' }}>
                        <h4 style={{ marginTop: 0, color: '#856404' }}>➕ Create Master Attribute</h4>
                        <form onSubmit={handleCreateAttribute} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}><label style={miniLabel}>Name</label><input value={newName} onChange={e => setNewName(e.target.value)} style={formInput} required /></div>
                            <div style={{ width: '150px' }}><label style={miniLabel}>Type</label><select value={newType} onChange={e => setNewType(e.target.value)} style={formInput}><option value="Dropdown">Dropdown</option><option value="Text">Text</option><option value="ColorSwatch">Color Swatch</option></select></div>
                            {['Dropdown', 'ColorSwatch'].includes(newType) && (
                                <>
                                    <div style={{ width: '100%' }}><label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}><input type="checkbox" checked={newAllowMultiple} onChange={(e) => setNewAllowMultiple(e.target.checked)} /> Allow Multi-Selection (Pill Matrix)</label></div>
                                    <div style={{ width: '100%' }}><label style={miniLabel}>Options (Comma separated)</label><input placeholder="Red, Blue, Green" value={newOptions} onChange={e => setNewOptions(e.target.value)} style={formInput} required /></div>
                                </>
                            )}
                            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#343a40', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Create Attribute</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-2px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' };
const addBtnSmall = { background: '#e9ecef', border: '1px solid #ccc', color: '#333', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const miniLabel = { display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase', color: '#666' };
const formInput = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', outline: 'none' };

export default AttributeManager;