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

function App() {
  // Global State
  const [user, setUser] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null); 
  const [refreshKey, setRefreshKey] = useState(0); // Triggers re-fetching child data
  
  // Modals & Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isVerifyingStock, setIsVerifyingStock] = useState(false); 
  const [isBuyerOrdersOpen, setIsBuyerOrdersOpen] = useState(false);

  // --- CART HANDLERS ---
  const addToCart = async (product) => {
    if (cartItems.length > 0) {
        const existingSellerId = cartItems[0].sellerId;
        // Safely extract the ID from the selectedSeller object
        const currentShopId = selectedSeller.id || selectedSeller.SellerId;
        
        if (existingSellerId && existingSellerId !== currentShopId) {
            if (!window.confirm(`⚠️ Switch Shop?\n\nYour cart contains items from another shop.\n\nClick OK to CLEAR cart and add this item.\nClick Cancel to keep your existing cart.`)) return;
            setCartItems([]); 
        }
    }

    let currentQtyInCart = 0;
    const currentShopIdForQty = selectedSeller.id || selectedSeller.SellerId;

    if (!(cartItems.length > 0 && cartItems[0].sellerId !== currentShopIdForQty)) {
         const existingItem = cartItems.find(item => item.id === product.id);
         currentQtyInCart = existingItem ? existingItem.qty : 0;
    }
    
    if (currentQtyInCart + 1 > product.qty) {
        return alert(`⚠️ Out of Stock! Only ${product.qty} items available.`);
    }

    axios.post('http://localhost:7071/api/AddToCart', { userId: user.userId, productId: product.id }).catch(e => console.error(e));

    setCartItems(prev => {
        const targetSellerId = selectedSeller.id || selectedSeller.SellerId;
        if (prev.length > 0 && prev[0].sellerId !== targetSellerId) {
             return [{ ...product, qty: 1, sellerId: targetSellerId, maxStock: product.qty }];
        }
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
            return prev.map(item => item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item);
        }
        return [...prev, { ...product, qty: 1, sellerId: targetSellerId, maxStock: product.qty }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id) => setCartItems(prev => prev.filter(item => item.id !== id));

  const handleUpdateQty = (itemId, newQty) => {
      setCartItems(prev => prev.map(item => {
          if (item.id === itemId) {
              if (newQty < 1) return { ...item, qty: 0 };
              if (newQty > (item.maxStock || 100)) {
                  alert(`Sorry, only ${item.maxStock || 100} items in stock!`);
                  return item;
              }
              return { ...item, qty: newQty };
          }
          return item;
      }).filter(item => item.qty > 0)); 
  };

  const handleVerifyAndCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsVerifyingStock(true);
    const sellerId = cartItems[0].sellerId; 
    
    try {
        const res = await axios.get(`http://localhost:7071/api/GetProducts?sellerId=${sellerId}`);
        const freshProducts = res.data;

        let errors = [];
        for (const cartItem of cartItems) {
            const freshItem = freshProducts.find(p => p.id === cartItem.id);
            if (!freshItem) errors.push(`${cartItem.name} is no longer available.`);
            else if (freshItem.qty < cartItem.qty) errors.push(`${cartItem.name}: You want ${cartItem.qty}, but only ${freshItem.qty} left.`);
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

  // 🔥 UPDATED: Now receives the ratings object from the CheckoutModal
  const handlePlaceOrder = async (address, ratings) => {
      setIsVerifyingStock(true); 
      try {
          const res = await axios.post('http://localhost:7071/api/PlaceOrder', {
              userId: user.userId, address, cartItems,
              totalAmount: cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0)
          });
          
          if (res.status === 200) {
              
              // 🔥 NEW: Save the ratings for all purchased items
              for (const item of cartItems) {
                  if (ratings[item.id]) {
                      await axios.post('http://localhost:7071/api/AddRating', {
                          productId: item.id,
                          userId: user.userId,
                          rating: ratings[item.id]
                      }).catch(e => console.error("Rating save failed", e));
                  }
              }

              setCartItems([]);              
              setRefreshKey(prev => prev + 1); 
              setIsCheckoutModalOpen(false); // Ensure modal closes
              return res.data.orderId; 
          }
      } catch (err) {
          throw new Error(err.response?.data || err.message);
      } finally {
          setIsVerifyingStock(false);    
      }
  };

  // --- ROUTING ---
  if (!user) return <AuthScreen onUserAuthenticated={setUser} />;

  return (
    <div style={{ padding: 50 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom:'20px', borderBottom:'1px solid #eee', marginBottom:'20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {/* Clean welcome message */}
                  <h1 style={{ margin: 0, fontSize: '24px' }}>
                      Welcome, {user.name}!!
                  </h1>          
                </div>

          <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
              {user.role === 'BUYER' && (
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsCartOpen(true)}>
                      <span style={{ fontSize: '28px' }}>🛒</span>
                      {cartItems.length > 0 && (
                          <div style={{ position: 'absolute', top: -5, right: -8, background: '#dc3545', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', minWidth:'15px', textAlign:'center' }}>
                              {cartItems.reduce((acc, item) => acc + (item.qty || 1), 0)}
                          </div>
                      )}
                  </div>
              )}
              {user.role === 'BUYER' && (
                  <button onClick={() => setIsBuyerOrdersOpen(true)} style={{ background: '#c5bcbc', border: 'none', cursor: 'pointer', fontSize: '16px', borderRadius:'4px', padding:'5px 10px' }}>📦 My Orders</button>
              )}
              <button onClick={() => {setUser(null); setSelectedSeller(null); setCartItems([])}} style={{cursor:'pointer', padding:'8px 16px', background:'#333', color:'white', border:'none', borderRadius:'4px'}}>Logout</button>
          </div>
      </div>
      
      {/* GLOBAL MODALS */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cartItems={cartItems} onRemove={removeFromCart} onCheckout={handleVerifyAndCheckout} isVerifyingStock={isVerifyingStock} onUpdateQty={handleUpdateQty} />
      
      {/* 🔥 CHECKOUT MODAL WILL NOW PASS BACK THE RATINGS OBJECT */}
      <CheckoutModal 
          isOpen={isCheckoutModalOpen} 
          onClose={() => setIsCheckoutModalOpen(false)} 
          cartItems={cartItems} 
          cartTotal={cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0)} 
          onConfirmOrder={handlePlaceOrder} 
      />
      
      <BuyerOrdersModal isOpen={isBuyerOrdersOpen} onClose={() => setIsBuyerOrdersOpen(false)} userId={user?.userId} />

      {/* PAGE RENDERING based on Role & State */}
      {user.role === 'ADMIN' && <AdminDashboard user={user} />}
      {user.role === 'SELLER' && <SellerDashboard user={user} />}
      
      {user.role === 'BUYER' && !selectedSeller && <BuyerShopList onEnterShop={(shop) => setSelectedSeller(shop)} refreshKey={refreshKey} />}
      {user.role === 'BUYER' && selectedSeller && <BuyerShopView user={user} selectedSeller={selectedSeller} onBack={() => setSelectedSeller(null)} addToCart={addToCart} refreshKey={refreshKey} />}    </div>
  );
}

export default App;