import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { processFile, parseImages } from '../../utils/imageHelpers';
import Modal from '../../components/common/Modal';
import ReadMore from '../../components/common/ReadMore';
import ImageGallery from '../../components/common/ImageGallery';
import SellerOrdersModal from '../../components/orders/SellerOrdersModal';
import SellerProfileModal from '../../components/profile/SellerProfileModal';

const SellerDashboard = ({ user }) => {
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const [dashboardMetrics, setDashboardMetrics] = useState({ 
      revenue: 0, 
      pendingOrders: 0, 
      totalOrders: 0, 
      deliveredOrders: 0 
  });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
      setToast({ visible: true, message, type });
      setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const loadDashboardData = async () => {
    try {
      const prodRes = await axios.get(`http://localhost:7071/api/GetSellerProducts?userId=${user.userId}`);
      setSellerProducts(prodRes.data);

      const orderRes = await axios.get(`http://localhost:7071/api/GetOrders?sellerId=${user.userId}`);
      let rev = 0;
      let pending = 0;
      let total = 0;
      let delivered = 0;
      
      orderRes.data.forEach(o => {
          if (o.Status && !o.Status.includes('Cancelled')) {
              rev += (o.TotalAmount || 0);
              total += 1; 
          }
          if (o.Status === 'Placed' || o.Status === 'Confirmed') pending += 1;
          if (o.Status === 'Delivered') delivered += 1;
      });
      
      setDashboardMetrics({ revenue: rev, pendingOrders: pending, totalOrders: total, deliveredOrders: delivered });

    } catch (err) {
      console.error("Failed to load dashboard data");
      showToast("Failed to load dashboard data", "error");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user.userId]);

  const handleUpdateProduct = async () => {
    const { id, name, price, qty, imageUrl, description, originalPrice, category, brand, weight, sku, isActive } = editingProduct;
    if (!name || !price || qty === undefined) return showToast("Core fields are required", "error");

    try {
      await axios.post('http://localhost:7071/api/UpdateProduct', {
        productId: id, name, price, stock: qty, imageUrl, description, originalPrice, category, brand, weight, sku, isActive
      });
      showToast("Product Updated Successfully!", "success");
      setEditingProduct(null); 
      loadDashboardData(); 
    } catch (err) {
      showToast("Update failed: " + (err.response?.data || err.message), "error");
    }
  };

  const handleToggleVisibility = async (product) => {
    // 🔥 NEW: Prevent unapproved sellers from making products live
    if (!user.isApproved) {
        return showToast("Account pending approval. You cannot make products live yet.", "error");
    }

    const newStatus = product.isActive === false ? true : false;
    
    try {
      await axios.post('http://localhost:7071/api/UpdateProduct', {
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        stock: product.qty, 
        imageUrl: product.imageUrl, 
        description: product.description, 
        originalPrice: product.originalPrice, 
        category: product.category, 
        brand: product.brand, 
        weight: product.weight, 
        sku: product.sku, 
        isActive: newStatus 
      });
      loadDashboardData(); 
      showToast(newStatus ? "Product is now Live" : "Product hidden (Draft mode)", "success");
    } catch (err) {
      showToast("Status update failed", "error");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`http://localhost:7071/api/DeleteProduct?productId=${productId}&userId=${user.userId}`);
      showToast("Product Deleted", "success");
      loadDashboardData();
    } catch (err) { 
      showToast("Delete failed", "error"); 
    }
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

    if (!name || !price || !stock) return showToast("Please fill all required text fields (*)", "error");
    
    let processedImages = [];
    if (fileInput.files.length > 0) {
        try {
            for (let i = 0; i < fileInput.files.length; i++) {
                 const base64 = await processFile(fileInput.files[i]);
                 processedImages.push(base64); 
            }
        } catch (err) { return showToast("Error processing images", "error"); }
    } else { 
        return showToast("Please upload at least one image.", "error"); 
    }

    try {
        await axios.post('http://localhost:7071/api/AddProduct', { 
            userId: user.userId, name, price, stock, description, originalPrice: origPrice, 
            category, brand, weight, sku, images: processedImages, 
            // 🔥 NEW: Products from unapproved sellers stay as drafts (isActive: false)
            isActive: user.isApproved ? true : false 
        });
        
        showToast(user.isApproved ? "Product Added Successfully!" : "Product Saved as Draft (Pending Approval)", "success");
        setIsAddModalOpen(false); 
        loadDashboardData();
        
        ["pName", "pPrice", "pOrigPrice", "pStock", "pBrand", "pCat", "pWeight", "pSku", "pDesc"].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
        if(fileInput) fileInput.value = ""; 
    } catch (err) { 
        showToast("Upload Failed: " + (err.response?.data?.error || err.message), "error"); 
    }
  };

  const uniqueCategories = ['ALL', ...new Set(sellerProducts.map(p => p.category).filter(Boolean))];
  const outOfStockCount = sellerProducts.filter(p => p.qty <= 0).length;

  const filteredProducts = sellerProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStock = stockFilter === 'ALL' ? true : (stockFilter === 'OUT_OF_STOCK' ? p.qty <= 0 : p.qty > 0);
      const matchCategory = categoryFilter === 'ALL' ? true : p.category === categoryFilter;
      return matchSearch && matchStock && matchCategory;
  });

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* 🔥 NEW: Pending Approval Banner */}
      {!user.isApproved && (
        <div style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '15px 20px',
            borderRadius: '8px',
            border: '1px solid #ffeeba',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            fontWeight: '500'
        }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div>
                <strong>Your account is pending admin approval.</strong> Your products will be saved as drafts and will not be visible to buyers until your store is verified.
            </div>
        </div>
      )}

      {toast.visible && (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            fontWeight: 'bold',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'opacity 0.3s ease-in-out',
            opacity: 1
        }}>
            <span style={{ fontSize: '20px' }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>🏪 Seller Dashboard</h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsProfileModalOpen(true)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                ⚙️ Store Settings
            </button>
            <button onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Add New Product
            </button>
            <button onClick={() => setIsOrdersModalOpen(true)} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', background: '#007bff', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>
                📦 View My Orders
            </button>
          </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #28a745' }}>
              <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>Rs. {dashboardMetrics.revenue}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #17a2b8' }}>
              <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Orders</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>{dashboardMetrics.totalOrders}</div>
          </div>
          <div 
              onClick={() => setIsOrdersModalOpen(true)}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
              style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #ffc107', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
              <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  Pending Orders <span style={{fontSize: '14px'}}>👆</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>{dashboardMetrics.pendingOrders}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #007bff' }}>
              <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Delivered</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>{dashboardMetrics.deliveredOrders}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${outOfStockCount > 0 ? '#dc3545' : '#e9ecef'}` }}>
              <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Out of Stock</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: outOfStockCount > 0 ? '#dc3545' : '#333', marginTop: '5px' }}>{outOfStockCount}</div>
          </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
          <input type="text" placeholder="🔍 Search by Name or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              {uniqueCategories.map(cat => ( <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat.toUpperCase()}</option> ))}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
      </div>

      {/* Product List */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {filteredProducts.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '40px', color: '#888' }}>No products match your search or filters.</div>
        ) : (
            filteredProducts.map((p, i) => (
            <div key={i} style={{ 
                border: p.isArchived ? '2px solid #dc3545' : '1px solid #ccc', padding: 15, borderRadius: 12, width: 320, background: p.isArchived ? '#fff5f5' : 'white', 
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'relative', 
                opacity: (p.qty <= 0 || p.isActive === false) ? 0.6 : 1, 
                transition: 'all 0.3s ease' 
            }}>
                
                {p.isArchived ? (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#dc3545', color: 'white', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', zIndex: 10, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', border: '2px solid white' }}>
                        🚫 TAKEN DOWN BY ADMIN
                    </div>
                ) : p.qty <= 0 ? (
                    <div style={{ position: 'absolute', top: '25px', left: '25px', background: '#dc3545', color: 'white', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', zIndex: 10, letterSpacing: '1px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        OUT OF STOCK
                    </div>
                ) : p.isActive === false && (
                    <div style={{ position: 'absolute', top: '25px', right: '25px', background: '#6c757d', color: 'white', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', zIndex: 10, letterSpacing: '1px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        DRAFT (HIDDEN)
                    </div>
                )}

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
                            <button onClick={() => {
                                const currentImages = parseImages(editingProduct.imageUrl);
                                const updatedImages = currentImages.filter((_, i) => i !== idx);
                                setEditingProduct({...editingProduct, imageUrl: JSON.stringify(updatedImages)});
                            }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        ))}
                    </div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Add More Images:</label>
                    <input type="file" multiple onChange={async (e) => {
                        const currentImages = parseImages(editingProduct.imageUrl);
                        const newImages = [];
                        for (let file of e.target.files) { newImages.push(await processFile(file)); }
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

                        <p style={{ fontSize: '13px', color: '#555', marginBottom: '5px' }}>Stock: <strong style={{ color: p.qty <= 0 ? 'red' : 'inherit' }}>{p.qty}</strong> | SKU: {p.sku || 'N/A'}</p>
                        
                        <div style={{ maxHeight: '75px', overflowY: 'auto', wordBreak: 'break-word', paddingRight: '5px', marginBottom: '10px', fontSize: '13px', color: '#555' }}>
                            <ReadMore text={p.description} limit={60} />
                        </div>
                    </div>

                    {/* MODERATION ALERT BOX - ALWAYS SHOW IF ARCHIVED */}
                    {p.isArchived && (
                        <div style={{ padding: '12px', background: '#ffeeba', color: '#856404', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #ffe8a1', marginTop: '10px', marginBottom: '10px', lineHeight: '1.4' }}>
                            ⚠️ Moderation Alert<br/>
                            <span style={{ fontWeight: 'normal', color: '#666' }}>
                                {p.adminMessage ? `Reason: ${p.adminMessage}` : 'This product violates platform policies and has been taken down.'}
                            </span>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                        {/* 🔥 UPDATED: Toggle visibility check */}
                        <button 
                            disabled={p.isArchived}
                            onClick={() => handleToggleVisibility(p)} 
                            style={{ 
                                flex: 1, 
                                background: p.isArchived ? '#ccc' : (p.isActive === false ? '#28a745' : '#6c757d'), 
                                color: 'white', 
                                border: 'none', 
                                padding: '8px', 
                                borderRadius: 4, 
                                cursor: p.isArchived ? 'not-allowed' : 'pointer', 
                                fontWeight: 'bold', 
                                fontSize: '12px' 
                            }}
                        >
                            {p.isArchived ? '🚫 Locked' : (p.isActive === false ? '✅ Set Active' : '👁️ Hide / Draft')}
                        </button>

                        <button onClick={() => setEditingProduct(p)} style={{ flex: 1, background: '#ffc107', border: 'none', padding: '8px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Edit</button>
                        <button onClick={() => handleDeleteProduct(p.id)} style={{ flex: 1, color: 'red', border: '1px solid red', padding: '8px', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                </>
                )}
            </div>
            ))
        )}
      </div>

      <SellerProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userId={user.userId} />
      <SellerOrdersModal isOpen={isOrdersModalOpen} onClose={() => { setIsOrdersModalOpen(false); loadDashboardData(); }} sellerId={user.userId} />

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