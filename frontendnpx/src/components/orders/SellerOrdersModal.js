import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { parseImages } from '../../utils/imageHelpers';

const SellerOrdersModal = ({ isOpen, onClose, sellerId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);
    
    const [catalog, setCatalog] = useState([]);

    // 🔥 ADDED: Viewport detection for mobile responsiveness
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!sellerId) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:7071/api/GetOrders?sellerId=${sellerId}`);
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [sellerId]);

    useEffect(() => { 
        if (isOpen && sellerId) {
            fetchOrders(); 
            axios.get(`http://localhost:7071/api/GetSellerProducts?userId=${sellerId}`)
                 .then(res => setCatalog(res.data))
                 .catch(err => console.error("Failed to load catalog"));
        }
    }, [isOpen, sellerId, fetchOrders]);

    const handleCancelItem = async (orderId, product, e) => {
        e.stopPropagation(); 
        if (!window.confirm(`Cancel item "${product.Name}"? This will restore stock.`)) return;
        try {
            await axios.post('http://localhost:7071/api/CancelOrderItem', { 
                orderId, 
                productId: product.ProductId || product.id,
                price: product.Price,
                qty: product.Qty 
            });
            alert("Item cancelled successfully");
            fetchOrders(); 
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
        try {
            await axios.post('http://localhost:7071/api/UpdateOrderStatus', { orderId, newStatus });
            fetchOrders();
        } catch (err) {
            alert("Update failed");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("✅ Address copied to clipboard!");
    };

    const getLiveProductInfo = (itemSnapshot) => {
        if (!itemSnapshot) return {};
        const targetId = String(itemSnapshot.ProductId || itemSnapshot.id || itemSnapshot.Id);
        return catalog.find(p => String(p.id) === targetId) || {};
    };

    return (
        <>
            {/* 🔥 Modal width set to 100% via the newly optimized Modal.js */}
            <Modal isOpen={isOpen} onClose={onClose} title="Order Management">
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '15px', width: '100%', boxSizing: 'border-box' }}>
                    <button onClick={fetchOrders} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '6px', cursor:'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>
                        🔄 Refresh List
                    </button>
                </div>
                
                <div style={{ maxHeight: isMobile ? 'auto' : '75vh', overflowY: isMobile ? 'visible' : 'auto', paddingRight: isMobile ? '0' : '10px', width: '100%', boxSizing: 'border-box' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>⏳ Loading orders...</div>
                    ) : orders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No orders found yet.</div>
                    ) : orders.map(o => {
                        const products = o.ItemsJson ? JSON.parse(o.ItemsJson) : [];
                        
                        let rawAddress = o.ShippingAddress || "No address provided";
                        let paymentMethod = "COD"; 
                        if (rawAddress.includes("Payment:")) {
                            const parts = rawAddress.split("Payment:");
                            rawAddress = parts[0].trim();
                            paymentMethod = parts[1].trim();
                        }

                        const isTerminal = o.Status === 'Delivered' || o.Status?.includes('Cancelled');

                        return (
                            <div key={o.OrderId} style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: isMobile ? '15px' : '20px', marginBottom: '20px', background: o.Status?.includes('Cancelled') ? '#fffcfc' : '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', width: '100%', boxSizing: 'border-box' }}>
                                
                                {/* HEADER */}
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-start', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px', gap: isMobile ? '15px' : '0' }}>
                                    <div style={{ width: '100%' }}>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Order <span style={{ color: '#007bff' }}>#{o.OrderId}</span></h4>
                                        <div style={{ fontSize: '13px', color: '#888' }}>
                                            {o.OrderDate ? new Date(o.OrderDate.replace('Z', '')).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Date not available'}
                                        </div>
                                    </div>
                                    <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                        {isTerminal ? (
                                            <span style={{ 
                                                display: 'inline-block', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box',
                                                background: o.Status === 'Delivered' ? '#d4edda' : '#f8d7da',
                                                color: o.Status === 'Delivered' ? '#155724' : '#721c24',
                                                border: `1px solid ${o.Status === 'Delivered' ? '#c3e6cb' : '#f5c6cb'}`
                                            }}>
                                                {o.Status.toUpperCase()}
                                            </span>
                                        ) : (
                                            <select
                                                value={o.Status}
                                                onChange={(e) => updateStatus(o.OrderId, e.target.value)}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', outline: 'none', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box',
                                                    backgroundColor: o.Status === 'Confirmed' ? '#e7f1ff' : o.Status === 'Shipped' ? '#fff3cd' : '#f8f9fa',
                                                    color: o.Status === 'Confirmed' ? '#0c63e4' : o.Status === 'Shipped' ? '#856404' : '#333'
                                                }}
                                            >
                                                <option value="Placed">Placed (New)</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* CUSTOMER DETAILS */}
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e9ecef', fontSize: '14px', color: '#333', width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>
                                        <span style={{ fontWeight: 'bold', color: '#495057', fontSize: isMobile ? '13px' : '14px' }}>👤 Customer Info & Shipping</span>
                                        <span style={{ background: '#e2e3e5', color: '#383d41', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                            {paymentMethod}
                                        </span>
                                    </div>
                                    
                                    {/* 🔥 FIX: Changed grid layout to stack vertically on mobile */}
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', width: '100%' }}>
                                        <div style={{ flex: 1, paddingBottom: isMobile ? '10px' : '0', borderBottom: isMobile ? '1px dashed #ddd' : 'none' }}>
                                            <div style={{ marginBottom: '8px' }}><span style={{ color: '#6c757d', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Buyer Name</span> <strong style={{ wordBreak: 'break-word' }}>{o.BuyerName || "Unknown"}</strong></div>
                                            <div><span style={{ color: '#6c757d', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Email Contact</span> <a href={`mailto:${o.BuyerEmail}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold', wordBreak: 'break-all' }}>{o.BuyerEmail || "N/A"}</a></div>
                                        </div>
                                        <div style={{ flex: 1.5, position: 'relative' }}>
                                            <span style={{ color: '#6c757d', fontSize: '11px', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Address</span>
                                            <div style={{ whiteSpace: 'pre-wrap', background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', lineHeight: '1.5', fontSize: '13px', wordBreak: 'break-word' }}>
                                                {rawAddress}
                                            </div>
                                            <button onClick={() => copyToClipboard(rawAddress)} style={{ position: 'absolute', top: '18px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '5px' }} title="Copy Address">
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS LIST */}
                                <div style={{ marginBottom: '15px', width: '100%', boxSizing: 'border-box' }}>
                                    <h5 style={{ margin: '0 0 10px 0', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Ordered Items</h5>
                                    {products.map((p, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setViewingItem(p)}
                                            title="Click to view full product details"
                                            style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', marginBottom: '10px', opacity: p.ItemStatus?.includes('Cancelled') ? 0.5 : 1, cursor: 'pointer', padding: '12px', borderRadius: '8px', border: '1px solid #f0f0f0', transition: 'background 0.2s', width: '100%', boxSizing: 'border-box' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', gap: '15px', width: '100%', alignItems: 'center' }}>
                                                <div style={{ width: '60px', height: '60px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                                    <img src={parseImages(p.ImageUrl)[0]} alt={p.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#007bff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {p.Name} ↗
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                        <div style={{ fontSize: '12px', color: '#666' }}>Qty: {p.Qty} × Rs.{p.Price}</div>
                                                        {p.ItemStatus?.includes('Cancelled') && <span style={{ color: '#dc3545', fontSize: '10px', border: '1px solid #dc3545', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{p.ItemStatus.toUpperCase()}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '10px' : '0', borderTop: isMobile ? '1px dashed #eee' : 'none', paddingTop: isMobile ? '10px' : '0' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>Rs. {p.Qty * p.Price}</div>
                                                
                                                {!p.ItemStatus?.includes('Cancelled') && (o.Status === 'Placed' || o.Status === 'Confirmed') && (
                                                    <button 
                                                        onClick={(e) => handleCancelItem(o.OrderId, p, e)}
                                                        style={{ color: '#dc3545', border: '1px solid #dc3545', background: 'white', cursor: 'pointer', padding: '6px 10px', fontSize: '11px', borderRadius: '4px', fontWeight: 'bold', transition: 'all 0.2s', marginLeft: '15px' }}
                                                    >
                                                        ✕ Cancel Item
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-end' : 'center', marginTop: '15px', borderTop: '2px dashed #eee', paddingTop: '15px', gap: isMobile ? '10px' : '0', width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: '12px', color: '#888', width: '100%', textAlign: isMobile ? 'right' : 'left' }}>
                                        {o.Status === 'Cancelled by Admin' ? "⚠️ Forcefully cancelled by Admin." : 
                                         o.Status === 'Cancelled' ? "Entire order was cancelled." : "Update status to notify the buyer."}
                                    </div>
                                    <div style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                        <span style={{ color: '#666', fontSize: '14px' }}>Total:</span>
                                        <strong style={{ color: '#28a745' }}>Rs. {o.TotalAmount}</strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* 🔥 PRODUCT DETAILS SUB-MODAL */}
            {viewingItem && (() => {
                const liveInfo = getLiveProductInfo(viewingItem);
                const displayDesc = liveInfo.description || viewingItem.Description || "No detailed description available.";
                const liveStock = liveInfo.qty !== undefined ? liveInfo.qty : 'N/A';

                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 9999, padding: isMobile ? '0' : '20px' }}>
                        <div style={{ backgroundColor: 'white', padding: isMobile ? '20px' : '30px', borderRadius: isMobile ? '16px 16px 0 0' : '12px', width: '100%', maxWidth: '550px', maxHeight: isMobile ? '90vh' : '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
                            <button onClick={() => setViewingItem(null)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: '#f1f3f5', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', zIndex: 10 }}>&times;</button>
                            
                            <h2 style={{ margin: '0 0 15px 0', borderBottom: '2px solid #f8f9fa', paddingBottom: '15px', color: '#333', fontSize: '18px', paddingRight: '40px' }}>📦 Item Info</h2>
                            
                            <div style={{ textAlign: 'center', marginBottom: '20px', background: '#f8f9fa', borderRadius: '8px', padding: '15px', border: '1px solid #e9ecef', width: '100%', boxSizing: 'border-box' }}>
                                <img 
                                    src={parseImages(viewingItem.ImageUrl)[0]} 
                                    alt="Product" 
                                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }} 
                                />
                            </div>

                            <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: isMobile ? '18px' : '22px', wordBreak: 'break-word', lineHeight: '1.4' }}>{viewingItem.Name}</h3>
                            
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', width: '100%' }}>
                                <span style={{ background: '#e9ecef', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#495057' }}>SKU: {liveInfo.sku || 'N/A'}</span>
                                <span style={{ background: '#e9ecef', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#495057' }}>Brand: {liveInfo.brand || 'N/A'}</span>
                                <span style={{ background: '#e9ecef', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#495057' }}>Category: {liveInfo.category || 'N/A'}</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}>
                                <div style={{ background: '#e7f1ff', padding: '15px', borderRadius: '6px', border: '1px solid #b6d4fe', display: isMobile ? 'flex' : 'block', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ color: '#0c63e4', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Ordered Price</strong> 
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Rs. {viewingItem.Price}</span>
                                </div>
                                <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '6px', border: '1px solid #ffecb5', display: isMobile ? 'flex' : 'block', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ color: '#856404', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Ordered Qty</strong> 
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{viewingItem.Qty} Units</span>
                                </div>
                                <div style={{ background: liveStock <= 5 ? '#f8d7da' : '#d4edda', padding: '15px', borderRadius: '6px', border: `1px solid ${liveStock <= 5 ? '#f5c6cb' : '#c3e6cb'}`, display: isMobile ? 'flex' : 'block', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ color: liveStock <= 5 ? '#721c24' : '#155724', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Live Stock Left</strong> 
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{liveStock}</span>
                                </div>
                            </div>

                            <div style={{ width: '100%', boxSizing: 'border-box' }}>
                                <strong style={{ color: '#495057', fontSize: '14px' }}>Product Description:</strong>
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', fontSize: '13px', lineHeight: '1.6', marginTop: '8px', maxHeight: isMobile ? '200px' : '120px', overflowY: 'auto', border: '1px solid #dee2e6', color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                                    {displayDesc}
                                </div>
                            </div>

                            <button 
                                onClick={() => setViewingItem(null)} 
                                style={{ width: '100%', padding: '16px', background: '#343a40', color: 'white', border: 'none', borderRadius: '8px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'background 0.2s', boxSizing: 'border-box' }}
                                onMouseOver={(e) => e.target.style.background = '#212529'}
                                onMouseOut={(e) => e.target.style.background = '#343a40'}
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default SellerOrdersModal;