import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { parseImages } from '../../utils/imageHelpers';

const BuyerOrdersModal = ({ isOpen, onClose, userId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchOrders = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:7071/api/GetOrders?sellerId=${userId}&isBuyer=true`);
            setOrders(res.data);
        } catch (err) {
            console.error("Failed to load orders", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { if (isOpen) fetchOrders(); }, [isOpen, fetchOrders]);

    const getProgress = (status) => {
        switch (status) {
            case 'Placed': return '25%';
            case 'Confirmed': return '50%';
            case 'Shipped': return '75%';
            case 'Delivered': return '100%';
            default: return '0%';
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Cancelled') return '#dc3545';
        if (status === 'Delivered') return '#28a745';
        return '#007bff';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Orders & Tracking">
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
                <button onClick={fetchOrders} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '6px', cursor:'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    🔄 Refresh Status
                </button>
            </div>

            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>⏳ Loading your orders...</div>
                ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛍️</div>
                        You haven't placed any orders yet.
                    </div>
                ) : (
                    orders.map(o => {
                        const products = o.ItemsJson ? JSON.parse(o.ItemsJson) : [];
                        const isCancelled = o.Status === 'Cancelled';

                        return (
                            <div key={o.OrderId} style={{ border: '1px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '20px', background: isCancelled ? '#fffcfc' : '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                                
                                {/* HEADER: Order ID & Status */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '15px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '18px' }}>Order <span style={{ color: '#007bff' }}>#{o.OrderId}</span></h4>
                                        <div style={{ fontSize: '13px', color: '#888' }}>Placed on {new Date(o.OrderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: getStatusColor(o.Status), background: `${getStatusColor(o.Status)}15`, padding: '5px 12px', borderRadius: '20px', display: 'inline-block' }}>
                                            {o.Status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {/* PROGRESS BAR UI */}
                                {!isCancelled && (
                                    <div style={{ marginBottom: '25px', padding: '10px 0' }}>
                                        <div style={{ height: '8px', background: '#e9ecef', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: getProgress(o.Status), 
                                                height: '100%', 
                                                background: o.Status === 'Delivered' ? '#28a745' : '#007bff', 
                                                borderRadius: '4px', 
                                                transition: 'width 0.8s ease-in-out' 
                                            }}></div>
                                        </div>
                                        {/* Properly spaced labels */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', color: '#666', fontWeight: 'bold' }}>
                                            <span style={{ color: o.Status === 'Placed' || o.Status === 'Confirmed' || o.Status === 'Shipped' || o.Status === 'Delivered' ? '#333' : '#aaa' }}>Placed</span>
                                            <span style={{ color: o.Status === 'Confirmed' || o.Status === 'Shipped' || o.Status === 'Delivered' ? '#333' : '#aaa' }}>Confirmed</span>
                                            <span style={{ color: o.Status === 'Shipped' || o.Status === 'Delivered' ? '#333' : '#aaa' }}>Shipped</span>
                                            <span style={{ color: o.Status === 'Delivered' ? '#28a745' : '#aaa' }}>Delivered</span>
                                        </div>
                                    </div>
                                )}

                                {/* ITEMS LIST */}
                                <div>
                                    {products.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', opacity: isCancelled ? 0.6 : 1 }}>
                                            <div style={{ width: '60px', height: '60px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#f8f9fa' }}>
                                                <img src={parseImages(p.ImageUrl)[0]} alt={p.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333', marginBottom: '3px' }}>{p.Name}</div>
                                                <div style={{ fontSize: '13px', color: '#666' }}>
                                                    Qty: <strong>{p.Qty}</strong> × Rs.{p.Price}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>
                                                Rs. {p.Price * p.Qty}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* FOOTER: Total Amount */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: '1px solid #f0f0f0', paddingTop: '15px' }}>
                                    <div>
                                        {isCancelled && <span style={{ fontSize: '13px', color: '#dc3545', fontWeight: 'bold' }}>🚫 Order Cancelled by Seller</span>}
                                    </div>
                                    <div style={{ fontSize: '18px' }}>
                                        <span style={{ color: '#666', fontSize: '14px', marginRight: '8px' }}>Total Paid:</span>
                                        <strong style={{ color: '#28a745' }}>Rs. {o.TotalAmount}</strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
};

export default BuyerOrdersModal;