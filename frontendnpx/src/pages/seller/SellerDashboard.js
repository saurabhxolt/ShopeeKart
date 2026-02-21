import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { processFile, parseImages } from '../../utils/imageHelpers';
import Modal from '../../components/common/Modal';
import ReadMore from '../../components/common/ReadMore';
import ImageGallery from '../../components/common/ImageGallery';
import SellerOrdersModal from '../../components/orders/SellerOrdersModal';

const SellerDashboard = ({ user }) => {
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);

  const loadSellerProducts = async () => {
    try {
      const res = await axios.get(`http://localhost:7071/api/GetSellerProducts?userId=${user.userId}`);
      setSellerProducts(res.data);
    } catch (err) {
      console.error("Failed to load products");
    }
  };

  useEffect(() => {
    loadSellerProducts();
  }, [user.userId]);

  const handleUpdateProduct = async () => {
    const { id, name, price, qty, imageUrl, description, originalPrice, category, brand, weight, sku, isActive } = editingProduct;
    if (!name || !price || qty === undefined) return alert("Core fields are required");

    try {
      await axios.post('http://localhost:7071/api/UpdateProduct', {
        productId: id, name, price, stock: qty, imageUrl, description, originalPrice, category, brand, weight, sku, isActive
      });
      alert("✅ Product Updated Successfully!");
      setEditingProduct(null); 
      loadSellerProducts(); 
    } catch (err) {
      alert("Update failed: " + (err.response?.data || err.message));
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`http://localhost:7071/api/DeleteProduct?productId=${productId}&userId=${user.userId}`);
      alert("Deleted");
      loadSellerProducts();
    } catch (err) { alert("Delete failed"); }
  };

  const handleAddProductSubmit = async () => {
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

    if (!name || !price || !stock) return alert("Please fill all required text fields (*)");
    
    // --- UPDATED FOR AZURE BLOB STORAGE ---
    let processedImages = [];
    if (fileInput.files.length > 0) {
        try {
            for (let i = 0; i < fileInput.files.length; i++) {
                 const base64 = await processFile(fileInput.files[i]);
                 processedImages.push(base64); // Push to array instead of stringifying
            }
        } catch (err) { return alert("Error processing images: " + err); }
    } else { 
        // Force the seller to upload at least one image
        return alert("Please upload at least one image."); 
    }

    try {
        await axios.post('http://localhost:7071/api/AddProduct', { 
            userId: user.userId, 
            name, 
            price, 
            stock, 
            description, 
            originalPrice: origPrice, 
            category, 
            brand, 
            weight, 
            sku,
            images: processedImages // Send the array of Base64 strings to Azure
        });
        
        alert("✅ Product Added!");
        setIsAddModalOpen(false); 
        loadSellerProducts();
        
        ["pName", "pPrice", "pOrigPrice", "pStock", "pBrand", "pCat", "pWeight", "pSku", "pDesc"].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
        if(fileInput) fileInput.value = ""; 
    } catch (err) { 
        alert("Upload Failed: " + (err.response?.data?.error || err.message)); 
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>🏪 Seller Dashboard</h2>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            + Add New Product
          </button>
        <button
          onClick={() => setIsOrdersModalOpen(true)}
          style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', background: '#007bff', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}
        >
          📦 View My Orders
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {sellerProducts.map((p, i) => (
          <div key={i} style={{ border: '1px solid #ccc', padding: 15, borderRadius: 12, width: 320, background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            {editingProduct?.id === p.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ color: '#007bff', margin: '0 0 5px 0' }}>Editing: {p.name}</h4>
                  
                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Name & SKU</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                      <input value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} style={{ padding: '6px', flex: 2, boxSizing: 'border-box' }} />
                      <input placeholder="SKU" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Pricing (Price vs MRP)</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                      <input type="number" placeholder="MRP" value={editingProduct.originalPrice || ''} onChange={(e) => setEditingProduct({...editingProduct, originalPrice: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Stock & Weight</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="number" value={editingProduct.qty} onChange={(e) => setEditingProduct({...editingProduct, qty: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                      <input type="number" placeholder="Weight" value={editingProduct.weight || ''} onChange={(e) => setEditingProduct({...editingProduct, weight: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Details</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                      <input placeholder="Brand" value={editingProduct.brand || ''} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                      <input placeholder="Category" value={editingProduct.category || ''} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box' }} />
                  </div>

                  <textarea placeholder="Description" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} style={{ padding: '6px', height: '60px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  
                  <label style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px' }}>Gallery (Click ✕ to remove):</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
                    {parseImages(editingProduct.imageUrl).map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '50px', height: '50px' }}>
                        <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} alt="thumb" />
                        <button 
                          onClick={() => {
                            const currentImages = parseImages(editingProduct.imageUrl);
                            const updatedImages = currentImages.filter((_, i) => i !== idx);
                            setEditingProduct({...editingProduct, imageUrl: JSON.stringify(updatedImages)});
                          }}
                          style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Add More Images:</label>
                  <input type="file" multiple onChange={async (e) => {
                      const currentImages = parseImages(editingProduct.imageUrl);
                      const newImages = [];
                      for (let file of e.target.files) {
                        newImages.push(await processFile(file));
                      }
                      setEditingProduct({...editingProduct, imageUrl: JSON.stringify([...currentImages, ...newImages])});
                  }} style={{ fontSize: '11px' }} />

                  <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                    <button onClick={handleUpdateProduct} style={{ flex: 1, background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
                    <button onClick={() => setEditingProduct(null)} style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  </div>
              </div>
            ) : (
              <>
                <ImageGallery images={p.imageUrl} />
                <div style={{ padding: '10px 0' }}>
                    <span style={{ fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>{p.brand || 'No Brand'}</span>
                    <h4 style={{ margin: '5px 0' }}>{p.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Rs.{p.price}</span>
                         {p.originalPrice > p.price && (
                             <>
                                 <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.9rem' }}>Rs.{p.originalPrice}</span>
                                 <span style={{ color: 'green', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                     ({Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF)
                                 </span>
                             </>
                         )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#555' }}>Stock: <strong>{p.qty}</strong> | SKU: {p.sku || 'N/A'}</p>
                    <ReadMore text={p.description} limit={60} />
                </div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <button onClick={() => setEditingProduct(p)} style={{ flex: 1, background: '#ffc107', border: 'none', padding: '10px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                  <button onClick={() => handleDeleteProduct(p.id)} style={{ flex: 1, color: 'red', border: '1px solid red', padding: '10px', borderRadius: 4, background: 'white', cursor: 'pointer' }}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <SellerOrdersModal isOpen={isOrdersModalOpen} onClose={() => setIsOrdersModalOpen(false)} sellerId={user.userId} />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Upload New Product">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
              <label>Product Name *</label>
              <input placeholder="Ex: Premium Silk Saree" id="pName" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
              <label>Price *</label>
              <input placeholder="Current Price" type="number" id="pPrice" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
              <label>Original Price (MRP)</label>
              <input placeholder="For showing discounts" type="number" id="pOrigPrice" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
              <label>Stock *</label>
              <input placeholder="Quantity available" type="number" id="pStock" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
          </div>
          <div>
              <label>Brand</label>
              <input placeholder="Ex: Kancheepuram Arts" id="pBrand" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
              <label>Category</label>
              <input placeholder="Ex: Ethnic Wear" id="pCat" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
              <label>Weight (kg)</label>
              <input placeholder="Ex: 0.8" type="number" step="0.1" id="pWeight" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
              <label>SKU ID</label>
              <input placeholder="Ex: SAR-BLU-001" id="pSku" style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
          </div>
        </div>
        
        <label style={{ fontWeight: 'bold', display: 'block', marginTop: 10 }}>Description</label>
        <textarea id="pDesc" placeholder="Describe your product details, fabric, and care instructions..." style={{ display: 'block', marginBottom: 10, width: '100%', height: '80px', padding: 8 }} />

        <label style={{ fontWeight: 'bold', display: 'block', marginTop: 10 }}>Product Images (Multiple allowed + GIF):</label>
        <input type="file" accept="image/*" multiple id="pImageInput" style={{ display: 'block', marginBottom: 15 }} />

        <button onClick={handleAddProductSubmit} style={{ background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', width: '100%' }}>
          Upload Product
        </button>
      </Modal>
    </div>
  );
};

export default SellerDashboard;