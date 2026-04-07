import React from 'react';
import ReadMore from '../../components/common/ReadMore';
import SellerMetrics from './SellerMetrics';
import SellerFilters from './SellerFilters';
import SellerProductEdit from './SellerProductEdit';

// 🔥 Helper to safely parse images (Handles DB JSON strings or local arrays)
const getThumbnailUrl = (imageProp) => {
    if (!imageProp) return '/placeholder-image.jpg';
    if (Array.isArray(imageProp)) return imageProp.length > 0 ? imageProp[0] : '/placeholder-image.jpg';
    if (typeof imageProp === 'string' && imageProp.startsWith('[')) {
        try {
            const parsed = JSON.parse(imageProp);
            return parsed.length > 0 ? parsed[0] : '/placeholder-image.jpg';
        } catch (e) { return '/placeholder-image.jpg'; }
    }
    return imageProp;
};

const SellerInventoryView = ({
    isMobile, dashboardMetrics, outOfStockCount, trafficData, isTrafficLoading,
    setIsOrdersModalOpen, searchTerm, setSearchTerm, categoryFilter, setCategoryFilter,
    uniqueCategories, stockFilter, setStockFilter, filteredProducts, editingProduct,
    setEditingProduct, handleUpdateProduct, handleToggleVisibility, handleDeleteProduct,
    handleRestoreProduct, archiveFilter, setArchiveFilter 
}) => {

    // --- 1. EDIT MODE ---
    if (editingProduct) {
        return (
            <SellerProductEdit 
                isMobile={isMobile}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                handleUpdateProduct={handleUpdateProduct}
            />
        );
    }

    // --- 2. INVENTORY LIST VIEW ---
    return (
        <>
            <SellerMetrics 
                isMobile={isMobile} 
                dashboardMetrics={dashboardMetrics} 
                outOfStockCount={outOfStockCount} 
                setIsOrdersModalOpen={setIsOrdersModalOpen} 
            />

            <SellerFilters 
                isMobile={isMobile}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                archiveFilter={archiveFilter}
                setArchiveFilter={setArchiveFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                uniqueCategories={uniqueCategories}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
            />

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '10px' : '20px', width: '100%', boxSizing: 'border-box' }}>
                {filteredProducts.length === 0 ? (
                    <div style={{ width: '100%', textAlign: 'center', padding: '40px', color: '#888', gridColumn: '1 / -1' }}>
                        {archiveFilter === 'ARCHIVED' ? 'Your trash is empty.' : 'No products match your search or filters.'}
                    </div>
                ) : (
                    filteredProducts.map((p, i) => {
                        // Smart Stock Logic
                        const hasVariations = p.variations && p.variations.length > 0;
                        const isFullyOutOfStock = p.stock <= 0;
                        // 🔥 Logic: Parent has stock, but at least one size/color is at 0
                        const hasSoldOutVariant = hasVariations && p.variations.some(v => v.stock <= 0);

                        return (
                            <div key={i} style={{ 
                                // 🔥 Highlight problem items with a red border
                                border: (isFullyOutOfStock || p.isArchived) ? '2px solid #dc3545' : (p.isDeleted ? '1px solid #6c757d' : '1px solid #ccc'), 
                                padding: isMobile ? 10 : 15, borderRadius: 12, 
                                background: p.isArchived ? '#fff5f5' : (p.isDeleted ? '#f8f9fa' : 'white'), 
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'relative', 
                                // High visibility for OOS items so seller can read details to restock
                                opacity: (p.isActive === false || p.isDeleted) ? 0.6 : 1, 
                                transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box'
                            }}>
                                
                                {/* Status Badges */}
                                {p.isArchived ? (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10 }}>🚫 BANNED</div>
                                ) : p.isDeleted ? (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#6c757d', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10 }}>🗑️ TRASHED</div>
                                ) : isFullyOutOfStock ? (
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10 }}>OUT OF STOCK</div>
                                ) : p.isActive === false && (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#6c757d', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', zIndex: 10 }}>DRAFT</div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    
                                    <img 
                                        src={getThumbnailUrl(p.imageUrl)} 
                                        alt={p.name} 
                                        style={{ width: '100%', height: isMobile ? '160px' : '200px', objectFit: 'cover', borderRadius: '8px', background: '#f8f9fa' }} 
                                    />
                                    
                                    <div style={{ padding: '10px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        {/* 🏠 BRAND & BREADCRUMBS */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <span style={{ fontSize: '11px', color: '#007bff', fontWeight: 'bold', display: 'block' }}>{p.brand || 'No Brand'}</span>
                                            <div style={{ fontSize: '9px', color: '#888', display: 'flex', gap: '3px', alignItems: 'center', marginTop: '2px' }}>
                                                <span>{p.targetGender || p.mainCategory}</span>
                                                <span style={{ color: '#ccc' }}>›</span>
                                                <span>{p.categoryGroup}</span>
                                                <span style={{ color: '#ccc' }}>›</span>
                                                <span style={{ color: '#555', fontWeight: 'bold' }}>{p.subCategory || p.category}</span>
                                            </div>
                                        </div>

                                        <h4 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '14px' : '15px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '38px', lineHeight: '1.3' }}>{p.name}</h4>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>₹{p.price}</span>
                                            {p.originalPrice > p.price && (
                                                <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.85rem' }}>₹{p.originalPrice}</span>
                                            )}
                                        </div>

                                        {/* 📦 STOCK SECTION */}
                                        <div style={{ marginBottom: '10px' }}>
                                            <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>
                                                Total Stock: <strong style={{ color: isFullyOutOfStock ? '#dc3545' : '#28a745' }}>{p.stock}</strong> 
                                                {hasVariations && <span style={{ color: '#888', marginLeft: '5px' }}>({p.variations.length} Options)</span>}
                                            </p>
                                            
                                            {/* 🔥 PARTIAL STOCK ALERT */}
                                            {!isFullyOutOfStock && hasSoldOutVariant && (
                                                <div style={{ marginTop: '5px', fontSize: '10px', background: '#fff5f5', color: '#dc3545', padding: '4px 8px', borderRadius: '4px', border: '1px solid #feb2b2', fontWeight: 'bold' }}>
                                                    ⚠️ Some sizes/colors sold out!
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                                            {!p.isDeleted && (
                                                <button 
                                                    disabled={p.isArchived}
                                                    onClick={() => handleToggleVisibility(p)} 
                                                    style={{ flex: 1, background: p.isArchived ? '#ccc' : (p.isActive === false ? '#28a745' : '#e2e8f0'), color: (p.isActive === false || p.isArchived) ? 'white' : '#333', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                                >
                                                    {p.isActive === false ? '✅ Publish' : '👁️ Hide'}
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                                {!p.isDeleted ? (
                                                    <>
                                                        <button onClick={() => setEditingProduct(p)} style={{ flex: 1, background: '#ffc107', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#000' }}>Edit</button>
                                                        <button onClick={() => handleDeleteProduct(p.id)} style={{ flex: 1, color: '#dc3545', border: '1px solid #dc3545', padding: '8px', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Delete</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleRestoreProduct(p.id)} style={{ flex: 1, background: '#17a2b8', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>♻️ Restore</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
};

export default SellerInventoryView;