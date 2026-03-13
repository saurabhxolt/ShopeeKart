import React from 'react';

// --- HELPER FUNCTIONS ---
const getRowStyle = (isDeleted) => ({ 
    background: isDeleted ? '#f5f5f5' : 'white', 
    color: isDeleted ? '#999' : '#333', 
    borderBottom: '1px solid #eee', 
    opacity: isDeleted ? 0.8 : 1 
});

const getPrimaryImage = (imageStr) => {
    if (!imageStr) return null;
    try { 
        const parsed = JSON.parse(imageStr); 
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageStr; 
    } catch (e) { return imageStr; }
};

/** * 🔥 FIXED: Handles UTC strings correctly for IST comparison 
 */
const isUserLive = (lastSeen) => {
    if (!lastSeen) return false;
    
    // 1. Ensure string is treated as UTC by formatting it correctly (YYYY-MM-DDTHH:MM:SSZ)
    const dateStr = lastSeen.endsWith('Z') ? lastSeen : `${lastSeen.replace(' ', 'T')}Z`;
    const lastActive = new Date(dateStr);
    
    // 2. Compare against the browser's current local time
    const diffInMinutes = (new Date() - lastActive) / 60000;
    
    return diffInMinutes <= 5; // True if active in last 5 minutes
};

// --- ANALYTICS CARDS (TOP ROW) ---
export const AnalyticsCards = ({ pendingSellers, activeSellers, trafficSummary, isTrafficLoading }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '35px' }}>
    <div style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#fff' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#c0392b' }}>⏳ Pending Approvals</h4>
      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#c0392b' }}>{pendingSellers.length}</div>
    </div>

    <div style={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#0d47a1' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>🏪 Active Shops</h4>
      <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{activeSellers.length}</div>
    </div>

    <div style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#fff' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#bf360c' }}>🚀 Global Hits (24h)</h4>
      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#bf360c' }}>{isTrafficLoading ? '...' : (trafficSummary?.TotalHits || 0)}</div>
    </div>

    <div style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: '#006266' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>👥 Unique Humans (24h)</h4>
      <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{isTrafficLoading ? '...' : (trafficSummary?.UniqueShoppers || 0)}</div>
    </div>
  </div>
);

