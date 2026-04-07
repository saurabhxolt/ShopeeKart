import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import SellerProfileModal from '../../components/profile/SellerProfileModal';

// Views & Components
import SellerOrdersView from '../../components/orders/SellerOrdersView';
import SellerAnalyticsView from './SellerAnalyticsView';
import SellerInventoryView from './SellerInventoryView';
import SellerSubscriptionView from './SellerSubscriptionView'; 
import AddProductPage from './AddProductPage'; 
import SellerDashboardHeader from './SellerDashboardHeader'; 

const SellerDashboard = ({ user }) => {
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerDetails, setSellerDetails] = useState(null); 
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 🔥 FIX 3: Added loading state
  const [editingProduct, setEditingProduct] = useState(null);
  
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
      // 1. Fetch Products
      const prodRes = await axios.get(`http://localhost:7071/api/GetSellerProducts?userId=${user.userId}`);
      setSellerProducts(prodRes.data);

      // 2. Fetch Seller Profile
      const profileRes = await axios.get(`http://localhost:7071/api/GetSellerProfile?userId=${user.userId}`);
      setSellerDetails(profileRes.data);

      // 3. Fetch Orders
      const orderRes = await axios.get(`http://localhost:7071/api/GetOrders?sellerId=${user.userId}`);
      let rev = 0, pending = 0, total = 0, delivered = 0;
      
      orderRes.data.forEach(o => {
          if (o.Status && !o.Status.includes('Cancelled')) {
              rev += (o.TotalAmount || 0);
              total += 1; 
          }
          if (o.Status === 'Placed' || o.Status === 'Confirmed') pending += 1;
          if (o.Status === 'Delivered') delivered += 1;
      });
      
      setDashboardMetrics({ revenue: rev, pendingOrders: pending, totalOrders: total, deliveredOrders: delivered });
      setIsInitialLoading(false); // 🔥 Stop loading when done

    } catch (err) {
      console.error("Failed to load dashboard data", err);
      showToast("Failed to load dashboard data", "error");
      setIsInitialLoading(false); // 🔥 Stop loading even on error
    }
  }, [user?.userId, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const uniqueCategories = useMemo(() => {
    const cats = sellerProducts.map(p => {
        if (p.targetGender && p.subCategory) {
            return `${p.targetGender} - ${p.subCategory}`;
        }
        return p.mainCategory;
    }).filter(Boolean);
    return ['ALL', ...new Set(cats)].sort();
  }, [sellerProducts]);

  const outOfStockCount = useMemo(() => sellerProducts.filter(p => p.stock <= 0).length, [sellerProducts]);

  const filteredProducts = useMemo(() => {
    return sellerProducts.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const productPath = p.targetGender && p.subCategory 
            ? `${p.targetGender} - ${p.subCategory}` 
            : p.mainCategory;
            
        const matchCategory = categoryFilter === 'ALL' ? true : productPath === categoryFilter;
        
        // 🔥 FIX 1: Check both JavaScript and SQL casings for Trash
        const isTrash = !!(p.isDeleted || p.IsDeleted);
        const matchArchive = archiveFilter === 'ACTIVE' ? !isTrash : isTrash;

        let matchStock = true;
        if (stockFilter === 'OUT_OF_STOCK') {
            matchStock = p.stock <= 0;
        } else if (stockFilter === 'LOW_STOCK') {
            const hasSoldOutVariant = p.variations?.some(v => v.stock <= 0);
            const isCriticallyLow = p.stock > 0 && p.stock < 5;
            matchStock = hasSoldOutVariant || isCriticallyLow;
        } else if (stockFilter === 'IN_STOCK') {
            const allVariantsIn = p.variations?.length > 0 ? p.variations.every(v => v.stock > 0) : p.stock > 0;
            matchStock = p.stock > 0 && allVariantsIn;
        }

        return matchSearch && matchCategory && matchArchive && matchStock;
    });
  }, [sellerProducts, searchTerm, stockFilter, categoryFilter, archiveFilter]);

  const sortedProductStats = useMemo(() => {
    if (!trafficData || !trafficData.productStats) return [];
    return [...trafficData.productStats].sort((a, b) => 
        analyticsSort === 'desc' ? b.views - a.views : a.views - b.views
    );
  }, [trafficData, analyticsSort]);

  const handleUpdateProduct = async () => {
    const { id, name, price, stock, imageUrl, description, originalPrice, category, brand, weight, sku, isActive, gstPercentage, hsnCode, gstConfirm, categoryId, attributes, variations } = editingProduct;
    if (!name || !price || stock === undefined) return showToast("Core fields are required", "error");
    if (gstConfirm !== true) return showToast("You must confirm GST liability.", "error");

    try {
      await axios.post('http://localhost:7071/api/UpdateProduct', { productId: id, name, price, stock, imageUrl, description, originalPrice, category, brand, weight, sku, isActive, gstPercentage, hsnCode, categoryId, attributes, variations });
      showToast("Product Updated Successfully!", "success");
      setEditingProduct(null); 
      loadDashboardData(); 
    } catch (err) { showToast("Update failed", "error"); }
  };

  const handleToggleVisibility = async (product) => {
    if (!user.isApproved) return showToast("Account pending approval.", "error");
    const newStatus = !product.isActive;
    try {
      await axios.post('http://localhost:7071/api/UpdateProduct', { 
          ...product, 
          productId: product.id, 
          isActive: newStatus,
          stock: product.stock 
      });
      loadDashboardData(); 
      showToast(newStatus ? "Product is Live" : "Product hidden", "success");
    } catch (err) { showToast("Status update failed", "error"); }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to move this product to the trash?")) return;
    try {
      await axios.delete(`http://localhost:7071/api/DeleteProduct?productId=${productId}&userId=${user.userId}`);
      showToast("Product moved to trash", "success");
      loadDashboardData();
    } catch (err) { showToast("Delete failed", "error"); }
  };

  const handleRestoreProduct = async (productId) => {
    try {
      await axios.post('http://localhost:7071/api/RestoreProduct', { productId, userId: user.userId });
      showToast("Product Restored!", "success");
      loadDashboardData();
    } catch (err) { showToast("Restore failed", "error"); }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '50px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden', padding: isMobile ? '10px' : '20px' }}>
      
      {!user.isApproved && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '15px 20px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontWeight: '500', width: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div style={{ fontSize: isMobile ? '13px' : '15px' }}>
                <strong>Verification Pending.</strong> Products stay as drafts until your store is approved.
            </div>
        </div>
      )}

      {toast.visible && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745', color: 'white', padding: '16px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
            <span>{toast.type === 'error' ? '⚠️' : '✅'} {toast.message}</span>
        </div>
      )}

      <SellerDashboardHeader 
          isMobile={isMobile}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setIsProfileModalOpen={setIsProfileModalOpen}
          setIsAddModalOpen={() => setViewMode('add-product')} 
      />

      {viewMode === 'add-product' ? (
          // 🔥 FIX 3: Anti-flicker logic
          isInitialLoading ? (
            <div style={{ textAlign: 'center', padding: '100px' }}>Verifying Profile Access...</div>
          ) : (
            <AddProductPage 
              // 🔥 FIX 2: Merged User object to resolve "Missing User ID" error
              user={{ ...user, ...sellerDetails }} 
              isMobile={isMobile} 
              loadDashboardData={loadDashboardData} 
              showToast={showToast} 
              onBack={() => setViewMode('inventory')} 
            />
          )
      ) : viewMode === 'analytics' ? (
          <SellerAnalyticsView isMobile={isMobile} trafficData={trafficData} isTrafficLoading={isTrafficLoading} analyticsDays={analyticsDays} setAnalyticsDays={setAnalyticsDays} analyticsSort={analyticsSort} setAnalyticsSort={setAnalyticsSort} setViewMode={setViewMode} sortedProductStats={sortedProductStats} />
      ) : viewMode === 'subscription' ? (
          <SellerSubscriptionView user={user} isMobile={isMobile} revenue={dashboardMetrics.revenue} />
      ) : viewMode === 'orders' ? (
          <SellerOrdersView sellerId={user.userId} isMobile={isMobile} />
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

      <SellerProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => { setIsProfileModalOpen(false); loadDashboardData(); }} 
        userId={user.userId} 
      />
    </div>
  );
};

export default SellerDashboard;