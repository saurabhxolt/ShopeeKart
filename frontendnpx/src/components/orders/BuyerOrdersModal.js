import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';
import { parseImages } from '../../utils/imageHelpers';

const BuyerOrdersModal = ({ isOpen, onClose, userId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // States for detail view and rating
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [submittedRatings, setSubmittedRatings] = useState({});

    // 🔥 NEW: State for sorting/filtering by Date
    const [timeFilter, setTimeFilter] = useState('ALL');

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

    useEffect(() => { 
        if (isOpen) {
            fetchOrders();
            setSelectedOrder(null);
            setSelectedItem(null);
            setTimeFilter('ALL'); // Reset filter when opened
        }
    }, [isOpen, fetchOrders]);

    const handleRateItem = async (productId, rating) => {
        try {
            await axios.post('http://localhost:7071/api/AddRating', {
                productId: productId,
                userId: userId,
                rating: rating
            });
            setSubmittedRatings(prev => ({ ...prev, [productId]: rating }));
            alert(`Success! You rated this item ${rating} stars.`);
        } catch (err) {
            alert("Failed to submit rating.");
        }
    };

    // 🔥 FIX: Now safely checks for Address, ShippingAddress, or DeliveryAddress
    const parseAddress = (addressStr) => {
        if (!addressStr) return { name: 'N/A', phone: '', address: 'No address provided', payment: 'COD' };
        try {
            const lines = addressStr.split('\n');
            const namePhoneLine = lines[0] || '';
            const [name, phoneStr] = namePhoneLine.split(' | Ph: +91 ');
            const paymentLine = lines.find(l => l.startsWith('Payment: ')) || '';
            const payment = paymentLine.replace('Payment: ', '') || 'COD';
            const address = lines.filter(l => l !== namePhoneLine && l !== paymentLine).join(', ');
            return { name: name || 'N/A', phone: phoneStr || '', address, payment };
        } catch (e) {
            return { name: 'N/A', phone: '', address: addressStr, payment: 'COD' };
        }
    };

    // Extract dynamic years from order history
    const availableYears = [...new Set(orders.map(o => new Date(o.OrderDate).getFullYear()))].sort((a,b) => b - a);

    // ============================================================================
    // VIEW 1: LIST VIEW (With Month/Year Sorting)
    // ============================================================================
    const renderListView = () => {
        // Flatten orders so each product is its own row
        const flattenedItems = orders.flatMap(o => {
            const items = o.ItemsJson ? JSON.parse(o.ItemsJson) : [];
            return items.map(item => ({ item, order: o }));
        });

        // Apply Time Filter
        const filteredItems = flattenedItems.filter(data => {
            if (timeFilter === 'ALL') return true;
            
            const orderDate = new Date(data.order.OrderDate);
            const now = new Date();
            const diffTime = Math.abs(now - orderDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (timeFilter === '30DAYS') return diffDays <= 30;
            if (timeFilter === '6MONTHS') return diffDays <= 180;
            
            // If it's a specific year (e.g. "2026")
            return orderDate.getFullYear().toString() === timeFilter;
        });

        if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>⏳ Loading your orders...</div>;
        
        if (flattenedItems.length === 0) return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛍️</div>
                You haven't placed any orders yet.
            </div>
        );

        return (
            <div style={{ padding: '10px' }}>
                {/* SORTING / FILTERING HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#212121', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📦 My Orders
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', color: '#878787', fontWeight: '500' }}>Filter by:</span>
                        <select 
                            value={timeFilter} 
                            onChange={(e) => setTimeFilter(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', outline: 'none', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#212121', fontWeight: '500' }}
                        >
                            <option value="ALL">All Orders</option>
                            <option value="30DAYS">Last 30 Days</option>
                            <option value="6MONTHS">Last 6 Months</option>
                            <optgroup label="Filter by Year">
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#878787', background: 'white', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                        No orders found for this time period.
                    </div>
                ) : (
                    filteredItems.map((data, index) => {
                        const { item, order } = data;
                        const isDelivered = order.Status === 'Delivered';
                        const isCancelled = order.Status === 'Cancelled';
                        const statusColor = isDelivered ? '#26a541' : (isCancelled ? '#ff6161' : '#2874f0');
                        const itemId = item.id || item.ProductId;

                        return (
                            <div 
                                key={`${order.OrderId}-${index}`} 
                                onClick={() => { setSelectedOrder(order); setSelectedItem(item); }}
                                style={{ cursor: 'pointer', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '16px', display: 'flex', gap: '20px', marginBottom: '12px', background: '#fff', alignItems: 'center', transition: 'box-shadow 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                            >
                                <div style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                                    <img src={parseImages(item.ImageUrl || item.imageUrl)[0]} alt={item.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                
                                <div style={{ flex: 2 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.Name || item.name}</div>
                                    <div style={{ fontSize: '12px', color: '#878787', marginTop: '6px' }}>Qty: {item.Qty || item.qty}</div>
                                </div>
                                
                                <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#212121' }}>
                                    ₹{item.Price || item.price}
                                </div>
                                
                                <div style={{ flex: 2 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor }}></span>
                                        {order.Status} on {new Date(order.OrderDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>
                                        {isCancelled ? 'Order was cancelled.' : `Your item has been ${order.Status.toLowerCase()}`}
                                    </div>
                                    {isDelivered && (
                                        <div style={{ color: '#2874f0', fontSize: '13px', fontWeight: '500', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            ★ Rate & Review Product
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    // ============================================================================
    // VIEW 2: DETAIL VIEW 
    // ============================================================================
    const renderDetailView = () => {
        const o = selectedOrder;
        const item = selectedItem;
        
        // 🔥 PASSING ShippingAddress to avoid N/A bugs
        const addressData = parseAddress(o.ShippingAddress || o.Address || o.DeliveryAddress);
        
        const itemId = item.id || item.ProductId;
        const isDelivered = o.Status === 'Delivered';
        const isCancelled = o.Status === 'Cancelled';

        // Fake Listing Price Calculation for UI realism (usually +20%)
        const sellingPrice = item.Price || item.price;
        const listingPrice = item.OriginalPrice || Math.round(sellingPrice * 1.2);
        const discount = listingPrice - sellingPrice;

        const timeline = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
        const currentIndex = timeline.indexOf(isCancelled ? 'Placed' : o.Status);

        return (
            <div style={{ background: '#f1f3f6', padding: '15px', minHeight: '60vh', margin: '-20px', borderRadius: '0 0 8px 8px' }}>
                {/* Back Button */}
                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => { setSelectedOrder(null); setSelectedItem(null); }} style={{ background: 'white', border: '1px solid #ccc', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>
                        ← Back to My Orders
                    </button>
                    <span style={{ fontSize: '12px', color: '#878787' }}>Order ID: #{o.OrderId}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                    
                    {/* LEFT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Packaging Info */}
                        <div style={{ background: 'white', padding: '15px 20px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #e0e0e0' }}>
                            <div style={{ fontSize: '24px' }}>📦</div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121' }}>Delivered in secure packaging</div>
                                <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>Check the package at your doorstep before accepting.</div>
                            </div>
                        </div>

                        {/* Product & Timeline */}
                        <div style={{ background: 'white', padding: '24px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                            {/* Product Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '20px', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#212121', marginBottom: '8px' }}>{item.Name || item.name}</div>
                                    <div style={{ fontSize: '12px', color: '#878787', marginBottom: '8px' }}>Qty: {item.Qty || item.qty} • Seller: {o.StoreName || 'Marketplace'}</div>
                                    <div style={{ fontSize: '20px', fontWeight: '500', color: '#212121' }}>₹{sellingPrice}</div>
                                </div>
                                <div style={{ width: '80px', height: '80px', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px' }}>
                                    <img src={parseImages(item.ImageUrl || item.imageUrl)[0]} alt={item.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                            </div>

                            {/* Vertical Timeline */}
                            <div style={{ margin: '10px 0 30px 10px' }}>
                                {isCancelled ? (
                                    <div style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#ff6161', zIndex: 1, marginTop: '2px' }}></div>
                                        <div style={{ marginTop: '-2px' }}>
                                            <div style={{ fontWeight: '500', color: '#ff6161', fontSize: '14px' }}>Cancelled</div>
                                            <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>Order was cancelled on {new Date(o.OrderDate).toDateString()}</div>
                                        </div>
                                    </div>
                                ) : (
                                    timeline.map((step, idx) => {
                                        const isCompleted = currentIndex >= idx;
                                        const isLast = idx === timeline.length - 1;
                                        return (
                                            <div key={step} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: isLast ? '0' : '35px' }}>
                                                {/* Connecting Line */}
                                                {!isLast && <div style={{ position: 'absolute', left: '6px', top: '16px', bottom: '0', width: '2px', background: isCompleted && currentIndex > idx ? '#26a541' : '#e0e0e0' }}></div>}
                                                {/* Dot */}
                                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: isCompleted ? '#26a541' : '#e0e0e0', zIndex: 1, marginTop: '2px' }}></div>
                                                {/* Text */}
                                                <div style={{ marginTop: '-2px' }}>
                                                    <div style={{ fontWeight: '500', color: isCompleted ? '#212121' : '#878787', fontSize: '14px' }}>Order {step}</div>
                                                    {isCompleted && <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>{new Date(o.OrderDate).toDateString()}</div>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Rate Experience */}
                        {isDelivered && (
                            <div style={{ background: 'white', padding: '24px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#212121', fontWeight: '500' }}>Rate your experience</h3>
                                <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '4px' }}>
                                    <div style={{ fontSize: '12px', color: '#878787', marginBottom: '10px' }}>Rate the product</div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span
                                                key={star}
                                                onMouseEnter={() => setHoveredStar(star)}
                                                onMouseLeave={() => setHoveredStar(0)}
                                                onClick={() => handleRateItem(itemId, star)}
                                                style={{
                                                    fontSize: '32px', cursor: 'pointer', lineHeight: '1', transition: 'color 0.2s',
                                                    color: star <= (hoveredStar || submittedRatings[itemId] || 0) ? '#ff9f00' : '#e0e0e0'
                                                }}
                                                title={`Rate ${star} stars`}
                                            >
                                                ★
                                            </span>
                                        ))}
                                        {submittedRatings[itemId] && <span style={{ marginLeft: '15px', color: '#26a541', fontWeight: 'bold', alignSelf: 'center' }}>✓ Saved</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Delivery Address */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#212121', marginBottom: '15px' }}>Delivery details</div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '16px' }}>📍</span>
                                <div>
                                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#212121', marginBottom: '4px' }}>{addressData.name}</div>
                                    <div style={{ fontSize: '13px', color: '#212121', lineHeight: '1.5' }}>{addressData.address}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '16px' }}>📞</span>
                                <div style={{ fontSize: '13px', color: '#212121' }}>{addressData.phone}</div>
                            </div>
                        </div>

                        {/* Price Details */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#212121', marginBottom: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>Price details</div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#212121', marginBottom: '12px' }}>
                                <span>Listing price</span>
                                <span>₹{listingPrice * (item.Qty || item.qty || 1)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#212121', marginBottom: '12px' }}>
                                <span>Selling price</span>
                                <span>₹{sellingPrice * (item.Qty || item.qty || 1)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#212121', marginBottom: '12px' }}>
                                <span>Delivery fee</span>
                                <span style={{ color: '#26a541' }}>Free</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#212121', marginBottom: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '15px' }}>
                                <span>Other discount</span>
                                <span style={{ color: '#26a541' }}>-₹{discount * (item.Qty || item.qty || 1)}</span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '500', color: '#212121', marginBottom: '20px' }}>
                                <span>Total amount</span>
                                <span>₹{sellingPrice * (item.Qty || item.qty || 1)}</span>
                            </div>

                            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', fontSize: '13px', color: '#212121', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Payment method</span>
                                <strong>{addressData.payment}</strong>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={selectedOrder ? "Order Details" : ""} width={selectedOrder ? "1000px" : "800px"}>
            {selectedOrder ? renderDetailView() : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px', borderBottom: '1px solid #eee', marginBottom: '10px' }}>
                        <button onClick={fetchOrders} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '6px', cursor:'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🔄 Refresh Status
                        </button>
                    </div>
                    <div style={{ maxHeight: '75vh', overflowY: 'auto', background: '#f1f3f6', margin: '0 -20px -20px -20px', padding: '10px 20px', borderRadius: '0 0 8px 8px' }}>
                        {renderListView()}
                    </div>
                </>
            )}
        </Modal>
    );
};

export default BuyerOrdersModal;