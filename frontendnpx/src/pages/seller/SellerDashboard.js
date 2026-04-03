import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import SellerProfileModal from '../../components/profile/SellerProfileModal';

// Views & Components
import SellerOrdersView from '../../components/orders/SellerOrdersView'; // ✅ Renamed for clarity
import SellerAnalyticsView from './SellerAnalyticsView';
import SellerInventoryView from './SellerInventoryView';
import SellerSubscriptionView from './SellerSubscriptionView'; 
import AddProductModal from './AddProductModal'; 
import SellerDashboardHeader from './SellerDashboardHeader'; 

const SellerDashboard = ({ user }) => {
  const [sellerProducts, setSellerProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState('inventory'); 

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [archiveFilter, setArchiveFilter] = useState('ACTIVE'); 
  
  const [dashboardMetrics, setDashboardMetrics] = useState({ 
      revenue: 0, 
      pendingOrders: 0, 
      totalOrders: 0, 
      deliveredOrders: 0 
  });

  const [trafficData, setTrafficData] = useState({ summary: {}, productStats: [] });
  const [isTrafficLoading, setIsTrafficLoading] = useState(true);
  const [analyticsDays, setAnalyticsDays] = useState(30); 
  const [analyticsSort, setAnalyticsSort] = useState('desc');

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const toastTimer = useRef(null); 

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
      setToast({ visible: true, message, type });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!user?.userId) return;
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
      console.error("Failed to load dashboard data", err);
      showToast("Failed to load dashboard data", "error");
    }
  }, [user?.userId, showToast]);

  useEffect(() => {
    const fetchTraffic = async () => {
        if (!user?.userId) return;
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

    if (viewMode === 'analytics') {
        fetchTraffic();
    }
  }, [user?.userId, analyticsDays, viewMode]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleUpdateProduct = async () => {
    const { 
        id, name, price, qty, imageUrl, description, originalPrice, 
        category, brand, weight, sku, isActive, gstPercentage, hsnCode, gstConfirm 
    } = editingProduct;
    
    if (!name || !price || qty === undefined) {
        return showToast("Core fields are required", "error");
    }
    
    if (gstConfirm !== true) {
        return showToast("You must tick the box to confirm your GST & HSN liability.", "error");
    }

    try {
      await axios.post('http://localhost:7071/api/UpdateProduct', {
        productId: id, name, price, stock: qty, imageUrl, description, 
        originalPrice, category, brand, weight, sku, isActive, gstPercentage, hsnCode
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
        productId: product.id, name: product.name, price: product.price, stock: product.qty, imageUrl: product.imageUrl, 
        description: product.description, originalPrice: product.originalPrice, category: product.category, brand: product.brand, 
        weight: product.weight, sku: product.sku, isActive: newStatus 
      });
      loadDashboardData(); 
      showToast(newStatus ? "Product is now Live" : "Product hidden (Draft mode)", "success");
    } catch (err) {
      showToast("Status update failed", "error");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to move this product to the trash?")) return;
    try {
      await axios.delete(`http://localhost:7071/api/DeleteProduct?productId=${productId}&userId=${user.userId}`);
      showToast("Product moved to trash", "success");
      loadDashboardData();
    } catch (err) { 
      showToast("Delete failed", "error"); 
    }
  };

  const handleRestoreProduct = async (productId) => {
    try {
      await axios.post('http://localhost:7071/api/RestoreProduct', { productId, userId: user.userId });
      showToast("Product Restored to Active Listings!", "success");
      loadDashboardData();
    } catch (err) { 
      showToast("Restore failed", "error"); 
    }
  };

  const uniqueCategories = useMemo(() => ['ALL', ...new Set(sellerProducts.map(p => p.category).filter(Boolean))], [sellerProducts]);
  const outOfStockCount = useMemo(() => sellerProducts.filter(p => p.qty <= 0).length, [sellerProducts]);

  const filteredProducts = useMemo(() => {
    return sellerProducts.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStock = stockFilter === 'ALL' ? true : (stockFilter === 'OUT_OF_STOCK' ? p.qty <= 0 : p.qty > 0);
        const matchCategory = categoryFilter === 'ALL' ? true : p.category === categoryFilter;
        const matchArchive = archiveFilter === 'ACTIVE' ? !p.isDeleted : p.isDeleted;
        
        return matchSearch && matchStock && matchCategory && matchArchive;
    });
  }, [sellerProducts, searchTerm, stockFilter, categoryFilter, archiveFilter]);

  const sortedProductStats = useMemo(() => {
    if (!trafficData || !trafficData.productStats) return [];
    return [...trafficData.productStats].sort((a, b) => 
        analyticsSort === 'desc' ? b.views - a.views : a.views - b.views
    );
  }, [trafficData, analyticsSort]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden', padding: isMobile ? '10px' : '20px' }}>
      
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

      <SellerDashboardHeader 
          isMobile={isMobile}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setIsProfileModalOpen={setIsProfileModalOpen}
          setIsAddModalOpen={setIsAddModalOpen}
          setIsOrdersModalOpen={setIsOrdersModalOpen}
      />

      {/* ✅ ADDED viewMode === 'orders' logic below */}
      {viewMode === 'analytics' ? (
          <SellerAnalyticsView 
              isMobile={isMobile} trafficData={trafficData} isTrafficLoading={isTrafficLoading}
              analyticsDays={analyticsDays} setAnalyticsDays={setAnalyticsDays}
              analyticsSort={analyticsSort} setAnalyticsSort={setAnalyticsSort}
              setViewMode={setViewMode} sortedProductStats={sortedProductStats}
          />
      ) : viewMode === 'subscription' ? (
          <SellerSubscriptionView 
              user={user} isMobile={isMobile} revenue={dashboardMetrics.revenue} 
          />
      ) : viewMode === 'orders' ? (
          <SellerOrdersView 
              sellerId={user.userId} 
              isMobile={isMobile} 
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
              handleDeleteProduct={handleDeleteProduct} handleRestoreProduct={handleRestoreProduct} 
              archiveFilter={archiveFilter} setArchiveFilter={setArchiveFilter} 
          />
      )}

      {/* Modals */}
      <SellerProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userId={user.userId} />

      <AddProductModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          user={user} 
          isMobile={isMobile} 
          loadDashboardData={loadDashboardData} 
          showToast={showToast} 
      />
    </div>
  );
};

export default SellerDashboard;