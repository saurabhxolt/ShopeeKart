import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { processFile } from '../../utils/imageHelpers';
import Modal from '../../components/common/Modal';
import SellerOrdersModal from '../../components/orders/SellerOrdersModal';
import SellerProfileModal from '../../components/profile/SellerProfileModal';

// 🔥 IMPORT YOUR NEW SPLIT COMPONENTS
import SellerAnalyticsView from './SellerAnalyticsView';
import SellerInventoryView from './SellerInventoryView';

const SellerDashboard = ({ user }) => {
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 🔥 NEW NAVIGATION: Toggle between Inventory and Analytics
  const [viewMode, setViewMode] = useState('inventory'); 

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const [dashboardMetrics, setDashboardMetrics] = useState({ 
      revenue: 0, 
      pendingOrders: 0, 
      totalOrders: 0, 
      deliveredOrders: 0 
  });

  // 🔥 UPDATED ANALYTICS STATE: Added sorting and day filters
  const [trafficData, setTrafficData] = useState({ summary: {}, productStats: [] });
  const [isTrafficLoading, setIsTrafficLoading] = useState(true);
  const [analyticsDays, setAnalyticsDays] = useState(30); 
  const [analyticsSort, setAnalyticsSort] = useState('desc');

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // 🔥 ADDED: Viewport detection for mobile responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // 🔥 UPDATED: Dynamic fetch based on days selected
  // 🔥 UPDATED: Now fetches fresh data the moment you click "View Insights"
  useEffect(() => {
    const fetchTraffic = async () => {
        if (!user.userId) return;
        setIsTrafficLoading(true);
        try {
            const res = await axios.get(`http://localhost:7071/api/GetSellerAnalytics?sellerId=${user.userId}&days=${analyticsDays}`);
            setTrafficData(res.data);
        } catch (err) {
            console.error("Failed to load seller analytics", err);
        } finally {
            setIsTrafficLoading(false);
        }
    };

    // 🔥 ONLY fetch if the seller is currently looking at the analytics page
    if (viewMode === 'analytics') {
        fetchTraffic();
    }
    
  // Notice we added 'viewMode' to this array so React knows to trigger this when the view changes
  }, [user.userId, analyticsDays, viewMode]);

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

  const sortedProductStats = useMemo(() => {
    if (!trafficData || !trafficData.productStats) return [];
    return [...trafficData.productStats].sort((a, b) => 
        analyticsSort === 'desc' ? b.views - a.views : a.views - b.views
    );
  }, [trafficData, analyticsSort]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden', padding: isMobile ? '10px' : '20px' }}>
      
      {/* Pending Approval Banner */}
      {!user.isApproved && (
        <div style={{
            background: '#fff3cd', color: '#856404', padding: '15px 20px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontWeight: '500', width: '100%', boxSizing: 'border-box'
        }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div style={{ fontSize: isMobile ? '13px' : '15px' }}>
                <strong>Your account is pending admin approval.</strong> Your products will be saved as drafts and will not be visible to buyers until your store is verified.
            </div>
        </div>
      )}

      {toast.visible && (
        <div style={{
            position: 'fixed', bottom: '30px', right: '30px', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', fontWeight: 'bold', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', transition: 'opacity 0.3s ease-in-out', opacity: 1, maxWidth: 'calc(100vw - 60px)'
        }}>
            <span style={{ fontSize: '20px' }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: isMobile ? '15px' : '0' }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? '22px' : '24px' }}>🏪 {viewMode === 'inventory' ? 'Seller Dashboard' : 'Store Insights'}</h2>
          
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* 🔥 Toggle button for Insights view */}
            {viewMode === 'inventory' ? (
                <button onClick={() => setViewMode('analytics')} style={{ backgroundColor: '#f6d365', color: '#bf360c', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📈 View Insights
                </button>
            ) : (
                <button onClick={() => setViewMode('inventory')} style={{ backgroundColor: '#eee', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📦 Manage Products
                </button>
            )}
            
            <button onClick={() => setIsProfileModalOpen(true)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>
                ⚙️ Store Settings
            </button>
            <button onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>
                + Add New Product
            </button>
            <button onClick={() => setIsOrdersModalOpen(true)} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', background: '#007bff', color: 'white', borderRadius: '8px', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>
                📦 View My Orders
            </button>
          </div>
      </div>

      {/* 🔥 SWITCH CONTENT BASED ON VIEWMODE */}
      {viewMode === 'analytics' ? (
          <SellerAnalyticsView 
              isMobile={isMobile} trafficData={trafficData} isTrafficLoading={isTrafficLoading}
              analyticsDays={analyticsDays} setAnalyticsDays={setAnalyticsDays}
              analyticsSort={analyticsSort} setAnalyticsSort={setAnalyticsSort}
              setViewMode={setViewMode} sortedProductStats={sortedProductStats}
          />
      ) : (
          <SellerInventoryView 
              isMobile={isMobile} dashboardMetrics={dashboardMetrics} outOfStockCount={outOfStockCount}
              trafficData={trafficData} isTrafficLoading={isTrafficLoading} 
              setIsOrdersModalOpen={setIsOrdersModalOpen} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} uniqueCategories={uniqueCategories}
              stockFilter={stockFilter} setStockFilter={setStockFilter} filteredProducts={filteredProducts}
              editingProduct={editingProduct} setEditingProduct={setEditingProduct}
              handleUpdateProduct={handleUpdateProduct} handleToggleVisibility={handleToggleVisibility}
              handleDeleteProduct={handleDeleteProduct}
          />
      )}

      {/* Modals */}
      <SellerProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userId={user.userId} />
      <SellerOrdersModal isOpen={isOrdersModalOpen} onClose={() => { setIsOrdersModalOpen(false); loadDashboardData(); }} sellerId={user.userId} />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Upload New Product" width={isMobile ? "100%" : "800px"}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
          <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Product Name *</label>
              <input placeholder="Ex: Premium Silk Saree" id="pName" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Price *</label>
              <input placeholder="Current Price" type="number" id="pPrice" style={{ display: 'block', marginBottom: 15, width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
              
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Original Price (MRP)</label>
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
        <label style={{ fontWeight: 'bold', display: 'block', marginTop: 10, fontSize: '13px', color: '#555' }}>Description</label>
        <textarea id="pDesc" placeholder="Describe your product details, fabric, and care instructions..." style={{ display: 'block', marginBottom: 15, width: '100%', height: '80px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }} />
        
        <label style={{ fontWeight: 'bold', display: 'block', marginTop: 10, fontSize: '13px', color: '#555' }}>Product Images (Multiple allowed + GIF):</label>
        <input type="file" accept="image/*" multiple id="pImageInput" style={{ display: 'block', marginBottom: 25, width: '100%' }} />
        
        <button onClick={handleAddProductSubmit} style={{ background: '#007bff', color: 'white', border: 'none', padding: '14px 24px', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', width: '100%', fontSize: '16px' }}>
          Upload Product
        </button>
      </Modal>
    </div>
  );
};

export default SellerDashboard;