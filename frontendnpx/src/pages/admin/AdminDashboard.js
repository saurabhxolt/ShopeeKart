import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ user }) {
  const [allSellers, setAllSellers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // 🔥 NEW: Added state for Orders
  
  const [reviewingSeller, setReviewingSeller] = useState(null); 
  const [viewingProduct, setViewingProduct] = useState(null); 
  const [managingOrder, setManagingOrder] = useState(null); // 🔥 NEW: State for Order Manage Modal
  
  const [activeTab, setActiveTab] = useState('overview'); 
  const [productSearch, setProductSearch] = useState('');
  const [orderStoreFilter, setOrderStoreFilter] = useState('ALL'); // 🔥 NEW: Store Filter State

  const fetchData = async () => {
    try {
      const sellerRes = await axios.get('http://localhost:7071/api/GetSellers?all=true');
      setAllSellers(sellerRes.data);
      
      const userRes = await axios.get('http://localhost:7071/api/GetUsers');
      setAllUsers(userRes.data);

      const productRes = await axios.get('http://localhost:7071/api/GetAdminProducts');
      setAllProducts(productRes.data);

      // 🔥 NEW: Fetching Orders from the new API
      const orderRes = await axios.get('http://localhost:7071/api/GetAdminOrders');
      setAllOrders(orderRes.data);

    } catch (err) {
      console.error("Failed to load admin data");
    }
  };

  const handleAction = async (action, targetId) => {
    if (action === 'DELETE_USER') {
      if (!window.confirm("⚠️ Are you sure? This will 'Soft Delete' the user and hide their data.")) return;
    }
    // 🔥 NEW: Confirmation for Admin Force Cancel
    if (action === 'FORCE_CANCEL_ORDER') {
      if (!window.confirm("⚠️ Force Cancel this order? This will mark it cancelled for both buyer and seller.")) return;
    }

    try {
      await axios.post('http://localhost:7071/api/super-task', { action, targetId });
      setReviewingSeller(null); 
      setViewingProduct(null); 
      setManagingOrder(null); // Close order modal on success
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
          if (adminMessage.trim() === "") {
              alert("A reason is required to take down a product.");
              return;
          }
      }

      try {
          await axios.post('http://localhost:7071/api/super-task', { 
              action: 'TOGGLE_PRODUCT', 
              targetId: product.ProductId,
              message: adminMessage,
              clearFixFlag: product.IsArchived ? true : false 
          });
          fetchData(); 
      } catch (err) {
          alert("Action failed: " + err.message);
      }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const getRowStyle = (isDeleted) => ({
    background: isDeleted ? '#f5f5f5' : 'white',
    color: isDeleted ? '#999' : '#333',
    borderBottom: '1px solid #eee',
    opacity: isDeleted ? 0.8 : 1
  });

  const openDocSafe = (docString) => {
    if (docString.startsWith('data:')) {
        const mimeType = docString.split(';')[0].split(':')[1];
        const base64Data = docString.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new Blob([byteArray], { type: mimeType });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
    } else {
        window.open(docString, '_blank');
    }
  };

  const getPrimaryImage = (imageStr) => {
      if (!imageStr) return null;
      try {
          const parsed = JSON.parse(imageStr);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch (e) { return imageStr; }
      return null;
  };

  // Groupings
  const pendingSellers = allSellers.filter(s => !s.IsApproved && !s.IsDeleted);
  const activeSellers = allSellers.filter(s => s.IsApproved && !s.IsDeleted);
  const deletedSellers = allSellers.filter(s => s.IsDeleted);
  const activeBuyers = allUsers.filter(u => u.Role === 'BUYER' && !u.IsDeleted);
  const totalActiveUsers = allUsers.filter(u => !u.IsDeleted);

  const filteredProducts = allProducts.filter(p => 
      p.Name?.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.StoreName?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // 🔥 NEW: Logic for filtering Orders by Seller
  const uniqueOrderStores = ['ALL', ...new Set(allOrders.map(o => o.StoreName).filter(Boolean))];
  const filteredOrders = allOrders.filter(o => {
      if (orderStoreFilter === 'ALL') return true;
      return o.StoreName === orderStoreFilter;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* --- 1. KPI ANALYTICS CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '35px' }}>
        <div style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#fff' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#c0392b' }}>⏳ Pending Approvals</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#c0392b' }}>{pendingSellers.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#0d47a1' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>🏪 Active Shops</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{activeSellers.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#006266' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>🛍️ Registered Buyers</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{activeBuyers.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#4a00e0' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>👥 Total Active Users</h4>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{totalActiveUsers.length}</div>
        </div>
      </div>

      {/* --- 2. TAB NAVIGATION BAR --- */}
      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '25px', gap: '30px' }}>
        <TabButton label="📊 Action Overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} alertCount={pendingSellers.length} />
        <TabButton label="📦 Product Moderation" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} alertCount={allProducts.filter(p => (p.fixSubmitted || p.FixSubmitted) && p.IsArchived).length} />
        
        {/* 🔥 SHIPMENTS TAB ADDED HERE */}
        <TabButton label="🚛 All Shipments" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} alertCount={allOrders.filter(o => o.Status === 'Placed' && o.HoursSincePlaced > 48).length} />
        
        <TabButton label="🏪 Manage Sellers" isActive={activeTab === 'sellers'} onClick={() => setActiveTab('sellers')} />
        <TabButton label="🛍️ Manage Buyers" isActive={activeTab === 'buyers'} onClick={() => setActiveTab('buyers')} />
      </div>

      {/* --- 3. DYNAMIC CONTENT RENDERING --- */}
      
      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="tab-content fade-in">
          <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid #007bff' }}>
            <h2 style={{ color: '#0d47a1', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⏳ Awaiting Shop Approvals ({pendingSellers.length})
            </h2>
            {pendingSellers.length === 0 ? (
              <p style={{ color: '#555', fontStyle: 'italic' }}>All caught up! No pending shops.</p>
            ) : (
              <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#1976d2', color: 'white', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Store Name</th>
                    <th style={{ padding: '12px' }}>Owner</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSellers.map((s) => (
                    <tr key={s.SellerId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.StoreName || 'Unnamed'}</td>
                      <td style={{ padding: '12px' }}>{s.FullName}</td>
                      <td style={{ padding: '12px' }}>{s.Email}</td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => setReviewingSeller(s)} style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold' }}>🔍 Review Shop</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 🔥 TAB: SHIPMENTS & ORDERS */}
      {activeTab === 'orders' && (
        <div className="tab-content fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ color: '#495057', margin: 0 }}>🚛 Global Order Lifecycle ({filteredOrders.length})</h2>
              
              {/* FILTER DROPDOWN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Filter by Seller:</span>
                  <select 
                      value={orderStoreFilter} 
                      onChange={(e) => setOrderStoreFilter(e.target.value)} 
                      style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', minWidth: '200px' }}
                  >
                      {uniqueOrderStores.map(store => (
                          <option key={store} value={store}>{store === 'ALL' ? 'Show All Orders' : store}</option>
                      ))}
                  </select>
              </div>
          </div>
          
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#343a40', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>Order ID</th>
                  <th style={{ padding: '15px' }}>Parties (Buyer & Seller)</th>
                  <th style={{ padding: '15px' }}>Current Status</th>
                  <th style={{ padding: '15px' }}>Order Age</th>
                  <th style={{ padding: '15px' }}>Amount</th>
                  <th style={{ padding: '15px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const isStale = o.Status === 'Placed' && o.HoursSincePlaced > 48;
                  return (
                    <tr key={o.OrderId} style={{ borderBottom: '1px solid #eee', backgroundColor: isStale ? '#fff3cd' : 'white' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>#{o.OrderId}</td>
                      <td style={{ padding: '15px' }}>
                        <strong>Buyer:</strong> {o.BuyerName} <br/>
                        <strong>Store:</strong> {o.StoreName || 'Multi-Vendor'} (<small>{o.SellerPhone || 'No Phone'}</small>)
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                          background: o.Status === 'Delivered' ? '#d4edda' : (o.Status === 'Cancelled' ? '#f8d7da' : '#e2e3e5'),
                          color: o.Status === 'Delivered' ? '#155724' : (o.Status === 'Cancelled' ? '#721c24' : '#383d41')
                        }}>{o.Status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ color: isStale ? '#856404' : '#666', fontWeight: isStale ? 'bold' : 'normal' }}>
                          {o.HoursSincePlaced} hrs ago
                          {isStale && <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#dc3545', marginTop: '4px' }}>⚠️ STALE ORDER</div>}
                        </div>
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>₹{o.TotalAmount}</td>
                      <td style={{ padding: '15px' }}>
                        <button onClick={() => setManagingOrder(o)} style={{ background: '#007bff', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding: '20px', color: '#888'}}>No orders match your filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="tab-content fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: '#495057', margin: 0 }}>📦 Global Product Feed ({allProducts.length})</h2>
            <input 
              type="text" 
              placeholder="Search by Product or Store Name..." 
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ padding: '10px 15px', width: '300px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
            />
          </div>

          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#6c757d', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>Image</th>
                  <th style={{ padding: '15px' }}>Product Info</th>
                  <th style={{ padding: '15px' }}>Store</th>
                  <th style={{ padding: '15px' }}>Metrics</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const imgSrc = getPrimaryImage(p.MainImage);
                  return (
                  <tr key={p.ProductId} style={{ borderBottom: '1px solid #eee', background: p.IsArchived ? '#fcf0f2' : 'white', opacity: p.IsArchived ? 0.7 : 1 }}>
                    <td style={{ padding: '15px' }}>
                        <div style={{ width: '60px', height: '60px', background: '#eee', borderRadius: '6px', overflow: 'hidden' }}>
                            {imgSrc ? <img src={imgSrc} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                        </div>
                    </td>
                      <td style={{ padding: '15px' }}>
                        <span onClick={() => setViewingProduct(p)} style={{ fontSize: '15px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                          {p.Name}
                        </span><br />
                        <span style={{ fontSize: '12px', color: '#666' }}>{p.Category}</span>

                        {/* 🔥 Robust check for the badge */}
                        {(p.fixSubmitted === 1 || p.FixSubmitted === 1 || p.fixSubmitted === true) && p.IsArchived && (
                          <div style={{
                            marginTop: '8px',
                            background: '#28a745',
                            color: 'white',
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            ✨ FIX SUBMITTED
                          </div>
                        )}
                      </td>
                    <td style={{ padding: '15px' }}>
                        <strong style={{ color: '#555' }}>{p.StoreName}</strong><br/>
                        <span style={{ fontSize: '12px', color: '#666' }}>{p.SellerEmail}</span>
                    </td>
                    <td style={{ padding: '15px' }}>
                        <strong>₹{p.Price}</strong><br/>
                        <span style={{ fontSize: '12px' }}>Stock: {p.StockQuantity}</span>
                    </td>
                    <td style={{ padding: '15px', fontWeight: 'bold', color: p.IsArchived ? '#dc3545' : '#28a745' }}>
                        {p.IsArchived ? 'HIDDEN' : 'LIVE'}
                    </td>
                    <td style={{ padding: '15px' }}>
                        {p.SellerIsDeleted ? (
                            <span style={{ color: '#999', fontSize: '12px', fontWeight: 'bold', padding: '6px 10px', background: '#f4f4f4', borderRadius: '6px' }}>🚫 SELLER BANNED</span>
                        ) : (
                            <button 
                                onClick={() => handleToggleProduct(p)} 
                                style={{ background: p.IsArchived ? '#28a745' : '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                {p.IsArchived ? '👁️ Unhide' : '🚫 Take Down'}
                            </button>
                        )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SELLERS */}
      {activeTab === 'sellers' && (
        <div className="tab-content fade-in">
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '10px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#1b5e20', marginTop: 0 }}>✅ Active Shops ({activeSellers.length})</h2>
            <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#388e3c', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Store Name</th>
                  <th style={{ padding: '12px' }}>Owner</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSellers.map((s) => (
                  <tr key={s.SellerId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.StoreName}</td>
                    <td style={{ padding: '12px' }}>{s.FullName}</td>
                    <td style={{ fontWeight: 'bold', color: '#28a745' }}>Active</td>
                    <td>
                      <button onClick={() => handleAction('BAN', s.SellerId)} style={{ background: '#ffc107', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold' }}>⏸️ Suspend Shop</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#856404', marginTop: 0 }}>🏪 Seller Account Data (Raw)</h2>
            <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#ffc107', textAlign: 'left', color: '#333' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.filter(u => u.Role === 'SELLER').map((u) => (
                  <tr key={u.UserId} style={getRowStyle(u.IsDeleted)}>
                    <td style={{ padding: '12px' }}>{u.FullName}</td>
                    <td style={{ padding: '12px' }}>{u.Email}</td>
                    <td style={{ fontWeight: 'bold' }}>{u.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : <span style={{color:'green'}}>✅ Active</span>}</td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {!u.IsDeleted && (
                        <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleAction('DELETE_USER', u.UserId)}>Delete User</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: BUYERS */}
      {activeTab === 'buyers' && (
        <div className="tab-content fade-in">
          <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#0c5460', marginTop: 0 }}>🛍️ Buyer Accounts ({activeBuyers.length})</h2>
            <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#17a2b8', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.filter(u => u.Role === 'BUYER').map((u) => (
                  <tr key={u.UserId} style={getRowStyle(u.IsDeleted)}>
                    <td style={{ padding: '12px' }}>{u.FullName}</td>
                    <td>{u.Email}</td>
                    <td style={{ fontWeight: 'bold' }}>
                      {u.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : u.IsBanned ? <span style={{color:'orange'}}>⛔ Banned</span> : <span style={{color:'green'}}>✅ Active</span>}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {!u.IsDeleted && (
                        <>
                          <button onClick={() => handleAction(u.IsBanned ? 'UNBAN_USER' : 'BAN_USER', u.UserId)} style={{ background: u.IsBanned ? '#28a745' : '#ffc107', color: u.IsBanned ? 'white' : 'black', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>
                            {u.IsBanned ? 'Unban' : 'Ban User'}
                          </button>
                          <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleAction('DELETE_USER', u.UserId)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. MANAGE ORDER MODAL (NEW!) */}
      {managingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '600px', maxWidth: '100%', padding: '30px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: '#333' }}>Manage Order #{managingOrder.OrderId}</h2>
                  <button onClick={() => setManagingOrder(null)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888' }}>&times;</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>🛍️ Buyer Info</h4>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Name:</strong> {managingOrder.BuyerName}</p>
                      <p style={{ margin: '0' }}><strong>Email:</strong> {managingOrder.BuyerEmail}</p>
                  </div>
                  <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>🏪 Seller Info</h4>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Store:</strong> {managingOrder.StoreName || 'N/A'}</p>
                      <p style={{ margin: '0' }}><strong>Phone:</strong> {managingOrder.SellerPhone || 'N/A'}</p>
                  </div>
              </div>

              <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', marginBottom: '25px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Order Total: <strong>₹{managingOrder.TotalAmount}</strong></p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Current Status: <strong>{managingOrder.Status}</strong></p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Time since placed: {managingOrder.HoursSincePlaced} hours</p>
              </div>

              <div style={{ borderTop: '2px solid #eee', paddingTop: '20px', display: 'flex', gap: '15px' }}>
                  {managingOrder.Status !== 'Cancelled' ? (
                      <button onClick={() => handleAction('FORCE_CANCEL_ORDER', managingOrder.OrderId)} style={{ flex: 1, padding: '12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                          🚫 Admin: Force Cancel
                      </button>
                  ) : (
                      <div style={{ flex: 1, padding: '12px', background: '#f8d7da', color: '#721c24', textAlign: 'center', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #f5c6cb' }}>
                          This order is already Cancelled.
                      </div>
                  )}
                  <button onClick={() => setManagingOrder(null)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Close Window</button>
              </div>
          </div>
        </div>
      )}

      {/* 2. PRODUCT REVIEW MODAL */}
      {viewingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: '#333' }}>{viewingProduct.Name}</h2>
                  <button onClick={() => setViewingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '20px' }}>
                  {(() => {
                      let imgs = [];
                      if (viewingProduct.MainImage) {
                          try { imgs = JSON.parse(viewingProduct.MainImage); }
                          catch(e) { imgs = [viewingProduct.MainImage]; }
                      }
                      if (imgs.length === 0) return <div style={{width:'120px', height:'120px', background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'8px'}}>No Image</div>;
                      return imgs.map((imgUrl, i) => (
                          <img key={i} src={imgUrl} alt={`Product ${i}`} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                      ));
                  })()}
              </div>

              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
                  <p><strong>Category:</strong> {viewingProduct.Category}</p>
                  <p><strong>Price:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>₹{viewingProduct.Price}</span> (MRP: ₹{viewingProduct.OriginalPrice})</p>
                  <p><strong>Stock:</strong> {viewingProduct.StockQuantity}</p>
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                      <strong>Description:</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#555' }}>{viewingProduct.Description || 'No description provided.'}</p>
                  </div>
              </div>

              <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #b8daff' }}>
                  <p><strong>Store:</strong> {viewingProduct.StoreName}</p>
                  <p><strong>Owner:</strong> {viewingProduct.SellerEmail}</p>
                  {viewingProduct.AdminMessage && <p style={{ color: '#dc3545' }}><strong>Admin Note:</strong> {viewingProduct.AdminMessage}</p>}
              </div>
          </div>
        </div>
      )}

      {/* 3. SELLER REVIEW MODAL */}
      {reviewingSeller && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <div style={{ width: '100%', height: '150px', backgroundColor: '#ddd', position: 'relative' }}>
                  {reviewingSeller.StoreBanner ? <img src={reviewingSeller.StoreBanner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', paddingTop: '60px', color: '#888' }}>No Banner Provided</div>}
                  <div style={{ position: 'absolute', bottom: '-40px', left: '30px', width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'white', border: '4px solid white', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                      {reviewingSeller.StoreLogo ? <img src={reviewingSeller.StoreLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏪</div>}
                  </div>
              </div>
              <div style={{ padding: '60px 30px 30px 30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                          <h2 style={{ margin: '0 0 5px 0' }}>{reviewingSeller.StoreName || 'Unnamed Store'}</h2>
                          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Owner: {reviewingSeller.FullName} ({reviewingSeller.Email})</p>
                      </div>
                      <button onClick={() => setReviewingSeller(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}>&times;</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                          <h4 style={{ color: '#007bff', margin: '0 0 10px 0' }}>Contact & Compliance</h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Phone:</strong> {reviewingSeller.SupportPhone || '-'}</p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Support Email:</strong> {reviewingSeller.SupportEmail || '-'}</p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>GSTIN / PAN:</strong> <span style={{ color: '#dc3545', fontWeight: 'bold' }}>{reviewingSeller.GSTIN || 'MISSING'}</span></p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Pickup Address:</strong> {reviewingSeller.PickupAddress || '-'}</p>
                          {reviewingSeller.VerificationDoc && reviewingSeller.VerificationDoc !== '[]' && reviewingSeller.VerificationDoc !== 'null' ? (
                              <div style={{ marginTop: '10px' }}>
                                  <strong style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Uploaded Documents:</strong>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {(() => {
                                          let docs = [];
                                          try { docs = JSON.parse(reviewingSeller.VerificationDoc); } catch(e) { docs = [reviewingSeller.VerificationDoc]; }
                                          return docs.map((docUrl, idx) => (
                                              <button key={idx} onClick={() => openDocSafe(docUrl)} style={{ background: '#17a2b8', color: 'white', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>📄 View Document {idx + 1}</button>
                                          ));
                                      })()}
                                  </div>
                              </div>
                          ) : <span style={{ display: 'inline-block', marginTop: '10px', color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>⚠️ No KYC Document</span>}
                      </div>
                      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                          <h4 style={{ color: '#28a745', margin: '0 0 10px 0' }}>Payout Information</h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Bank Account:</strong> {reviewingSeller.BankAccount || '-'}</p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>IFSC Code:</strong> {reviewingSeller.IFSC || '-'}</p>
                      </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                      <button onClick={() => setReviewingSeller(null)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                      <button onClick={() => handleAction('APPROVE', reviewingSeller.SellerId)} style={{ flex: 2, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>✅ Approve & Publish Shop</button>
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TabButton = ({ label, isActive, onClick, alertCount }) => (
  <button onClick={onClick} style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', background: 'none', border: 'none', borderBottom: isActive ? '4px solid #007bff' : '4px solid transparent', color: isActive ? '#007bff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
    {label}
    {alertCount > 0 && <span style={{ background: '#dc3545', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{alertCount}</span>}
  </button>
);

export default AdminDashboard;