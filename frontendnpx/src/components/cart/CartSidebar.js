import React from 'react';
import { parseImages } from '../../utils/imageHelpers';

const CartSidebar = ({ isOpen, onClose, cartItems, onRemove, onCheckout, isVerifyingStock, onUpdateQty }) => {
  const total = cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.qty || 1)), 0);

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}></div>}
      <div style={{
        position: 'fixed', top: 0, right: isOpen ? 0 : '-400px', width: '350px', height: '100%',
        background: 'white', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', zIndex: 1200, transition: 'right 0.3s ease',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px', background: '#007bff', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>My Cart ({cartItems.length})</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cartItems.length === 0 ? <p style={{ textAlign: 'center', color: '#888', marginTop: 50 }}>Your cart is empty.</p> :
            cartItems.map((item, idx) => {
              
              // 🔥 NEW: Calculate if the max limit has been reached
              const maxLimit = item.maxStock || 100;
              const isMaxReached = item.qty >= maxLimit;

              return (
                <div key={idx} style={{ display: 'flex', gap: '15px', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                  <img src={parseImages(item.imageUrl)[0]} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{item.name}</div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <button 
                          onClick={() => onUpdateQty(item.id, item.qty - 1)}
                          style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #ccc', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >-</button>
                        
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.qty}</span>
                        
                        {/* 🔥 NEW: Disabled state styling when max is reached */}
                        <button 
                          onClick={() => onUpdateQty(item.id, item.qty + 1)}
                          disabled={isMaxReached}
                          style={{ 
                            width: '25px', height: '25px', borderRadius: '50%', 
                            border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isMaxReached ? '#f0f0f0' : 'white', 
                            cursor: isMaxReached ? 'not-allowed' : 'pointer', 
                            color: isMaxReached ? '#aaa' : '#333' 
                          }}
                        >+</button>
                    </div>

                    <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: isMaxReached ? '4px' : '0' }}>
                        Rs. {item.price * (item.qty || 1)}
                    </div>
                    
                    {/* 🔥 NEW: Inline Red Warning Text */}
                    {isMaxReached && (
                        <div style={{ fontSize: '11px', color: '#dc3545', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ Stock Limit Reached! <br/> Only {maxLimit} units of this item are available.
                        </div>
                    )}
                  </div>
                  <button onClick={() => onRemove(item.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' }}>✕</button>
                </div>
              );
            })
          }
        </div>

        {cartItems.length > 0 && (
          <div style={{ padding: '20px', background: '#f8f9fa', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
              <span>Total:</span><span>Rs. {total}</span>
            </div>
            <button 
                onClick={onCheckout} 
                disabled={isVerifyingStock}
                style={{ 
                    width: '100%', padding: '15px', 
                    background: isVerifyingStock ? '#6c757d' : '#28a745', 
                    color: 'white', border: 'none', borderRadius: '8px', 
                    fontSize: '16px', fontWeight: 'bold', 
                    cursor: isVerifyingStock ? 'wait' : 'pointer' 
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