import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalyticsCards, OverviewTab, OrdersTab, ProductsTab, SellersTab, BuyersTab, SecurityTab, IntelligenceTab } from './AdminTabs';
import { ManageOrderModal, ProductReviewModal, SellerReviewModal } from './AdminModals';

const TabButton = ({ label, isActive, onClick, alertCount }) => (
  <button onClick={onClick} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', background: 'none', border: 'none', borderBottom: isActive ? '4px solid #007bff' : '4px solid transparent', color: isActive ? '#007bff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
    {label}
    {alertCount > 0 && <span style={{ background: '#dc3545', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{alertCount}</span>}
  </button>
);

function AdminDashboard({ user }) {
  const [allSellers, setAllSellers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]); 
  
  const [securityLogs, setSecurityLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Analytics State
  const [trafficData, setTrafficData] = useState({ 
    summary: { TotalHits: 0, UniqueShoppers: 0, MobileUsers: 0, DesktopUsers: 0 }, 
    topShops: [],
    shoppers: []
  });
  
  const [marketplaceStats, setMarketplaceStats] = useState([]);
  const [isTrafficLoading, setIsTrafficLoading] = useState(true);

  // 🔥 NEW: Marketplace Intelligence Filter & Sort State
  const [intelSearch, setIntelSearch] = useState('');
  const [intelCategoryFilter, setIntelCategoryFilter] = useState('ALL');
  const [intelSortKey, setIntelSortKey] = useState('views_desc'); // 'views' or 'shoppers'
  
  const [reviewingSeller, setReviewingSeller] = useState(null); 
  const [viewingProduct, setViewingProduct] = useState(null); 
  const [managingOrder, setManagingOrder] = useState(null); 
  const [activeTab, setActiveTab] = useState('overview'); 
  const [productSearch, setProductSearch] = useState('');
  const [orderStoreFilter, setOrderStoreFilter] = useState('ALL'); 

  const fetchData = async () => {
    try {
      const [sellerRes, userRes, productRes, orderRes] = await Promise.all([
        axios.get('http://localhost:7071/api/GetSellers?all=true'),
        axios.get('http://localhost:7071/api/GetUsers'),
        axios.get('http://localhost:7071/api/GetAdminProducts'),
        axios.get('http://localhost:7071/api/GetAdminOrders')
      ]);
      setAllSellers(sellerRes.data);
      setAllUsers(userRes.data);
      setAllProducts(productRes.data);
      setAllOrders(orderRes.data);
    } catch (err) {
      console.error("Failed to load admin data");
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
        setIsTrafficLoading(true);
        try {
            const [trafficRes, intelRes] = await Promise.all([
                axios.get('http://localhost:7071/api/GetAdminAnalytics'),
                axios.get('http://localhost:7071/api/GetMarketplaceIntelligence')
            ]);
            setTrafficData(trafficRes.data);
            setMarketplaceStats(intelRes.data);
        } catch (err) {
            console.error("Failed to load analytics", err);
        } finally {
            setIsTrafficLoading(false);
        }
    };
    fetchAnalytics();
  }, [activeTab]); 

  useEffect(() => { fetchData(); }, [activeTab]);

  useEffect(() => {
      const fetchSecurityLogs = async () => {
          setIsLogsLoading(true);
          try {
              const res = await axios.get('http://localhost:7071/api/GetSecurityLogs');
              setSecurityLogs(res.data);
          } catch (err) {
              console.error("Failed to load logs");
          } finally {
              setIsLogsLoading(false);
          }
      };
      if (activeTab === 'security') {
          fetchSecurityLogs();
      }
  }, [activeTab]); 

  const handleArchiveAndClean = async () => {
    if (!window.confirm("This will download a CSV report of all security logs from the last 180 days. Proceed?")) return;
    try {
        const res = await axios.post('http://localhost:7071/api/ArchiveSecurityLogs', {}, { responseType: 'blob' });
        if (res.data.type === 'text/plain') {
            const text = await res.data.text();
            if (text === "NO_LOGS") {
                alert("No logs found for the last 180 days.");
                return;
            }
        }
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Security_Report_180Days_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        alert("180-Day Report successfully downloaded!");
    } catch (err) {
        alert("Export process failed.");
        console.error(err);
    }
  };

  const handleAction = async (action, targetId) => {
    if (action === 'DELETE_USER' && !window.confirm("⚠️ Are you sure? This will 'Soft Delete' the user and hide their data.")) return;
    if (action === 'FORCE_CANCEL_ORDER' && !window.confirm("⚠️ Force Cancel this order? This will mark it cancelled for both buyer and seller.")) return;
    try {
      await axios.post('http://localhost:7071/api/super-task', { action, targetId });
      setReviewingSeller(null); setViewingProduct(null); setManagingOrder(null); 
      fetchData(); 
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  const handleToggleProduct = async (product) => {
      let adminMessage = "";
      if (product.IsArchived) {
          const confirmMsg = product.FixSubmitted 
            ? `Seller has modified "${product.Name}". \n\nOriginal Takedown Reason: ${product.AdminMessage || 'None'}\n\nDo you want to approve the changes and unhide it?`
            : `Do you want to unhide "${product.Name}" and make it live again?`;
          if (!window.confirm(confirmMsg)) return;
      } else {
          adminMessage = window.prompt(`Enter reason for taking down "${product.Name}":\n(The seller will see this message)`);
          if (adminMessage === null) return;
          if (adminMessage.trim() === "") return alert("A reason is required to take down a product.");
      }
      try {
          await axios.post('http://localhost:7071/api/super-task', { action: 'TOGGLE_PRODUCT', targetId: product.ProductId, message: adminMessage, clearFixFlag: product.IsArchived ? true : false });
          fetchData(); 
      } catch (err) { alert("Action failed: " + err.message); }
  };

  const pendingSellers = allSellers.filter(s => !s.IsApproved && !s.IsDeleted);
  const activeSellers = allSellers.filter(s => s.IsApproved && !s.IsDeleted);
  const activeBuyers = allUsers.filter(u => u.Role === 'BUYER' && !u.IsDeleted);
  const totalActiveUsers = allUsers.filter(u => !u.IsDeleted);
  
  const filteredProducts = allProducts.filter(p => p.Name?.toLowerCase().includes(productSearch.toLowerCase()) || p.StoreName?.toLowerCase().includes(productSearch.toLowerCase()));
  
  const uniqueOrderStores = ['ALL', ...new Set(allOrders.map(o => o.StoreName).filter(Boolean))];
  const filteredOrders = allOrders.filter(o => orderStoreFilter === 'ALL' || o.StoreName === orderStoreFilter);

  // 🔥 NEW: Filter and Sort Logic for Marketplace Intelligence (90 Days)
  // 🔥 UPDATED: Added 'purchases' to the sort and filter logic
  const filteredIntel = marketplaceStats
    .filter(item => 
        (item.productName?.toLowerCase().includes(intelSearch.toLowerCase()) || 
         item.storeName?.toLowerCase().includes(intelSearch.toLowerCase())) &&
        (intelCategoryFilter === 'ALL' || item.category === intelCategoryFilter)
    )
    .sort((a, b) => {
        const [key, direction] = intelSortKey.split('_');
        if (direction === 'asc') {
            return a[key] - b[key]; // Lowest to Highest
        } else {
            return b[key] - a[key]; // Highest to Lowest
        }
    });

  const uniqueIntelCategories = ['ALL', ...new Set(marketplaceStats.map(item => item.category).filter(Boolean))];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <AnalyticsCards 
        pendingSellers={pendingSellers} 
        activeSellers={activeSellers} 
        activeBuyers={activeBuyers} 
        totalActiveUsers={totalActiveUsers} 
        trafficSummary={trafficData.summary}
        isTrafficLoading={isTrafficLoading}
      />

      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '25px', gap: '30px', overflowX: 'auto' }}>
        <TabButton label="📊 Action Overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} alertCount={pendingSellers.length} />
        <TabButton label="📈 Marketplace Intelligence" isActive={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} />
        <TabButton label="📦 Product Moderation" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} alertCount={allProducts.filter(p => (p.fixSubmitted || p.FixSubmitted) && p.IsArchived).length} />
        <TabButton label="🚛 All Shipments" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} alertCount={allOrders.filter(o => o.Status === 'Placed' && o.HoursSincePlaced > 48).length} />
        <TabButton label="🏪 Manage Sellers" isActive={activeTab === 'sellers'} onClick={() => setActiveTab('sellers')} />
        <TabButton label="🛍️ Manage Buyers" isActive={activeTab === 'buyers'} onClick={() => setActiveTab('buyers')} />
        <TabButton label="🛡️ Security & Logs" isActive={activeTab === 'security'} onClick={() => setActiveTab('security')} />
      </div>

      {activeTab === 'overview' && (
        <OverviewTab 
            pendingSellers={pendingSellers} 
            setReviewingSeller={setReviewingSeller} 
            topShops={trafficData.topShops}
            shoppers={trafficData.shoppers} 
        />
      )}

      {/* 🔥 UPDATED Intelligence Tab with Filter/Sort Props */}
      {activeTab === 'intelligence' && (
        <IntelligenceTab 
            stats={filteredIntel} 
            isTrafficLoading={isTrafficLoading}
            intelSearch={intelSearch}
            setIntelSearch={setIntelSearch}
            intelCategoryFilter={intelCategoryFilter}
            setIntelCategoryFilter={setIntelCategoryFilter}
            intelSortKey={intelSortKey}
            setIntelSortKey={setIntelSortKey}
            uniqueCategories={uniqueIntelCategories}
        />
      )}
      
      {activeTab === 'orders' && <OrdersTab filteredOrders={filteredOrders} uniqueOrderStores={uniqueOrderStores} orderStoreFilter={orderStoreFilter} setOrderStoreFilter={setOrderStoreFilter} setManagingOrder={setManagingOrder} />}
      {activeTab === 'products' && <ProductsTab filteredProducts={filteredProducts} productSearch={productSearch} setProductSearch={setProductSearch} setViewingProduct={setViewingProduct} handleToggleProduct={handleToggleProduct} />}
      {activeTab === 'sellers' && <SellersTab activeSellers={activeSellers} allUsers={allUsers} handleAction={handleAction} />}
      {activeTab === 'buyers' && <BuyersTab activeBuyers={activeBuyers} allUsers={allUsers} handleAction={handleAction} />}
      
      {activeTab === 'security' && (
        <SecurityTab 
            logs={securityLogs} 
            isLogsLoading={isLogsLoading} 
            handleArchiveAndClean={handleArchiveAndClean} 
        />
      )}

      <ManageOrderModal managingOrder={managingOrder} setManagingOrder={setManagingOrder} handleAction={handleAction} />
      <ProductReviewModal viewingProduct={viewingProduct} setViewingProduct={setViewingProduct} />
      <SellerReviewModal reviewingSeller={reviewingSeller} setReviewingSeller={setReviewingSeller} handleAction={handleAction} />
    </div>
  );
}

export default AdminDashboard;