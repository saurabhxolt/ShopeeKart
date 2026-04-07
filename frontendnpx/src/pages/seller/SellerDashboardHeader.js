import React from 'react';

const SellerDashboardHeader = ({ 
    isMobile, 
    viewMode, 
    setViewMode, 
    setIsProfileModalOpen, 
    setIsAddModalOpen 
}) => {
    
    // Helper function to keep button styles clean and readable!
    const getTabStyle = (tabMode) => ({
        border: 'none', 
        padding: '8px 12px', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: 'bold', 
        fontSize: '13px', 
        background: viewMode === tabMode ? 'white' : 'transparent', 
        color: viewMode === tabMode ? '#2874f0' : '#666', 
        boxShadow: viewMode === tabMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.2s ease'
    });

    return (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: isMobile ? '15px' : '0' }}>
            
            {/* 🔥 FIX: Added 'add-product' to the title logic to prevent the "Subscription Plan" bug */}
            <h2 style={{ margin: 0, fontSize: isMobile ? '22px' : '24px' }}>
                🏪 {
                    viewMode === 'inventory' ? 'Seller Dashboard' : 
                    viewMode === 'orders' ? 'Order Management' :   
                    viewMode === 'analytics' ? 'Store Insights' : 
                    viewMode === 'add-product' ? 'Upload New Product' : 
                    'Subscription Plan'
                }
            </h2>
            
            <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* View Toggles */}
                <div style={{ display: 'flex', background: '#eee', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                    <button onClick={() => setViewMode('inventory')} style={getTabStyle('inventory')}>📦 Products</button>
                    <button onClick={() => setViewMode('orders')} style={getTabStyle('orders')}>🛍️ Orders</button>
                    <button onClick={() => setViewMode('analytics')} style={getTabStyle('analytics')}>📈 Insights</button>
                    <button onClick={() => setViewMode('subscription')} style={getTabStyle('subscription')}>💎 My Plan</button>
                </div>
                
                {/* Action Buttons */}
                <button onClick={() => setIsProfileModalOpen(true)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>
                    ⚙️ Store Settings
                </button>
                <button onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>
                    + Add New Product
                </button>
            </div>
        </div>
    );
};

export default SellerDashboardHeader;