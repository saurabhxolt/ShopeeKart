import React, { useState } from 'react';
import axios from 'axios';
import { processFile } from '../../utils/imageHelpers';
import Modal from '../../components/common/Modal';

const AddProductModal = ({ isOpen, onClose, user, isMobile, loadDashboardData, showToast }) => {
    const [addError, setAddError] = useState('');

    const handleAddProductSubmit = async () => {
        setAddError(''); // Clear any previous errors
        
        const name = document.getElementById('pName').value;
        const price = document.getElementById('pPrice').value;
        const origPrice = document.getElementById('pOrigPrice').value;
        const stock = document.getElementById('pStock').value;
        const brand = document.getElementById('pBrand').value;
        const category = document.getElementById('pCat').value;
        const weight = document.getElementById('pWeight').value;
        const sku = document.getElementById('pSku').value;
        const description = document.getElementById('pDesc').value;
        const fileInput = document.getElementById('pImageInput');
        
        const gstPercentage = document.getElementById('pGst').value;
        const hsnCode = document.getElementById('pHsn').value;
        const gstConfirm = document.getElementById('pGstConfirm').checked;

        if (!name || !price || !stock) return setAddError("Please fill all required text fields (*)");
        if (!gstConfirm) return setAddError("You must confirm your GST & HSN liability.");

        let processedImages = [];
        if (fileInput.files.length > 0) {
            try {
                for (let i = 0; i < fileInput.files.length; i++) {
                     const base64 = await processFile(fileInput.files[i]);
                     processedImages.push(base64); 
                }
            } catch (err) { return setAddError("Error processing images. Please try again."); }
        } else { 
            return setAddError("Please upload at least one image."); 
        }

        try {
            await axios.post('http://localhost:7071/api/AddProduct', { 
                userId: user.userId, name, price, stock, description, originalPrice: origPrice, 
                category, brand, weight, sku, images: processedImages, 
                isActive: user.isApproved ? true : false,
                gstPercentage, hsnCode 
            });
            
            showToast(user.isApproved ? "Product Added Successfully!" : "Product Saved as Draft (Pending Approval)", "success");
            onClose(); // Use the prop to close the modal
            loadDashboardData(); // Refresh the parent's data
            
            ["pName", "pPrice", "pOrigPrice", "pStock", "pBrand", "pCat", "pWeight", "pSku", "pDesc", "pHsn"].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = "";
            });
            document.getElementById('pGst').value = "0.18"; 
            document.getElementById('pGstConfirm').checked = false;
            if(fileInput) fileInput.value = ""; 
        } catch (err) { 
            setAddError("Upload Failed: " + (err.response?.data?.error || err.message)); 
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { onClose(); setAddError(''); }} title="Upload New Product" width={isMobile ? "100%" : "800px"}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Product Name *</label>
                    <input placeholder="Ex: Premium Silk Saree" id="pName" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Price (Final MRP incl. GST) *</label>
                    <input placeholder="Current Price" type="number" id="pPrice" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Original Price (Before Discount)</label>
                    <input placeholder="For showing discounts" type="number" id="pOrigPrice" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Stock *</label>
                    <input placeholder="Quantity available" type="number" id="pStock" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Brand</label>
                    <input placeholder="Ex: Kancheepuram Arts" id="pBrand" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Category</label>
                    <input placeholder="Ex: Ethnic Wear" id="pCat" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Weight (kg)</label>
                    <input placeholder="Ex: 0.8" type="number" step="0.1" id="pWeight" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>SKU ID</label>
                    <input placeholder="Ex: SAR-BLU-001" id="pSku" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
            </div>

            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px', marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Tax Information (Mandatory)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>GST Bracket *</label>
                        <select id="pGst" defaultValue="0.18" style={{ display: 'block', width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
                            <option value="0.28">28% (Luxury Goods, ACs)</option>
                            <option value="0.18">18% (Standard Electronics, Goods)</option>
                            <option value="0.12">12% (Apparel over ₹1000, Phones)</option>
                            <option value="0.05">5% (Apparel under ₹1000, Spices)</option>
                            <option value="0.00">0% (Books, Unpackaged Food)</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>HSN Code *</label>
                        <input id="pHsn" placeholder="Ex: 8517" style={{ display: 'block', width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '15px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>
                    <input type="checkbox" id="pGstConfirm" style={{ marginTop: '2px', width: '16px', height: '16px' }} />
                    <span style={{ lineHeight: '1.4' }}>☑️ I confirm that the HSN code and GST percentage selected are legally accurate. I understand that I am solely responsible for any tax penalties arising from incorrect classification.</span>
                </label>
            </div>

            <label style={{ fontWeight: 'bold', display: 'block', marginTop: 10, fontSize: '13px', color: '#555' }}>Description</label>
            <textarea id="pDesc" placeholder="Describe your product details, fabric, and care instructions..." style={{ display: 'block', marginBottom: 15, width: '100%', height: '80px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }} />
            
            <label style={{ fontWeight: 'bold', display: 'block', marginTop: 10, fontSize: '13px', color: '#555' }}>Product Images (Multiple allowed + GIF):</label>
            <input type="file" accept="image/*" multiple id="pImageInput" style={{ display: 'block', marginBottom: 25, width: '100%' }} />
            
            {addError && (
                <div style={{ padding: '12px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '15px', fontSize: '14px', fontWeight: 'bold', border: '1px solid #f5c6cb' }}>
                    ⚠️ {addError}
                </div>
            )}

            <button onClick={handleAddProductSubmit} style={{ background: '#007bff', color: 'white', border: 'none', padding: '14px 24px', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', width: '100%', fontSize: '16px' }}>
            Upload Product
            </button>
        </Modal>
    );
};

export default AddProductModal;