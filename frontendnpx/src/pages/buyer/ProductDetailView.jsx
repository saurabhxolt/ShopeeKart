// src/pages/buyer/ProductDetailView.jsx (or appropriate path)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

// 🔥 COLOR_HEX_MAP for UI rendering
const COLOR_HEX_MAP = {
    "Black": "#000000", "White": "#ffffff", "Red": "#dc3545", "Blue": "#007bff", 
    "Green": "#28a745", "Yellow": "#ffc107", "Pink": "#e83e8c", "Purple": "#6f42c1", 
    "Grey": "#6c757d", "Brown": "#795548", "Orange": "#fd7e14", "Navy": "#001f3f", 
    "Beige": "#f5f5dc", "Maroon": "#800000", "Olive": "#808000", 
    "Dark Blue": "#00008b", "Light Blue": "#add8e6", "Dark Green": "#006400", 
    "Khaki": "#f0e68c", "Dark Grey": "#555555", "Light Green": "#90ee90", 
    "Cream": "#fffdd0", "Silver": "#c0c0c0", "Gold": "#ffd700",
    "Multicolor": "conic-gradient(red, yellow, green, blue, magenta, red)"
};

const getImages = (imageProp) => {
    if (!imageProp) return [];
    if (Array.isArray(imageProp)) return imageProp; 
    if (typeof imageProp === 'string' && imageProp.startsWith('[')) {
        try { return JSON.parse(imageProp); } catch (e) { return [imageProp]; }
    }
    return [imageProp];
};

