import React, { useState } from 'react';
import axios from 'axios';

// --- IMPORT ALL EXTRACTED COMPONENTS ---
import AuthScreen from './pages/auth/AuthScreen';
import AdminDashboard from './pages/admin/AdminDashboard';
import SellerDashboard from './pages/seller/SellerDashboard';
import BuyerShopList from './pages/buyer/BuyerShopList';
import BuyerShopView from './pages/buyer/BuyerShopView';

import CartSidebar from './components/cart/CartSidebar';
import CheckoutModal from './components/cart/CheckoutModal';
import BuyerOrdersModal from './components/orders/BuyerOrdersModal';
import BuyerAccountModal from './components/account/BuyerAccountModal'; 

function App() {
  const [user, setUser] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null); 
  const [targetProductId, setTargetProductId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isVerifyingStock, setIsVerifyingStock] = useState(false); 
  const [isBuyerOrdersOpen, setIsBuyerOrdersOpen] = useState(false);

  // Header & Account States
  const [globalSearch, setGlobalSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activeAccountTab, setActiveAccountTab] = useState('profile');

  // 🔥 THE FIX: Separate Checkout Session State
  const [checkoutSession, setCheckoutSession] = useState({ items: [], isBuyNow: false });

  // --- CART HANDLERS ---
  const addToCart = async (product, isBuyNow = false) => {
    const targetSellerId = selectedSeller.id || selectedSeller.SellerId;
    
    // 🔥 THE FIX: Buy Now completely bypasses the cart state
    if (isBuyNow) {
        const buyNowItem = { ...product, qty: 1, sellerId: targetSellerId, maxStock: product.qty };
        setCheckoutSession({ items: [buyNowItem], isBuyNow: true });
        setIsCartOpen(false); 
        handleVerifyAndCheckout([buyNowItem]); // Verify only this item
        return;
    }

    let currentCart = [...cartItems];

    if (currentCart.length > 0) {
        const existingSellerId = currentCart[0].sellerId;
        if (existingSellerId && existingSellerId !== targetSellerId) {
            if (!window.confirm(`⚠️ Switch Shop?\n\nYour cart contains items from another shop.\n\nClick OK to CLEAR cart and add this item.\nClick Cancel to keep your existing cart.`)) return;
            currentCart = []; 
        }
    }

    const existingIndex = currentCart.findIndex(item => item.id === product.id);
    const currentQtyInCart = existingIndex >= 0 ? currentCart[existingIndex].qty : 0;
    
    if (currentQtyInCart + 1 > product.qty) return alert(`⚠️ Out of Stock! Only ${product.qty} items available.`);

    if (existingIndex >= 0) {
        currentCart[existingIndex] = { ...currentCart[existingIndex], qty: currentCart[existingIndex].qty + 1 };
    } else {
        currentCart.push({ ...product, qty: 1, sellerId: targetSellerId, maxStock: product.qty });
    }

    setCartItems(currentCart);
    axios.post('http://localhost:7071/api/AddToCart', { userId: user.userId, productId: product.id }).catch(e => console.error(e));
    setIsCartOpen(true); 
  };

  const removeFromCart = (id) => setCartItems(prev => prev.filter(item => item.id !== id));

  const handleUpdateQty = (itemId, newQty) => {
      setCartItems(prev => prev.map(item => {
          if (item.id === itemId) {
              if (newQty < 1) return { ...item, qty: 0 };
              if (newQty > (item.maxStock || 100)) return item;
              return { ...item, qty: newQty };
          }
          return item;
      }).filter(item => item.qty > 0)); 
  };

  const handleVerifyAndCheckout = async (itemsToCheck) => {
    if (itemsToCheck.length === 0) return;
    setIsVerifyingStock(true);
    const sellerId = itemsToCheck[0].sellerId; 
    
    try {
        const res = await axios.get(`http://localhost:7071/api/GetProducts?sellerId=${sellerId}`);
        const freshProducts = res.data;

        let errors = [];
        for (const checkoutItem of itemsToCheck) {
            const freshItem = freshProducts.find(p => p.id === checkoutItem.id);
            if (!freshItem) errors.push(`${checkoutItem.name} is no longer available.`);
            else if (freshItem.qty < checkoutItem.qty) errors.push(`${checkoutItem.name}: You want ${checkoutItem.qty}, but only ${freshItem.qty} left.`);
        }
        
        setIsVerifyingStock(false);
        if (errors.length > 0) return alert("⚠️ Stock Issue:\n" + errors.join("\n"));

        setIsCartOpen(false);
        setIsCheckoutModalOpen(true);
    } catch (err) {
        setIsVerifyingStock(false);
        alert("Could not verify stock.");
    }
  };

  const handlePlaceOrder = async (address, ratings) => {
      setIsVerifyingStock(true); 
      try {
          const res = await axios.post('http://localhost:7071/api/PlaceOrder', {
              userId: user.userId, 
              address, 
              cartItems: checkoutSession.items, // 🔥 Send session items
              totalAmount: checkoutSession.items.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0),
              isBuyNow: checkoutSession.isBuyNow // 🔥 Pass flag to backend
          });
          
          if (res.status === 200) {
              for (const item of checkoutSession.items) {
                  if (ratings[item.id]) {
                      await axios.post('http://localhost:7071/api/AddRating', {
                          productId: item.id, userId: user.userId, rating: ratings[item.id]
                      }).catch(e => console.error("Rating save failed", e));
                  }
              }
              
              // 🔥 THE FIX: Only clear the frontend cart if it was a Cart checkout!
              if (!checkoutSession.isBuyNow) {
                  setCartItems([]);              
              }

              setRefreshKey(prev => prev + 1); 
              return res.data.orderId; 
          }
      } catch (err) {
          throw new Error(err.response?.data || err.message);
      } finally {
          setIsVerifyingStock(false);    
      }
  };

  // Handle Account Menu Clicks
  const openAccountFeature = (feature) => {
      setIsDropdownOpen(false);
      if (feature === 'orders') {
          setIsBuyerOrdersOpen(true);
      } else if (feature === 'logout') {
          setUser(null); setSelectedSeller(null); setCartItems([]);
      } else {
          setActiveAccountTab(feature);
          setIsAccountModalOpen(true);
      }
  };

  if (!user) return <AuthScreen onUserAuthenticated={setUser} />;

  return (
    <div style={{ background: '#f1f3f6', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* 🔥 THE ROLE-BASED HEADER */}
      <header style={{ background: 'white', padding: '12px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          
          <div onClick={() => setSelectedSeller(null)} style={{ fontSize: '22px', fontWeight: 'bold', color: '#2874f0', fontStyle: 'italic', cursor: 'pointer', letterSpacing: '1px' }}>
              MyMarket {user.role !== 'BUYER' && <span style={{fontSize:'14px', color:'#dc3545', textTransform:'uppercase'}}>({user.role})</span>}
          </div>

          {/* Search Bar (Only Visible to Buyers) */}
          {user.role === 'BUYER' ? (
              <div style={{ flex: 1, maxWidth: '600px', margin: '0 40px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '15px', top: '10px', color: '#2874f0', fontSize: '18px' }}>⚲</span>
                  <input 
                      type="text" placeholder="Search for Products, Brands and More" 
                      value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 15px 10px 45px', borderRadius: '8px', border: '1px solid #2874f0', outline: 'none', fontSize: '15px', background: '#f0f5ff', color: '#333', boxSizing: 'border-box' }} 
                  />
              </div>
          ) : <div style={{ flex: 1 }}></div>}

          {/* Right Navigation */}
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
                          <style>{`.dropdown-item { padding: 14px 20px; font-size: 15px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; color: #212121; } .dropdown-item:hover { background: #f0f5ff; color: #2874f0; }`}</style>
                          
                          {/* BUYER MENU */}
                          {user.role === 'BUYER' && (
                              <>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('profile')}>👤 My Profile</div>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('orders')}>📦 Orders</div>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('coupons')}>🎫 Coupons</div>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('wallet')}>💳 Saved Cards & Wallet</div>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('addresses')}>📍 Saved Addresses</div>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('wishlist')}>❤️ Wishlist</div>
                                  <div className="dropdown-item" onClick={() => openAccountFeature('notifications')}>🔔 Notifications</div>
                              </>
                          )}

                          {/* SELLER MENU */}
                          {user.role === 'SELLER' && (
                              <>
                                  <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>🏪 Shop Dashboard</div>
                                  <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>⚙️ Shop Settings</div>
                              </>
                          )}

                          {/* ADMIN MENU */}
                          {user.role === 'ADMIN' && (
                              <>
                                  <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>📊 Admin Panel</div>
                                  <div className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>⚙️ System Settings</div>
                              </>
                          )}

                          <div className="dropdown-item" onClick={() => openAccountFeature('logout')} style={{ borderTop: '2px solid #eee', color: '#dc3545' }}>🚪 Logout</div>
                      </div>
                  )}
              </div>

              {/* Cart Button (Only for Buyers) */}
              {user.role === 'BUYER' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '16px', color: '#212121' }} onClick={() => setIsCartOpen(true)}>
                      <span style={{ fontSize: '22px', position: 'relative' }}>🛒
                          {cartItems.length > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-10px', background: '#ff6161', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', border: '2px solid white' }}>{cartItems.reduce((acc, item) => acc + (item.qty || 1), 0)}</span>}
                      </span>
                      Cart
                  </div>
              )}
          </div>
      </header>
      
      {/* MAIN CONTENT AREA */}
      <div style={{ padding: '40px' }}>
          {user.role === 'ADMIN' && <AdminDashboard user={user} />}
          {user.role === 'SELLER' && <SellerDashboard user={user} />}
          {user.role === 'BUYER' && !selectedSeller && <BuyerShopList onEnterShop={(shop) => setSelectedSeller(shop)} refreshKey={refreshKey} />}
          {user.role === 'BUYER' && selectedSeller && (
              <BuyerShopView 
                  user={user} 
                  selectedSeller={selectedSeller} 
                  onBack={() => {
                      setSelectedSeller(null);
                      setTargetProductId(null); // 🔥 NEW: Clear it when leaving shop
                  }} 
                  addToCart={addToCart} 
                  refreshKey={refreshKey} 
                  targetProductId={targetProductId} // 🔥 NEW: Pass it to the shop
              />
          )}    
      </div>

      {/* MODALS */}
      <CartSidebar 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          cartItems={cartItems} 
          onRemove={removeFromCart} 
          // 🔥 THE FIX: Checking out from the Cart loads the cart items into the session
          onCheckout={() => {
              setCheckoutSession({ items: cartItems, isBuyNow: false });
              handleVerifyAndCheckout(cartItems);
          }} 
          isVerifyingStock={isVerifyingStock} 
          onUpdateQty={handleUpdateQty} 
      />
      
      {/* 🔥 THE FIX: Checkout modal now safely reads from checkoutSession, not cartItems */}
      <CheckoutModal 
          isOpen={isCheckoutModalOpen} 
          onClose={() => setIsCheckoutModalOpen(false)} 
          cartItems={checkoutSession.items} 
          cartTotal={checkoutSession.items.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0)} 
          onConfirmOrder={handlePlaceOrder} 
          userId={user?.userId} 
          
          // 🔥 NEW: Passes the logic to open the Orders screen
          onViewOrders={() => {
              setIsCheckoutModalOpen(false);
              setIsBuyerOrdersOpen(true);
          }}
      />
      <BuyerOrdersModal isOpen={isBuyerOrdersOpen} onClose={() => setIsBuyerOrdersOpen(false)} userId={user?.userId} />
      <BuyerAccountModal 
          isOpen={isAccountModalOpen} 
          onClose={() => setIsAccountModalOpen(false)} 
          activeTab={activeAccountTab} 
          setActiveTab={setActiveAccountTab} 
          user={user} 
          onUpdateUser={setUser} 
          
          // 🔥 NEW: This function catches the click from the Wishlist and transports the user!
          onVisitShop={(sellerId, storeName, productId) => {
              setIsAccountModalOpen(false); // Close the modal
              setTargetProductId(productId);
              setSelectedSeller({ id: sellerId, StoreName: storeName }); // Open the shop!
          }}
      />
    </div>
  );
}

export default App;