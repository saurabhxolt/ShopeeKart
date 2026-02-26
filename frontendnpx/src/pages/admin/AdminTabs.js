import React from 'react';

// --- HELPER FUNCTIONS ---
const getRowStyle = (isDeleted) => ({ background: isDeleted ? '#f5f5f5' : 'white', color: isDeleted ? '#999' : '#333', borderBottom: '1px solid #eee', opacity: isDeleted ? 0.8 : 1 });
const getPrimaryImage = (imageStr) => {
    if (!imageStr) return null;
    try { const parsed = JSON.parse(imageStr); return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageStr; } 
    catch (e) { return imageStr; }
};

// --- ANALYTICS CARDS (TOP ROW) ---
export const AnalyticsCards = ({ pendingSellers, activeSellers, activeBuyers, totalActiveUsers }) => (
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
);

// --- TAB 1: OVERVIEW ---
export const OverviewTab = ({ pendingSellers, setReviewingSeller }) => (
  <div className="tab-content fade-in">
    <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid #007bff' }}>
      <h2 style={{ color: '#0d47a1', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>⏳ Awaiting Shop Approvals ({pendingSellers.length})</h2>
      {pendingSellers.length === 0 ? (
        <p style={{ color: '#555', fontStyle: 'italic' }}>All caught up! No pending shops.</p>
      ) : (
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1976d2', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Store Name</th><th style={{ padding: '12px' }}>Owner</th><th style={{ padding: '12px' }}>Email</th><th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingSellers.map(s => (
              <tr key={s.SellerId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.StoreName || 'Unnamed'}</td>
                <td style={{ padding: '12px' }}>{s.FullName}</td>
                <td style={{ padding: '12px' }}>{s.Email}</td>
                <td style={{ padding: '12px' }}><button onClick={() => setReviewingSeller(s)} style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold' }}>🔍 Review Shop</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

// --- TAB 2: ORDERS ---
export const OrdersTab = ({ filteredOrders, uniqueOrderStores, orderStoreFilter, setOrderStoreFilter, setManagingOrder }) => (
  <div className="tab-content fade-in">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ color: '#495057', margin: 0 }}>🚛 Global Order Lifecycle ({filteredOrders.length})</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Filter by Seller:</span>
            <select value={orderStoreFilter} onChange={(e) => setOrderStoreFilter(e.target.value)} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', minWidth: '200px' }}>
                {uniqueOrderStores.map(store => <option key={store} value={store}>{store === 'ALL' ? 'Show All Orders' : store}</option>)}
            </select>
        </div>
    </div>
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#343a40', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '15px' }}>Order ID</th><th style={{ padding: '15px' }}>Parties (Buyer & Seller)</th><th style={{ padding: '15px' }}>Current Status</th><th style={{ padding: '15px' }}>Order Date (IST)</th><th style={{ padding: '15px' }}>Amount</th><th style={{ padding: '15px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(o => {
            const isStale = o.Status === 'Placed' && o.HoursSincePlaced > 48;
            return (
              <tr key={o.OrderId} style={{ borderBottom: '1px solid #eee', backgroundColor: isStale ? '#fff3cd' : 'white' }}>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>#{o.OrderId}</td>
                <td style={{ padding: '15px' }}><strong>Buyer:</strong> {o.BuyerName} <br/><strong>Store:</strong> {o.StoreName || 'Multi-Vendor'} (<small>{o.SellerPhone || 'No Phone'}</small>)</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: o.Status === 'Delivered' ? '#d4edda' : (o.Status.includes('Cancelled') ? '#f8d7da' : '#e2e3e5'), color: o.Status === 'Delivered' ? '#155724' : (o.Status.includes('Cancelled') ? '#721c24' : '#383d41') }}>
                    {o.Status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '15px' }}>
                    {/* 🔥 THE FIX: Strip 'Z' to force local DB time */}
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#333' }}>
                        {o.OrderDate ? new Date(o.OrderDate.replace('Z', '')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                    </div>
                    <div style={{ color: isStale ? '#856404' : '#666', fontSize: '11px', marginTop: '4px', fontWeight: isStale ? 'bold' : 'normal' }}>
                        ({o.HoursSincePlaced} hrs ago) 
                        {isStale && <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#dc3545', marginTop: '2px' }}>⚠️ STALE ORDER</div>}
                    </div>
                </td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>₹{o.TotalAmount}</td>
                <td style={{ padding: '15px' }}><button onClick={() => setManagingOrder(o)} style={{ background: '#007bff', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Manage</button></td>
              </tr>
            );
          })}
          {filteredOrders.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding: '20px', color: '#888'}}>No orders match your filter.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

// --- TAB 3: PRODUCTS ---
export const ProductsTab = ({ filteredProducts, productSearch, setProductSearch, setViewingProduct, handleToggleProduct }) => (
  <div className="tab-content fade-in">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h2 style={{ color: '#495057', margin: 0 }}>📦 Global Product Feed ({filteredProducts.length})</h2>
      <input type="text" placeholder="Search by Product or Store Name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} style={{ padding: '10px 15px', width: '300px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
    </div>
    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#6c757d', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '15px' }}>Image</th><th style={{ padding: '15px' }}>Product Info</th><th style={{ padding: '15px' }}>Store</th><th style={{ padding: '15px' }}>Metrics</th><th style={{ padding: '15px' }}>Status</th><th style={{ padding: '15px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map(p => {
            const imgSrc = getPrimaryImage(p.MainImage);
            return (
            <tr key={p.ProductId} style={{ borderBottom: '1px solid #eee', background: p.IsArchived ? '#fcf0f2' : 'white', opacity: p.IsArchived ? 0.7 : 1 }}>
              <td style={{ padding: '15px' }}><div style={{ width: '60px', height: '60px', background: '#eee', borderRadius: '6px', overflow: 'hidden' }}>{imgSrc ? <img src={imgSrc} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}</div></td>
              <td style={{ padding: '15px' }}>
                <span onClick={() => setViewingProduct(p)} style={{ fontSize: '15px', fontWeight: 'bold', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>{p.Name}</span><br /><span style={{ fontSize: '12px', color: '#666' }}>{p.Category}</span>
                {(p.fixSubmitted === 1 || p.FixSubmitted === 1 || p.fixSubmitted === true) && p.IsArchived && (<div style={{ marginTop: '8px', background: '#28a745', color: 'white', display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>✨ FIX SUBMITTED</div>)}
              </td>
              <td style={{ padding: '15px' }}><strong style={{ color: '#555' }}>{p.StoreName}</strong><br/><span style={{ fontSize: '12px', color: '#666' }}>{p.SellerEmail}</span></td>
              <td style={{ padding: '15px' }}><strong>₹{p.Price}</strong><br/><span style={{ fontSize: '12px' }}>Stock: {p.StockQuantity}</span></td>
              <td style={{ padding: '15px', fontWeight: 'bold', color: p.IsArchived ? '#dc3545' : '#28a745' }}>{p.IsArchived ? 'HIDDEN' : 'LIVE'}</td>
              <td style={{ padding: '15px' }}>
                  {p.SellerIsDeleted ? <span style={{ color: '#999', fontSize: '12px', fontWeight: 'bold', padding: '6px 10px', background: '#f4f4f4', borderRadius: '6px' }}>🚫 SELLER BANNED</span> : (
                      <button onClick={() => handleToggleProduct(p)} style={{ background: p.IsArchived ? '#28a745' : '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{p.IsArchived ? '👁️ Unhide' : '🚫 Take Down'}</button>
                  )}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  </div>
);

// --- TAB 4: SELLERS ---
export const SellersTab = ({ activeSellers, allUsers, handleAction }) => (
  <div className="tab-content fade-in">
    <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '10px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#1b5e20', marginTop: 0 }}>✅ Active Shops ({activeSellers.length})</h2>
      <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
        <thead><tr style={{ background: '#388e3c', color: 'white', textAlign: 'left' }}><th style={{ padding: '12px' }}>Store Name</th><th style={{ padding: '12px' }}>Owner</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {activeSellers.map(s => (
            <tr key={s.SellerId} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.StoreName}</td><td style={{ padding: '12px' }}>{s.FullName}</td><td style={{ fontWeight: 'bold', color: '#28a745' }}>Active</td>
              <td><button onClick={() => handleAction('BAN', s.SellerId)} style={{ background: '#ffc107', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold' }}>⏸️ Suspend Shop</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#856404', marginTop: 0 }}>🏪 Seller Account Data (Raw)</h2>
      <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
        <thead><tr style={{ background: '#ffc107', textAlign: 'left', color: '#333' }}><th style={{ padding: '12px' }}>Name</th><th style={{ padding: '12px' }}>Email</th><th>Account Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
        <tbody>
          {allUsers.filter(u => u.Role === 'SELLER').map(u => (
            <tr key={u.UserId} style={getRowStyle(u.IsDeleted)}>
              <td style={{ padding: '12px' }}>{u.FullName}</td><td style={{ padding: '12px' }}>{u.Email}</td><td style={{ fontWeight: 'bold' }}>{u.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : <span style={{color:'green'}}>✅ Active</span>}</td>
              <td style={{ textAlign: 'center', padding: '12px' }}>{!u.IsDeleted && <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleAction('DELETE_USER', u.UserId)}>Delete User</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- TAB 5: BUYERS ---
export const BuyersTab = ({ activeBuyers, allUsers, handleAction }) => (
  <div className="tab-content fade-in">
    <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#0c5460', marginTop: 0 }}>🛍️ Buyer Accounts ({activeBuyers.length})</h2>
      <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
        <thead><tr style={{ background: '#17a2b8', color: 'white', textAlign: 'left' }}><th style={{ padding: '12px' }}>Name</th><th>Email</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
        <tbody>
          {allUsers.filter(u => u.Role === 'BUYER').map(u => (
            <tr key={u.UserId} style={getRowStyle(u.IsDeleted)}>
              <td style={{ padding: '12px' }}>{u.FullName}</td><td>{u.Email}</td>
              <td style={{ fontWeight: 'bold' }}>{u.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : u.IsBanned ? <span style={{color:'orange'}}>⛔ Banned</span> : <span style={{color:'green'}}>✅ Active</span>}</td>
              <td style={{ textAlign: 'center', padding: '12px' }}>
                {!u.IsDeleted && (
                  <>
                    <button onClick={() => handleAction(u.IsBanned ? 'UNBAN_USER' : 'BAN_USER', u.UserId)} style={{ background: u.IsBanned ? '#28a745' : '#ffc107', color: u.IsBanned ? 'white' : 'black', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>{u.IsBanned ? 'Unban' : 'Ban User'}</button>
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
);