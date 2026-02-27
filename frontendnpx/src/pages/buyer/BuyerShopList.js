import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BuyerShopList = ({ onEnterShop, refreshKey }) => {
  const [sellers, setSellers] = useState([]);

  // 🔥 ADDED: Viewport detection for mobile responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    axios.get('http://localhost:7071/api/GetSellers') 
      .then(res => {
          const activeSellers = res.data.filter(s => s.IsApproved && !s.IsDeleted);
          setSellers(activeSellers);
      })
      .catch(err => console.error("Failed to load shops", err));
  }, [refreshKey]);

  return (
    <div style={{ padding: isMobile ? '10px' : '10px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', borderBottom: '2px solid #007bff', paddingBottom: '15px', marginBottom: isMobile ? '20px' : '35px', gap: isMobile ? '8px' : '0' }}>
          <h2 style={{ color: '#333', margin: 0, fontSize: isMobile ? '22px' : '28px' }}>
            🛒 Available Shops ({sellers.length})
          </h2>
          <span style={{ color: '#666', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold' }}>Discover top-rated sellers</span>
      </div>
      
      <div style={{ 
          display: 'grid', 
          // 🔥 FIX: Use 100% width on mobile (1fr), and 400px min-width on desktop
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', 
          gap: isMobile ? '20px' : '40px' 
      }}>
        {sellers.map((shop) => (
          <div 
            key={shop.SellerId} 
            style={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: '16px', 
                background: 'white', 
                boxShadow: '0 6px 16px rgba(0,0,0,0.08)', 
                transition: 'transform 0.2s, box-shadow 0.2s',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                boxSizing: 'border-box'
            }}
            onMouseOver={(e) => { !isMobile && (e.currentTarget.style.transform = 'translateY(-6px)'); !isMobile && (e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)'); }}
            onMouseOut={(e) => { !isMobile && (e.currentTarget.style.transform = 'translateY(0)'); !isMobile && (e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'); }}
          >
            {/* TALLER Store Banner */}
            <div style={{ 
                height: isMobile ? '120px' : '180px', 
                background: shop.StoreBanner ? `url(${shop.StoreBanner}) center/cover` : 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                width: '100%'
            }}></div>

            <div style={{ padding: isMobile ? '0 20px 20px 20px' : '0 30px 30px 30px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* LARGER Store Logo */}
                <div style={{ 
                    width: isMobile ? '70px' : '90px', 
                    height: isMobile ? '70px' : '90px', 
                    borderRadius: '50%', 
                    border: '5px solid white', 
                    background: '#eee', 
                    marginTop: isMobile ? '-35px' : '-45px', 
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
                        <span style={{ fontSize: isMobile ? '28px' : '36px' }}>🏪</span>
                    )}
                </div>

                {/* BIGGER Text */}
                <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: isMobile ? '20px' : '24px' }}>
                  {shop.StoreName || "Unnamed Shop"}
                </h3>
                
                <p style={{ color: '#555', fontSize: isMobile ? '13px' : '15px', lineHeight: '1.5', margin: '0 0 20px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                  {shop.Description || shop.StoreDescription || "Welcome to our store! Browse our latest collections."}
                </p>
                
                <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#28a745', marginBottom: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#28a745', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</span> 
                  Verified Seller
                </div>
                
                {/* BIGGER Button */}
                <button 
                  onClick={() => onEnterShop({ ...shop, id: shop.SellerId, name: shop.StoreName })} 
                  style={{ 
                      width: '100%', 
                      padding: isMobile ? '14px' : '16px', 
                      background: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: isMobile ? '15px' : '16px',
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
         <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8f9fa', borderRadius: '12px', color: '#666', marginTop: '20px' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px' }}>No active shops found right now.</h3>
            <p style={{ fontSize: isMobile ? '14px' : '16px', marginTop: '10px' }}>Please check back later!</p>
         </div>
      )}
    </div>
  );
};

export default BuyerShopList;