import React from 'react';

const SellerMetrics = ({ isMobile, dashboardMetrics, outOfStockCount, setIsOrdersModalOpen }) => {
    return (
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
    );
};

export default SellerMetrics;