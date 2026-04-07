import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { processFile } from '../../utils/imageHelpers';

// Fallback map for common colors if HexCode is missing in DB
const COLOR_HEX_MAP = {
    "Black": "#000000", "White": "#ffffff", "Red": "#dc3545", "Blue": "#007bff", 
    "Green": "#28a745", "Yellow": "#ffc107", "Pink": "#e83e8c", "Purple": "#6f42c1", 
    "Grey": "#6c757d", "Brown": "#795548", "Orange": "#fd7e14", "Navy": "#001f3f", 
    "Beige": "#f5f5dc", "Maroon": "#800000", "Olive": "#808000", 
    "Dark Blue": "#00008b", "Light Blue": "#add8e6", "Dark Green": "#006400", 
    "Khaki": "#f0e68c", "Dark Grey": "#555555", "Light Green": "#90ee90", 
    "Cream": "#fffdd0", "Silver": "#c0c0c0", "Gold": "#ffd700",
    "Multicolor": "conic-gradient(red, yellow, green, blue, magenta, red)"
};

const safeGetImages = (imgData) => {
    if (!imgData) return [];
    if (Array.isArray(imgData)) return imgData;
    if (typeof imgData === 'string') {
        const match = imgData.match(/https?:\/\/[^"'\s\\]+/);
        if (match) return [match[0]];
        try {
            const parsed = JSON.parse(imgData);
            return Array.isArray(parsed) ? parsed : [imgData];
        } catch(e) { return [imgData]; }
    }
    return [];
};

const getNormKey = (obj) => {
    if (!obj) return "";
    const target = typeof obj === 'string' ? JSON.parse(obj) : obj;
    return Object.keys(target).sort()
        .map(k => `${k.toLowerCase()}:${String(target[k]).toLowerCase()}`)
        .join('|');
};

const SellerProductEdit = ({ isMobile, editingProduct, setEditingProduct, handleUpdateProduct, handleDeleteProduct }) => {
    const [allCategories, setAllCategories] = useState([]);
    const [dbVariations, setDbVariations] = useState([]); 
    const [dynamicRules, setDynamicRules] = useState([]);
    
    const [mainCategoryId, setMainCategoryId] = useState(''); 
    const [genderCategoryId, setGenderCategoryId] = useState(''); 
    
    const [draftVariant, setDraftVariant] = useState({});

    // 1. Fetch Categories on Load
    useEffect(() => {
        axios.get('http://localhost:7071/api/GetCategories')
             .then(res => setAllCategories(res.data))
             .catch(err => console.error("Failed to load categories", err));
    }, []);

    // 2. Safely parse product attributes on load
    useEffect(() => {
        const rawAttr = editingProduct?.ProductAttributes || editingProduct?.attributes;
        if (editingProduct && typeof rawAttr === 'string') {
            try {
                const parsedAttrs = JSON.parse(rawAttr);
                setEditingProduct(prev => ({ ...prev, attributes: parsedAttrs }));
            } catch (e) {
                setEditingProduct(prev => ({ ...prev, attributes: {} }));
            }
        } else if (editingProduct && typeof rawAttr === 'object') {
            setEditingProduct(prev => ({ ...prev, attributes: rawAttr }));
        }
    }, []);

    // 3. Map Hierarchy based on Product CategoryId
    useEffect(() => {
        const catId = editingProduct?.CategoryId || editingProduct?.categoryId;
        if (allCategories.length > 0 && catId) {
            let current = allCategories.find(c => String(c.categoryId) === String(catId));
            let lvl1 = '', lvl2 = '';
            while (current) {
                if (current.categoryLevel === 1) lvl1 = current.categoryId;
                if (current.categoryLevel === 2) lvl2 = current.categoryId;
                current = allCategories.find(c => c.categoryId === current.parentId);
            }
            setMainCategoryId(lvl1);
            setGenderCategoryId(lvl2);
        }
    }, [allCategories, editingProduct?.CategoryId, editingProduct?.categoryId]);

    // 4. Fetch Dynamic Attributes
    useEffect(() => {
        const catId = editingProduct?.CategoryId || editingProduct?.categoryId;
        if (!catId) {
            setDbVariations([]); setDynamicRules([]); setDraftVariant({});
            return;
        }

        axios.get(`http://localhost:7071/api/GetCategoryAttributes?categoryId=${catId}`)
            .then(res => {
                const variations = res.data.filter(attr => attr.options && attr.options.length > 0);
                const rules = res.data.filter(attr => !attr.options || attr.options.length === 0);
                
                setDbVariations(variations);
                setDynamicRules(rules);

                const initialDraft = {};
                variations.forEach(v => { initialDraft[v.name || v.Name] = []; });
                setDraftVariant(initialDraft);
            })
            .catch(console.error);
    }, [editingProduct?.CategoryId, editingProduct?.categoryId]);

    // 5. Toggle Option (Strict Multi vs Single Select based on DB)
    const toggleDraftOption = (axis, value) => {
        const axisName = axis.name || axis.Name;
        const allowMultiple = 
            axis.AllowMultiple === true || 
            axis.AllowMultiple === 1 || 
            String(axis.AllowMultiple).toLowerCase() === 'true' || 
            String(axis.AllowMultiple) === '1';

        setDraftVariant(prev => {
            const currentList = prev[axisName] || [];
            if (currentList.includes(value)) {
                return { ...prev, [axisName]: currentList.filter(v => v !== value) };
            } else {
                return allowMultiple 
                    ? { ...prev, [axisName]: [...currentList, value] } 
                    : { ...prev, [axisName]: [value] };
            }
        });
    };

    const handleAddDraftToGrid = (e) => {
        e.preventDefault();
        for (const axis of dbVariations) {
            const axisName = axis.name || axis.Name;
            if (!draftVariant[axisName] || draftVariant[axisName].length === 0) {
                return alert(`Please select at least one option for ${axisName}`);
            }
        }

        const axesToMultiply = dbVariations.map(v => ({ name: v.name || v.Name, options: draftVariant[v.name || v.Name] }));
        const combinations = axesToMultiply.reduce((acc, axis) => {
            const newAcc = [];
            acc.forEach(existingCombo => {
                axis.options.forEach(option => { 
                    newAcc.push({ ...existingCombo, [axis.name]: option.Value || option }); 
                });
            });
            return newAcc;
        }, [{}]);

        const currentVars = editingProduct.variations || [];
        const newRows = [];
        combinations.forEach(combo => {
            if (!currentVars.some(row => getNormKey(row.attributes) === getNormKey(combo))) {
                newRows.push({ attributes: combo, stock: '', sku: '' });
            }
        });

        if (newRows.length > 0) {
            setEditingProduct(prev => ({ 
                ...prev, 
                variations: [...(prev.variations || []), ...newRows] 
            }));
        }
    };

    const handleVariationEdit = (index, field, value) => {
        const updated = [...editingProduct.variations];
        updated[index] = { ...updated[index], [field]: value };
        setEditingProduct({ ...editingProduct, variations: updated });
    };

    const removeVariantRow = (index) => {
        if (window.confirm("Are you sure you want to remove this variation?")) {
            const updated = [...editingProduct.variations];
            updated.splice(index, 1);
            setEditingProduct({ ...editingProduct, variations: updated });
        }
    };

    const mainCategoriesList = allCategories.filter(c => c.categoryLevel === 1);
    const genderCategoriesList = allCategories.filter(c => String(c.parentId) === String(mainCategoryId));
    const groupCategoriesList = allCategories.filter(c => String(c.parentId) === String(genderCategoryId));

    const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' };
    const inputStyle = { display: 'block', width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: 'white', marginBottom: '15px', fontSize: '14px' };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '15px' : '30px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '20px' : '26px' }}>Edit Product: <span style={{color: '#007bff'}}>{editingProduct.Name || editingProduct.name}</span></h2>
                <button onClick={() => setEditingProduct(null)} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>&larr; Back</button>
            </div>

            <div style={{ background: 'white', padding: isMobile ? '20px' : '35px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                
                {/* 1. CORE INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Product Name *</label>
                        <input value={editingProduct.Name || editingProduct.name || ''} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value, Name: e.target.value})} style={inputStyle} />
                        
                        <label style={labelStyle}>Base Price (Final MRP incl. GST) *</label>
                        <input type="number" value={editingProduct.Price || editingProduct.price || ''} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value, Price: e.target.value})} style={inputStyle} />
                        
                        <label style={labelStyle}>Original Price (Before Discount)</label>
                        <input type="number" value={editingProduct.OriginalPrice || editingProduct.originalPrice || ''} onChange={(e) => setEditingProduct({...editingProduct, originalPrice: e.target.value, OriginalPrice: e.target.value})} style={inputStyle} />
                        
                        {dbVariations.length === 0 && (
                            <>
                                <label style={labelStyle}>Base Stock</label>
                                <input type="number" value={(editingProduct.Stock !== undefined ? editingProduct.Stock : editingProduct.stock) || ''} onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value, Stock: e.target.value})} style={inputStyle} />
                            </>
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>Brand</label>
                        <input value={editingProduct.Brand || editingProduct.brand || ''} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value, Brand: e.target.value})} style={inputStyle} />
                        
                        <div style={{ display: 'flex', gap: '10px', marginBottom: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Main Category *</label>
                                <select 
                                    value={mainCategoryId} 
                                    disabled={true} 
                                    onChange={(e) => {
                                        setMainCategoryId(e.target.value);
                                        setGenderCategoryId('');
                                        setEditingProduct({...editingProduct, CategoryId: '', categoryId: ''});
                                    }}
                                    style={{ ...inputStyle, backgroundColor: '#f5f5f5', color: '#888' }}
                                >
                                    <option value="">-- Main --</option>
                                    {mainCategoriesList.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}
                                </select>
                            </div>

                            {genderCategoriesList.length > 0 && (
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Target Group *</label>
                                    <select 
                                        value={genderCategoryId} 
                                        disabled={true}
                                        onChange={(e) => {
                                            setGenderCategoryId(e.target.value);
                                            setEditingProduct({...editingProduct, CategoryId: '', categoryId: ''});
                                        }}
                                        style={{ ...inputStyle, backgroundColor: '#f5f5f5', color: '#888' }}
                                    >
                                        <option value="">-- Select --</option>
                                        {genderCategoriesList.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={labelStyle}>Sub-Category *</label>
                            <select 
                                disabled={!mainCategoryId || (genderCategoriesList.length > 0 && !genderCategoryId)}
                                value={editingProduct.CategoryId || editingProduct.categoryId || ''} 
                                onChange={(e) => {
                                    const newCatId = e.target.value;
                                    setEditingProduct({ 
                                        ...editingProduct, 
                                        CategoryId: newCatId,
                                        categoryId: newCatId
                                    });
                                }} 
                                style={inputStyle}
                            >
                                <option value="">-- Select Sub-Category --</option>
                                {groupCategoriesList.map((group) => (
                                    <optgroup key={group.categoryId} label={group.name}>
                                        {allCategories
                                            .filter(c => String(c.parentId) === String(group.categoryId))
                                            .map(leaf => (
                                                <option key={leaf.categoryId} value={leaf.categoryId}>{leaf.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Weight (kg)</label>
                                <input type="number" step="0.1" value={editingProduct.Weight || editingProduct.weight || ''} onChange={(e) => setEditingProduct({...editingProduct, weight: e.target.value, Weight: e.target.value})} style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>SKU ID (Base)</label>
                                <input value={editingProduct.SKU || editingProduct.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value, SKU: e.target.value})} style={inputStyle} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DYNAMIC SPECIFICATIONS (Text Inputs Only Now) */}
                {dynamicRules.length > 0 && (
                    <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '16px' }}>📋 Category Specifications</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                            {dynamicRules.map((rule, idx) => {
                                const ruleName = rule.name || rule.Name;
                                const isRequired = rule.isRequired || rule.IsRequired;

                                return (
                                    <div key={idx}>
                                        <label style={labelStyle}>
                                            {ruleName} {isRequired ? '*' : ''}
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder={`Enter ${ruleName}`} 
                                            value={(editingProduct.attributes && editingProduct.attributes[ruleName]) || ''} 
                                            onChange={(e) => setEditingProduct({
                                                ...editingProduct, 
                                                attributes: { ...(editingProduct.attributes || {}), [ruleName]: e.target.value }
                                            })} 
                                            style={{...inputStyle, marginBottom: 0}} 
                                            required={isRequired}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 3. VARIATION BUILDER (Pills for EVERYTHING with options) */}
                {dbVariations.length > 0 && (
                    <div style={{ background: '#fff8e1', padding: '20px', borderRadius: '12px', border: '1px solid #ffe082', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '18px' }}>1. Build New Variations</h4>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                            Need to add new combinations? Select below and click "Add to Matrix".
                        </p>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            {dbVariations.map((axis) => {
                                const axisName = axis.name || axis.Name;
                                const isColorAxis = axisName.toLowerCase() === 'color';
                                const isMulti = axis.AllowMultiple === true || axis.AllowMultiple === 1 || String(axis.AllowMultiple).toLowerCase() === 'true' || String(axis.AllowMultiple) === '1';

                                return (
                                    <div key={axisName} style={{ flex: '1 1 100%', minWidth: '150px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#333', display: 'block', marginBottom: '10px' }}>
                                            {axisName} {isMulti ? '(Select one or more)' : '(Select ONE)'}
                                        </label>
                                        
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {axis.options.map(opt => {
                                                const optionValue = opt.Value || opt;
                                                const isSelected = draftVariant[axisName]?.includes(optionValue);
                                                
                                                if (isColorAxis) {
                                                    const hex = opt.HexCode || COLOR_HEX_MAP[optionValue] || '#ccc';
                                                    return (
                                                        <div key={optionValue} 
                                                            onClick={() => toggleDraftOption(axis, optionValue)}
                                                            title={optionValue} style={{ 
                                                            width: '36px', height: '36px', borderRadius: '50%', background: hex, cursor: 'pointer', 
                                                            border: isSelected ? '3px solid #007bff' : '1px solid #ddd',
                                                            boxShadow: isSelected ? '0 0 8px rgba(0,123,255,0.4)' : 'none',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s ease'
                                                        }}>
                                                            {isSelected && <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', mixBlendMode: 'difference' }}>✓</span>}
                                                        </div>
                                                    );
                                                }
                                                
                                                return (
                                                    <div key={optionValue} 
                                                        onClick={() => toggleDraftOption(axis, optionValue)}
                                                        style={{ 
                                                        padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', 
                                                        border: isSelected ? '2px solid #007bff' : '1px solid #ccc',
                                                        background: isSelected ? '#e7f3ff' : '#f8f9fa', color: isSelected ? '#007bff' : '#333', fontWeight: isSelected ? 'bold' : 'normal',
                                                        transition: 'all 0.1s ease'
                                                    }}>{optionValue}</div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        <button onClick={handleAddDraftToGrid} style={{ marginTop: '15px', padding: '12px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>+</span> Add to Inventory Matrix
                        </button>
                    </div>
                )}

                {/* 4. INVENTORY MATRIX TABLE */}
                {editingProduct.variations && editingProduct.variations.length > 0 && (
                    <div style={{ overflowX: 'auto', background: 'white', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
                        <h4 style={{ margin: '15px 20px 5px', color: '#856404', fontSize: '18px' }}>2. Manage Inventory Matrix</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    <th style={{ padding: '12px 20px', borderBottom: '2px solid #ccc', textAlign: 'left' }}>Variant</th>
                                    <th style={{ padding: '12px 20px', borderBottom: '2px solid #ccc', width: '150px' }}>Stock Qty *</th>
                                    <th style={{ padding: '12px 20px', borderBottom: '2px solid #ccc' }}>SKU</th>
                                    <th style={{ padding: '12px 20px', borderBottom: '2px solid #ccc', width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {editingProduct.variations.map((v, vIdx) => {
                                    let attrs = v.attributes || v.VariationAttributes;
                                    if (typeof attrs === 'string') { try { attrs = JSON.parse(attrs); } catch(e){} }
                                    return (
                                        <tr key={vIdx}>
                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
                                                {attrs && Object.entries(attrs).map(([key, val]) => (
                                                    <span key={val} style={{ 
                                                        background: key.toLowerCase() === 'color' && COLOR_HEX_MAP[val] ? COLOR_HEX_MAP[val] : '#f1f1f1', 
                                                        color: key.toLowerCase() === 'color' && ['White', 'Yellow', 'Cream', 'Silver', 'Gold', 'Khaki'].includes(val) ? 'black' : (key.toLowerCase() === 'color' ? 'white' : '#333'),
                                                        border: '1px solid #ddd', padding: '4px 10px', borderRadius: '16px', marginRight: '6px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block'
                                                    }}>{val}</span>
                                                ))}
                                            </td>
                                            <td style={{ padding: '10px 20px', borderBottom: '1px solid #eee' }}>
                                                <input type="number" value={v.stock !== undefined && v.stock !== null ? v.stock : ''} onChange={(e) => handleVariationEdit(vIdx, 'stock', e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #007bff', borderRadius: '6px', boxSizing: 'border-box' }} />
                                            </td>
                                            <td style={{ padding: '10px 20px', borderBottom: '1px solid #eee' }}>
                                                <input type="text" value={v.sku || ''} onChange={(e) => handleVariationEdit(vIdx, 'sku', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' }} />
                                            </td>
                                            <td style={{ padding: '10px 20px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                                <button onClick={(e) => { e.preventDefault(); removeVariantRow(vIdx); }} title="Remove this combination" style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}>✕</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* TAX, DESCRIPTION, GALLERY & FOOTER */}
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Tax Information (Mandatory)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>GST Bracket *</label>
                            <select value={editingProduct.GSTPercentage !== undefined ? editingProduct.GSTPercentage : "0.18"} onChange={(e) => setEditingProduct({...editingProduct, gstPercentage: e.target.value, GSTPercentage: e.target.value})} style={inputStyle}>
                                <option value="0.28">28% GST</option><option value="0.18">18% GST</option><option value="0.12">12% GST</option><option value="0.05">5% GST</option><option value="0.00">0% GST</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>HSN Code *</label>
                            <input value={editingProduct.HSNCode || editingProduct.hsnCode || ''} onChange={(e) => setEditingProduct({...editingProduct, hsnCode: e.target.value, HSNCode: e.target.value})} style={inputStyle} />
                        </div>
                    </div>
                    {/* 🔥 RESTORED GST CHECKBOX */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={editingProduct.gstConfirm || false}
                            onChange={(e) => setEditingProduct({ ...editingProduct, gstConfirm: e.target.checked })}
                            style={{ width: '16px', height: '16px' }}
                        />
                        <span>☑️ I confirm that the HSN code and GST percentage selected are legally accurate.</span>
                    </label>
                </div>

                <label style={labelStyle}>Description</label>
                <textarea value={editingProduct.Description || editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value, Description: e.target.value})} style={{ ...inputStyle, height: '120px' }} />
                
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
                    <label style={labelStyle}>Product Gallery</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                        {safeGetImages(editingProduct.ImageUrl || editingProduct.imageUrl).map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '90px', height: '90px', border: idx === 0 ? '3px solid #28a745' : '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                            <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="thumb" />
                            {idx === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(40, 167, 69, 0.95)', color: 'white', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', padding: '3px 0' }}>COVER</div>}
                            <button onClick={(e) => { e.preventDefault(); const imgs = [...safeGetImages(editingProduct.imageUrl || editingProduct.ImageUrl)]; imgs.splice(idx, 1); setEditingProduct({...editingProduct, imageUrl: imgs, ImageUrl: imgs}); }} style={{ position: 'absolute', top: '5px', right: '5px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                        </div>
                        ))}
                    </div>
                    <input type="file" multiple onChange={async (e) => {
                        const current = safeGetImages(editingProduct.imageUrl || editingProduct.ImageUrl);
                        const added = [];
                        for (let file of e.target.files) { added.push(await processFile(file)); }
                        setEditingProduct({...editingProduct, imageUrl: [...current, ...added], ImageUrl: [...current, ...added]});
                    }} style={{ fontSize: '12px' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <button onClick={(e) => {
                        e.preventDefault();
                        // 🔥 Require GST confirmation before saving
                        if (!editingProduct.gstConfirm) {
                            alert("Please tick the GST confirmation checkbox to proceed.");
                            return;
                        }

                        const finalStock = (editingProduct.variations && editingProduct.variations.length > 0) ? 0 : (parseInt(editingProduct.Stock || editingProduct.stock) || 0);
                        const productToSave = { ...editingProduct, stock: finalStock, Stock: finalStock };
                        
                        if (typeof productToSave.attributes === 'object') {
                            productToSave.ProductAttributes = JSON.stringify(productToSave.attributes);
                        }
                        
                        setEditingProduct(productToSave);
                        setTimeout(handleUpdateProduct, 50); 
                    }} style={{ flex: 2, background: '#28a745', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', minWidth: '150px' }}>Save Changes</button>
                    
                    <button onClick={() => setEditingProduct(null)} style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', minWidth: '120px' }}>Cancel</button>

                    <button onClick={(e) => {
                        e.preventDefault();
                        if (window.confirm("🚨 WARNING: Are you sure you want to permanently DELETE this product? This action cannot be undone.")) {
                            if (handleDeleteProduct) {
                                handleDeleteProduct(editingProduct.ProductId || editingProduct.productId || editingProduct.id);
                            } else {
                                alert("Delete function not yet connected.");
                            }
                        }
                    }} style={{ flex: 1, background: '#dc3545', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', minWidth: '150px' }}>Delete</button>
                </div>
            </div>
        </div>
    );
};

export default SellerProductEdit;