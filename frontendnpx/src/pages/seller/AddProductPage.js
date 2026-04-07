import React, { useState, useEffect, useMemo } from 'react';
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

const AddProductPage = ({ user, isMobile, loadDashboardData, showToast, onBack }) => {
    const [addError, setAddError] = useState('');
    
    const [allCategories, setAllCategories] = useState([]);
    const [dbVariations, setDbVariations] = useState([]); 
    const [dynamicRules, setDynamicRules] = useState([]); 
    
    const [mainCategoryId, setMainCategoryId] = useState(''); 
    const [genderCategoryId, setGenderCategoryId] = useState(''); 
    const [categoryId, setCategoryId] = useState(''); 
    
    const [attributes, setAttributes] = useState({}); 
    const [hasBlouse, setHasBlouse] = useState(false);

    const [draftVariant, setDraftVariant] = useState({});
    const [variationGrid, setVariationGrid] = useState([]);

    const [images, setImages] = useState([]); 
    const [coverIndex, setCoverIndex] = useState(0);

    // 1. Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('http://localhost:7071/api/GetCategories');
                setAllCategories(res.data);
            } catch (err) { console.error("Failed to load categories", err); }
        };
        fetchCategories();
    }, []);

    // 2. Authorization Logic
    const authorizedCategoryIds = useMemo(() => {
        const rawData = user?.shopCategories || user?.ShopCategories; 
        if (!rawData) return [];
        try {
            const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            return Array.isArray(parsed) ? parsed.map(id => Number(id)) : [];
        } catch (e) { return []; }
    }, [user]);

    const selectedCat = useMemo(() => {
        return allCategories.find(c => String(c.categoryId) === String(categoryId));
    }, [allCategories, categoryId]);

    const mainCategoriesList = allCategories.filter(c => {
        if (c.categoryLevel !== 1) return false;
        return authorizedCategoryIds.includes(Number(c.categoryId));
    });

    const genderCategoriesList = allCategories.filter(c => String(c.parentId) === String(mainCategoryId));
    const groupCategoriesList = allCategories.filter(c => String(c.parentId) === String(genderCategoryId));

    // 3. Fetch Category Rules & Variations
    useEffect(() => {
        if (!categoryId) {
            setDbVariations([]); setDynamicRules([]); setVariationGrid([]); setAttributes({});
            return;
        }

        const fetchCategoryData = async () => {
            try {
                const res = await axios.get(`http://localhost:7071/api/GetCategoryAttributes?categoryId=${categoryId}`);
                
                // Group by Matrix (Pills) vs Specs (Text Fields)
                const variations = res.data.filter(attr => attr.options && attr.options.length > 0);
                const rules = res.data.filter(attr => !attr.options || attr.options.length === 0);

                setDbVariations(variations);
                setDynamicRules(rules);
                
                const initialDraft = {};
                variations.forEach(v => { initialDraft[v.name || v.Name] = []; });
                setDraftVariant(initialDraft);
                setVariationGrid([]); 
            } catch (err) { console.error("Error fetching rules:", err); }
        };
        
        fetchCategoryData();
        setHasBlouse(false);
    }, [categoryId]);

    const allowedVariationOptions = dbVariations.map(v => v.name || v.Name);

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

        const newRows = [];
        combinations.forEach(combo => {
            const idKey = Object.values(combo).join('-');
            if (!variationGrid.some(row => row.id === idKey)) {
                newRows.push({ id: idKey, attributes: combo, stock: '', sku: '' });
            }
        });

        setVariationGrid(prev => [...prev, ...newRows]);
    };

    const updateGridRow = (idKey, field, value) => {
        setVariationGrid(prev => prev.map(row => row.id === idKey ? { ...row, [field]: value } : row));
    };

    const removeVariantRow = (idKey) => {
        setVariationGrid(prev => prev.filter(row => row.id !== idKey));
    };

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
        setImages(prev => [...prev, ...newImages]);
        e.target.value = null; 
    };

    const handleRemoveImage = (indexToRemove, e) => {
        e.preventDefault();
        setImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[indexToRemove].preview); 
            updated.splice(indexToRemove, 1);
            return updated;
        });
        if (coverIndex === indexToRemove) setCoverIndex(0); 
        else if (coverIndex > indexToRemove) setCoverIndex(prev => prev - 1);
    };

    useEffect(() => {
        return () => { images.forEach(img => URL.revokeObjectURL(img.preview)); };
    }, [images]);

    const handleAddProductSubmit = async (e) => {
        if (e) e.preventDefault(); setAddError(''); 
        const finalUserId = user?.userId || user?.UserId || user?.id;
        if (!finalUserId) return setAddError("Session error: Missing User ID.");
        const name = document.getElementById('pName').value.trim();
        const price = document.getElementById('pPrice').value;
        const origPrice = document.getElementById('pOrigPrice').value;
        const brand = document.getElementById('pBrand').value;
        const weight = document.getElementById('pWeight').value;
        const sku = document.getElementById('pSku').value;
        const description = document.getElementById('pDesc').value.trim();
        const gstPercentage = document.getElementById('pGst').value;
        const hsnCode = document.getElementById('pHsn').value;
        const gstConfirm = document.getElementById('pGstConfirm').checked;
        const baseStockInput = document.getElementById('pBaseStock');
        const baseStock = baseStockInput ? parseInt(baseStockInput.value) || 0 : 0;

        if (!mainCategoryId || !categoryId || !name || !price || !description) {
            return setAddError("Please fill all required fields marked with an asterisk (*)");
        }
        for (let rule of dynamicRules) {
            const ruleName = rule.name || rule.Name;
            if (rule.IsRequired && (!attributes[ruleName] || attributes[ruleName].trim() === '')) {
                return setAddError(`Please fill out required specification: ${ruleName}`);
            }
        }
        if (!gstConfirm) return setAddError("You must confirm GST liability.");
        if (images.length === 0) return setAddError("Please upload at least one product image.");
        if (allowedVariationOptions.length > 0) {
            if (variationGrid.length === 0) return setAddError("You must add at least one variation combination.");
        } else if (baseStock <= 0) return setAddError("Please enter a valid Base Stock quantity.");

        const reorderedImages = [...images];
        if (coverIndex !== 0 && reorderedImages.length > coverIndex) {
            const coverImg = reorderedImages.splice(coverIndex, 1)[0];
            reorderedImages.unshift(coverImg);
        }

        let processedImages = [];
        try {
            for (let img of reorderedImages) processedImages.push(await processFile(img.file));
        } catch (err) { return setAddError("Error processing images."); }

        const isProductActive = user.isApproved === 1 || user.isApproved === true || user.IsApproved === 1;

        try {
            await axios.post('http://localhost:7071/api/AddProduct', { 
                userId: finalUserId, name, price, description, originalPrice: origPrice, 
                brand, weight, sku, images: processedImages, isActive: isProductActive, 
                gstPercentage, hsnCode, category: selectedCat ? selectedCat.name : '', 
                categoryId: parseInt(categoryId), attributes: { ...attributes, ...(hasBlouse ? { 'Includes Blouse': 'Yes' } : {}) }, 
                stock: baseStock, variations: variationGrid.map(row => ({ attributes: row.attributes, stock: parseInt(row.stock) || 0, sku: row.sku || null }))
            });
            showToast(isProductActive ? "Product Added Successfully!" : "Product Saved as Draft", "success");
            loadDashboardData(); if (onBack) onBack(); 
        } catch (err) { setAddError("Upload Failed: " + (err.response?.data?.error || err.message)); }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '15px' : '30px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '20px' : '26px' }}>Upload New Product</h2>
                <button onClick={onBack} style={{ background: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>&larr; Back</button>
            </div>

            <div style={{ background: 'white', padding: isMobile ? '20px' : '35px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                
                {/* CATEGORY PATH */}
                <div style={{ padding: '20px', background: '#f0f7ff', borderRadius: '8px', marginBottom: '25px', border: '1px solid #cce3ff' }}>
                    <label style={labelStyle}>Authorized Category Path *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <select value={mainCategoryId} onChange={(e) => { setMainCategoryId(e.target.value); setGenderCategoryId(''); setCategoryId(''); }} style={{ ...inputStyle, flex: 1, minWidth: '150px', marginBottom: 0 }}>
                            <option value="">-- Main --</option>
                            {mainCategoriesList.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}
                        </select>
                        {genderCategoriesList.length > 0 && (
                            <select value={genderCategoryId} onChange={(e) => { setGenderCategoryId(e.target.value); setCategoryId(''); }} style={{ ...inputStyle, flex: 1, minWidth: '150px', marginBottom: 0 }}>
                                <option value="">-- Target --</option>
                                {genderCategoriesList.map(cat => <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>)}
                            </select>
                        )}
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!mainCategoryId || (genderCategoriesList.length > 0 && !genderCategoryId)} style={{ ...inputStyle, flex: 1.5, minWidth: '200px', marginBottom: 0 }}>
                            <option value="">-- Sub-Category --</option>
                            {groupCategoriesList.map((group) => (
                                <optgroup key={group.categoryId} label={group.name}>
                                    {allCategories.filter(c => String(c.parentId) === String(group.categoryId)).map(leaf => <option key={leaf.categoryId} value={leaf.categoryId}>{leaf.name}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>

                {/* CORE INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Product Name *</label><input placeholder="Ex: Premium Silk Saree" id="pName" style={inputStyle} />
                        <label style={labelStyle}>Base Price (incl. GST) *</label><input type="number" id="pPrice" style={inputStyle} />
                        <label style={labelStyle}>Original Price (MRP)</label><input type="number" id="pOrigPrice" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Brand</label><input id="pBrand" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Weight (kg)</label><input type="number" step="0.1" id="pWeight" style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Base SKU</label><input id="pSku" style={inputStyle} /></div>
                        </div>
                        {selectedCat?.name.toLowerCase().includes('saree') && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', fontSize: '13px', color: '#007bff', fontWeight: 'bold', cursor: 'pointer', background: '#e1f0ff', padding: '10px', borderRadius: '6px' }}>
                                <input type="checkbox" checked={hasBlouse} onChange={(e) => setHasBlouse(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                                Includes unstitched blouse piece
                            </label>
                        )}
                    </div>
                </div>

                {/* DYNAMIC SPECS */}
                {dynamicRules.length > 0 && (
                    <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #ddd' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '16px' }}>📋 Category Specifications</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                            {dynamicRules.map((rule, idx) => (
                                <div key={idx}>
                                    <label style={labelStyle}>{rule.name || rule.Name} {rule.IsRequired ? '*' : ''}</label>
                                    <input type="text" placeholder={`Enter ${rule.name || rule.Name}`} value={attributes[rule.name || rule.Name] || ''} onChange={(e) => setAttributes({...attributes, [rule.name || rule.Name]: e.target.value})} style={{...inputStyle, marginBottom: 0}} required={rule.IsRequired} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PILL BUILDER (With Improved Color Logic) */}
                {categoryId && (
                    <div style={{ marginTop: '20px' }}>
                        {allowedVariationOptions.length === 0 ? (
                            <div style={{ background: '#fff8e1', padding: '20px', borderRadius: '8px', border: '1px solid #ffe082' }}>
                                <label style={labelStyle}>Base Stock Quantity *</label>
                                <input type="number" id="pBaseStock" style={{ ...inputStyle, width: '150px', border: '1px solid #007bff', marginBottom: 0 }} />
                            </div>
                        ) : (
                            <div style={{ background: '#fff8e1', padding: '20px', borderRadius: '12px', border: '1px solid #ffe082' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '18px' }}>1. Build Variations</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                    {dbVariations.map((axis) => {
                                        const axisName = axis.name || axis.Name;
                                        const isColorAxis = axisName.toLowerCase() === 'color';
                                        const isMulti = axis.AllowMultiple === true || axis.AllowMultiple === 1 || String(axis.AllowMultiple).toLowerCase() === 'true' || String(axis.AllowMultiple) === '1';
                                        
                                        return (
                                            <div key={axisName} style={{ flex: '1 1 100%', minWidth: '150px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#333', display: 'block', marginBottom: '10px' }}>
                                                    {axisName} {isMulti ? '(Select one or more) *' : '(Select ONE) *'}
                                                </label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {axis.options.map(opt => {
                                                        const optionValue = opt.Value || opt; 
                                                        const isSelected = draftVariant[axisName]?.includes(optionValue);
                                                        
                                                        if (isColorAxis) {
                                                            // 🔥 THE FIX: Prioritize DB HexCode, fallback to map, fallback to grey
                                                            const hex = opt.HexCode || COLOR_HEX_MAP[optionValue] || '#ccc';
                                                            return (
                                                                <div key={optionValue} onClick={() => toggleDraftOption(axis, optionValue)} title={optionValue} style={{ 
                                                                    width: '36px', height: '36px', borderRadius: '50%', background: hex, cursor: 'pointer', 
                                                                    border: isSelected ? '3px solid #007bff' : '1px solid #ddd',
                                                                    boxShadow: isSelected ? '0 0 8px rgba(0,123,255,0.4)' : 'none',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s ease'
                                                                }}>
                                                                    {isSelected && (
                                                                        <span style={{ 
                                                                            color: 'white', 
                                                                            fontSize: '16px', 
                                                                            fontWeight: 'bold', 
                                                                            // 🔥 Dynamic Contrast: Checkmark is always visible
                                                                            mixBlendMode: 'difference' 
                                                                        }}>✓</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={optionValue} onClick={() => toggleDraftOption(axis, optionValue)} style={{ 
                                                                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', 
                                                                border: isSelected ? '2px solid #007bff' : '1px solid #ccc',
                                                                background: isSelected ? '#e7f3ff' : '#f8f9fa', color: isSelected ? '#007bff' : '#333', fontWeight: isSelected ? 'bold' : 'normal'
                                                            }}>{optionValue}</div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button onClick={handleAddDraftToGrid} style={{ marginTop: '15px', padding: '12px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    + Add to Inventory Matrix
                                </button>

                                {variationGrid.length > 0 && (
                                    <div style={{ marginTop: '30px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '18px' }}>2. Set Stock & SKU</h4>
                                        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                <thead>
                                                    <tr style={{ background: '#f4f6f8' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Combination</th>
                                                        <th style={{ padding: '12px', width: '140px' }}>Stock *</th>
                                                        <th style={{ padding: '12px' }}>SKU</th>
                                                        <th style={{ padding: '12px', width: '40px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {variationGrid.map(row => (
                                                        <tr key={row.id} style={{ borderTop: '1px solid #eee' }}>
                                                            <td style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                {Object.entries(row.attributes).map(([key, val]) => (
                                                                    <span key={val} style={{ background: '#eee', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ddd' }}>{val}</span>
                                                                ))}
                                                            </td>
                                                            <td style={{ padding: '8px' }}><input type="number" placeholder="0" value={row.stock} onChange={(e) => updateGridRow(row.id, 'stock', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #007bff', borderRadius: '4px' }} /></td>
                                                            <td style={{ padding: '8px' }}><input type="text" placeholder="Optional" value={row.sku} onChange={(e) => updateGridRow(row.id, 'sku', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} /></td>
                                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                <button onClick={(e) => { e.preventDefault(); removeVariantRow(row.id); }} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}>✕</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAX & DESCRIPTION */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginTop: '25px' }}>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                        <label style={labelStyle}>Tax & Compliance</label>
                        <select id="pGst" defaultValue="0.18" style={inputStyle}>
                            <option value="0.05">5% GST (Apparel)</option><option value="0.12">12% GST (Premium)</option><option value="0.18">18% GST (Standard)</option>
                        </select>
                        <input id="pHsn" placeholder="HSN Code" style={inputStyle} />
                        <label style={{ fontSize: '13px', display: 'flex', gap: '8px', cursor: 'pointer' }}><input type="checkbox" id="pGstConfirm" /> I confirm GST & HSN accuracy.</label>
                    </div>
                    <div>
                        <label style={labelStyle}>Product Description *</label><textarea id="pDesc" placeholder="Enter product details..." style={{ ...inputStyle, height: '110px' }} />
                        <label style={labelStyle}>Product Images *</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px dashed #ccc' }}>
                            {images.map((img, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', border: coverIndex === idx ? '3px solid #28a745' : '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                                    <img src={img.preview} alt="upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={(e) => handleRemoveImage(idx, e)} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(220, 53, 69, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                    {coverIndex !== idx ? (
                                        <button onClick={(e) => { e.preventDefault(); setCoverIndex(idx); }} style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Set Cover</button>
                                    ) : (
                                        <span style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', background: '#28a745', color: 'white', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cover ★</span>
                                    )}
                                </div>
                            ))}
                            <label style={{ width: '100px', height: '100px', border: '2px dashed #007bff', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#e1f0ff', color: '#007bff' }}>
                                <span style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>+</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Add Photo</span>
                                <input type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                </div>

                {addError && <div style={{ color: '#dc3545', marginTop: '20px', fontWeight: 'bold', padding: '10px', background: '#fff5f5', borderRadius: '6px' }}>⚠️ {addError}</div>}
                
                <button onClick={handleAddProductSubmit} style={{ width: '100%', marginTop: '30px', padding: '18px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>
                    Publish Product Listing
                </button>
            </div>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' };
const inputStyle = { display: 'block', width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: 'white', marginBottom: '15px', fontSize: '14px' };

export default AddProductPage;