import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImageGallery from '../../components/common/ImageGallery';
import ReadMore from '../../components/common/ReadMore';

const BuyerShopView = ({ selectedSeller, onBack, addToCart, refreshKey }) => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    if (selectedSeller) {
      axios.get(`http://localhost:7071/api/GetProducts?sellerId=${selectedSeller.id}`)
        .then(res => setProducts(res.data))
        .catch(err => console.error(err));
    }
  }, [selectedSeller, refreshKey]);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <button 
          onClick={onBack} 
          style={{ marginBottom: 20, padding: '8px 20px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
      >
          ← Back to Shops
      </button>
      
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <h2 style={{ margin:0 }}>🛍️ Shop: {selectedSeller.name}</h2>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <input 
              placeholder="🔍 Search for items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '16px' }}
          />
          <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', minWidth: '150px' }}
          >
              <option value="">All Categories</option>
              {categories.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
              ))}
          </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 25 }}>
        {filteredProducts.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '40px', color: '#888' }}>
                <h3>🚫 No products match your search.</h3>
                <button onClick={() => {setSearchTerm(""); setCategoryFilter("");}} style={{ marginTop: 10, color: '#007bff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear Filters</button>
            </div>
        ) : (
            filteredProducts.map((p, i) => (
              <div key={i} style={{ border: '1px solid #ddd', padding: 20, borderRadius: 15, width: 320, background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <ImageGallery images={p.imageUrl} />
                <div style={{ padding: '15px 0' }}>
                    <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{p.category || 'General'}</span>
                    <h3 style={{ marginTop: 5, marginBottom: 10 }}>{p.name}</h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                         <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#d32f2f' }}>Rs.{p.price}</span>
                         {p.originalPrice > p.price && (
                             <>
                                 <span style={{ textDecoration: 'line-through', color: '#888' }}>Rs.{p.originalPrice}</span>
                                 <span style={{ color: 'green', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                     ({Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF)
                                 </span>
                             </>
                         )}
                    </div>

                    <ReadMore text={p.description} limit={100} />
                    
                    <div style={{ margin: '15px 0', borderTop: '1px solid #eee', paddingTop: '10px', fontSize: '0.85rem' }}>
                          <p>🚚 <strong>Fast Delivery</strong> in Bengaluru</p>
                          <p>💵 <strong>Pay on Delivery</strong> available</p>
                          {p.qty < 5 && <p style={{ color: 'red', fontWeight: 'bold' }}>🔥 Only {p.qty} left in stock!</p>}
                    </div>
                  
                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.qty <= 0}
                    style={{
                      width: '100%', padding: '14px',
                      background: p.qty > 0 ? '#28a745' : '#ccc',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontWeight: 'bold', cursor: p.qty > 0 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {p.qty > 0 ? "Add to Cart" : "Out of Stock"}
                  </button>                      
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default BuyerShopView;