// --- TAB 1: OVERVIEW ---
export const OverviewTab = ({ pendingSellers, setReviewingSeller, topShops }) => (
  <div className="tab-content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

    {/* Awaiting Approvals Section */}
    <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid #007bff' }}>
      <h2 style={{ color: '#0d47a1', marginTop: 0 }}>⏳ Awaiting Shop Approvals ({pendingSellers.length})</h2>
      {pendingSellers.length === 0 ? (
        <p style={{ color: '#555', fontStyle: 'italic' }}>All caught up! No pending shops.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px' }}>
              <thead>
                <tr style={{ background: '#1976d2', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Store Name</th><th style={{ padding: '12px' }}>Owner</th><th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingSellers.map(s => (
                  <tr key={s.SellerId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.StoreName || 'Unnamed'}</td>
                    <td style={{ padding: '12px' }}>{s.FullName}</td>
                    <td style={{ padding: '12px' }}><button onClick={() => setReviewingSeller(s)} style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor:'pointer' }}>🔍 Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </div>

    {/* Trending Shops Leaderboard */}
    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid #28a745' }}>
        <h2 style={{ color: '#1b5e20', marginTop: 0 }}>📈 Trending Shops (Weekly)</h2>
        {topShops && topShops.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px' }}>
                    <thead>
                        <tr style={{ background: '#28a745', color: 'white', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Shop Name</th>
                            <th style={{ padding: '12px' }}>Visitors (Unique)</th>
                            <th style={{ padding: '12px' }}>Activity Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topShops.map((shop, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{shop.name}</td>
                                <td style={{ padding: '12px' }}>{shop.uniqueVisitors || 0} humans</td>
                                <td style={{ padding: '12px' }}>
                                    <div style={{ width: '100%', maxWidth: '200px', height: '10px', background: '#e9ecef', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(shop.uniqueVisitors / topShops[0].uniqueVisitors) * 100}%`, height: '100%', background: '#28a745' }}></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p style={{ color: '#666' }}>Collecting traffic data...</p>
        )}
    </div>
  </div>
);

// --- TAB 2: ORDERS ---
export const OrdersTab = ({ filteredOrders, uniqueOrderStores, orderStoreFilter, setOrderStoreFilter, setManagingOrder }) => (
  <div className="tab-content fade-in">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#495057', margin: 0 }}>🚛 Global Order Lifecycle ({filteredOrders.length})</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Filter by Seller:</span>
            <select value={orderStoreFilter} onChange={(e) => setOrderStoreFilter(e.target.value)} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', minWidth: '200px' }}>
                {uniqueOrderStores.map(store => <option key={store} value={store}>{store === 'ALL' ? 'Show All Orders' : store}</option>)}
            </select>
        </div>
    </div>
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
      <h2 style={{ color: '#495057', margin: 0 }}>📦 Global Product Feed ({filteredProducts.length})</h2>
      <input type="text" placeholder="Search by Product or Store Name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} style={{ padding: '10px 15px', width: '300px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} />
    </div>
    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
      <div style={{ overflowX: 'auto' }}>
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
    </div>
    <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#856404', marginTop: 0 }}>🏪 Seller Account Data (Raw)</h2>
      <div style={{ overflowX: 'auto' }}>
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
  </div>
);

// --- TAB 5: BUYERS ---
export const BuyersTab = ({ activeBuyers, allUsers, handleAction }) => (
  <div className="tab-content fade-in">
    <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#0c5460', marginTop: 0 }}>🛍️ Buyer Accounts ({activeBuyers.length})</h2>
      <div style={{ overflowX: 'auto' }}>
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
  </div>
);

// --- TAB 6: SECURITY & LOGS ---
export const SecurityTab = ({ logs, isLogsLoading, handleArchiveAndClean }) => (
  <div className="tab-content fade-in">
    <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>🛡️ Security & Login Compliance</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>CERT-In Compliance: Maintain active logs for 180 days.</p>
          </div>
          
        <button
          onClick={handleArchiveAndClean}
          style={{ background: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📥 Download Last 180 Days
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
            <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px' }}>Date & Time (IST)</th>
                    <th style={{ padding: '12px' }}>IP Address</th>
                    <th style={{ padding: '12px' }}>Email Attempt</th>
                    <th style={{ padding: '12px' }}>Device / Browser</th>
                    <th style={{ padding: '12px' }}>Status</th>
                </tr>
            </thead>
            <tbody>
                {isLogsLoading ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading security logs... ⏳</td></tr>
                ) : logs.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No recent login activity found.</td></tr>
                ) : (
                    logs.map((log, index) => {
                        let os = 'Unknown OS';
                        let browser = 'Unknown Browser';
                        if (log.device) {
                            if (log.device.includes('Windows')) os = 'Windows';
                            else if (log.device.includes('Macintosh')) os = 'Mac';
                            else if (log.device.includes('Android')) os = 'Android';
                            else if (log.device.includes('iPhone') || log.device.includes('iPad')) os = 'iOS';
                            else if (log.device.includes('Linux')) os = 'Linux';

                            if (log.device.includes('Edg/')) browser = 'Edge';
                            else if (log.device.includes('Chrome')) browser = 'Chrome';
                            else if (log.device.includes('Firefox')) browser = 'Firefox';
                            else if (log.device.includes('Safari') && !log.device.includes('Chrome')) browser = 'Safari';
                        }
                        const readableDevice = `${browser} on ${os}`;
                        return (
                        <tr key={index} style={{ borderBottom: '1px solid #eee', background: log.action === 'LOGIN_FAILED' ? '#fff5f5' : 'white' }}>
                            <td style={{ padding: '12px', color: '#555' }}>
                                {log.date ? new Date(log.date.replace('Z', '')).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#0056b3' }}>{log.ip}</td>
                            <td style={{ padding: '12px' }}>{log.email || `User ID: ${log.userId}`}</td>
                            <td style={{ padding: '12px', color: '#666', fontSize: '13px' }} title={log.device}>💻 {readableDevice}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{ background: log.action === 'LOGIN_SUCCESS' ? '#e8f5e9' : '#ffebee', color: log.action === 'LOGIN_SUCCESS' ? '#2e7d32' : '#c62828', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{log.action}</span>
                            </td>
                        </tr>
                    )})
                )}
            </tbody>
        </table>
      </div>
    </div>
  </div>
);

// --- TAB 7: IntelligenceTab ---
export const IntelligenceTab = ({ 
    stats, isTrafficLoading, 
    intelSearch, setIntelSearch, 
    intelCategoryFilter, setIntelCategoryFilter, 
    intelSortKey, setIntelSortKey,
    uniqueCategories 
}) => (
    <div className="tab-content fade-in">
        <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>💎 Marketplace Intelligence (90-Day Funnel)</h3>
                    <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#666' }}>Track views vs. actual sales to optimize inventory and custom offers.</p>
                    <input 
                        type="text" 
                        placeholder="Search Product or Shop..." 
                        value={intelSearch} 
                        onChange={(e) => setIntelSearch(e.target.value)} 
                        style={{ padding: '10px 15px', width: '100%', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#666' }}>Category Filter</label>
                        <select value={intelCategoryFilter} onChange={(e) => setIntelCategoryFilter(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '150px' }}>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#666' }}>Primary Sort</label>
            <select value={intelSortKey} onChange={(e) => setIntelSortKey(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '150px' }}>
              <option value="purchases_desc">🏆 Highest Purchased</option>
              <option value="purchases_asc">📉 Lowest Purchased</option>
              <option value="views_desc">🔥 Highest Viewed</option>
              <option value="views_asc">🧊 Lowest Viewed</option>
              <option value="shoppers_desc">👥 Most Unique Shoppers</option>
            </select>
          </div>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#888', fontSize: '13px' }}>
                            <th style={{ padding: '15px' }}>Product Details</th>
                            <th style={{ padding: '15px' }}>Store Name</th>
                            <th style={{ padding: '15px' }}>Category</th>
                            <th style={{ padding: '15px' }}>90D Views</th>
                            <th style={{ padding: '15px' }}>Unique Shoppers</th>
                            <th style={{ padding: '15px' }}>🔥 Purchases</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isTrafficLoading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading marketplace intelligence... ⏳</td></tr>
                        ) : stats.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f9f9f9', background: item.purchases > 10 ? '#f0fff4' : 'white' }}>
                                <td style={{ padding: '15px', fontWeight: 'bold', color: '#007bff' }}>{item.productName}</td>
                                <td style={{ padding: '15px' }}><strong>{item.storeName}</strong></td>
                                <td style={{ padding: '15px', color: '#666' }}>{item.category}</td>
                                <td style={{ padding: '15px' }}>{item.views}</td>
                                <td style={{ padding: '15px' }}>{item.shoppers} buyers</td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ background: '#2e7d32', color: 'white', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                                        {item.purchases} Sold
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

// --- TAB 8: LIVE TRAFFIC & SHOPPERS ---
export const LiveTrafficTab = ({ shoppers }) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    // 🔥 FIXED: Robust search logic that safely handles null values and spaces
    const term = searchTerm.trim().toLowerCase();
    const filteredShoppers = (shoppers || []).filter(s => {
        const safeName = s.name ? s.name.toLowerCase() : '';
        const safeEmail = s.email ? s.email.toLowerCase() : '';
        return safeName.includes(term) || safeEmail.includes(term);
    });

    const liveCount = filteredShoppers.filter(s => isUserLive(s.lastSeen)).length;

    return (
        <div className="tab-content fade-in">
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(40, 167, 69, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
                }
                .live-dot {
                    width: 10px; height: 10px; background: #28a745; border-radius: 50%;
                    display: inline-block; animation: pulse 2s infinite;
                }
            `}</style>

            <div style={{ background: '#fff9db', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '5px solid #fcc419' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ color: '#e67700', margin: '0 0 5px 0' }}>📡 Live & Recent Shoppers</h2>
                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                            <span style={{ fontWeight: 'bold', color: '#28a745' }}>{liveCount} Online Now</span> • {filteredShoppers.length} Total in last 24h
                        </p>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search user or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', width: '250px' }}
                    />
                </div>

                {filteredShoppers.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {filteredShoppers.map((shopper, i) => {
                            const active = isUserLive(shopper.lastSeen);
                            const safeDateStr = shopper.lastSeen.endsWith('Z') ? shopper.lastSeen : `${shopper.lastSeen.replace(' ', 'T')}Z`;
                            
                            return (
                                <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '10px', border: active ? '2px solid #28a745' : '1px solid #ffe066', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                                    {active && <span className="live-dot" title="Active Now" style={{ position: 'absolute', top: '-4px', right: '-4px' }}></span>}
                                    
                                    <div style={{ fontSize: '30px', background: '#f8f9fa', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                                    
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{shopper.name}</div>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{shopper.email}</div>
                                        <div style={{ fontSize: '11px', color: active ? '#28a745' : '#991b1b', fontWeight: 'bold' }}>
                                            {active ? '● LIVE NOW' : `Seen: ${new Date(safeDateStr).toLocaleString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true})}`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: 'white', borderRadius: '8px' }}>
                        {searchTerm ? "No shoppers found matching your search." : "No shopper activity in the last 24 hours."}
                    </div>
                )}
            </div>
        </div>
    );
};