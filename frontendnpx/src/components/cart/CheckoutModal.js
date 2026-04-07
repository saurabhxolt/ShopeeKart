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

const getFirstImage = (imageProp) => {
    if (!imageProp) return 'https://via.placeholder.com/50';
    if (Array.isArray(imageProp) && imageProp.length > 0) return imageProp[0];
    if (typeof imageProp === 'string') {
        if (imageProp.startsWith('[')) {
            try {
                const parsed = JSON.parse(imageProp);
                return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 'https://via.placeholder.com/50';
            } catch(e) { return imageProp; }
        }
        return imageProp;
    }
    return 'https://via.placeholder.com/50';
};

// 🔥 Added onUpdateQty to props
const CheckoutModal = ({ isOpen, onClose, cartItems = [], cartTotal, onConfirmOrder, userId, onViewOrders, onUpdateQty }) => {
    
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('NEW');
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

    const [formData, setFormData] = useState({ fullName: '', phone: '', addressLine: '', pincode: '', city: '', district: '', state: '' });
    
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isFetchingPin, setIsFetchingPin] = useState(false);
    
    const [orderId, setOrderId] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const [error, setError] = useState('');
    
    // 🔥 NEW STATE: Holds the conflict data from the backend
    const [stockConflict, setStockConflict] = useState(null);

    const [ratings, setRatings] = useState({});
    const [hoveredStar, setHoveredStar] = useState({});

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const paymentOptions = [
        { id: 'UPI', label: 'UPI / QR', desc: 'Google Pay, PhonePe, Paytm' },
        { id: 'CARD', label: 'Credit / Debit / ATM Card', desc: 'All major cards supported' },
        { id: 'COD', label: 'Cash on Delivery (COD)', desc: 'Pay securely in cash when your order arrives.' }
    ];

    useEffect(() => {
        if (isOpen) {
            setFormData({ fullName: '', phone: '', addressLine: '', pincode: '', city: '', district: '', state: '' });
            setPaymentMethod('COD'); 
            setOrderId(null);
            setTransactionId(null); 
            setError('');
            setStockConflict(null); // Reset conflict on open
            setIsPlacingOrder(false);
            setIsFetchingPin(false);
            setSelectedAddressId('NEW');
            
            const initRatings = {};
            cartItems.forEach(item => initRatings[item.id || item.ProductId] = 0);
            setRatings(initRatings);

            if (userId) fetchAddresses();
        }
    }, [isOpen, cartItems, userId]);

    const fetchAddresses = async () => {
        setIsLoadingAddresses(true);
        try {
            const res = await axios.get(`http://localhost:7071/api/GetAddresses?userId=${userId}`);
            setSavedAddresses(res.data);
            if (res.data.length > 0) {
                setSelectedAddressId(res.data[0].AddressId);
            }
        } catch (err) {} finally {
            setIsLoadingAddresses(false);
        }
    };

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
                    ...prev, city: location.Block || location.Region || '', district: location.District || '', state: location.State || ''
                }));
            } else {
                setError("Invalid PIN Code. Please enter manually.");
            }
        } catch (err) {} finally {
            setIsFetchingPin(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            setFormData({ ...formData, phone: value.replace(/\D/g, '').slice(0, 10) });
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
        let formattedAddress = "";

        if (selectedAddressId === 'NEW') {
            if (!formData.fullName || !formData.phone || !formData.addressLine || !formData.pincode || !formData.city || !formData.state) return setError("Please fill in all required address fields.");
            if (formData.phone.length !== 10) return setError("Please enter a valid 10-digit mobile number.");
            formattedAddress = `${formData.fullName} | Ph: +91 ${formData.phone}\n${formData.addressLine}\n${formData.city}, Dist: ${formData.district}, ${formData.state} - ${formData.pincode}\nPayment: ${paymentMethod}`;
            
            try {
                await axios.post('http://localhost:7071/api/SaveAddress', {
                    userId, fullName: formData.fullName, phone: formData.phone, addressLine: formData.addressLine, city: formData.city, state: formData.state, pincode: formData.pincode, district: formData.district || ''
                });
            } catch(e) {}
        } else {
            const addr = savedAddresses.find(a => String(a.AddressId) === String(selectedAddressId));
            if (!addr) return setError("Please select a valid address.");
            formattedAddress = `${addr.FullName} | Ph: +91 ${addr.Phone}\n${addr.AddressLine}\n${addr.City}, Dist: ${addr.District}, ${addr.State} - ${addr.Pincode}\nPayment: ${paymentMethod}`;
        }
        
        setError('');
        setStockConflict(null);
        setIsPlacingOrder(true);

        try {
            const response = await onConfirmOrder(formattedAddress, ratings, paymentMethod);
            if (response && response.orderId) {
                setOrderId(response.orderId);
                setTransactionId(response.transactionId);
            } else {
                setOrderId(response);
            }
        } catch (err) {
            // 🔥 Catch the specific JSON object sent by our backend pre-flight check
            if (err && err.code === 'INSUFFICIENT_STOCK') {
                setStockConflict(err);
            } else {
                setError(err.message || "Failed to place order. Please try again.");
            }
        } finally {
            setIsPlacingOrder(false);
        }
    };

    // 🔥 UPGRADED: Handles both updating qty AND kicking the user back if stock is 0
    const handleAcceptAvailableStock = async () => {
        if (onUpdateQty && stockConflict) {
            // 1. Tell the App to update the cart (which will remove it if qty is 0)
            await onUpdateQty(stockConflict.itemId, stockConflict.availableQty, stockConflict.variationId);
            
            // 2. Decide where the user goes next
            if (stockConflict.availableQty === 0) {
                // If it's completely out of stock, clear the conflict and close the modal
                // This drops them exactly where they were (the product page)
                setStockConflict(null);
                onClose(); 
            } else {
                // If there's still 1 or 2 left, just clear the warning so they can click "Pay"
                setStockConflict(null); 
            }
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 1300, padding: isMobile ? '0' : '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: isMobile ? '16px 16px 0 0' : '12px', width: '100%', maxWidth: '1000px', maxHeight: isMobile ? '95vh' : '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}>
                
                {!orderId && (
                    <div style={{ background: 'white', padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>🔒 Secure Checkout</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#555', padding: '0 5px' }}>&times;</button>
                    </div>
                )}

                {orderId ? (
                    <div style={{ textAlign: 'center', padding: isMobile ? '30px 15px' : '50px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ fontSize: '70px', marginBottom: '15px', animation: 'bounce 0.5s ease' }}>🎉</div>
                        <h1 style={{ color: '#28a745', margin: '0 0 10px 0', fontSize: isMobile ? '24px' : '32px' }}>Order Confirmed!</h1>
                        <p style={{ color: '#555', fontSize: '15px', marginBottom: '25px' }}>Your order has been successfully placed.</p>
                        
                        <div style={{ background: '#f8f9fa', border: '2px dashed #28a745', padding: '20px', borderRadius: '8px', display: 'inline-block', marginBottom: '15px', minWidth: '280px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
                            <span style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Order ID</span>
                            <strong style={{ fontSize: '28px', color: '#333', display: 'block', marginBottom: transactionId ? '10px' : '0' }}>#{orderId}</strong>
                            
                            {transactionId && (
                                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '10px', marginTop: '10px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Transaction ID</span>
                                    <strong style={{ fontSize: '16px', color: '#007bff' }}>{transactionId}</strong>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto', marginTop: '20px' }}>
                            <button onClick={onClose} style={{ padding: '12px 25px', border: '1px solid #007bff', background: 'white', color: '#007bff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s', width: isMobile ? '100%' : 'auto' }}>
                                Continue Shopping
                            </button>
                            <button onClick={() => onViewOrders && onViewOrders()} style={{ padding: '12px 25px', border: 'none', background: '#007bff', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)', width: isMobile ? '100%' : 'auto' }}>
                                Track My Order
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflowX: 'hidden' }}>
                            
                            {/* LEFT COLUMN */}
                            <div style={{ flex: '1 1 100%', padding: isMobile ? '20px' : '40px', boxSizing: 'border-box' }}>
                                
                                {/* 🔥 NEW: Dynamic Stock Conflict UI */}
                                {stockConflict && (
                                    <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
                                        <div style={{ color: '#856404', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            ⚠️ Inventory Update
                                        </div>
                                        <div style={{ color: '#856404', fontSize: '14px', marginBottom: '15px', lineHeight: '1.5' }}>
                                            Someone just bought some of the items in your cart. We currently only have <strong>{stockConflict.availableQty} unit(s)</strong> of <strong>{stockConflict.name}</strong> left, but you requested {stockConflict.requestedQty}.
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
                                            {stockConflict.availableQty > 0 ? (
                                                <button onClick={handleAcceptAvailableStock} style={{ flex: 1, padding: '10px', background: '#ffc107', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: '#212529', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                    Update to remaining {stockConflict.availableQty}
                                                </button>
                                            ) : (
                                                <button onClick={handleAcceptAvailableStock} style={{ flex: 1, padding: '10px', background: '#dc3545', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                    Remove & Go Back
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', border: '1px solid #f5c6cb' }}>
                                        {error}
                                    </div>
                                )}

                                <h4 style={{ color: '#555', marginBottom: '15px', marginTop: 0 }}>1. Shipping Address</h4>
                                
                                {isLoadingAddresses ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading saved addresses...</div>
                                ) : (
                                    <div style={{ marginBottom: '20px' }}>
                                        <select 
                                            value={selectedAddressId}
                                            onChange={(e) => setSelectedAddressId(e.target.value)}
                                            style={{ ...inputStyle, marginBottom: '15px', background: '#f8f9fa', cursor: 'pointer', fontWeight: '500', color: '#333' }}
                                        >
                                            {savedAddresses.map(addr => (
                                                <option key={addr.AddressId} value={addr.AddressId}>
                                                    {addr.FullName} — {addr.City}, {addr.State} ({addr.Pincode})
                                                </option>
                                            ))}
                                            <option value="NEW">+ Add a New Address</option>
                                        </select>

                                        {selectedAddressId !== 'NEW' && savedAddresses.length > 0 && (
                                            <div style={{ padding: '15px', background: '#f0f5ff', border: '1px solid #2874f0', borderRadius: '6px', transition: 'all 0.2s ease' }}>
                                                {(() => {
                                                    const addr = savedAddresses.find(a => String(a.AddressId) === String(selectedAddressId));
                                                    if(!addr) return null;
                                                    return (
                                                        <>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>{addr.FullName}</span>
                                                                <span style={{ background: '#e0e0e0', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>HOME</span>
                                                            </div>
                                                            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                                                                {addr.AddressLine}, {addr.City}, {addr.State} - <strong>{addr.Pincode}</strong><br/>
                                                                Mobile: <strong>{addr.Phone}</strong>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedAddressId === 'NEW' && (
                                    <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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
                                            {isFetchingPin && <span style={{ position: 'absolute', left: '53%', top: '38px', fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>⏳ Fetching...</span>}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.2fr', gap: '15px', marginBottom: isMobile ? '10px' : '30px' }}>
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
                                    </div>
                                )}

                                <h4 style={{ color: '#555', marginBottom: '15px', borderTop: '1px solid #eee', paddingTop: '20px' }}>2. Payment Method</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {paymentOptions.map(opt => (
                                        <label key={opt.id} style={{ border: `1px solid ${paymentMethod === opt.id ? '#28a745' : '#ccc'}`, borderRadius: '8px', padding: '15px', background: paymentMethod === opt.id ? '#f8fff9' : '#fff', display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            <input type="radio" name="payment" value={opt.id} checked={paymentMethod === opt.id} onChange={(e) => setPaymentMethod(e.target.value)} style={{ accentColor: '#28a745', width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                                            <div>
                                                <strong style={{ display: 'block', color: '#333' }}>{opt.label}</strong>
                                                <span style={{ fontSize: '12px', color: '#666' }}>{opt.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: SUMMARY */}
                            <div style={{ width: isMobile ? '100%' : '400px', background: '#f8f9fa', padding: isMobile ? '20px' : '40px', borderLeft: isMobile ? 'none' : '1px solid #eee', borderTop: isMobile ? '1px solid #eee' : 'none', boxSizing: 'border-box' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Order Summary</h3>
                                
                                <div style={{ paddingRight: isMobile ? '0' : '10px', marginBottom: '20px' }}>
                                    {cartItems.map((item, idx) => {
                                        const itemId = item.id || item.ProductId; 
                                        
                                        return (
                                        <div key={idx} style={{ background: 'white', borderRadius: '8px', padding: '15px', marginBottom: '15px', border: '1px solid #e9ecef', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                                <div style={{ width: '50px', height: '50px', background: '#eee', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden', flexShrink: 0 }}>
                                                    <img src={getFirstImage(item.imageUrl || item.ImageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                                    {item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0 && (
                                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontStyle: 'italic' }}>
                                                            {Object.entries(item.selectedAttributes).map(([key, val]) => `${key}: ${val}`).join(' | ')}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '12px', color: '#888' }}>Qty: {item.qty} | ₹{item.price * item.qty}</div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ borderTop: '1px dashed #eee', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                                    Rate Item:
                                                    {(!ratings[itemId] || ratings[itemId] === 0) && (
                                                        <span style={{ color: '#fb641b', fontSize: '11px', marginLeft: '6px', background: '#fff5ec', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fbdcce' }}>
                                                            ✨ Tap to rate
                                                        </span>
                                                    )}
                                                    {ratings[itemId] > 0 && (
                                                        <span style={{ color: '#28a745', fontSize: '11px', marginLeft: '6px' }}>✓ Rated</span>
                                                    )}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <span 
                                                            key={star}
                                                            onMouseEnter={() => setHoveredStar({...hoveredStar, [itemId]: star})}
                                                            onMouseLeave={() => setHoveredStar({...hoveredStar, [itemId]: 0})}
                                                            onClick={() => setRatings({...ratings, [itemId]: star})}
                                                            style={{ 
                                                                fontSize: '20px', cursor: 'pointer', lineHeight: '1', transition: 'color 0.2s',
                                                                color: star <= (hoveredStar[itemId] || ratings[itemId]) ? '#ff9f00' : '#e0e0e0' 
                                                            }}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>

                                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '15px', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555', fontSize: '15px' }}>
                                        <span>Subtotal</span><span>Rs. {cartTotal}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '15px' }}>
                                        <span>Shipping</span><span style={{ color: '#28a745', fontWeight: 'bold' }}>FREE</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '10px' : '30px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Total</span>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>Rs. {cartTotal}</span>
                                </div>

                                {!isMobile && (
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={isPlacingOrder || stockConflict}
                                        style={{ width: '100%', padding: '16px', border: 'none', background: isPlacingOrder ? '#6c757d' : (stockConflict ? '#e0e0e0' : '#fb641b'), color: stockConflict ? '#888' : 'white', borderRadius: '8px', fontWeight: 'bold', cursor: isPlacingOrder || stockConflict ? 'not-allowed' : 'pointer', fontSize: '18px', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                                    >
                                        {isPlacingOrder ? 'Processing Order...' : `Pay Rs. ${cartTotal}`}
                                    </button>
                                )}
                            </div>
                        </div>

                        {isMobile && (
                            <div style={{ flexShrink: 0, padding: '15px', background: 'white', borderTop: '1px solid #e0e0e0', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
                                <button 
                                    onClick={handleSubmit} 
                                    disabled={isPlacingOrder || stockConflict}
                                    style={{ width: '100%', padding: '16px', border: 'none', background: isPlacingOrder ? '#6c757d' : (stockConflict ? '#e0e0e0' : '#fb641b'), color: stockConflict ? '#888' : 'white', borderRadius: '8px', fontWeight: 'bold', cursor: isPlacingOrder || stockConflict ? 'not-allowed' : 'pointer', fontSize: '18px', transition: 'background 0.2s' }}
                                >
                                    {isPlacingOrder ? 'Processing...' : `Pay Rs. ${cartTotal}`}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' };

export default CheckoutModal;