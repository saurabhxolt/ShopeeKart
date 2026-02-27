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

    // 🔥 ADDED: Viewport detection for mobile responsiveness
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

        if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#666', width: '100%', boxSizing: 'border-box' }}>⏳ Loading your orders...</div>;
        
        if (flattenedItems.length === 0) return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛍️</div>
                You haven't placed any orders yet.
            </div>
        );

        return (
            <div style={{ padding: isMobile ? '5px' : '10px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
                {/* SORTING / FILTERING HEADER */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '15px', background: 'white', padding: '15px', borderRadius: '4px', border: '1px solid #e0e0e0', width: '100%', boxSizing: 'border-box', gap: isMobile ? '10px' : '0' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#212121', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📦 My Orders
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                        <span style={{ fontSize: '14px', color: '#878787', fontWeight: '500' }}>Filter by:</span>
                        <select 
                            value={timeFilter} 
                            onChange={(e) => setTimeFilter(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', outline: 'none', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#212121', fontWeight: '500', flex: isMobile ? 1 : 'none', width: '100%', boxSizing: 'border-box' }}
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
                    <div style={{ textAlign: 'center', padding: '40px', color: '#878787', background: 'white', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
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
                                style={{ cursor: 'pointer', border: '1px solid #e0e0e0', borderRadius: '4px', padding: isMobile ? '12px' : '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '20px', marginBottom: '12px', background: '#fff', alignItems: isMobile ? 'flex-start' : 'center', transition: 'box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                                onMouseOver={(e) => !isMobile && (e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)')}
                                onMouseOut={(e) => !isMobile && (e.currentTarget.style.boxShadow = 'none')}
                            >
                                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                    <div style={{ width: isMobile ? '60px' : '80px', height: isMobile ? '60px' : '80px', flexShrink: 0 }}>
                                        <img src={parseImages(item.ImageUrl || item.imageUrl)[0]} alt={item.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.Name || item.name}</div>
                                        <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>Qty: {item.Qty || item.qty}</div>
                                    </div>
                                </div>
                                
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: isMobile ? '5px' : '0' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#212121' }}>
                                        ₹{item.Price || item.price}
                                    </div>
                                    
                                    <div style={{ flex: isMobile ? 'none' : 2, textAlign: isMobile ? 'right' : 'left' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#212121', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-end' : 'flex-start', gap: '6px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }}></span>
                                            {order.Status} <span style={{ display: isMobile ? 'none' : 'inline' }}>on {order.OrderDate ? new Date(order.OrderDate.replace('Z', '')).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</span>
                                        </div>
                                        {/* Show date below on mobile for better fit */}
                                        {isMobile && <div style={{ fontSize: '11px', color: '#878787', marginTop: '2px' }}>{order.OrderDate ? new Date(order.OrderDate.replace('Z', '')).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>}
                                        
                                        {!isMobile && (
                                            <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>
                                                {isCancelled ? 'Order was cancelled.' : `Your item has been ${order.Status.toLowerCase()}`}
                                            </div>
                                        )}
                                        
                                        {isDelivered && (
                                            <div style={{ color: '#2874f0', fontSize: '12px', fontWeight: '500', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-end' : 'flex-start', gap: '4px' }}>
                                                ★ Rate Product
                                            </div>
                                        )}
                                    </div>
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
            <div style={{ background: '#f1f3f6', padding: isMobile ? '10px' : '15px', minHeight: '60vh', margin: isMobile ? '0' : '-20px', borderRadius: '0 0 8px 8px', width: '100%', boxSizing: 'border-box' }}>
                {/* Back Button */}
                <div style={{ marginBottom: '15px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px', width: '100%' }}>
                    <button onClick={() => { setSelectedOrder(null); setSelectedItem(null); }} style={{ background: 'white', border: '1px solid #ccc', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333', width: isMobile ? '100%' : 'auto' }}>
                        ← Back to My Orders
                    </button>
                    <span style={{ fontSize: '12px', color: '#878787' }}>Order ID: #{o.OrderId}</span>
                </div>

                {/* 🔥 GRID UPDATED: Swaps to 1 column on mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '15px', width: '100%', boxSizing: 'border-box' }}>
                    
                    {/* LEFT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        
                        {/* Packaging Info */}
                        <div style={{ background: 'white', padding: '15px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #e0e0e0', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '24px' }}>📦</div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121' }}>Delivered in secure packaging</div>
                                <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px', wordBreak: 'break-word' }}>Check the package at your doorstep before accepting.</div>
                            </div>
                        </div>

                        {/* Product & Timeline */}
                        <div style={{ background: 'white', padding: isMobile ? '15px' : '24px', borderRadius: '4px', border: '1px solid #e0e0e0', width: '100%', boxSizing: 'border-box' }}>
                            {/* Product Header */}
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '20px', marginBottom: '20px', gap: isMobile ? '15px' : '0' }}>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#212121', marginBottom: '8px', wordBreak: 'break-word' }}>{item.Name || item.name}</div>
                                    <div style={{ fontSize: '12px', color: '#878787', marginBottom: '8px' }}>Qty: {item.Qty || item.qty} • Seller: {o.StoreName || 'Marketplace'}</div>
                                    <div style={{ fontSize: '20px', fontWeight: '500', color: '#212121' }}>₹{sellingPrice}</div>
                                </div>
                                <div style={{ width: '80px', height: '80px', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px', alignSelf: isMobile ? 'flex-start' : 'auto' }}>
                                    <img src={parseImages(item.ImageUrl || item.imageUrl)[0]} alt={item.Name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                            </div>

                            {/* Vertical Timeline */}
                            <div style={{ margin: '10px 0 20px 10px' }}>
                                {isCancelled ? (
                                    <div style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#ff6161', zIndex: 1, marginTop: '2px', flexShrink: 0 }}></div>
                                        <div style={{ marginTop: '-2px' }}>
                                            <div style={{ fontWeight: '500', color: '#ff6161', fontSize: '14px' }}>Cancelled</div>
                                            <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>Order was cancelled on {o.OrderDate ? new Date(o.OrderDate.replace('Z', '')).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</div>
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
                                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: isCompleted ? '#26a541' : '#e0e0e0', zIndex: 1, marginTop: '2px', flexShrink: 0 }}></div>
                                                {/* Text */}
                                                <div style={{ marginTop: '-2px' }}>
                                                    <div style={{ fontWeight: '500', color: isCompleted ? '#212121' : '#878787', fontSize: '14px' }}>Order {step}</div>
                                                    {isCompleted && <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>{o.OrderDate ? new Date(o.OrderDate.replace('Z', '')).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</div>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Rate Experience */}
                        {isDelivered && (
                            <div style={{ background: 'white', padding: isMobile ? '15px' : '24px', borderRadius: '4px', border: '1px solid #e0e0e0', width: '100%', boxSizing: 'border-box' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#212121', fontWeight: '500' }}>Rate your experience</h3>
                                <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '4px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '10px' : '0', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '13px', color: '#878787' }}>Rate the product</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span
                                                key={star}
                                                onMouseEnter={() => !isMobile && setHoveredStar(star)}
                                                onMouseLeave={() => !isMobile && setHoveredStar(0)}
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
                                        {submittedRatings[itemId] && <span style={{ marginLeft: '10px', color: '#26a541', fontWeight: 'bold', alignSelf: 'center' }}>✓ Saved</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                        
                        {/* Delivery Address */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid #e0e0e0', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '15px', fontWeight: '500', color: '#212121', marginBottom: '15px' }}>Delivery details</div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '16px' }}>📍</span>
                                <div>
                                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#212121', marginBottom: '4px', wordBreak: 'break-word' }}>{addressData.name}</div>
                                    <div style={{ fontSize: '13px', color: '#212121', lineHeight: '1.5', wordBreak: 'break-word' }}>{addressData.address}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '16px' }}>📞</span>
                                <div style={{ fontSize: '13px', color: '#212121', wordBreak: 'break-word' }}>{addressData.phone}</div>
                            </div>
                        </div>

                        {/* Price Details */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid #e0e0e0', width: '100%', boxSizing: 'border-box' }}>
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

                            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '4px', fontSize: '13px', color: '#212121', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        // 🔥 Make Modal width 100% on mobile so it doesn't push horizontally
        <Modal isOpen={isOpen} onClose={onClose} title={selectedOrder ? "Order Details" : ""} width={isMobile ? "100%" : (selectedOrder ? "1000px" : "800px")}>
            {selectedOrder ? renderDetailView() : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px', borderBottom: '1px solid #eee', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                        <button onClick={fetchOrders} style={{ background: '#f8f9fa', color: '#333', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '6px', cursor:'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'auto' }}>
                            🔄 Refresh Status
                        </button>
                    </div>
                    <div style={{ maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden', background: '#f1f3f6', margin: isMobile ? '0' : '0 -20px -20px -20px', padding: isMobile ? '0' : '10px 20px', borderRadius: '0 0 8px 8px', width: '100%', boxSizing: 'border-box' }}>
                        {renderListView()}
                    </div>
                </>
            )}
        </Modal>
    );
};

export default BuyerOrdersModal;