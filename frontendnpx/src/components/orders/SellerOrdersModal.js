import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { parseImages } from '../../utils/imageHelpers';

const SellerOrdersModal = ({ isOpen, onClose, sellerId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);

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

    const handleCancelItem = async (orderId, product, e) => {
        e.stopPropagation(); 
        if (!window.confirm(`Cancel item "${product.Name}"? This will restore stock.`)) return;
        try {
            await axios.post('http://localhost:7071/api/CancelOrderItem', { 
                orderId, 
                productId: product.ProductId,
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
        try {
            await axios.post('http://localhost:7071/api/UpdateOrderStatus', { orderId, newStatus });
            fetchOrders();
        } catch (err) {
            alert("Update failed");
        }
    };

    useEffect(() => { if (isOpen) fetchOrders(); }, [isOpen, fetchOrders]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Order Management">
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                    <button onClick={fetchOrders} style={{ background: '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor:'pointer' }}>Refresh</button>
                </div>
                
                <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '10px' }}>
                    {loading ? <p>Loading orders...</p> : orders.length === 0 ? <p>No orders found.</p> : orders.map(o => {
                        const products = o.ItemsJson ? JSON.parse(o.ItemsJson) : [];
                        return (
                            <div key={o.OrderId} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '15px', background: '#fff' }}>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                    <div>
                                        <h4 style={{ margin: 0 }}>Order #{o.OrderId}</h4>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{new Date(o.OrderDate).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        {o.Status === 'Cancelled' ? (
                                            <span style={{ color: 'red', fontWeight: 'bold', border: '1px solid red', padding: '2px 6px', borderRadius: '4px' }}>CANCELLED</span>
                                        ) : (
                                            <select
                                                value={o.Status}
                                                onChange={(e) => updateStatus(o.OrderId, e.target.value)}
                                                style={{
                                                    padding: '5px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ccc',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    color: o.Status === 'Confirmed' ? '#007bff' :
                                                        o.Status === 'Shipped' ? '#e67e22' :
                                                        o.Status === 'Delivered' ? '#27ae60' : '#333'
                                                }}
                                            >
                                                <option value="Placed">Placed</option>
                                                <option value="Confirmed">Confirmed</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #90caf9', fontSize: '14px', color: '#333' }}>
                                    <div style={{ fontWeight: 'bold', color: '#0d47a1', marginBottom: '8px', borderBottom: '1px solid #bbdefb', paddingBottom: '5px' }}>
                                        👤 Customer Details
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <span style={{ fontWeight: 'bold', color: '#555' }}>Name:</span> <br/>
                                            {o.BuyerName || "Unknown"}
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 'bold', color: '#555' }}>Email:</span> <br/>
                                            <a href={`mailto:${o.BuyerEmail}`} style={{ color: '#007bff' }}>{o.BuyerEmail || "N/A"}</a>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '10px' }}>
                                        <span style={{ fontWeight: 'bold', color: '#555' }}>📍 Shipping Address:</span>
                                        <p style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                            {o.ShippingAddress || "No address provided"}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px' }}>
                                    {products.map((p, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setViewingItem(p)}
                                            title="Click to view full product details"
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: p.ItemStatus === 'Cancelled' ? 0.5 : 1, cursor: 'pointer', borderBottom: '1px solid #eee', paddingBottom: '10px' }}
                                        >
                                            <img src={parseImages(p.ImageUrl)[0]} alt={p.Name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#007bff' }}>
                                                    {p.Name} ↗
                                                    {p.ItemStatus === 'Cancelled' && <span style={{ color: 'red', fontSize: '10px', marginLeft: '5px' }}>(CANCELLED)</span>}
                                                </div>
                                                <div style={{ fontSize: '12px' }}>Qty: {p.Qty} × Rs.{p.Price}</div>
                                            </div>
                                            
                                            {p.ItemStatus !== 'Cancelled' && o.Status === 'Placed' && (
                                                <button 
                                                    onClick={(e) => handleCancelItem(o.OrderId, p, e)}
                                                    style={{ color: 'red', border: '1px solid #ddd', background: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                                                >
                                                    ✕ Cancel
                                                </button>
                                            )}
                                            <div style={{ fontWeight: 'bold' }}>Rs. {p.Qty * p.Price}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold', fontSize: '16px' }}>Total: Rs. {o.TotalAmount}</div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {viewingItem && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button onClick={() => setViewingItem(null)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                        
                        <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' }}>Item Details</h2>
                        
                        <div style={{ textAlign: 'center', marginBottom: '20px', background: '#f4f4f4', borderRadius: '8px', padding: '10px' }}>
                            <img 
                                src={parseImages(viewingItem.ImageUrl)[0]} 
                                alt="Product" 
                                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} 
                            />
                        </div>

                        <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{viewingItem.Name}</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '14px' }}>
                            <div style={{ background: '#e3f2fd', padding: '8px', borderRadius: '4px' }}>
                                <strong>Price:</strong> Rs. {viewingItem.Price}
                            </div>
                            <div style={{ background: '#fff3cd', padding: '8px', borderRadius: '4px' }}>
                                <strong>Quantity:</strong> {viewingItem.Qty}
                            </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <strong>Description (Snapshot):</strong>
                            <p style={{ background: '#f9f9f9', padding: '10px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.5', marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                                {viewingItem.Description || "No detailed description stored with this order item."}
                            </p>
                        </div>

                        <button 
                            onClick={() => setViewingItem(null)} 
                            style={{ width: '100%', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', marginTop: '15px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default SellerOrdersModal;