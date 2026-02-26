import React from 'react';

const Header = ({ 
  user, 
  onLogoClick, 
  globalSearch, 
  setGlobalSearch, 
  isDropdownOpen, 
  setIsDropdownOpen, 
  openAccountFeature, 
  cartItems, 
  onOpenCart,
  // 🔥 Added selectedSeller to detect if we are in a shop view
  selectedSeller,
  // 🔥 Props to control search visibility
  isAccountModalOpen,
  isCheckoutModalOpen,
  isBuyerOrdersOpen
}) => {
  // 🔥 UPDATED: Logic now hides search if inside a shop OR if a modal is open
  const hideSearch = !!selectedSeller || isAccountModalOpen || isCheckoutModalOpen || isBuyerOrdersOpen;

  return (
    <header style={{ background: 'white', padding: '12px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        
        <div onClick={onLogoClick} style={{ fontSize: '22px', fontWeight: 'bold', color: '#2874f0', fontStyle: 'italic', cursor: 'pointer', letterSpacing: '1px' }}>
            MyMarket {user.role !== 'BUYER' && <span style={{fontSize:'14px', color:'#dc3545', textTransform:'uppercase'}}>({user.role})</span>}
        </div>

        {/* Search Bar (Only Visible to Buyers and only if not hidden) */}
        {user.role === 'BUYER' && !hideSearch ? (
            <div style={{ flex: 1, maxWidth: '600px', margin: '0 40px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '10px', color: '#2874f0', fontSize: '18px' }}>⚲</span>
                <input 
                    type="text" placeholder="Search for Products, Brands and More" 
                    value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 15px 10px 45px', borderRadius: '8px', border: '1px solid #2874f0', outline: 'none', fontSize: '15px', background: '#f0f5ff', color: '#333', boxSizing: 'border-box' }} 
                />
            </div>
        ) : <div style={{ flex: 1 }}></div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '35px' }}>
            
            {/* Dynamic Account Dropdown */}
            <div 
                onMouseEnter={() => setIsDropdownOpen(true)} onMouseLeave={() => setIsDropdownOpen(false)}
                style={{ position: 'relative', cursor: 'pointer', height: '40px', display: 'flex', alignItems: 'center' }}
            >
                <div style={{ fontWeight: '500', fontSize: '16px', color: '#212121', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>👤</span> {user.name} <span style={{ fontSize: '12px', color: '#878787', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>

                {isDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: '250px', background: 'white', color: '#333', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', borderRadius: '4px', zIndex: 5000, overflow: 'hidden', border: '1px solid #e0e0e0', marginTop: '10px' }}>
                        <div style={{ position: 'absolute', top: '-6px', left: '50%', marginLeft: '-6px', width: '12px', height: '12px', background: 'white', transform: 'rotate(45deg)', borderLeft: '1px solid #e0e0e0', borderTop: '1px solid #e0e0e0' }}></div>
                        <div style={{ padding: '15px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '13px', color: '#878787', textTransform: 'uppercase' }}>Your Account</div>
                        
                        <style>{`
                          .dropdown-item { padding: 14px 20px; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; color: #212121; } 
                          .dropdown-item:hover { background: #f0f5ff; color: #2874f0; }
                        `}</style>
                        
                        {user.role === 'BUYER' && (
                            <>
                                <div className="dropdown-item" onClick={() => openAccountFeature('profile')}>👤 My Profile</div>
                                <div className="dropdown-item" onClick={() => openAccountFeature('orders')}>📦 Orders</div>
                                <div className="dropdown-item" onClick={() => openAccountFeature('wishlist')}>❤️ Wishlist</div>
                                <div className="dropdown-item" onClick={() => openAccountFeature('addresses')}>📍 Saved Addresses</div>
                            </>
                        )}

                        {user.role === 'SELLER' && <div className="dropdown-item">🏪 Shop Dashboard</div>}
                        {user.role === 'ADMIN' && <div className="dropdown-item">📊 Admin Panel</div>}

                        <div className="dropdown-item" onClick={() => openAccountFeature('logout')} style={{ borderTop: '2px solid #eee', color: '#dc3545' }}>🚪 Logout</div>
                    </div>
                )}
            </div>

            {/* Cart Button */}
            {user.role === 'BUYER' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '16px', color: '#212121' }} onClick={onOpenCart}>
                    <span style={{ fontSize: '22px', position: 'relative' }}>🛒
                        {cartItems.length > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-10px', background: '#ff6161', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', border: '2px solid white' }}>{cartItems.reduce((acc, item) => acc + (item.qty || 1), 0)}</span>}
                    </span>
                    Cart
                </div>
            )}
        </div>
    </header>
  );
};

export default Header;