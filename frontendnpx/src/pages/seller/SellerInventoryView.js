import React from 'react';
import ReadMore from '../../components/common/ReadMore';
import ImageGallery from '../../components/common/ImageGallery';
import { processFile, parseImages } from '../../utils/imageHelpers';

const SellerInventoryView = ({
    isMobile, dashboardMetrics, outOfStockCount, trafficData, isTrafficLoading,
    setIsOrdersModalOpen, searchTerm, setSearchTerm, categoryFilter, setCategoryFilter,
    uniqueCategories, stockFilter, setStockFilter, filteredProducts, editingProduct,
    setEditingProduct, handleUpdateProduct, handleToggleVisibility, handleDeleteProduct
}) => {
    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #28a745', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Revenue</div>
                    <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>Rs. {dashboardMetrics.revenue}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #17a2b8', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Orders</div>
                    <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>{dashboardMetrics.totalOrders}</div>
                </div>
                <div 
                    onClick={() => setIsOrdersModalOpen(true)}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                    style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #ffc107', cursor: 'pointer', transition: 'all 0.2s ease', width: '100%', boxSizing: 'border-box' }}
                >
                    <div style={{ color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                        Pending <span style={{fontSize: '14px', display: isMobile ? 'none' : 'inline'}}>👆</span>
                    </div>
                    <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: '#333', marginTop: '5px' }}>{dashboardMetrics.pendingOrders}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${outOfStockCount > 0 ? '#dc3545' : '#e9ecef'}`, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Out of Stock</div>
                    <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 'bold', color: outOfStockCount > 0 ? '#dc3545' : '#333', marginTop: '5px' }}>{outOfStockCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '25px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee', width: '100%', boxSizing: 'border-box' }}>
                <input type="text" placeholder="🔍 Search by Name or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '50%' }}>
                        {uniqueCategories.map(cat => ( <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat.toUpperCase()}</option> ))}
                    </select>
                    <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '50%' }}>
                        <option value="ALL">All Stock Status</option>
                        <option value="IN_STOCK">In Stock</option>
                        <option value="OUT_OF_STOCK">Out of Stock</option>
                    </select>
                </div>
            </div>

            {/* Product List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? '10px' : '20px', width: '100%', boxSizing: 'border-box' }}>
                {filteredProducts.length === 0 ? (
                    <div style={{ width: '100%', textAlign: 'center', padding: '40px', color: '#888', gridColumn: '1 / -1' }}>No products match your search or filters.</div>
                ) : (
                    filteredProducts.map((p, i) => (
                    <div key={i} style={{ 
                        border: p.isArchived ? '2px solid #dc3545' : '1px solid #ccc', padding: isMobile ? 10 : 15, borderRadius: 12, background: p.isArchived ? '#fff5f5' : 'white', 
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'relative', 
                        opacity: (p.qty <= 0 || p.isActive === false) ? 0.6 : 1, 
                        transition: 'all 0.3s ease',
                        display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box'
                    }}>
                        
                        {p.isArchived ? (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', border: '1px solid white' }}>
                                🚫 TAKEN DOWN
                            </div>
                        ) : p.qty <= 0 ? (
                            <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                OUT OF STOCK
                            </div>
                        ) : p.isActive === false && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#6c757d', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                DRAFT (HIDDEN)
                            </div>
                        )}

                        {editingProduct?.id === p.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <h4 style={{ color: '#007bff', margin: '0 0 5px 0', fontSize: '14px' }}>Editing: {p.name}</h4>
                            
                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Name & SKU</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                                <input value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} style={{ padding: '6px', width: '100%', boxSizing: 'border-box' }} />
                                <input placeholder="SKU" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} style={{ padding: '6px', width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            
                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Pricing (Price vs MRP)</label>
                            <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                                <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box', minWidth: '0' }} />
                                <input type="number" placeholder="MRP" value={editingProduct.originalPrice || ''} onChange={(e) => setEditingProduct({...editingProduct, originalPrice: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box', minWidth: '0' }} />
                            </div>
                            
                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Stock & Weight</label>
                            <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                                <input type="number" value={editingProduct.qty} onChange={(e) => setEditingProduct({...editingProduct, qty: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box', minWidth: '0' }} />
                                <input type="number" placeholder="Weight" value={editingProduct.weight || ''} onChange={(e) => setEditingProduct({...editingProduct, weight: e.target.value})} style={{ padding: '6px', flex: 1, boxSizing: 'border-box', minWidth: '0' }} />
                            </div>
                            
                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Details</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                                <input placeholder="Brand" value={editingProduct.brand || ''} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} style={{ padding: '6px', width: '100%', boxSizing: 'border-box' }} />
                                <input placeholder="Category" value={editingProduct.category || ''} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} style={{ padding: '6px', width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            
                            <textarea placeholder="Description" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} style={{ padding: '6px', height: '60px', boxSizing: 'border-box', fontFamily: 'inherit', width: '100%' }} />
                            
                            <label style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px' }}>Gallery (Click ✕ to remove):</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
                                {parseImages(editingProduct.imageUrl).map((img, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '40px', height: '40px' }}>
                                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} alt="thumb" />
                                    <button onClick={() => {
                                        const currentImages = parseImages(editingProduct.imageUrl);
                                        const updatedImages = currentImages.filter((_, i) => i !== idx);
                                        setEditingProduct({...editingProduct, imageUrl: JSON.stringify(updatedImages)});
                                    }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                                ))}
                            </div>
                            
                            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Add More Images:</label>
                            <input type="file" multiple onChange={async (e) => {
                                const currentImages = parseImages(editingProduct.imageUrl);
                                const newImages = [];
                                for (let file of e.target.files) { newImages.push(await processFile(file)); }
                                setEditingProduct({...editingProduct, imageUrl: JSON.stringify([...currentImages, ...newImages])});
                            }} style={{ fontSize: '11px', maxWidth: '100%' }} />
                            
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <button onClick={handleUpdateProduct} style={{ flex: 1, background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Save</button>
                                <button onClick={() => setEditingProduct(null)} style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                            </div>
                        </div>
                        ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <ImageGallery images={p.imageUrl} />
                            <div style={{ padding: '10px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: '#007bff', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.brand || 'No Brand'}</span>
                                <h4 style={{ margin: '5px 0', fontSize: isMobile ? '13px' : '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</h4>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                    <span style={{ fontSize: isMobile ? '14px' : '1.2rem', fontWeight: 'bold' }}>Rs.{p.price}</span>
                                    {p.originalPrice > p.price && (
                                        <>
                                            <span style={{ textDecoration: 'line-through', color: '#888', fontSize: isMobile ? '10px' : '0.9rem' }}>Rs.{p.originalPrice}</span>
                                            <span style={{ color: 'green', fontSize: isMobile ? '10px' : '0.9rem', fontWeight: 'bold' }}>
                                                ({Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF)
                                            </span>
                                        </>
                                    )}
                                </div>

                                <p style={{ fontSize: '11px', color: '#555', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Stock: <strong style={{ color: p.qty <= 0 ? 'red' : 'inherit' }}>{p.qty}</strong> | SKU: {p.sku || 'N/A'}</p>
                                
                                {!isMobile && (
                                  <div style={{ maxHeight: '75px', overflowY: 'auto', wordBreak: 'break-word', paddingRight: '5px', marginBottom: '10px', fontSize: '12px', color: '#555' }}>
                                      <ReadMore text={p.description} limit={60} />
                                  </div>
                                )}

                                {/* MODERATION ALERT BOX - ALWAYS SHOW IF ARCHIVED */}
                                {p.isArchived && (
                                    <div style={{ padding: '8px', background: '#ffeeba', color: '#856404', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffe8a1', marginTop: '10px', marginBottom: '10px', lineHeight: '1.2' }}>
                                        ⚠️ Moderation Alert<br/>
                                        <span style={{ fontWeight: 'normal', color: '#666' }}>
                                            {p.adminMessage ? `Reason: ${p.adminMessage}` : 'This product violates platform policies and has been taken down.'}
                                        </span>
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '5px', marginTop: 'auto', paddingTop: '10px' }}>
                                    <button 
                                        disabled={p.isArchived}
                                        onClick={() => handleToggleVisibility(p)} 
                                        style={{ 
                                            flex: 1, 
                                            background: p.isArchived ? '#ccc' : (p.isActive === false ? '#28a745' : '#6c757d'), 
                                            color: 'white', border: 'none', padding: '8px', borderRadius: 4, 
                                            cursor: p.isArchived ? 'not-allowed' : 'pointer', 
                                            fontWeight: 'bold', fontSize: '11px', width: '100%' 
                                        }}
                                    >
                                        {p.isArchived ? '🚫 Locked' : (p.isActive === false ? '✅ Set Active' : '👁️ Hide')}
                                    </button>
                                    <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                                      <button onClick={() => setEditingProduct(p)} style={{ flex: 1, background: '#ffc107', border: 'none', padding: '8px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Edit</button>
                                      <button onClick={() => handleDeleteProduct(p.id)} style={{ flex: 1, color: 'red', border: '1px solid red', padding: '8px', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                    ))
                )}
            </div>
        </>
    );
};

export default SellerInventoryView;