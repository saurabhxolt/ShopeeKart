import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BuyerShopList = ({ onEnterShop, refreshKey }) => {
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:7071/api/GetSellers') 
      .then(res => {
          const activeSellers = res.data.filter(s => s.IsApproved && !s.IsDeleted);
          setSellers(activeSellers);
      })
      .catch(err => console.error("Failed to load shops", err));
  }, [refreshKey]);

  return (
    <div style={{ padding: '10px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #007bff', paddingBottom: '15px', marginBottom: '35px' }}>
          <h2 style={{ color: '#333', margin: 0, fontSize: '28px' }}>
            🛒 Available Shops ({sellers.length})
          </h2>
          <span style={{ color: '#666', fontSize: '15px', fontWeight: 'bold' }}>Discover top-rated sellers</span>
      </div>
      
      {/* 🔥 INCREASED minmax to 400px to make cards significantly wider */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
          gap: '40px' 
      }}>
        {sellers.map((shop) => (
          <div 
            key={shop.SellerId} 
            style={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: '16px', // Slightly rounder corners for larger card
                background: 'white', 
                boxShadow: '0 6px 16px rgba(0,0,0,0.08)', 
                transition: 'transform 0.2s, box-shadow 0.2s',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%' 
                // ⚠️ Removed the fixed width so the grid can stretch it naturally!
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; }}
          >
            {/* 🔥 TALLER Store Banner */}
            <div style={{ 
                height: '180px', 
                background: shop.StoreBanner ? `url(${shop.StoreBanner}) center/cover` : 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                width: '100%'
            }}></div>

            <div style={{ padding: '0 30px 30px 30px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* 🔥 LARGER Store Logo */}
                <div style={{ 
                    width: '90px', 
                    height: '90px', 
                    borderRadius: '50%', 
                    border: '5px solid white', 
                    background: '#eee', 
                    marginTop: '-45px', 
                    marginBottom: '15px', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    backgroundColor: 'white'
                }}>
                    {shop.StoreLogo ? (
                        <img src={shop.StoreLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '36px' }}>🏪</span>
                    )}
                </div>

                {/* 🔥 BIGGER Text */}
                <h3 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '24px' }}>
                  {shop.StoreName || "Unnamed Shop"}
                </h3>
                
                <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', margin: '0 0 25px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                  {shop.Description || shop.StoreDescription || "Welcome to our store! Browse our latest collections."}
                </p>
                
                <div style={{ fontSize: '14px', color: '#28a745', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#28a745', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</span> 
                  Verified Seller
                </div>
                
                {/* 🔥 BIGGER Button */}
                <button 
                  onClick={() => onEnterShop({ ...shop, id: shop.SellerId, name: shop.StoreName })} 
                  style={{ 
                      width: '100%', 
                      padding: '16px', 
                      background: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '16px',
                      transition: 'background 0.2s',
                      marginTop: 'auto' 
                  }}
                  onMouseOver={(e) => e.target.style.background = '#0056b3'}
                  onMouseOut={(e) => e.target.style.background = '#007bff'}
                >
                  Enter Shop ➔
                </button>
            </div>
          </div>
        ))}
      </div>
      
      {sellers.length === 0 && (
         <div style={{ textAlign: 'center', padding: '60px', background: '#f8f9fa', borderRadius: '12px', color: '#666', marginTop: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '24px' }}>No active shops found right now.</h3>
            <p style={{ fontSize: '16px', marginTop: '10px' }}>Please check back later!</p>
         </div>
      )}
    </div>
  );
};

export default BuyerShopList;