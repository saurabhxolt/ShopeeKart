import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const BuyerShopView = ({ user, selectedSeller, onBack, addToCart, refreshKey, targetProductId }) => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  
  // 🔥 NEW STATE: Sorting
  const [sortBy, setSortBy] = useState("newest");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // State for Seller Profile Modal
  const [showSellerProfile, setShowSellerProfile] = useState(false);

  const [avgRating, setAvgRating] = useState("0.0");
  const [totalRatings, setTotalRatings] = useState(0);

  // 🔥 NEW: Wishlist State
  const [wishlistIds, setWishlistIds] = useState([]);

  const shopData = (selectedSeller && typeof selectedSeller.id === 'object') ? selectedSeller.id : selectedSeller || {};
  const sellerId = shopData.SellerId || shopData.id;
  const storeName = shopData.StoreName || shopData.name || "Unnamed Shop";
  const storeBanner = shopData.StoreBanner || shopData.banner;
  const storeLogo = shopData.StoreLogo || shopData.logo;
  const storeDesc = shopData.StoreDescription || shopData.Description || shopData.description;

  useEffect(() => {
    if (sellerId && !isNaN(sellerId)) {
      axios.get(`http://localhost:7071/api/GetProducts?sellerId=${sellerId}`)
        .then(res => setProducts(res.data))
        .catch(err => console.error(err));
    }
  }, [sellerId, refreshKey]);

  // 🔥 NEW: Fetch user's wishlist when component mounts
  // 🔥 FIX: Re-sync wishlist from DB every time the user or shop changes
  useEffect(() => {
    const syncWishlist = async () => {
        if (user?.userId) {
            try {
                // Add a timestamp to prevent browser caching of the GET request
                const res = await axios.get(`http://localhost:7071/api/GetWishlist?userId=${user.userId}&t=${Date.now()}`);
                
                // 🔥 Ensure we extract the ID correctly regardless of casing
                const ids = res.data.map(item => item.id || item.ProductId);
                console.log("Wishlist IDs synced from DB:", ids);
                setWishlistIds(ids);
            } catch (err) {
                console.error("Wishlist Sync Error:", err);
            }
        }
    };

    syncWishlist();
  }, [user?.userId, refreshKey]); // Sync whenever user changes or shop refreshes

  useEffect(() => {
      // 1. Define the function INSIDE the effect
      const fetchRating = async () => {
          try {
              const res = await axios.get(`http://localhost:7071/api/GetProductRating?productId=${selectedProduct.id}`);
              setAvgRating(res.data.avgRating);
              setTotalRatings(res.data.totalRatings);
          } catch (err) {
              console.error("Failed to load rating", err);
          }
      };

      // 2. Call it if a product is selected
      if (selectedProduct) {
          fetchRating();
      }
  }, [selectedProduct]); // 3. Now selectedProduct is the only dependency needed!

  // 🔥 UPGRADED: Auto-open the exact product with safe Number() casting
  useEffect(() => {
      if (targetProductId && products.length > 0) {
          // Convert both sides to Number to guarantee a match!
          const productToOpen = products.find(p => 
              Number(p.id) === Number(targetProductId) || 
              Number(p.ProductId) === Number(targetProductId)
          );
          
          if (productToOpen) {
              setSelectedProduct(productToOpen);
              setActiveImageIndex(0);
          } else {
              console.warn(`Could not find product ID ${targetProductId} in this shop.`);
          }
      }
  }, [targetProductId, products]);

  // 🔥 NEW: Toggle Wishlist Function (Optimistic UI Update)
  const handleWishlistToggle = async (e, productId) => {
      e.stopPropagation(); // Prevents opening the product detail modal
      
      const isCurrentlyWishlisted = wishlistIds.includes(productId);
      
      // Update UI instantly
      if (isCurrentlyWishlisted) {
          setWishlistIds(prev => prev.filter(id => id !== productId));
      } else {
          setWishlistIds(prev => [...prev, productId]);
      }

      try {
          await axios.post('http://localhost:7071/api/ToggleWishlist', {
              userId: user.userId,
              productId: productId
          });
      } catch (err) {
          alert("Failed to update wishlist.");
          // Revert if API fails
          if (isCurrentlyWishlisted) setWishlistIds(prev => [...prev, productId]);
          else setWishlistIds(prev => prev.filter(id => id !== productId));
      }
  };

  const categories = [...new Set(products.map(p => p.category || p.Category).filter(Boolean))];

  // 🔥 UPDATED LOGIC: Filter AND then Sort
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
        const matchesCategory = categoryFilter ? (p.category || p.Category) === categoryFilter : true;
        if (!matchesCategory) return false;
        if (!searchTerm.trim()) return true;
        const searchWords = searchTerm.toLowerCase().split(' ').filter(w => w.trim() !== '');
        const searchableText = `${p.name || p.Name || ''} ${p.brand || p.Brand || ''} ${p.category || p.Category || ''} ${p.description || p.Description || ''}`.toLowerCase();
        return searchWords.every(word => searchableText.includes(word));
    });

    // Apply Sorting logic
    return result.sort((a, b) => {
        if (sortBy === "priceLow") return (a.price || a.Price) - (b.price || b.Price);
        if (sortBy === "priceHigh") return (b.price || b.Price) - (a.price || a.Price);
        if (sortBy === "newest") {
            // Sort by CreatedAt descending (Newest first)
            return new Date(b.createdAt || b.CreatedAt) - new Date(a.createdAt || a.CreatedAt);
        }
        return 0;
    });
  }, [products, searchTerm, categoryFilter, sortBy]);

  const getImages = (imageStr) => {
      if (!imageStr) return [];
      try {
          const parsed = JSON.parse(imageStr);
          return Array.isArray(parsed) ? parsed : [imageStr];
      } catch (e) { return [imageStr]; }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderSellerProfileModal = () => {
      if (!showSellerProfile) return null;
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '500px', maxWidth: '100%', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div style={{ height: '120px', background: storeBanner ? `url(${storeBanner}) center/cover` : 'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)' }}></div>
                <button onClick={() => setShowSellerProfile(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#333' }}>&times;</button>
                <div style={{ padding: '0 30px 30px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-40px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', background: '#eee', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                        {storeLogo ? <img src={storeLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px' }}>🏪</span>}
                    </div>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#333' }}>{storeName}</h2>
                    <div style={{ display: 'flex', gap: '15px', color: '#28a745', fontSize: '13px', marginBottom: '20px', fontWeight: 'bold' }}>✓ Verified Marketplace Seller</div>
                    
                    <div style={{ width: '100%', background: '#f8f9fa', borderRadius: '8px', padding: '20px', border: '1px solid #eee' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2874f0', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Contact Details</h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '16px' }}>📞</span> <span><strong>Phone:</strong> <br/> {shopData.SupportPhone || shopData.Phone || 'Not provided'}</span>
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '16px' }}>✉️</span> <span><strong>Email:</strong> <br/> {shopData.SupportEmail || shopData.Email || 'Not provided'}</span>
                        </p>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '16px' }}>📍</span> <span><strong>Pickup Address:</strong> <br/> {shopData.PickupAddress || shopData.Address || 'Not provided'}</span>
                        </p>
                        {storeDesc && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
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

  // ============================================================================
  // VIEW 1: PRODUCT DETAIL PAGE 
  // ============================================================================
  if (selectedProduct) {
      const productImages = getImages(selectedProduct.imageUrl || selectedProduct.ImageUrl);
      const mainImage = productImages[activeImageIndex] || 'https://via.placeholder.com/400';
      const pPrice = selectedProduct.price || selectedProduct.Price;
      const pOrigPrice = selectedProduct.originalPrice || selectedProduct.OriginalPrice;
      const discount = pOrigPrice > pPrice 
          ? Math.round(((pOrigPrice - pPrice) / pOrigPrice) * 100) 
          : 0;
      const badgeColor = avgRating >= 3.5 ? '#388e3c' : (avgRating >= 2.5 ? '#ff9f00' : '#d32f2f');

      return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', background: 'white', minHeight: '80vh' }}>
            <button onClick={() => setSelectedProduct(null)} style={{ marginBottom: 20, padding: '8px 20px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold' }}>
                ← Back to {storeName}
            </button>

            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 400px', display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {productImages.map((img, idx) => (
                            <div key={idx} onMouseEnter={() => setActiveImageIndex(idx)} style={{ width: '60px', height: '80px', border: activeImageIndex === idx ? '2px solid #2874f0' : '1px solid #e0e0e0', cursor: 'pointer', overflow: 'hidden', padding: '2px' }}>
                                <img src={img} alt={`thumb-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, border: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', height: '600px', position: 'relative' }}>
                        
                        {/* 🔥 NEW: Wishlist Heart on Main Image */}
                        <div 
                            onClick={(e) => handleWishlistToggle(e, selectedProduct.id || selectedProduct.ProductId)} 
                            style={{ position: 'absolute', top: 20, right: 20, cursor: 'pointer', fontSize: '32px', zIndex: 10, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                        >
                            {wishlistIds.includes(selectedProduct.id || selectedProduct.ProductId) ? '❤️' : '🤍'}
                        </div>

                        <img src={mainImage} alt={selectedProduct.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                <div style={{ flex: '1 1 500px', padding: '10px' }}>
                    <div style={{ color: '#878787', fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>{selectedProduct.brand || selectedProduct.Brand || 'Generic Brand'}</div>
                    <h1 style={{ fontSize: '22px', color: '#212121', margin: '0 0 10px 0', fontWeight: 'normal' }}>{selectedProduct.name || selectedProduct.Name}</h1>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <span style={{ background: badgeColor, color: 'white', padding: '4px 8px', borderRadius: '3px', fontSize: '13px', fontWeight: 'bold' }}>
                            {avgRating} ★
                        </span>
                        <span style={{ color: '#878787', fontSize: '14px', marginRight: '15px' }}>{totalRatings} Ratings</span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #e0e0e0', paddingLeft: '15px' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} style={{ fontSize: '24px', color: star <= Math.round(Number(avgRating)) ? '#ff9f00' : '#e0e0e0', lineHeight: '1' }}>
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '25px' }}>
                        <span style={{ fontSize: '28px', fontWeight: '500', color: '#212121' }}>₹{pPrice}</span>
                        {discount > 0 && (
                            <>
                                <span style={{ fontSize: '16px', color: '#878787', textDecoration: 'line-through', marginBottom: '4px' }}>₹{pOrigPrice}</span>
                                <span style={{ fontSize: '16px', color: '#388e3c', fontWeight: '500', marginBottom: '4px' }}>{discount}% off</span>
                            </>
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', padding: '20px 0', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '18px' }}>📍</span>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121' }}>Delivery details</div>
                                <div 
                                    onClick={() => setShowSellerProfile(true)}
                                    style={{ fontSize: '13px', color: '#2874f0', marginTop: '4px', cursor: 'pointer' }}
                                >
                                    Dispatched by {storeName}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: '20px' }}>
                            <div><div style={{ fontSize:'24px' }}>📦</div><div style={{ fontSize:'12px', color:'#212121', marginTop:'5px' }}>10-Day Return</div></div>
                            <div><div style={{ fontSize:'24px' }}>💵</div><div style={{ fontSize:'12px', color:'#212121', marginTop:'5px' }}>Cash on Delivery</div></div>
                            <div><div style={{ fontSize:'24px' }}>🛡️</div><div style={{ fontSize:'12px', color:'#212121', marginTop:'5px' }}>Secure Checkout</div></div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '16px', color: '#212121', margin: '0 0 15px 0' }}>Product highlights</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                            <div><span style={{ color: '#878787' }}>Category:</span> {selectedProduct.category || selectedProduct.Category || 'N/A'}</div>
                            <div><span style={{ color: '#878787' }}>Brand:</span> {selectedProduct.brand || selectedProduct.Brand || 'N/A'}</div>
                            <div><span style={{ color: '#878787' }}>SKU:</span> {selectedProduct.sku || 'N/A'}</div>
                            <div><span style={{ color: '#878787' }}>Weight:</span> {selectedProduct.weight ? `${selectedProduct.weight} kg` : 'N/A'}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '16px', color: '#212121', margin: '0 0 10px 0' }}>Description</h3>
                        <p style={{ fontSize: '14px', color: '#212121', lineHeight: '1.6' }}>{selectedProduct.description || selectedProduct.Description || 'No description provided by the seller.'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                        {Number(selectedProduct.qty || selectedProduct.Stock) > 0 ? (
                            <>
                                <button onClick={() => addToCart(selectedProduct, false)} style={{ flex: 1, padding: '16px', background: '#ff9f00', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                    🛒 ADD TO CART
                                </button>
                                <button onClick={() => addToCart(selectedProduct, true)} style={{ flex: 1, padding: '16px', background: '#fb641b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    ⚡ BUY NOW
                                </button>
                            </>
                        ) : (
                            <button onClick={() => alert("We'll email you when this item is back in stock!")} style={{ flex: 1, padding: '16px', background: 'white', color: '#2874f0', border: '1px solid #2874f0', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                🔔 NOTIFY ME
                            </button>
                        )}
                    </div>
                    {(selectedProduct.qty || selectedProduct.Stock) > 0 && (selectedProduct.qty || selectedProduct.Stock) <= 5 && <div style={{ color: '#d32f2f', fontWeight: '500', marginTop: '15px', fontSize: '14px' }}>Only few left</div>}
                    {(selectedProduct.qty || selectedProduct.Stock) <= 0 && <div style={{ color: '#d32f2f', fontWeight: 'bold', marginTop: '15px', fontSize: '16px' }}>Currently Out of Stock</div>}
                </div>
            </div>
            
            {/* Render the modal */}
            {renderSellerProfileModal()}
        </div>
      );
  }

  // ============================================================================
  // VIEW 2: PRODUCT LISTING GRID 
  // ============================================================================
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px' }}>
      <button onClick={onBack} style={{ marginBottom: 20, padding: '8px 20px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold' }}>← Back to Shops</button>
      
      <div style={{ background: 'white', overflow: 'hidden', marginBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ height: '150px', background: storeBanner ? `url(${storeBanner}) center/cover` : 'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)', width: '100%' }}></div>
          <div style={{ padding: '0 30px 20px 30px', display: 'flex', alignItems: 'flex-end', marginTop: '-40px', gap: '20px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid white', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {storeLogo ? <img src={storeLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '36px' }}>🏪</span>}
              </div>
              <div style={{ paddingBottom: '5px' }}>
                  <h2 
                      onClick={() => setShowSellerProfile(true)}
                      style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#2874f0', cursor: 'pointer', display: 'inline-block' }}
                      onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                      title="Click to view seller details"
                  >
                      {storeName}
                  </h2>
                  <div style={{ color: '#878787', fontSize: '14px' }}><span style={{ color: '#388e3c', fontWeight: 'bold' }}>✓ Verified</span> • {products.length} Products</div>
              </div>
          </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#fff', padding: '15px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
          <input placeholder="🔍 Search by name, brand, or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 2, padding: '10px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none', minWidth: '200px' }} />
          
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', outline: 'none', minWidth: '150px' }}>
              <option value="">All Categories</option>
              {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>

          {/* 🔥 NEW DROP DOWN: Sorting */}
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            style={{ flex: 1, padding: '10px', border: '1px solid #2874f0', borderRadius: '4px', fontSize: '14px', outline: 'none', minWidth: '150px', cursor: 'pointer', fontWeight: 'bold', color: '#2874f0' }}
          >
              <option value="newest">Newest First</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
          </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
        {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#878787' }}><h3>No products match your search.</h3></div>
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
                      onClick={() => { setSelectedProduct(p); setActiveImageIndex(0); }}
                      style={{ background: 'white', cursor: 'pointer', transition: 'box-shadow 0.2s ease', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid #eee' }}
                      onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                      onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                      {/* 🔥 NEW: Wishlist Icon on Listing Card */}
                      <div 
                          onClick={(e) => handleWishlistToggle(e, p.id || p.ProductId)} 
                          style={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer', fontSize: '20px', zIndex: 10, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                          {wishlistIds.includes(p.id || p.ProductId) ? '❤️' : '🤍'}
                      </div>

                      <div style={{ width: '100%', aspectRatio: '3/4', background: '#f9f9f9', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                          <img src={thumb} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: pStock <= 0 ? 0.5 : 1 }} />
                      </div>
                      
                      <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', flex: 1, opacity: pStock <= 0 ? 0.6 : 1 }}>
                          <div style={{ color: '#878787', fontSize: '13px', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase' }}>{p.brand || p.Brand || p.category || p.Category || 'Generic'}</div>
                          <div style={{ color: '#212121', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }} title={p.name || p.Name}>{p.name || p.Name}</div>
                          
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto' }}>
                              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#212121' }}>₹{pPrice}</span>
                              {discount > 0 && (
                                  <>
                                      <span style={{ fontSize: '13px', color: '#878787', textDecoration: 'line-through' }}>₹{pOrigPrice}</span>
                                      <span style={{ fontSize: '13px', color: '#388e3c', fontWeight: '500' }}>{discount}% off</span>
                                  </>
                              )}
                          </div>
                          
                          {pStock <= 0 
                              ? <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '6px', fontWeight: 'bold' }}>Out of Stock</div>
                              : pStock <= 5 && <div style={{ color: '#d32f2f', fontSize: '13px', marginTop: '6px', fontWeight: '500' }}>Only few left</div>
                          }
                      </div>
                  </div>
              );
            })
        )}
      </div>
      
      {/* Render the modal */}
      {renderSellerProfileModal()}
    </div>
  );
};

export default BuyerShopView;