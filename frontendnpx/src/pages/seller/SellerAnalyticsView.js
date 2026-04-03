import React from 'react';

const SellerAnalyticsView = ({ 
    isMobile, trafficData, isTrafficLoading, 
    analyticsDays, setAnalyticsDays, 
    analyticsSort, setAnalyticsSort, 
    setViewMode, sortedProductStats 
}) => {
    return (
        <div style={{ width: '100%', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0 }}>📊 Performance Reports</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={analyticsDays} onChange={(e) => setAnalyticsDays(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    <button onClick={() => setViewMode('inventory')} style={{ background: '#eee', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>← Back</button>
                </div>
            </div>

            {/* 🔥 UPDATED GRID: Now 4 columns to include Shop Views */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                
                {/* 🔥 CARD 1: Total Shop Views (Top of the Funnel) */}
                <div style={{ background: '#a1c4fd', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#003366' }}>Total Shop Visits</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: '#003366' }}>
                        {isTrafficLoading ? '⏳' : (trafficData?.summary?.TotalShopViews || 0)}
                    </div>
                </div>

                {/* CARD 2: Total Product Views (Bottom of the Funnel) */}
                <div style={{ background: '#f6d365', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#bf360c' }}>Total Product Clicks</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: '#bf360c' }}>
                        {isTrafficLoading ? '⏳' : (trafficData?.summary?.TotalProductViews || 0)}
                    </div>
                </div>

                {/* CARD 3: Unique Shoppers */}
                <div style={{ background: '#84fab0', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#006266' }}>Unique Shoppers</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '10px', color: '#006266' }}>
                        {isTrafficLoading ? '⏳' : (trafficData?.summary?.UniqueShoppers || trafficData?.summary?.UniqueVisitors || 0)}
                    </div>
                </div>

                {/* 🔥 CARD 4: Device Breakdown (Mobile vs Desktop) */}
                <div style={{ background: '#fda085', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#fff', marginBottom: '10px' }}>Device Breakdown</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                        {/* Mobile Side */}
                        <div>
                            <div style={{ fontSize: '13px', color: '#fff', opacity: 0.9 }}>📱 Mobile</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                                {isTrafficLoading ? '⏳' : (trafficData?.summary?.MobileUsers || 0)}
                            </div>
                        </div>

                        {/* Vertical Divider */}
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.4)' }}></div>

                        {/* Desktop Side */}
                        <div>
                            <div style={{ fontSize: '13px', color: '#fff', opacity: 0.9 }}>💻 Desktop</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                                {isTrafficLoading ? '⏳' : (trafficData?.summary?.DesktopUsers || 0)}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0 }}>Item Level Traffic</h4>
                    <select value={analyticsSort} onChange={(e) => setAnalyticsSort(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
                        <option value="desc">Sort: Highest Views</option>
                        <option value="asc">Sort: Lowest Views</option>
                    </select>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#888', fontSize: '13px' }}>
                            <th style={{ padding: '12px' }}>Product Name</th>
                            <th style={{ padding: '12px' }}>Category</th>
                            <th style={{ padding: '12px' }}>Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isTrafficLoading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading traffic data... ⏳</td></tr>
                        ) : sortedProductStats && sortedProductStats.length > 0 ? (
                            sortedProductStats.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{p.name}</td>
                                    <td style={{ padding: '15px' }}>{p.category}</td>
                                    <td style={{ padding: '15px' }}><span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{p.views}</span></td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No traffic data for this period.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SellerAnalyticsView;