const ProductDetailView = ({ 
    selectedProduct, 
    onBack, 
    addToCart, 
    cartItems, 
    onUpdateQty, 
    wishlistIds, 
    handleWishlistToggle, 
    isMobile, 
    storeName, 
    storeLogo, 
    setShowSellerProfile,
    allProducts = [], // 🔥 NEW PROP: Needed for similar products
    onProductSelect   // 🔥 NEW PROP: To handle clicking a similar product
}) => {
    
    const [activeImageIndex, setActiveImageIndex] = useState(0);  
    const [avgRating, setAvgRating] = useState("0.0");
    const [totalRatings, setTotalRatings] = useState(0);
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [activeVariation, setActiveVariation] = useState(null);
    const ratingsCache = useRef({});

    useEffect(() => {
        const fetchProductDetails = async () => {
            const pId = selectedProduct.id || selectedProduct.ProductId;
            if (ratingsCache.current[pId]) {
                setAvgRating(ratingsCache.current[pId].avgRating);
                setTotalRatings(ratingsCache.current[pId].totalRatings);
                return; 
            }
            try {
                const ratingRes = await axios.get(`http://localhost:7071/api/GetProductRating?productId=${pId}`);
                setAvgRating(ratingRes.data.avgRating);
                setTotalRatings(ratingRes.data.totalRatings);
                ratingsCache.current[pId] = { avgRating: ratingRes.data.avgRating, totalRatings: ratingRes.data.totalRatings };
            } catch (err) {}
        };
        if (selectedProduct) fetchProductDetails();
    }, [selectedProduct]);

    const availableVariationOptions = useMemo(() => {
        if (!selectedProduct || !selectedProduct.variations || selectedProduct.variations.length === 0) return null;
        const options = {};
        selectedProduct.variations.forEach(v => {
            Object.entries(v.attributes).forEach(([key, val]) => {
                if (!options[key]) options[key] = new Set();
                options[key].add(val);
            });
        });
        Object.keys(options).forEach(k => options[k] = [...options[k]]);
        return options;
    }, [selectedProduct]);

    useEffect(() => {
        if (selectedProduct && selectedProduct.variations?.length > 0 && availableVariationOptions) {
            const requiredKeys = Object.keys(availableVariationOptions);
            const hasSelectedAll = requiredKeys.every(key => selectedAttributes[key]);
            if (hasSelectedAll) {
                const matchedVariation = selectedProduct.variations.find(v => {
                    return Object.entries(selectedAttributes).every(([key, val]) => v.attributes[key] === val);
                });
                setActiveVariation(matchedVariation || null);
            } else { setActiveVariation(null); }
        }
    }, [selectedAttributes, selectedProduct, availableVariationOptions]);

    const handleAddToCartClick = (isBuyNow) => {
        if (availableVariationOptions && !activeVariation) return alert("Please select a valid combination of options before adding to cart.");
        addToCart({
            ...selectedProduct,
            price: activeVariation?.priceOverride || selectedProduct.price,
            qty: activeVariation ? activeVariation.stock : selectedProduct.qty,
            variationId: activeVariation?.id || activeVariation?.VariationId,
            selectedAttributes: selectedAttributes
        }, isBuyNow);
    };

    // 🔥 NEW LOGIC: Highly robust Similar/Fallback Products calculation
    const similarData = useMemo(() => {
        if (!allProducts || allProducts.length <= 1) return { title: '', items: [] };

        const currentId = String(selectedProduct.id || selectedProduct.ProductId);

        // 1. Filter out the currently viewed product
        const otherProducts = allProducts.filter(p => String(p.id || p.ProductId) !== currentId);

        // 2. Try to find products in the exact same category (Checks multiple possible DB column names)
        const exactMatches = otherProducts.filter(p => 
            (p.categoryId && p.categoryId === selectedProduct.categoryId) ||
            (p.CategoryId && p.CategoryId === selectedProduct.CategoryId) ||
            (p.category && p.category === selectedProduct.category) ||
            (p.Category && p.Category === selectedProduct.Category) ||
            (p.subCategory && p.subCategory === selectedProduct.subCategory)
        );

        if (exactMatches.length > 0) {
            return { title: 'Similar Products', items: exactMatches.slice(0, 10) };
        }

        // 3. Fallback: If no exact category matches, just show other items from this store!
        if (otherProducts.length > 0) {
            return { title: 'More from this Seller', items: otherProducts.slice(0, 10) };
        }

        return { title: '', items: [] };
    }, [allProducts, selectedProduct]);

    const productImages = getImages(selectedProduct.imageUrl || selectedProduct.ImageUrl);
    const mainImage = productImages[activeImageIndex] || 'https://via.placeholder.com/400';
    const pPrice = activeVariation?.priceOverride || selectedProduct.price;
    const pOrigPrice = selectedProduct.originalPrice; 
    const pStock = activeVariation ? activeVariation.stock : selectedProduct.qty;
    const discount = pOrigPrice > pPrice ? Math.round(((pOrigPrice - pPrice) / pOrigPrice) * 100) : 0;
    const badgeColor = avgRating >= 3.5 ? '#388e3c' : (avgRating >= 2.5 ? '#ff9f00' : '#d32f2f');
    const currentProductId = selectedProduct.id || selectedProduct.ProductId;
    
    const cartItem = cartItems.find(item => 
        String(item.id || item.ProductId) === String(currentProductId) && 
        String(item.variationId || 'null') === String(activeVariation?.id || activeVariation?.VariationId || 'null')
    );
    const isAddedToCart = !!cartItem;

    return (
        <div style={{ width: '100%', boxSizing: 'border-box', maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '10px' : '20px', background: 'white', minHeight: '80vh', overflowX: 'hidden' }}>
            <button onClick={onBack} style={{ marginBottom: 20, padding: '8px 20px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold' }}>← Back to Shop</button>

            <div style={{ display: 'flex', gap: isMobile ? '20px' : '40px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ flex: '1 1 100%', display: 'flex', gap: '15px', flexDirection: isMobile ? 'column-reverse' : 'row', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '10px', overflowX: isMobile ? 'auto' : 'visible', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
                        {productImages.map((img, idx) => (
                            <div key={idx} onMouseEnter={() => setActiveImageIndex(idx)} style={{ width: isMobile ? '50px' : '60px', height: isMobile ? '70px' : '80px', border: activeImageIndex === idx ? '2px solid #2874f0' : '1px solid #e0e0e0', cursor: 'pointer', flexShrink: 0, padding: '2px', boxSizing: 'border-box' }}>
                                <img src={img} alt={`thumb-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, border: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', height: isMobile ? '350px' : '600px', position: 'relative', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        <div onClick={(e) => handleWishlistToggle(e, currentProductId)} style={{ position: 'absolute', top: 20, right: 20, cursor: 'pointer', fontSize: isMobile ? '24px' : '32px', zIndex: 10, background: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                            {wishlistIds.includes(currentProductId) ? '❤️' : '🤍'}
                        </div>
                        <img src={mainImage} alt={selectedProduct.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                <div style={{ flex: '1 1 100%', padding: isMobile ? '0' : '10px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ color: '#878787', fontSize: '12px', fontWeight: '500', marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        <span>{selectedProduct.brand || 'Generic'}</span>
                        {selectedProduct.mainCategory && <span>› {selectedProduct.mainCategory}</span>}
                        {selectedProduct.subCategory && <span style={{ color: '#2874f0' }}>› {selectedProduct.subCategory}</span>}
                    </div>

                    <h1 style={{ fontSize: isMobile ? '18px' : '22px', color: '#212121', margin: '0 0 10px 0', fontWeight: 'normal', width: '100%', wordBreak: 'break-word' }}>{selectedProduct.name}</h1>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
                        <span style={{ background: badgeColor, color: 'white', padding: '4px 8px', borderRadius: '3px', fontSize: '13px', fontWeight: 'bold' }}>{avgRating} ★</span>
                        <span style={{ color: '#878787', fontSize: '14px', marginRight: '15px' }}>{totalRatings} Ratings</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '28px', fontWeight: '500', color: '#212121' }}>₹{pPrice}</span>
                        {discount > 0 && (
                            <>
                                <span style={{ fontSize: '16px', color: '#878787', textDecoration: 'line-through', marginBottom: '4px' }}>₹{pOrigPrice}</span>
                                <span style={{ fontSize: '16px', color: '#388e3c', fontWeight: '500', marginBottom: '4px' }}>{discount}% off</span>
                            </>
                        )}
                    </div>

                    {availableVariationOptions && Object.keys(availableVariationOptions).length > 0 && (
                        <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#333' }}>Select Your Size & Color</h3>
                            
                            {availableVariationOptions['Color'] && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Color: <span style={{ color: '#212121' }}>{selectedAttributes['Color'] || 'Not Selected'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {availableVariationOptions['Color'].map(val => {
                                            const isSelected = selectedAttributes['Color'] === val;
                                            const hex = COLOR_HEX_MAP[val] || '#ccc';
                                            return (
                                                <div 
                                                    key={val} 
                                                    onClick={() => setSelectedAttributes(prev => ({ ...prev, 'Color': val }))}
                                                    style={{ 
                                                        width: '36px', height: '36px', borderRadius: '50%', background: hex, cursor: 'pointer', 
                                                        border: isSelected ? '3px solid #2874f0' : '1px solid #ddd',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    {isSelected && <span style={{ color: ['White', 'Yellow'].includes(val) ? 'black' : 'white', fontWeight: 'bold' }}>✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {(!availableVariationOptions['Color'] || selectedAttributes['Color']) && (
                                <>
                                    {availableVariationOptions['Top Size'] && availableVariationOptions['Bottom Size'] ? (
                                        <div style={{ marginBottom: '15px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>
                                                Select Matching Set:
                                            </div>
                                            
                                            {(() => {
                                                const groupedByTop = {};
                                                selectedProduct.variations
                                                    .filter(v => !selectedAttributes['Color'] || v.attributes['Color'] === selectedAttributes['Color'])
                                                    .forEach(v => {
                                                        const top = v.attributes['Top Size'];
                                                        if (!groupedByTop[top]) groupedByTop[top] = [];
                                                        groupedByTop[top].push(v);
                                                    });

                                                return Object.entries(groupedByTop).map(([topSize, variants]) => (
                                                    <div key={topSize} style={{ marginBottom: '15px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '10px' }}>
                                                            TOP SIZE: <span style={{ color: '#2874f0' }}>{topSize}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {variants.map((v, idx) => {
                                                                const bottomSize = v.attributes['Bottom Size'];
                                                                const isSelected = selectedAttributes['Top Size'] === topSize && 
                                                                                 selectedAttributes['Bottom Size'] === bottomSize;
                                                                const isOutOfStock = Number(v.stock) <= 0;

                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        disabled={isOutOfStock}
                                                                        onClick={() => setSelectedAttributes(prev => ({
                                                                            ...prev,
                                                                            'Top Size': topSize,
                                                                            'Bottom Size': bottomSize
                                                                        }))}
                                                                        style={{
                                                                            minWidth: '85px',
                                                                            padding: '8px 12px',
                                                                            background: isSelected ? '#2874f0' : 'white',
                                                                            color: isSelected ? 'white' : '#333',
                                                                            border: isSelected ? '1px solid #2874f0' : '1px solid #ccc',
                                                                            borderRadius: '4px',
                                                                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                                                            opacity: isOutOfStock ? 0.4 : 1,
                                                                            fontSize: '13px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            transition: 'all 0.2s ease'
                                                                        }}
                                                                    >
                                                                        <span style={{ fontWeight: 'bold' }}>{bottomSize}</span>
                                                                        <span style={{ fontSize: '10px', opacity: 0.8 }}>Bottom</span>
                                                                        {v.priceOverride && (
                                                                            <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: 'bold' }}>
                                                                                ₹{v.priceOverride}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    ) : (
                                        Object.entries(availableVariationOptions)
                                            .filter(([key]) => key.toLowerCase() !== 'color')
                                            .map(([attrKey, values]) => {
                                                const validValues = new Set();
                                                selectedProduct.variations
                                                    .filter(v => !selectedAttributes['Color'] || v.attributes['Color'] === selectedAttributes['Color'])
                                                    .forEach(v => {
                                                        if (v.attributes[attrKey]) validValues.add(v.attributes[attrKey]);
                                                    });

                                                return (
                                                    <div key={attrKey} style={{ marginBottom: '15px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                                                            {attrKey}:
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                            {values.map(val => {
                                                                const isValidForColor = !availableVariationOptions['Color'] || validValues.has(val);
                                                                if (!isValidForColor && selectedAttributes['Color']) return null;

                                                                const isSelected = selectedAttributes[attrKey] === val;
                                                                return (
                                                                    <button 
                                                                        key={val} 
                                                                        onClick={() => setSelectedAttributes(prev => ({ ...prev, [attrKey]: val }))}
                                                                        style={{ 
                                                                            padding: '8px 16px', 
                                                                            background: isSelected ? '#f0f5ff' : 'white', 
                                                                            border: isSelected ? '2px solid #2874f0' : '1px solid #ccc',
                                                                            color: isSelected ? '#2874f0' : '#333',
                                                                            borderRadius: '4px', cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {val}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', padding: '20px 0', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '18px' }}>📍</span>
                            <div onClick={() => setShowSellerProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f9f9f9', padding: '5px 12px', borderRadius: '20px', border: '1px solid #eee', marginTop: '6px', width: 'max-content' }}>
                                <img src={storeLogo || 'https://via.placeholder.com/20'} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#2874f0' }}>{storeName} <span style={{ fontWeight: 'normal', color: '#888', marginLeft: '5px' }}>ⓘ</span></span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: '20px', width: '100%', boxSizing: 'border-box' }}>
                            <div><div style={{ fontSize:'24px' }}>📦</div><div style={{ fontSize:'11px', marginTop:'5px' }}>10-Day Return</div></div>
                            <div><div style={{ fontSize:'24px' }}>💵</div><div style={{ fontSize:'11px', marginTop:'5px' }}>Cash on Delivery</div></div>
                            <div><div style={{ fontSize:'24px' }}>🛡️</div><div style={{ fontSize:'11px', marginTop:'5px' }}>Secure Checkout</div></div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{ fontSize: '16px', color: '#212121', margin: '0 0 15px 0' }}>Product highlights</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ wordBreak: 'break-word' }}><span style={{ color: '#878787' }}>SKU:</span> {activeVariation?.sku || selectedProduct.sku || 'N/A'}</div>
                            <div style={{ wordBreak: 'break-word' }}><span style={{ color: '#878787' }}>Weight:</span> {selectedProduct.weight ? `${selectedProduct.weight} kg` : 'N/A'}</div>
                            <div style={{ wordBreak: 'break-word' }}><span style={{ color: '#878787' }}>Tax:</span> {selectedProduct.gstPercentage ? `${selectedProduct.gstPercentage * 100}% GST` : 'Included'}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px', width: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{ fontSize: '16px', color: '#212121', margin: '0 0 15px 0' }}>Description</h3>
                        <p style={{ fontSize: '14px', color: '#212121', lineHeight: '1.6', width: '100%', wordBreak: 'break-word' }}>{selectedProduct.description || 'No description provided.'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px', width: '100%', boxSizing: 'border-box' }}>
                        {Number(pStock) > 0 ? (
                              <>
                                  {isAddedToCart ? (
                                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px solid #ff9f00', borderRadius: '4px', background: 'white' }}>
                                          <button onClick={() => onUpdateQty(currentProductId, cartItem.qty - 1, activeVariation?.id || activeVariation?.VariationId)} style={{ flex: 1, padding: '15px', background: 'transparent', color: '#ff9f00', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#212121', padding: '0 15px' }}>{cartItem.qty}</span>
                                          <button onClick={() => onUpdateQty(currentProductId, cartItem.qty + 1, activeVariation?.id || activeVariation?.VariationId)} style={{ flex: 1, padding: '15px', background: 'transparent', color: '#ff9f00', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                                      </div>
                                  ) : (
                                      <button onClick={() => handleAddToCartClick(false)} style={{ flex: 1, padding: '16px', background: '#ff9f00', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                          🛒 ADD TO CART
                                      </button>
                                  )}

                                  <button onClick={() => handleAddToCartClick(true)} style={{ flex: 1, padding: '16px', background: '#fb641b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                                      ⚡ BUY NOW
                                  </button>
                              </>
                        ) : (
                            <div style={{ width: '100%' }}>
                                <div style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>Currently Out of Stock</div>
                                <button 
                                    onClick={() => alert(`We'll notify you when ${selectedProduct.name} is back in stock!`)}
                                    style={{ flex: 1, width: '100%', padding: '16px', background: 'white', color: '#2874f0', border: '1px solid #2874f0', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    🔔 NOTIFY ME
                                </button>
                            </div>
                        )}
                    </div>

                    {Number(pStock) > 0 && Number(pStock) <= 5 && <div style={{ color: '#d32f2f', fontWeight: '500', marginTop: '15px', fontSize: '14px' }}>Only {pStock} left in stock!</div>}
                </div>
            </div>

            {/* 🔥 NEW LOGIC: SIMILAR PRODUCTS HORIZONTAL LIST 🔥 */}
            {similarData.items.length > 0 && (
                <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '30px' }}>
                    <h2 style={{ fontSize: '20px', color: '#212121', marginBottom: '20px' }}>{similarData.title}</h2>
                    <div style={{ 
                        display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', 
                        scrollbarWidth: 'thin', msOverflowStyle: 'none' 
                    }}>
                        {similarData.items.map((p, idx) => {
                            const simImages = getImages(p.imageUrl || p.ImageUrl);
                            const simThumb = simImages.length > 0 ? simImages[0] : 'https://via.placeholder.com/150';
                            const simPrice = p.price || p.Price;
                            const simOrigPrice = p.originalPrice || p.OriginalPrice;
                            const simDiscount = simOrigPrice > simPrice ? Math.round(((simOrigPrice - simPrice) / simOrigPrice) * 100) : 0;
                            
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to top
                                        if (onProductSelect) onProductSelect(p);
                                    }}
                                    style={{ 
                                        minWidth: '160px', width: '160px', cursor: 'pointer', 
                                        border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden',
                                        transition: 'box-shadow 0.2s', background: 'white', flexShrink: 0
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                                >
                                    <div style={{ height: '200px', width: '100%', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <img src={simThumb} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ padding: '10px' }}>
                                        <div style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.brand || 'Generic'}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '6px' }}>{p.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#212121' }}>₹{simPrice}</span>
                                            {simDiscount > 0 && <span style={{ fontSize: '11px', color: '#388e3c', fontWeight: 'bold' }}>{simDiscount}% off</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetailView;