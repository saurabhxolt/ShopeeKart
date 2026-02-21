import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BuyerShopList = ({ onEnterShop, refreshKey }) => {
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:7071/api/GetSellers') 
      .then(res => setSellers(res.data))
      .catch(err => console.error("Failed to load shops", err));
  }, [refreshKey]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px', display: 'inline-block' }}>
        Available Shops
      </h2>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        {sellers.map((shop) => (
          <div key={shop.SellerId} style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', width: '280px', background: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }}>
            <h3 style={{ marginTop: 0, color: '#007bff', fontSize: '18px' }}>
              {shop.StoreName || "Unnamed Shop"}
            </h3>
            <p style={{ color: '#666', fontSize: '14px', height: '40px', overflow: 'hidden' }}>
              {shop.Description || "No description provided."}
            </p>
            <div style={{ fontSize: '12px', color: '#28a745', marginBottom: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>✓</span> Verified Seller
            </div>
            <button 
              onClick={() => onEnterShop(shop.SellerId, shop.StoreName)} 
              style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              Enter Shop ➔
            </button>
          </div>
        ))}
      </div>
      
      {sellers.length === 0 && (
         <p style={{ color: '#666', marginTop: '20px' }}>No active shops found. Tell your admin to approve some sellers!</p>
      )}
    </div>
  );
};

export default BuyerShopList;