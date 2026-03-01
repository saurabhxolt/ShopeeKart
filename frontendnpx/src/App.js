import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// --- LAYOUT ---
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// --- PAGE COMPONENTS ---
import AuthScreen from './pages/auth/AuthScreen';
import AdminDashboard from './pages/admin/AdminDashboard';
import SellerDashboard from './pages/seller/SellerDashboard';
import BuyerShopList from './pages/buyer/BuyerShopList';
import BuyerShopView from './pages/buyer/BuyerShopView';

// --- MODAL COMPONENTS ---
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

  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activeAccountTab, setActiveAccountTab] = useState('profile');

  const [checkoutSession, setCheckoutSession] = useState({ items: [], isBuyNow: false });

  // 🔥 VIEWPORT DETECTION
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==========================================
  // 🔥 SMART BATCHING TRAFFIC LOGGING
  // ==========================================
  const trafficQueue = useRef([]);

  const flushLogs = useCallback(() => {
      if (trafficQueue.current.length === 0) return;
      
      const payload = [...trafficQueue.current]; 
      trafficQueue.current = []; // Empty the queue immediately

      // Send to backend via fetch with keepalive
      fetch('http://localhost:7071/api/LogTrafficBatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true // Ensures it sends even if the tab is closing
      }).catch(e => console.warn("Traffic batch log failed silently"));
  }, []);

  const logTraffic = useCallback((pageType, sellerId = null, productId = null) => {
    if (!user) return;
    
    trafficQueue.current.push({
      userId: user.userId,
      sellerId: sellerId,
      productId: productId,
      pageType: pageType,
      deviceType: isMobile ? 'Mobile' : 'Desktop',
      timestamp: new Date().toISOString()
    });

    // Flush automatically if we hit 50 clicks/views
    if (trafficQueue.current.length >= 50) {
        flushLogs();
    }
  }, [user, isMobile, flushLogs]);

  // Catch tab closes and page refreshes to save remaining logs
  useEffect(() => {
      const handleUnload = () => flushLogs();
      window.addEventListener('beforeunload', handleUnload);
      return () => window.removeEventListener('beforeunload', handleUnload);
  }, [flushLogs]);
  // ==========================================

  // --- GLOBAL SEARCH EFFECT ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
        if (globalSearch.trim().length > 1) {
            setIsSearching(true);
            try {
                const res = await axios.get(`http://localhost:7071/api/GlobalSearch?q=${globalSearch}`);
                setSearchResults(res.data);
            } catch (err) {
                console.error("Global search failed", err);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearch]);

  // --- CART & CHECKOUT LOGIC ---
  const addToCart = async (product, isBuyNow = false) => {
    const targetSellerId = selectedSeller?.id || selectedSeller?.SellerId;
    const targetSellerName = selectedSeller?.StoreName || selectedSeller?.name || "Unnamed Shop";
    if(!targetSellerId) return;

    if (isBuyNow) {
        const buyNowItem = { ...product, qty: 1, sellerId: targetSellerId, StoreName: targetSellerName, maxStock: product.qty };
        setCheckoutSession({ items: [buyNowItem], isBuyNow: true });
        setIsCartOpen(false); 
        handleVerifyAndCheckout([buyNowItem]); 
        return;
    }

    let currentCart = [...cartItems];
    if (currentCart.length > 0) {
        const existingSellerId = currentCart[0].sellerId;
        if (existingSellerId && existingSellerId !== targetSellerId) {
            if (!window.confirm(`⚠️ Switch Shop?\n\nYour cart contains items from another shop.\n\nClick OK to CLEAR cart and add this item.`)) return;
            currentCart = []; 
        }
    }

    const existingIndex = currentCart.findIndex(item => item.id === product.id);
    const currentQtyInCart = existingIndex >= 0 ? currentCart[existingIndex].qty : 0;
    
    if (currentQtyInCart + 1 > product.qty) return alert(`⚠️ Out of Stock! Only ${product.qty} items available.`);

    if (existingIndex >= 0) {
        currentCart[existingIndex] = { ...currentCart[existingIndex], qty: currentCart[existingIndex].qty + 1 };
    } else {
        currentCart.push({ ...product, qty: 1, sellerId: targetSellerId, StoreName: targetSellerName, maxStock: product.qty });
    }

    setCartItems(currentCart);
    axios.post('http://localhost:7071/api/AddToCart', { userId: user.userId, productId: product.id }).catch(e => console.error(e));
    setIsCartOpen(true); 
  };

  const removeFromCart = (id) => setCartItems(prev => prev.filter(item => item.id !== id));

  const handleUpdateQty = (itemId, newQty) => {
      setCartItems(prev => prev.map(item => {
          if (Number(item.id) === Number(itemId)) {
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
            else if (freshItem.qty < checkoutItem.qty) errors.push(`${checkoutItem.name}: Only ${freshItem.qty} left.`);
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
              cartItems: checkoutSession.items, 
              totalAmount: checkoutSession.items.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0),
              isBuyNow: checkoutSession.isBuyNow 
          });
          
          if (res.status === 200) {
              for (const item of checkoutSession.items) {
                  if (ratings[item.id]) {
                      await axios.post('http://localhost:7071/api/AddRating', {
                          productId: item.id, userId: user.userId, rating: ratings[item.id]
                      }).catch(e => console.error("Rating save failed", e));
                  }
              }
              if (!checkoutSession.isBuyNow) setCartItems([]);
              setRefreshKey(prev => prev + 1); 
              return res.data.orderId; 
          }
      } catch (err) {
          throw new Error(err.response?.data || err.message);
      } finally {
          setIsVerifyingStock(false);    
      }
  };

  const openAccountFeature = (feature) => {
      setIsDropdownOpen(false);
      if (feature === 'orders') {
          setIsBuyerOrdersOpen(true);
      } else if (feature === 'logout') {
          flushLogs(); // 🔥 NEW: Send remaining logs before logging out
          setUser(null); setSelectedSeller(null); setCartItems([]);
      } else {
          setActiveAccountTab(feature);
          setIsAccountModalOpen(true);
      }
  };

  if (!user) return <AuthScreen onUserAuthenticated={setUser} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f3f6', width: '100%', overflowX: 'hidden' }}>
      
      <Header 
        user={user}
        selectedSeller={selectedSeller}
        onLogoClick={() => { setSelectedSeller(null); setGlobalSearch(''); }}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        openAccountFeature={openAccountFeature}
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        hideSearch={!!selectedSeller || isAccountModalOpen || isCheckoutModalOpen || isBuyerOrdersOpen}
      />
      
      <div style={{ padding: isMobile ? '0' : '40px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
          {user.role === 'ADMIN' && <AdminDashboard user={user} />}
          {user.role === 'SELLER' && <SellerDashboard user={user} />}
          
          {user.role === 'BUYER' && (
              <>
                {globalSearch.trim().length > 1 ? (
                    <div style={{ padding: isMobile ? '10px' : '0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#212121', fontSize: isMobile ? '18px' : '24px' }}>
                                {isSearching ? '🔍 Searching...' : `Found ${searchResults.length} items for "${globalSearch}"`}
                            </h2>
                            <button onClick={() => setGlobalSearch('')} style={{ background: 'white', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Clear</button>
                        </div>

                        {searchResults.length === 0 && !isSearching ? (
                            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '8px' }}>
                                <div style={{ fontSize: '50px', marginBottom: '10px' }}>😕</div>
                                <h3>No products found.</h3>
                                <p style={{ color: '#878787' }}>Try different keywords or check your spelling.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                                {searchResults.map(product => {
                                    let imgs = [];
                                    try { imgs = JSON.parse(product.ImageUrl); } catch(e) { imgs = [product.ImageUrl]; }
                                    
                                    return (
                                        <div 
                                            key={product.id} 
                                            onClick={() => {
                                                setGlobalSearch(''); 
                                                setTargetProductId(product.id);
                                                setSelectedSeller({ id: product.sellerId, StoreName: product.StoreName });
                                            }}
                                            style={{ background: 'white', padding: '15px', borderRadius: '8px', width: isMobile ? 'calc(50% - 5px)' : '220px', boxSizing: 'border-box', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}
                                            onMouseOver={(e) => !isMobile && (e.currentTarget.style.transform = 'translateY(-5px)')}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <div style={{ height: isMobile ? '120px' : '180px', marginBottom: '10px' }}>
                                                <img src={imgs[0]} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', height: '40px', overflow: 'hidden' }}>{product.Name}</div>
                                            <div style={{ color: '#2874f0', fontSize: '18px', fontWeight: 'bold', margin: '10px 0' }}>₹{product.Price}</div>
                                            <div style={{ fontSize: '12px', color: '#878787', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                                🏪 Store: <span style={{ color: '#212121', fontWeight: '500' }}>{product.StoreName}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    !selectedSeller ? (
                        <BuyerShopList onEnterShop={(shop) => setSelectedSeller(shop)} refreshKey={refreshKey} />
                    ) : (
                       <BuyerShopView 
                            user={user} 
                            selectedSeller={selectedSeller} 
                            onBack={() => { setSelectedSeller(null); setTargetProductId(null); }} 
                            addToCart={addToCart} 
                            refreshKey={refreshKey} 
                            targetProductId={targetProductId}
                            cartItems={cartItems} 
                            onUpdateQty={handleUpdateQty}
                            // 🔥 PASS THE FUNCTION DOWN SO THE SHOP PAGE CAN USE BATCHING
                            logTraffic={logTraffic} 
                        />
                    )
                )}
              </>
          )}    
      </div>

      <Footer />

      {/* MODALS */}
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cartItems={cartItems} 
        onRemove={removeFromCart} 
        onCheckout={() => { setCheckoutSession({ items: cartItems, isBuyNow: false }); handleVerifyAndCheckout(cartItems); }} 
        isVerifyingStock={isVerifyingStock} 
        onUpdateQty={handleUpdateQty} 
        onProductClick={(sellerId, storeName, productId) => {
            setIsCartOpen(false);
            setTargetProductId(productId);
            setSelectedSeller({ id: sellerId, StoreName: storeName });
        }}
      />
      <CheckoutModal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} cartItems={checkoutSession.items} cartTotal={checkoutSession.items.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0)} onConfirmOrder={handlePlaceOrder} userId={user?.userId} onViewOrders={() => { setIsCheckoutModalOpen(false); setIsBuyerOrdersOpen(true); }} />
      <BuyerOrdersModal isOpen={isBuyerOrdersOpen} onClose={() => setIsBuyerOrdersOpen(false)} userId={user?.userId} />
      <BuyerAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} activeTab={activeAccountTab} setActiveTab={setActiveAccountTab} user={user} onUpdateUser={setUser} onVisitShop={(sellerId, storeName, productId) => { setIsAccountModalOpen(false); setTargetProductId(productId); setSelectedSeller({ id: sellerId, StoreName: storeName }); }} />
    </div>
  );
}

export default App;