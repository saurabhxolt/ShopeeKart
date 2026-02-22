import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { parseImages } from '../../utils/imageHelpers';

const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const CheckoutModal = ({ isOpen, onClose, cartItems = [], cartTotal, onConfirmOrder }) => {
    const [formData, setFormData] = useState({
        fullName: '', phone: '', addressLine: '', pincode: '', city: '', district: '', state: ''
    });
    
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isFetchingPin, setIsFetchingPin] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [error, setError] = useState('');

    // 🔥 NEW: States to handle ratings in the checkout modal
    const [ratings, setRatings] = useState({});
    const [hoveredStar, setHoveredStar] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData({ fullName: '', phone: '', addressLine: '', pincode: '', city: '', district: '', state: '' });
            setPaymentMethod('COD'); 
            setOrderId(null);
            setError('');
            setIsPlacingOrder(false);
            setIsFetchingPin(false);
            
            // 🔥 NEW: Initialize all cart items to a default 5-star rating
            const initRatings = {};
            cartItems.forEach(item => initRatings[item.id] = 5);
            setRatings(initRatings);
        }
    }, [isOpen, cartItems]);

    if (!isOpen) return null;

    const fetchPincodeDetails = async (pin) => {
        setIsFetchingPin(true);
        setError('');
        try {
            const res = await axios.get(`https://api.postalpincode.in/pincode/${pin}`);
            const data = res.data[0];

            if (data.Status === "Success" && data.PostOffice && data.PostOffice.length > 0) {
                const location = data.PostOffice[0];
                setFormData(prev => ({
                    ...prev,
                    city: location.Block || location.Region || '', 
                    district: location.District || '',
                    state: location.State || ''
                }));
            } else {
                setError("Invalid PIN Code. Please enter manually or try again.");
            }
        } catch (err) {
            console.error("Error fetching PIN details", err);
        } finally {
            setIsFetchingPin(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            const numericValue = value.replace(/\D/g, '').slice(0, 10);
            setFormData({ ...formData, phone: numericValue });
            return;
        }

        if (name === 'pincode') {
            const numericValue = value.replace(/\D/g, '').slice(0, 6);
            setFormData({ ...formData, pincode: numericValue });
            if (numericValue.length === 6) fetchPincodeDetails(numericValue);
            return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        if (!formData.fullName || !formData.phone || !formData.addressLine || !formData.pincode || !formData.city || !formData.state) {
            return setError("Please fill in all required address fields.");
        }

        if (formData.phone.length !== 10) {
            return setError("Please enter a valid 10-digit mobile number.");
        }
        
        setError('');
        setIsPlacingOrder(true);
        
        const formattedAddress = `${formData.fullName} | Ph: +91 ${formData.phone}\n${formData.addressLine}\n${formData.city}, Dist: ${formData.district}, ${formData.state} - ${formData.pincode}\nPayment: ${paymentMethod}`;

        try {
            // 🔥 NEW: Pass BOTH the address AND the ratings object back to App.js
            const newOrderId = await onConfirmOrder(formattedAddress, ratings);
            setOrderId(newOrderId); 
        } catch (err) {
            setError(err.message || "Failed to place order. Please try again.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease' }}>
                
                {!orderId && (
                    <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#555', zIndex: 10 }}>&times;</button>
                )}

                {/* --- SUCCESS STATE --- */}
                {orderId ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                        <div style={{ fontSize: '70px', marginBottom: '15px', animation: 'bounce 0.5s ease' }}>🎉</div>
                        <h1 style={{ color: '#28a745', margin: '0 0 10px 0' }}>Order Confirmed!</h1>
                        <p style={{ color: '#555', fontSize: '15px', marginBottom: '5px' }}>Your order has been successfully placed.</p>
                        <p style={{ color: '#888', fontSize: '13px', marginBottom: '25px' }}>Your ratings have been saved.</p>
                        
                        <div style={{ background: '#f8f9fa', border: '2px dashed #28a745', padding: '20px', borderRadius: '8px', display: 'inline-block', marginBottom: '15px', minWidth: '250px' }}>
                            <span style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Tracking ID</span>
                            <strong style={{ fontSize: '28px', color: '#333' }}>#{orderId}</strong>
                        </div>

                        <div style={{ background: '#e8f5e9', color: '#155724', padding: '12px', borderRadius: '8px', display: 'inline-block', marginBottom: '30px', border: '1px solid #c3e6cb' }}>
                            <span style={{ fontSize: '16px' }}>📦</span> <strong>Estimated Delivery:</strong>{' '}
                            {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={onClose} style={{ padding: '12px 25px', border: '1px solid #007bff', background: 'white', color: '#007bff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>
                                Continue Shopping
                            </button>
                            <button onClick={() => { onClose(); alert("Opening My Orders..."); }} style={{ padding: '12px 25px', border: 'none', background: '#007bff', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)' }}>
                                Track My Order
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        
                        {/* LEFT COLUMN: FORM */}
                        <div style={{ flex: '1 1 500px', padding: '40px' }}>
                            <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                🔒 Secure Checkout
                            </h2>
                            
                            {error && (
                                <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', border: '1px solid #f5c6cb' }}>
                                    {error}
                                </div>
                            )}

                            <h4 style={{ color: '#555', marginBottom: '15px' }}>1. Shipping Address</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                    <label style={labelStyle}>Full Name *</label>
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} style={inputStyle} placeholder="John Doe" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Mobile Number *</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={{...inputStyle, borderColor: formData.phone && formData.phone.length < 10 ? '#ffc107' : '#ccc'}} placeholder="10-digit number" />
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Street Address *</label>
                                <input type="text" name="addressLine" value={formData.addressLine} onChange={handleInputChange} style={inputStyle} placeholder="House/Flat No., Building Name, Street" />
                            </div>

                            <div style={{ marginBottom: '15px', position: 'relative' }}>
                                <label style={labelStyle}>PIN Code *</label>
                                <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} style={{...inputStyle, width: '50%'}} placeholder="560001" />
                                {isFetchingPin && <span style={{ position: 'absolute', left: '53%', top: '38px', fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>⏳ Fetching location...</span>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '15px', marginBottom: '30px' }}>
                                <div>
                                    <label style={labelStyle}>City/Block *</label>
                                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} style={inputStyle} placeholder="Bengaluru" />
                                </div>
                                <div>
                                    <label style={labelStyle}>District</label>
                                    <input type="text" name="district" value={formData.district} onChange={handleInputChange} style={inputStyle} placeholder="Bengaluru Urban" />
                                </div>
                                <div>
                                    <label style={labelStyle}>State *</label>
                                    <select name="state" value={formData.state} onChange={handleInputChange} style={{...inputStyle, cursor: 'pointer', backgroundColor: 'white', padding: '11px'}}>
                                        <option value="" disabled>Select State</option>
                                        {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                                    </select>
                                </div>
                            </div>

                            <h4 style={{ color: '#555', marginBottom: '15px', borderTop: '1px solid #eee', paddingTop: '20px' }}>2. Payment Method</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ border: `1px solid ${paymentMethod === 'COD' ? '#28a745' : '#ccc'}`, borderRadius: '8px', padding: '15px', background: paymentMethod === 'COD' ? '#f8fff9' : '#fff', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ accentColor: '#28a745', width: '18px', height: '18px', cursor: 'pointer' }} />
                                    <div>
                                        <strong style={{ display: 'block', color: '#333' }}>Cash on Delivery (COD)</strong>
                                        <span style={{ fontSize: '12px', color: '#666' }}>Pay securely in cash when your order arrives.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: ORDER SUMMARY & RATING */}
                        <div style={{ flex: '1 1 350px', background: '#f8f9fa', padding: '40px', borderLeft: '1px solid #eee' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#333' }}>Order Summary & Review</h3>
                            
                            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px', marginBottom: '20px' }}>
                                {cartItems.map((item, idx) => (
                                    <div key={idx} style={{ background: 'white', borderRadius: '8px', padding: '15px', marginBottom: '15px', border: '1px solid #e9ecef', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                            <div style={{ width: '50px', height: '50px', background: '#eee', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden' }}>
                                                <img src={parseImages(item.imageUrl)[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{item.name}</div>
                                                <div style={{ fontSize: '12px', color: '#888' }}>Qty: {item.qty} | ₹{item.price * item.qty}</div>
                                            </div>
                                        </div>
                                        
                                        {/* 🔥 THE NEW RATING UI */}
                                        <div style={{ borderTop: '1px dashed #eee', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Rate Item:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <span 
                                                        key={star}
                                                        onMouseEnter={() => setHoveredStar({...hoveredStar, [item.id]: star})}
                                                        onMouseLeave={() => setHoveredStar({...hoveredStar, [item.id]: 0})}
                                                        onClick={() => setRatings({...ratings, [item.id]: star})}
                                                        style={{ 
                                                            fontSize: '20px', cursor: 'pointer', lineHeight: '1', transition: 'color 0.2s',
                                                            color: star <= (hoveredStar[item.id] || ratings[item.id]) ? '#ff9f00' : '#e0e0e0' 
                                                        }}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '15px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555', fontSize: '15px' }}>
                                    <span>Subtotal</span><span>Rs. {cartTotal}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '15px' }}>
                                    <span>Shipping</span><span style={{ color: '#28a745', fontWeight: 'bold' }}>FREE</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Total</span>
                                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>Rs. {cartTotal}</span>
                            </div>

                            <button 
                                onClick={handleSubmit} 
                                disabled={isPlacingOrder}
                                style={{ width: '100%', padding: '16px', border: 'none', background: isPlacingOrder ? '#6c757d' : '#28a745', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: isPlacingOrder ? 'wait' : 'pointer', fontSize: '18px', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(40, 167, 69, 0.2)' }}
                            >
                                {isPlacingOrder ? 'Processing Order...' : `Pay Rs. ${cartTotal}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' };

export default CheckoutModal;