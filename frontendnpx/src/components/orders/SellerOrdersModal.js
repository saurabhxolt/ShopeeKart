import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { parseImages } from '../../utils/imageHelpers';

const SellerOrdersModal = ({ isOpen, onClose, sellerId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);
    
    // 🔥 NEW: Store the live product catalog to enrich order details
    const [catalog, setCatalog] = useState([]);

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

    // 🔥 NEW: Fetch the catalog so we can look up SKUs and Descriptions
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

    // Helper to find the live product data for the sub-modal
    const getLiveProductInfo = (itemSnapshot) => {
        if (!itemSnapshot) return {};
        const targetId = String(itemSnapshot.ProductId || itemSnapshot.id || itemSnapshot.Id);
        return catalog.find(p => String(p.id) === targetId) || {};
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Order Management">
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
                    <button onClick={fetchOrders} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '6px', cursor:'pointer', fontWeight: 'bold' }}>
                        🔄 Refresh List
                    </button>
                </div>
                
                <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
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

                        const isTerminal = o.Status === 'Delivered' || o.Status === 'Cancelled';

                        return (
                            <div key={o.OrderId} style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '20px', background: o.Status === 'Cancelled' ? '#fffcfc' : '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                                
                                {/* HEADER */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Order <span style={{ color: '#007bff' }}>#{o.OrderId}</span></h4>
                                        <div style={{ fontSize: '13px', color: '#888' }}>{new Date(o.OrderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</div>
                                    </div>
                                    <div>
                                        {isTerminal ? (
                                            <span style={{ 
                                                display: 'inline-block', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px',
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
                                                    padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', outline: 'none',
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
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e9ecef', fontSize: '14px', color: '#333' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>
                                        <span style={{ fontWeight: 'bold', color: '#495057' }}>👤 Customer Info & Shipping</span>
                                        <span style={{ background: '#e2e3e5', color: '#383d41', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {paymentMethod}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '15px' }}>
                                        <div>
                                            <div style={{ marginBottom: '8px' }}><span style={{ color: '#6c757d', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>Buyer Name</span> <strong>{o.BuyerName || "Unknown"}</strong></div>
                                            <div><span style={{ color: '#6c757d', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>Email Contact</span> <a href={`mailto:${o.BuyerEmail}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>{o.BuyerEmail || "N/A"}</a></div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ color: '#6c757d', fontSize: '12px', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Address</span>
                                            <div style={{ whiteSpace: 'pre-wrap', background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', lineHeight: '1.4' }}>
                                                {rawAddress}
                                            </div>
                                            <button onClick={() => copyToClipboard(rawAddress)} style={{ position: 'absolute', top: '18px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} title="Copy Address">
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS LIST */}
                                <div style={{ marginBottom: '15px' }}>
                                    <h5 style={{ margin: '0 0 10px 0', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Ordered Items</h5>
                                    {products.map((p, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setViewingItem(p)}
                                            title="Click to view full product details"
                                            style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px', opacity: p.ItemStatus === 'Cancelled' ? 0.5 : 1, cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ width: '50px', height: '50px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                                                <img src={parseImages(p.ImageUrl)[0]} alt={p.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#007bff' }}>
                                                    {p.Name} ↗
                                                    {p.ItemStatus === 'Cancelled' && <span style={{ color: '#dc3545', fontSize: '11px', marginLeft: '8px', border: '1px solid #dc3545', padding: '2px 4px', borderRadius: '4px' }}>CANCELLED</span>}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>Qty: {p.Qty} × Rs.{p.Price}</div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                {p.ItemStatus !== 'Cancelled' && (o.Status === 'Placed' || o.Status === 'Confirmed') && (
                                                    <button 
                                                        onClick={(e) => handleCancelItem(o.OrderId, p, e)}
                                                        style={{ color: '#dc3545', border: '1px solid #dc3545', background: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', borderRadius: '4px', fontWeight: 'bold', transition: 'all 0.2s' }}
                                                        onMouseOver={(e) => { e.target.style.background = '#dc3545'; e.target.style.color = 'white'; }}
                                                        onMouseOut={(e) => { e.target.style.background = 'white'; e.target.style.color = '#dc3545'; }}
                                                    >
                                                        ✕ Cancel Item
                                                    </button>
                                                )}
                                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>Rs. {p.Qty * p.Price}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: '2px dashed #eee', paddingTop: '15px' }}>
                                    <div style={{ fontSize: '13px', color: '#888' }}>
                                        {o.Status === 'Cancelled' ? "This entire order was cancelled." : "Update status to notify the buyer."}
                                    </div>
                                    <div style={{ fontSize: '18px' }}>
                                        <span style={{ color: '#666', fontSize: '14px', marginRight: '8px' }}>Total Amount:</span>
                                        <strong style={{ color: '#28a745' }}>Rs. {o.TotalAmount}</strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* 🔥 COMPLETELY UPGRADED PRODUCT DETAILS SUB-MODAL */}
            {viewingItem && (() => {
                // Dynamically merge cart snapshot with live database info
                const liveInfo = getLiveProductInfo(viewingItem);
                const displayDesc = liveInfo.description || viewingItem.Description || "No detailed description available.";
                const liveStock = liveInfo.qty !== undefined ? liveInfo.qty : 'N/A';

                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '550px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            <button onClick={() => setViewingItem(null)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: '#f1f3f5', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>&times;</button>
                            
                            <h2 style={{ marginTop: 0, borderBottom: '2px solid #f8f9fa', paddingBottom: '15px', color: '#333' }}>📦 Packaging Info</h2>
                            
                            <div style={{ textAlign: 'center', marginBottom: '20px', background: '#f8f9fa', borderRadius: '8px', padding: '15px', border: '1px solid #e9ecef' }}>
                                <img 
                                    src={parseImages(viewingItem.ImageUrl)[0]} 
                                    alt="Product" 
                                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }} 
                                />
                            </div>

                            <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '22px' }}>{viewingItem.Name}</h3>
                            
                            {/* LIVE BADGES (SKU, Brand, Category) */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>SKU: {liveInfo.sku || 'N/A'}</span>
                                <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Brand: {liveInfo.brand || 'N/A'}</span>
                                <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Category: {liveInfo.category || 'N/A'}</span>
                            </div>
                            
                            {/* PRICING & INVENTORY METRICS */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '14px' }}>
                                <div style={{ background: '#e7f1ff', padding: '12px', borderRadius: '6px', border: '1px solid #b6d4fe' }}>
                                    <strong style={{ color: '#0c63e4', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Ordered Price</strong> 
                                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Rs. {viewingItem.Price}</span>
                                </div>
                                <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', border: '1px solid #ffecb5' }}>
                                    <strong style={{ color: '#856404', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Ordered Qty</strong> 
                                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{viewingItem.Qty} Units</span>
                                </div>
                                {/* Highlights Red if stock is low so the seller knows to re-order */}
                                <div style={{ background: liveStock <= 5 ? '#f8d7da' : '#d4edda', padding: '12px', borderRadius: '6px', border: `1px solid ${liveStock <= 5 ? '#f5c6cb' : '#c3e6cb'}` }}>
                                    <strong style={{ color: liveStock <= 5 ? '#721c24' : '#155724', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Live Stock Left</strong> 
                                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{liveStock}</span>
                                </div>
                            </div>

                            <div>
                                <strong style={{ color: '#495057', fontSize: '14px' }}>Product Description:</strong>
                                <p style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', fontSize: '13px', lineHeight: '1.6', marginTop: '8px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #dee2e6', color: '#555', whiteSpace: 'pre-wrap' }}>
                                    {displayDesc}
                                </p>
                            </div>

                            <button 
                                onClick={() => setViewingItem(null)} 
                                style={{ width: '100%', padding: '14px', background: '#343a40', color: 'white', border: 'none', borderRadius: '8px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'background 0.2s' }}
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