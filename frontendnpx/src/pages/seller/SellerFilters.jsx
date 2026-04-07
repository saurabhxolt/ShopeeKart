import React from 'react';

const SellerFilters = ({ 
    isMobile, 
    searchTerm, 
    setSearchTerm, 
    archiveFilter, 
    setArchiveFilter, 
    categoryFilter, 
    setCategoryFilter, 
    uniqueCategories, 
    stockFilter, 
    setStockFilter 
}) => {
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            gap: '10px', 
            marginBottom: '25px', 
            background: 'white', 
            padding: '15px', 
            borderRadius: '8px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', 
            border: '1px solid #eee', 
            width: '100%', 
            boxSizing: 'border-box' 
        }}>
            {/* 1. Search Bar */}
            <input 
                type="text" 
                placeholder="🔍 Search Name or SKU..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ 
                    flex: isMobile ? 'none' : 1.5, 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #ccc', 
                    width: '100%', 
                    boxSizing: 'border-box',
                    fontSize: '14px'
                }} 
            />

            <div style={{ 
                display: 'flex', 
                gap: '10px', 
                width: '100%', 
                flex: isMobile ? 'none' : 2,
                flexWrap: isMobile ? 'wrap' : 'nowrap' 
            }}>
                {/* 2. Archive Filter (Active vs Trash) */}
                <select 
                    value={archiveFilter} 
                    onChange={(e) => setArchiveFilter(e.target.value)} 
                    style={{ 
                        flex: 1, 
                        minWidth: isMobile ? 'calc(50% - 5px)' : 'auto',
                        padding: '10px', 
                        borderRadius: '6px', 
                        border: '1px solid #ccc', 
                        fontWeight: 'bold', 
                        fontSize: '13px', 
                        color: archiveFilter === 'ARCHIVED' ? '#dc3545' : '#333',
                        background: 'white'
                    }}
                >
                    <option value="ACTIVE">✅ Active</option>
                    <option value="ARCHIVED">🗑️ Trash</option>
                </select>

                {/* 3. Granular Category Filter (Matches "Women - Sarees") */}
                <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)} 
                    style={{ 
                        flex: 1, 
                        minWidth: isMobile ? 'calc(50% - 5px)' : 'auto',
                        padding: '10px', 
                        borderRadius: '6px', 
                        border: '1px solid #ccc', 
                        fontSize: '13px',
                        background: 'white'
                    }}
                >
                    {uniqueCategories.map(cat => ( 
                        <option key={cat} value={cat}>
                            {cat === 'ALL' ? 'All Categories' : cat}
                        </option> 
                    ))}
                </select>

                {/* 4. Stock Status Filter with Smart Colors */}
                <select 
                    value={stockFilter} 
                    onChange={(e) => setStockFilter(e.target.value)} 
                    style={{ 
                        flex: isMobile ? 2 : 1, 
                        width: '100%',
                        padding: '10px', 
                        borderRadius: '6px', 
                        border: '1px solid #ccc',
                        fontSize: '13px',
                        background: 'white',
                        // Dynamic colors based on stock health
                        color: stockFilter === 'OUT_OF_STOCK' ? '#dc3545' : stockFilter === 'LOW_STOCK' ? '#fd7e14' : '#333',
                        fontWeight: stockFilter !== 'ALL' ? 'bold' : 'normal'
                    }}
                >
                    <option value="ALL">📦 All Stock</option>
                    <option value="IN_STOCK">✅ Fully In Stock</option>
                    <option value="LOW_STOCK">⚠️ Low/Partial</option>
                    <option value="OUT_OF_STOCK">🚫 Out of Stock</option>
                </select>
            </div>
        </div>
    );
};

export default SellerFilters;