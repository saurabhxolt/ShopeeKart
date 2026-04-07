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
import SellerProfileModal from './components/profile/SellerProfileModal'; 

function App() {
  const [user, setUser] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null); 
  const [targetProductId, setTargetProductId] = useState(null);
  const [targetAttributes, setTargetAttributes] = useState(null);
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

  const [isSellerProfileOpen, setIsSellerProfileOpen] = useState(false);

  const [checkoutSession, setCheckoutSession] = useState({ items: [], isBuyNow: false });

  // --- POLICY MODAL STATES ---
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activePolicyTitle, setActivePolicyTitle] = useState('');
  const [policyContent, setPolicyContent] = useState(''); 
  const [policyLang, setPolicyLang] = useState('en'); 

  // VIEWPORT DETECTION
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const cartUpdateTimer = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openPolicyDocument = async (fileName, title) => {
      setActivePolicyTitle(title);
      setShowTermsModal(true);
      setPolicyLang('en'); 
      setPolicyContent('<p style="text-align:center; padding: 20px; color:#666;">Loading document...</p>');

      try {
          const response = await fetch(`/policies/${fileName}.html`);
          if (!response.ok) throw new Error("Document not found");
          const text = await response.text();
          setPolicyContent(text);
      } catch (error) {
          setPolicyContent('<p style="color:red; padding: 20px;">Failed to load the policy document. Please ensure the lowercase "policies" folder exists in public/.</p>');
      }
  };

  const trafficQueue = useRef([]);

  const flushLogs = useCallback(() => {
      if (trafficQueue.current.length === 0) return;
      
      const payload = [...trafficQueue.current]; 
      trafficQueue.current = []; 

      fetch('http://localhost:7071/api/LogTrafficBatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true 
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

    if (trafficQueue.current.length >= 50) {
        flushLogs();
    }
  }, [user, isMobile, flushLogs]);

  useEffect(() => {
      const handleUnload = () => flushLogs();
      window.addEventListener('beforeunload', handleUnload);
      return () => window.removeEventListener('beforeunload', handleUnload);
  }, [flushLogs]);

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

  // ==========================================
  // 🔥 UNIFIED SSOT CART LOGIC
  // ==========================================
  
  const dispatchCartAction = async (payload) => {
      try {
          const response = await axios.post('http://localhost:7071/api/ManageCart', {
              userId: user.userId,
              ...payload
          });
          
          if (response.data && response.data.cart) {
              setCartItems(response.data.cart);
          }
          return { success: true, data: response.data };
      } catch (e) {
          console.error("Cart sync failed:", e);
          return { success: false, error: e };
      }
  };

  // 🔥 FIX: Hydrate cart WITHOUT forcing navigation to a specific shop
  useEffect(() => {
      const hydrateCart = async () => {
          if (user?.userId) {
              // This populates cartItems so the Header/Sidebar show the correct data
              await dispatchCartAction({ action: 'FETCH' });
              
              // We REMOVED setSelectedSeller here so you land on the Shop List page.
          } else {
              setCartItems([]);
          }
      };
      hydrateCart();
  }, [user?.userId]);

  const addToCart = async (product, isBuyNow = false) => {
    const targetSellerId = selectedSeller?.id || selectedSeller?.SellerId;
    const targetSellerName = selectedSeller?.StoreName || selectedSeller?.name || "Unnamed Shop";
    if(!targetSellerId) return;

    const prodId = product.id || product.ProductId;
    const varId = product.variationId || product.VariationId || null;

    if (isBuyNow) {
        const buyNowItem = { ...product, qty: 1, sellerId: targetSellerId, StoreName: targetSellerName, maxStock: product.qty, id: prodId, variationId: varId };
        setCheckoutSession({ items: [buyNowItem], isBuyNow: true });
        setIsCartOpen(false); 
        handleVerifyAndCheckout([buyNowItem]); 
        return;
    }

    if (cartItems.length > 0) {
        const existingSellerId = cartItems[0].sellerId;
        if (existingSellerId && String(existingSellerId) !== String(targetSellerId)) {
            if (!window.confirm(`⚠️ Switch Shop?\n\nYour cart contains items from another shop.\n\nClick OK to CLEAR cart and add this item.`)) return;
            
            const res = await dispatchCartAction({ action: 'CLEAR' });
            if (!res.success) return alert("❌ Failed to clear old cart from DB.");
        }
    }

    const addRes = await dispatchCartAction({ action: 'ADD', productId: prodId, variationId: varId, qty: 1 });
    
    if (!addRes.success) {
        alert("❌ Failed to save to database! Please try again.");
        return;
    }

    setIsCartOpen(true); 
  };

  const removeFromCart = async (id, variationId = null) => {
      setCartItems(prev => prev.filter(item => {
          const isMatch = String(item.id || item.ProductId) === String(id) && 
                          String(item.variationId || item.VariationId) === String(variationId || 'null');
          return !isMatch;
      }));

      await dispatchCartAction({ action: 'REMOVE', productId: id, variationId: variationId });
  };

  const handleUpdateQty = async (itemId, newQty, variationId = null) => {
      let finalQty = newQty;
      
      // 1. Instant UI Update for the main Cart
      setCartItems(prev => prev.map(item => {
          const isMatch = String(item.id || item.ProductId) === String(itemId) && 
                          (variationId ? String(item.variationId || item.VariationId) === String(variationId) : true);
          
          if (isMatch) {
            if (newQty < 1) finalQty = 0;
            else if (newQty > (item.maxStock || 100)) finalQty = item.maxStock || 100;
            else finalQty = newQty;
            return { ...item, qty: finalQty };
        }
          return item;
      }).filter(item => item.qty > 0)); 

      // 🔥 THE FIX: Instantly update the Checkout Session snapshot so the Modal UI updates!
      setCheckoutSession(prevSession => {
          if (!prevSession || !prevSession.items) return prevSession;
          return {
              ...prevSession,
              items: prevSession.items.map(item => {
                  const isMatch = String(item.id || item.ProductId) === String(itemId) && 
                                  (variationId ? String(item.variationId || item.VariationId) === String(variationId) : true);
                  if (isMatch) return { ...item, qty: finalQty };
                  return item;
              }).filter(item => item.qty > 0)
          };
      });
      
      // 2. Debounce logic to prevent DB spam
      if (cartUpdateTimer.current) {
          clearTimeout(cartUpdateTimer.current);
      }

      cartUpdateTimer.current = setTimeout(async () => {
          if (finalQty <= 0) {
              await dispatchCartAction({ action: 'REMOVE', productId: itemId, variationId: variationId });
          } else {
              await dispatchCartAction({ action: 'UPDATE_QTY', productId: itemId, variationId: variationId, qty: finalQty });
          }
      }, 400); 
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
            const freshItem = freshProducts.find(p => String(p.id || p.ProductId) === String(checkoutItem.id || checkoutItem.ProductId));
            
            if (!freshItem) {
                errors.push(`"${checkoutItem.name}" is no longer available.`);
            } else if (checkoutItem.variationId) {
                const freshVar = freshItem.variations?.find(v => String(v.id || v.VariationId) === String(checkoutItem.variationId));
                if (!freshVar) {
                    errors.push(`Selected option for "${checkoutItem.name}" is no longer available.`);
                } else if (freshVar.stock < checkoutItem.qty) {
                    const attrText = checkoutItem.selectedAttributes ? Object.values(checkoutItem.selectedAttributes).join(', ') : 'Variation';
                    errors.push(`"${checkoutItem.name}" (${attrText}): Only ${freshVar.stock} left in stock.`);
                }
            } else {
                if (freshItem.qty < checkoutItem.qty) {
                    errors.push(`"${checkoutItem.name}": Only ${freshItem.qty} left in stock.`);
                }
            }
        }
        
        setIsVerifyingStock(false);
        if (errors.length > 0) return alert("⚠️ Stock Issue:\n\n" + errors.join("\n"));
        setIsCartOpen(false);
        setIsCheckoutModalOpen(true);
    } catch (err) {
        setIsVerifyingStock(false);
        alert("Could not verify stock.");
    }
  };

  const handlePlaceOrder = async (address, ratings, paymentMethod) => {
      setIsVerifyingStock(true); 
      try {
          const res = await axios.post('http://localhost:7071/api/PlaceOrder', {
              userId: user.userId, 
              address, 
              cartItems: checkoutSession.items, 
              totalAmount: checkoutSession.items.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0),
              isBuyNow: checkoutSession.isBuyNow,
              paymentMethod: paymentMethod 
          });
          
          if (res.status === 200) {
              for (const item of checkoutSession.items) {
                  const itemId = item.id || item.ProductId;
                  if (ratings[itemId]) {
                      await axios.post('http://localhost:7071/api/AddRating', {
                          productId: itemId, userId: user.userId, rating: ratings[itemId]
                      }).catch(e => console.error("Rating save failed", e));
                  }
              }
              if (!checkoutSession.isBuyNow) {
                  setCartItems([]);
                  await dispatchCartAction({ action: 'CLEAR' }); 
              }
              setRefreshKey(prev => prev + 1); 
              
              return {
                  orderId: res.data.orderId,
                  transactionId: res.data.transactionId
              }; 
          }
      } catch (err) {
          // 🔥 THE FIX: If it's our stock conflict JSON, throw it directly!
          if (err.response && err.response.data && err.response.data.code === 'INSUFFICIENT_STOCK') {
              throw err.response.data; 
          }
          
          // For any other normal error, safely pull the string
          let errorMsg = err.message;
          if (err.response && err.response.data) {
              errorMsg = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
          }
          throw new Error(errorMsg);

      } finally {
          setIsVerifyingStock(false);    
      }
  };

  const openAccountFeature = (feature) => {
      setIsDropdownOpen(false);
      if (feature === 'orders') {
          setIsBuyerOrdersOpen(true);
      } else if (feature === 'logout') {
          flushLogs(); 
          setUser(null); setSelectedSeller(null); setCartItems([]);
      } else if (feature === 'store-settings') {
          setIsSellerProfileOpen(true);
      } else {
          setActiveAccountTab(feature);
          setIsAccountModalOpen(true);
      }
  };

  if (!user) return <AuthScreen onUserAuthenticated={setUser} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f3f6', width: '100%', overflowX: 'hidden' }}>
      
      <style>{`
        .policy-wrapper .lang-en, .policy-wrapper .lang-hi, .policy-wrapper .lang-mr { display: none; }
        .policy-wrapper.show-en .lang-en { display: block; }
        .policy-wrapper.show-hi .lang-hi { display: block; }
        .policy-wrapper.show-mr .lang-mr { display: block; }
      `}</style>

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
          {user.role === 'SELLER' && <SellerDashboard user={user} refreshKey={refreshKey} />}
          
          {user.role === 'BUYER' && (
              <>
                {globalSearch.trim().length > 1 ? (
                    // ... search result rendering ...
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
                                                setTargetAttributes(null);
                                            }}
                                            style={{ background: 'white', padding: '15px', borderRadius: '8px', width: isMobile ? 'calc(50% - 5px)' : '220px', boxSizing: 'border-box', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                        >
                                            <div style={{ height: isMobile ? '120px' : '180px', marginBottom: '10px' }}>
                                                <img src={imgs[0]} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', height: '40px', overflow: 'hidden' }}>{product.Name}</div>
                                            <div style={{ color: '#2874f0', fontSize: '18px', fontWeight: 'bold', margin: '10px 0' }}>₹{product.Price}</div>
                                            <div style={{ fontSize: '12px', color: '#878787', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                                🏪 {product.StoreName}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    !selectedSeller ? (
                        <BuyerShopList 
                            onEnterShop={(shop) => { setSelectedSeller(shop); setTargetAttributes(null); }} 
                            refreshKey={refreshKey} 
                        />
                    ) : (
                        <BuyerShopView
                            user={user}
                            selectedSeller={selectedSeller}
                            onBack={() => { setSelectedSeller(null); setTargetProductId(null); setTargetAttributes(null); }}
                            addToCart={addToCart}
                            refreshKey={refreshKey}
                            targetProductId={targetProductId}
                            setTargetProductId={setTargetProductId}
                            cartItems={cartItems}
                            onUpdateQty={handleUpdateQty}
                            logTraffic={logTraffic}
                            targetAttributes={targetAttributes}
                            setTargetAttributes={setTargetAttributes}
                        />
                    )
                )}
              </>
          )}    
      </div>

      <Footer user={user} onOpenPolicy={openPolicyDocument} />

      {showTermsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: isMobile ? '20px' : '30px', borderRadius: '12px', width: '95%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setShowTermsModal(false)} style={{ position: 'absolute', top: '10px', right: '15px', border: 'none', background: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>&times;</button>
            <div 
                className={`policy-wrapper show-${policyLang}`}
                style={{ flex: 1, fontSize: '14px', lineHeight: '1.6', color: '#444', overflowY: 'auto', maxHeight: '55vh', paddingRight: '10px', marginBottom: '15px' }}
                dangerouslySetInnerHTML={{ __html: policyContent }} 
            />
            <button onClick={() => setShowTermsModal(false)} style={{ width: '100%', padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                Close
            </button>
          </div>
        </div>
      )}

      <CartSidebar 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          cartItems={cartItems} 
          onRemove={removeFromCart} 
          onCheckout={() => { setCheckoutSession({ items: cartItems, isBuyNow: false }); handleVerifyAndCheckout(cartItems); }} 
          isVerifyingStock={isVerifyingStock} 
          onUpdateQty={handleUpdateQty} 
          onProductClick={(sellerId, storeName, productId, attributes) => { 
              setIsCartOpen(false); 
              setTargetProductId(productId); 
              setSelectedSeller({ id: sellerId, StoreName: storeName }); 
              setTargetAttributes(attributes || null); 
          }} 
      />
      <CheckoutModal 
          isOpen={isCheckoutModalOpen} 
          onClose={() => setIsCheckoutModalOpen(false)} 
          cartItems={checkoutSession.items} 
          cartTotal={checkoutSession.items.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0)} 
          onConfirmOrder={handlePlaceOrder} 
          userId={user?.userId} 
          onViewOrders={() => { setIsCheckoutModalOpen(false); setIsBuyerOrdersOpen(true); }} 
          onUpdateQty={handleUpdateQty} // 🔥 NEW PROP
      />
      <BuyerOrdersModal isOpen={isBuyerOrdersOpen} onClose={() => setIsBuyerOrdersOpen(false)} userId={user?.userId} />
      <BuyerAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} activeTab={activeAccountTab} setActiveTab={setActiveAccountTab} user={user} onUpdateUser={setUser} onVisitShop={(sellerId, storeName, productId) => { setIsAccountModalOpen(false); setTargetProductId(productId); setSelectedSeller({ id: sellerId, StoreName: storeName }); }} />
      
      <SellerProfileModal 
        isOpen={isSellerProfileOpen} 
        onClose={() => {
            setIsSellerProfileOpen(false);
            setRefreshKey(prev => prev + 1); 
        }} 
        userId={user?.userId} 
      />

    </div>
  );
}

export default App;