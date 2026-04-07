import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ProductDetailView from './ProductDetailView'; 

const BuyerShopView = ({ user, selectedSeller, onBack, addToCart, refreshKey, targetProductId, setTargetProductId, targetAttributes, setTargetAttributes, cartItems = [], onUpdateQty, logTraffic }) =>  {
  
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [wishlistIds, setWishlistIds] = useState([]);
  const [showSellerProfile, setShowSellerProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const loggedShopVisits = useRef(new Set());
  const [enrichedShopData, setEnrichedShopData] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      if (products.length > 0) {
          const s = products[0];
          setEnrichedShopData({
              id: s.sellerId,
              SellerId: s.sellerId,
              StoreName: s.storeName || s.StoreName,
              SupportPhone: s.sellerPhone,
              SupportEmail: s.sellerEmail,
              PickupAddress: s.pickupAddress,
              StoreLogo: s.storeLogo,
              StoreBanner: s.storeBanner,
              StoreDescription: s.storeDescription
          });
      } else if (selectedSeller) {
          const initialData = (selectedSeller && typeof selectedSeller.id === 'object') ? selectedSeller.id : selectedSeller || {};
          setEnrichedShopData(initialData);
      }
  }, [products, selectedSeller]);

  const sellerId = enrichedShopData.SellerId || enrichedShopData.id;
  const storeName = enrichedShopData.StoreName || enrichedShopData.name || "Unnamed Shop";
  const storeLogo = enrichedShopData.StoreLogo || enrichedShopData.logo;
  const storeDesc = enrichedShopData.StoreDescription || enrichedShopData.Description || enrichedShopData.description;

  useEffect(() => {
    if (sellerId && !selectedProduct && logTraffic) {
        if (!loggedShopVisits.current.has(sellerId)) {
            logTraffic('Shop', sellerId);
            loggedShopVisits.current.add(sellerId);
        }
    }
  }, [sellerId, !!selectedProduct, logTraffic]);

  useEffect(() => {
    if (selectedProduct && logTraffic) {
        logTraffic('Product', sellerId, selectedProduct.id || selectedProduct.ProductId);
    }
  }, [selectedProduct, sellerId, logTraffic]);

  useEffect(() => {
    if (sellerId && !isNaN(sellerId)) {
      axios.get(`http://localhost:7071/api/GetProducts?sellerId=${sellerId}`)
        .then(res => setProducts(res.data))
        .catch(err => console.error(err));
    }
  }, [sellerId, refreshKey]);

  useEffect(() => {
    const syncWishlist = async () => {
        if (user?.userId) {
            try {
                const res = await axios.get(`http://localhost:7071/api/GetWishlist?userId=${user.userId}&t=${Date.now()}`);
                const ids = res.data.map(item => item.id || item.ProductId);
                setWishlistIds(ids);
            } catch (err) {}
        }
    };
    syncWishlist();
  }, [user?.userId, refreshKey]); 

  useEffect(() => {
      if (targetProductId && products.length > 0) {
          const productToOpen = products.find(p => 
              String(p.id) === String(targetProductId) || 
              String(p.ProductId) === String(targetProductId)
          );
          if (productToOpen) {
              setSelectedProduct(productToOpen);
              if (setTargetProductId) setTargetProductId(null);
          }
      }
  }, [targetProductId, products, setTargetProductId]);

  const handleWishlistToggle = async (e, productId) => {
      e.stopPropagation(); 
      const isCurrentlyWishlisted = wishlistIds.includes(productId);
      setWishlistIds(prev => isCurrentlyWishlisted ? prev.filter(id => id !== productId) : [...prev, productId]);
      try {
          await axios.post('http://localhost:7071/api/ToggleWishlist', { userId: user.userId, productId: productId });
      } catch (err) { alert("Failed to update wishlist."); }
  };

  const categories = [...new Set(products.map(p => p.subCategory || p.mainCategory).filter(Boolean))];

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
        const matchesCategory = categoryFilter ? (p.subCategory === categoryFilter || p.mainCategory === categoryFilter) : true;
        if (!matchesCategory) return false;
        if (!searchTerm.trim()) return true;
        const searchableText = `${p.name || ''} ${p.brand || ''} ${p.subCategory || ''} ${p.mainCategory || ''} ${p.description || ''}`.toLowerCase();
        return searchTerm.toLowerCase().split(' ').every(word => searchableText.includes(word));
    });
    return result.sort((a, b) => {
        if (sortBy === "priceLow") return (a.price || a.Price) - (b.price || b.Price);
        if (sortBy === "priceHigh") return (b.price || b.Price) - (a.price || a.Price);
        return new Date(b.createdAt || b.CreatedAt) - new Date(a.createdAt || a.CreatedAt);
    });
  }, [products, searchTerm, categoryFilter, sortBy]);

  const getImages = (imageProp) => {
      if (!imageProp) return [];
      if (Array.isArray(imageProp)) return imageProp; 
      if (typeof imageProp === 'string' && imageProp.startsWith('[')) {
          try { return JSON.parse(imageProp); } catch (e) { return [imageProp]; }
      }
      return [imageProp];
  };

  const renderSellerProfileModal = () => {
      if (!showSellerProfile) return null;
      return (
        // 🔥 FIX: Super high zIndex (99999) to cover everything
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: isMobile ? '10px' : '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', boxSizing: 'border-box', maxWidth: '500px', overflowY: 'auto', maxHeight: '90vh', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div style={{ height: '120px', width: '100%', background: enrichedShopData.StoreBanner ? `url(${enrichedShopData.StoreBanner}) center/cover` : 'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)' }}></div>
                <button onClick={() => setShowSellerProfile(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#333' }}>&times;</button>
                
                <div style={{ padding: isMobile ? '15px' : '0 30px 30px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-40px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', background: '#eee', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                        {storeLogo ? <img src={storeLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px' }}>🏪</span>}
                    </div>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#333', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>{storeName}</h2>
                    <div style={{ display: 'flex', gap: '15px', color: '#28a745', fontSize: '13px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center', justifyContent: 'center', width: '100%' }}>✓ Verified Marketplace Seller</div>
                    
                    <div style={{ width: '100%', boxSizing: 'border-box', background: '#f8f9fa', borderRadius: '8px', padding: '20px', border: '1px solid #eee' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2874f0', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Contact Details</h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start', wordBreak: 'break-word' }}>
                            <span style={{ fontSize: '16px' }}>📞</span> <span><strong>Phone:</strong> <br/> {enrichedShopData.SupportPhone || enrichedShopData.Phone || 'Not provided'}</span>
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start', wordBreak: 'break-word' }}>
                            <span style={{ fontSize: '16px' }}>✉️</span> <span><strong>Email:</strong> <br/> {enrichedShopData.SupportEmail || enrichedShopData.Email || 'Not provided'}</span>
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start', wordBreak: 'break-word' }}>
                            <span style={{ fontSize: '16px' }}>📍</span> <span><strong>Pickup Address:</strong> <br/> {enrichedShopData.PickupAddress || enrichedShopData.Address || 'Not provided'}</span>
                        </p>
                        {storeDesc && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd', width: '100%' }}>
                                <strong>About this Store:</strong>
                                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666', lineHeight: '1.5' }}>{storeDesc}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  // 🔥 FIX: We wrap ProductDetailView and the Modal in a Fragment (<>...</>) 
  // so the modal escapes the CSS boundaries of the product view!
  if (selectedProduct) {
      return (
          <>
            <ProductDetailView 
                selectedProduct={selectedProduct}
                onBack={() => setSelectedProduct(null)}
                addToCart={addToCart}
                cartItems={cartItems}
                onUpdateQty={onUpdateQty}
                wishlistIds={wishlistIds}
                handleWishlistToggle={handleWishlistToggle}
                isMobile={isMobile}
                storeName={storeName}
                storeLogo={storeLogo}
                setShowSellerProfile={setShowSellerProfile}
                allProducts={products} 
                onProductSelect={setSelectedProduct}
            />
            {renderSellerProfileModal()}
          </>
      );
  }

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px', padding: isMobile ? '0 10px' : '0', overflowX: 'hidden' }}>
      <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', marginBottom: '10px' }}>
          <button onClick={onBack} style={{ padding: '8px 20px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold' }}>← Back to Shops</button>
          
          <div onClick={() => setShowSellerProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', padding: '6px 15px', borderRadius: '25px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
              <img src={storeLogo || 'https://via.placeholder.com/24'} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
              <span style={{ fontWeight: 'bold', color: '#2874f0', fontSize: '14px' }}>{storeName} <span style={{ fontWeight: 'normal', color: '#888' }}>ⓘ</span></span>
          </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#fff', padding: '15px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', width: '100%', boxSizing: 'border-box' }}>
          <input placeholder="🔍 Search by name, brand, or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', flex: isMobile ? 'none' : 2, padding: '10px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          
          <div style={{ display: 'flex', gap: '10px', width: '100%', flex: isMobile ? 'none' : 1, boxSizing: 'border-box' }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ flex: 1, width: '50%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">All Categories</option>
                {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
            </select>

            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                style={{ flex: 1, width: '50%', padding: '10px', border: '1px solid #2874f0', borderRadius: '4px', fontSize: '14px', outline: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#2874f0', boxSizing: 'border-box' }}
            >
                <option value="newest">Newest</option>
                <option value="priceLow">Price ↑</option>
                <option value="priceHigh">Price ↓</option>
            </select>
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: isMobile ? '10px' : '15px', width: '100%', boxSizing: 'border-box' }}>
        {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#878787', width: '100%', boxSizing: 'border-box' }}><h3>No products match your search.</h3></div>
        ) : (
            filteredProducts.map((p, i) => {
              const images = getImages(p.imageUrl || p.ImageUrl);
              const thumb = images.length > 0 ? images[0] : 'https://via.placeholder.com/240x320';
              const pPrice = p.price || p.Price;
              const pOrigPrice = p.originalPrice || p.OriginalPrice;
              const discount = pOrigPrice > pPrice ? Math.round(((pOrigPrice - pPrice) / pOrigPrice) * 100) : 0;
              const pStock = Number(p.qty || p.Stock || 0);

              return (
                  <div 
                      key={i} 
                      onClick={() => setSelectedProduct(p)}
                      style={{ background: 'white', cursor: 'pointer', transition: 'box-shadow 0.2s ease', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid #eee', width: '100%', boxSizing: 'border-box', overflow: 'hidden', borderRadius: '8px' }}
                      onMouseOver={(e) => !isMobile && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                      <div 
                          onClick={(e) => handleWishlistToggle(e, p.id || p.ProductId)} 
                          style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer', fontSize: isMobile ? '18px' : '20px', zIndex: 10, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                          {wishlistIds.includes(p.id || p.ProductId) ? '❤️' : '🤍'}
                      </div>

                      <div style={{ width: '100%', aspectRatio: '3/4', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box' }}>
                          <img src={thumb} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: pStock <= 0 ? 0.5 : 1 }} />
                      </div>
                      
                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, opacity: pStock <= 0 ? 0.6 : 1, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                          <div style={{ color: '#878787', fontSize: '11px', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.brand || 'Generic'}</div>
                          <div style={{ color: '#212121', fontSize: isMobile ? '12px' : '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px', width: '100%' }} title={p.name}>{p.name}</div>
                          
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto', flexWrap: 'wrap', width: '100%' }}>
                              <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 'bold', color: '#212121' }}>₹{pPrice}</span>
                              {discount > 0 && (
                                  <span style={{ fontSize: '11px', color: '#388e3c', fontWeight: 'bold' }}>{discount}% off</span>
                              )}
                          </div>
                          
                          {pStock <= 0 
                              ? <div style={{ color: '#dc3545', fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Out of Stock</div>
                              : pStock <= 5 && <div style={{ color: '#d32f2f', fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Only few left</div>
                          }
                      </div>
                  </div>
              );
            })
        )}
      </div>
      {renderSellerProfileModal()}
    </div>
  );
};

export default BuyerShopView;