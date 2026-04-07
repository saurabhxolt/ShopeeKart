import React, { useState, useEffect } from 'react';
import { parseImages } from '../../utils/imageHelpers';

// 🔥 Safe image extractor to prevent double-parse crashes in the cart
const getFirstImage = (imgProp) => {
  if (!imgProp) return 'https://via.placeholder.com/70';
  if (Array.isArray(imgProp)) return imgProp[0]; 
  try {
    const parsed = parseImages(imgProp);
    return parsed && parsed.length > 0 ? parsed[0] : imgProp;
  } catch (e) {
    return typeof imgProp === 'string' ? imgProp : 'https://via.placeholder.com/70';
  }
};

const CartSidebar = ({ isOpen, onClose, cartItems, onRemove, onCheckout, isVerifyingStock, onUpdateQty, onProductClick }) => {
  const total = cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}></div>}
      <div style={{
        position: 'fixed', top: 0, right: isOpen ? 0 : (isMobile ? '-100%' : '-400px'), 
        width: isMobile ? '100%' : '350px', height: '100%',
        background: 'white', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', zIndex: 1200, transition: 'right 0.3s ease',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ padding: isMobile ? '15px 20px' : '20px', background: '#2874f0', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMobile && <span onClick={onClose} style={{ cursor: 'pointer', marginRight: '5px' }}>←</span>}
            My Cart ({cartItems.length})
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', display: isMobile ? 'none' : 'block' }}>✕</button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px', background: '#f1f3f6', boxSizing: 'border-box' }}>
          {cartItems.length === 0 ? <p style={{ textAlign: 'center', color: '#888', marginTop: 50 }}>Your cart is empty.</p> :
            cartItems.map((item, idx) => {
              
              const maxLimit = item.maxStock || 100;
              const isMaxReached = item.qty >= maxLimit;
              
              const itemKey = `${item.id}-${item.variationId || 'base'}-${idx}`;

              return (
                <div key={itemKey} style={{ background: 'white', borderRadius: '8px', display: 'flex', gap: '15px', marginBottom: '15px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', position: 'relative' }}>
                  
                  <img 
                    src={getFirstImage(item.imageUrl)} 
                    alt="" 
                    onClick={() => onProductClick && onProductClick(item.sellerId, item.StoreName || "Shop", item.id, item.selectedAttributes)}
                    style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '4px', background: '#f9f9f9', padding: '4px', cursor: 'pointer' }} 
                  />
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ paddingRight: '20px' }}>
                      <div 
                        onClick={() => onProductClick && onProductClick(item.sellerId, item.StoreName || "Shop", item.id, item.selectedAttributes)}
                        style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px', color: '#212121', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      >
                        {item.name}
                      </div>

                      {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                        <div style={{ fontSize: '11px', color: '#878787', marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {Object.entries(item.selectedAttributes).map(([key, val]) => (
                            <span key={key} style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                              <strong>{key}:</strong> {val}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ fontWeight: 'bold', color: '#212121', marginBottom: '10px', fontSize: '16px' }}>
                          ₹{item.price * (item.qty || 1)}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                            <button 
                              onClick={() => onUpdateQty(item.id, item.qty - 1, item.variationId)}
                              style={{ width: '32px', height: '32px', border: 'none', borderRight: '1px solid #e0e0e0', background: '#f9f9f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}
                            >-</button>
                            
                            <span style={{ width: '36px', textAlign: 'center', fontWeight: '500', fontSize: '14px' }}>{item.qty}</span>
                            
                            <button 
                              onClick={() => onUpdateQty(item.id, item.qty + 1, item.variationId)}
                              disabled={isMaxReached}
                              style={{ 
                                width: '32px', height: '32px', border: 'none', borderLeft: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold',
                                background: isMaxReached ? '#f0f0f0' : '#f9f9f9', 
                                cursor: isMaxReached ? 'not-allowed' : 'pointer', 
                                color: isMaxReached ? '#aaa' : '#333' 
                              }}
                            >+</button>
                        </div>
                    </div>
                    
                    {isMaxReached && (
                        <div style={{ fontSize: '11px', color: '#dc3545', fontWeight: 'bold', marginTop: '8px' }}>
                            ⚠️ Only {maxLimit} units available.
                        </div>
                    )}
                  </div>

                  {/* 🔥 FIX: Passes BOTH product ID and variation ID to the remove function! */}
                  <button onClick={() => onRemove(item.id, item.variationId)} style={{ position: 'absolute', top: '10px', right: '10px', color: '#878787', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '5px' }}>✕</button>
                </div>
              );
            })
          }
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div style={{ padding: '15px 20px', background: 'white', borderTop: '1px solid #ddd', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold', color: '#212121' }}>
              <span>Total:</span><span>₹{total}</span>
            </div>
            <button 
                onClick={onCheckout} 
                disabled={isVerifyingStock}
                style={{ 
                    width: '100%', padding: '16px', 
                    background: isVerifyingStock ? '#6c757d' : '#fb641b', 
                    color: 'white', border: 'none', borderRadius: '4px', 
                    fontSize: '16px', fontWeight: 'bold', 
                    cursor: isVerifyingStock ? 'wait' : 'pointer',
                    boxSizing: 'border-box'
                }}
            >
                {isVerifyingStock ? "Verifying Stock..." : "Proceed to Pay"}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;