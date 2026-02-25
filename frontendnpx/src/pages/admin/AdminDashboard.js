import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnalyticsCards, OverviewTab, OrdersTab, ProductsTab, SellersTab, BuyersTab } from './AdminTabs';
import { ManageOrderModal, ProductReviewModal, SellerReviewModal } from './AdminModals';

// Tab Button Component
const TabButton = ({ label, isActive, onClick, alertCount }) => (
  <button onClick={onClick} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', background: 'none', border: 'none', borderBottom: isActive ? '4px solid #007bff' : '4px solid transparent', color: isActive ? '#007bff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
    {label}
    {alertCount > 0 && <span style={{ background: '#dc3545', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{alertCount}</span>}
  </button>
);

function AdminDashboard({ user }) {
  // Application State
  const [allSellers, setAllSellers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]); 
  
  // Modals & Navigation State
  const [reviewingSeller, setReviewingSeller] = useState(null); 
  const [viewingProduct, setViewingProduct] = useState(null); 
  const [managingOrder, setManagingOrder] = useState(null); 
  const [activeTab, setActiveTab] = useState('overview'); 
  const [productSearch, setProductSearch] = useState('');
  const [orderStoreFilter, setOrderStoreFilter] = useState('ALL'); 

  // Data Fetching
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

  useEffect(() => { fetchData(); }, [activeTab]);

  // Actions
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

  // Data Grouping & Filtering for Props
  const pendingSellers = allSellers.filter(s => !s.IsApproved && !s.IsDeleted);
  const activeSellers = allSellers.filter(s => s.IsApproved && !s.IsDeleted);
  const activeBuyers = allUsers.filter(u => u.Role === 'BUYER' && !u.IsDeleted);
  const totalActiveUsers = allUsers.filter(u => !u.IsDeleted);
  
  const filteredProducts = allProducts.filter(p => p.Name?.toLowerCase().includes(productSearch.toLowerCase()) || p.StoreName?.toLowerCase().includes(productSearch.toLowerCase()));
  
  const uniqueOrderStores = ['ALL', ...new Set(allOrders.map(o => o.StoreName).filter(Boolean))];
  const filteredOrders = allOrders.filter(o => orderStoreFilter === 'ALL' || o.StoreName === orderStoreFilter);

  // Render Shell
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <AnalyticsCards pendingSellers={pendingSellers} activeSellers={activeSellers} activeBuyers={activeBuyers} totalActiveUsers={totalActiveUsers} />

      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '25px', gap: '30px' }}>
        <TabButton label="📊 Action Overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} alertCount={pendingSellers.length} />
        <TabButton label="📦 Product Moderation" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} alertCount={allProducts.filter(p => (p.fixSubmitted || p.FixSubmitted) && p.IsArchived).length} />
        <TabButton label="🚛 All Shipments" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} alertCount={allOrders.filter(o => o.Status === 'Placed' && o.HoursSincePlaced > 48).length} />
        <TabButton label="🏪 Manage Sellers" isActive={activeTab === 'sellers'} onClick={() => setActiveTab('sellers')} />
        <TabButton label="🛍️ Manage Buyers" isActive={activeTab === 'buyers'} onClick={() => setActiveTab('buyers')} />
      </div>

      {activeTab === 'overview' && <OverviewTab pendingSellers={pendingSellers} setReviewingSeller={setReviewingSeller} />}
      {activeTab === 'orders' && <OrdersTab filteredOrders={filteredOrders} uniqueOrderStores={uniqueOrderStores} orderStoreFilter={orderStoreFilter} setOrderStoreFilter={setOrderStoreFilter} setManagingOrder={setManagingOrder} />}
      {activeTab === 'products' && <ProductsTab filteredProducts={filteredProducts} productSearch={productSearch} setProductSearch={setProductSearch} setViewingProduct={setViewingProduct} handleToggleProduct={handleToggleProduct} />}
      {activeTab === 'sellers' && <SellersTab activeSellers={activeSellers} allUsers={allUsers} handleAction={handleAction} />}
      {activeTab === 'buyers' && <BuyersTab activeBuyers={activeBuyers} allUsers={allUsers} handleAction={handleAction} />}

      <ManageOrderModal managingOrder={managingOrder} setManagingOrder={setManagingOrder} handleAction={handleAction} />
      <ProductReviewModal viewingProduct={viewingProduct} setViewingProduct={setViewingProduct} />
      <SellerReviewModal reviewingSeller={reviewingSeller} setReviewingSeller={setReviewingSeller} handleAction={handleAction} />
    </div>
  );
}

export default AdminDashboard;