import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../common/Modal';

const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Helper to safely parse images without needing external imports
const getImages = (imageStr) => {
    if (!imageStr) return [];
    try {
        const parsed = JSON.parse(imageStr);
        return Array.isArray(parsed) ? parsed : [imageStr];
    } catch (e) { return [imageStr]; }
};

const BuyerAccountModal = ({ isOpen, onClose, activeTab, setActiveTab, user, onUpdateUser, onVisitShop }) => {
    
    // Profile States
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Address States
    const [addresses, setAddresses] = useState([]); 
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [isFetchingPin, setIsFetchingPin] = useState(false);
    const [addressError, setAddressError] = useState('');
    const [newAddress, setNewAddress] = useState({ 
        fullName: '', phone: '', pincode: '', addressLine: '', city: '', district: '', state: '' 
    });

    // Wishlist States
    const [wishlistItems, setWishlistItems] = useState([]);
    const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);

    const fetchAddresses = useCallback(async () => {
        if (!user?.userId) return;
        try {
            const res = await axios.get(`http://localhost:7071/api/GetAddresses?userId=${user.userId}`);
            setAddresses(res.data);
        } catch (err) {
            console.error("Failed to fetch addresses", err);
        }
    }, [user]);

    // Enhanced Fetch Wishlist with absolute URL and error logging
    const fetchWishlist = useCallback(async () => {
        if (!user || !user.userId) {
            console.log("Wishlist fetch blocked: No User ID found");
            return;
        }
        
        setIsLoadingWishlist(true);
        try {
            // Using a timestamp to bypass any browser caching
            const res = await axios.get(`http://localhost:7071/api/GetWishlist?userId=${user.userId}&t=${Date.now()}`);
            console.log("Wishlist data received:", res.data);
            setWishlistItems(res.data);
        } catch (err) {
            console.error("Wishlist API Error:", err.response?.data || err.message);
        } finally {
            setIsLoadingWishlist(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && isOpen) {
            setFormData({ name: user.name || '', phone: user.phone || '' });
            setIsEditing(false);
            fetchAddresses();
            fetchWishlist(); 
        }
    }, [user, isOpen, fetchAddresses, fetchWishlist]);

    if (!isOpen) return null;

    // --- PROFILE LOGIC ---
    const handleSaveProfile = async () => {
        if (!formData.name.trim()) return alert("Name cannot be empty");
        setIsSaving(true);
        try {
            await axios.post('http://localhost:7071/api/UpdateProfile', { userId: user.userId, fullName: formData.name, phone: formData.phone });
            onUpdateUser({ ...user, name: formData.name, phone: formData.phone });
            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (err) { alert("Failed to update profile."); } finally { setIsSaving(false); }
    };

    // --- ADDRESS LOGIC ---
    const fetchPincodeDetails = async (pin) => {
        setIsFetchingPin(true);
        setAddressError('');
        try {
            const res = await axios.get(`https://api.postalpincode.in/pincode/${pin}`);
            const data = res.data[0];
            if (data.Status === "Success" && data.PostOffice && data.PostOffice.length > 0) {
                const location = data.PostOffice[0];
                setNewAddress(prev => ({ ...prev, city: location.Block || location.Region || '', district: location.District || '', state: location.State || '' }));
            } else {
                setAddressError("Invalid PIN Code. Please enter manually.");
            }
        } catch (err) { console.error(err); } finally { setIsFetchingPin(false); }
    };

    const handleAddressInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') return setNewAddress({ ...newAddress, phone: value.replace(/\D/g, '').slice(0, 10) });
        if (name === 'pincode') {
            const num = value.replace(/\D/g, '').slice(0, 6);
            setNewAddress({ ...newAddress, pincode: num });
            if (num.length === 6) fetchPincodeDetails(num);
            return;
        }
        setNewAddress({ ...newAddress, [name]: value });
    };

    const handleEditAddressClick = (addr) => {
        setNewAddress({
            fullName: addr.FullName, phone: addr.Phone, pincode: addr.Pincode,
            addressLine: addr.AddressLine, city: addr.City, district: addr.District || '', state: addr.State
        });
        setEditingAddressId(addr.AddressId);
        setIsAddingAddress(true);
    };

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm("Are you sure you want to delete this address?")) return;
        try {
            await axios.post('http://localhost:7071/api/DeleteAddress', { userId: user.userId, addressId });
            fetchAddresses();
        } catch (err) {
            alert("Failed to delete address.");
        }
    };

    const handleSaveAddress = async () => {
        if (!newAddress.fullName || !newAddress.phone || !newAddress.addressLine || !newAddress.pincode || !newAddress.city || !newAddress.state) {
            return setAddressError("Please fill in all required fields.");
        }

        try {
            const endpoint = editingAddressId ? 'UpdateAddress' : 'SaveAddress';
            const payload = { userId: user.userId, ...newAddress };
            if (editingAddressId) payload.addressId = editingAddressId;

            await axios.post(`http://localhost:7071/api/${endpoint}`, payload);
            
            setIsAddingAddress(false);
            setEditingAddressId(null);
            setNewAddress({ fullName: '', phone: '', pincode: '', addressLine: '', city: '', district: '', state: '' });
            fetchAddresses();
        } catch (err) {
            setAddressError("Failed to save address.");
        }
    };

    const handleCancelAddressForm = () => {
        setIsAddingAddress(false);
        setEditingAddressId(null);
        setNewAddress({ fullName: '', phone: '', pincode: '', addressLine: '', city: '', district: '', state: '' });
    };

    // --- WISHLIST LOGIC ---
    const handleRemoveFromWishlist = async (productId) => {
        try {
            setWishlistItems(prev => prev.filter(item => item.id !== productId)); // Optimistic UI update
            await axios.post('http://localhost:7071/api/ToggleWishlist', {
                userId: user.userId,
                productId: productId
            });
        } catch (err) {
            alert("Failed to remove from wishlist");
            fetchWishlist(); // Re-fetch on fail to fix UI
        }
    };

    // --- UI TABS ---
    const tabs = [
        { id: 'profile', icon: '👤', label: 'My Profile' },
        { id: 'coupons', icon: '🎫', label: 'Coupons' },
        { id: 'wallet', icon: '💳', label: 'Saved Cards & Wallet' },
        { id: 'addresses', icon: '📍', label: 'Saved Addresses' },
        { id: 'wishlist', icon: '❤️', label: 'Wishlist' },
        { id: 'notifications', icon: '🔔', label: 'Notifications' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" width="950px">
            <div style={{ display: 'flex', minHeight: '70vh', margin: '-20px', background: '#f1f3f6' }}>
                
                {/* LEFT SIDEBAR NAVIGATION */}
                <div style={{ width: '280px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#2874f0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#878787' }}>Hello,</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#212121', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{user?.name}</div>
                        </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        {tabs.map(tab => (
                            <div 
                                key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{ 
                                    padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
                                    background: activeTab === tab.id ? '#f0f5ff' : 'transparent',
                                    color: activeTab === tab.id ? '#2874f0' : '#878787',
                                    fontWeight: activeTab === tab.id ? 'bold' : '500', borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '18px', color: activeTab === tab.id ? '#2874f0' : '#2874f0' }}>{tab.icon}</span>
                                {tab.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT CONTENT AREA */}
                <div style={{ flex: 1, padding: '15px 15px 15px 0' }}>
                    
                    {/* 1. PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0', marginBottom: '25px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#212121', fontWeight: '500' }}>Personal Information</h2>
                                {!isEditing && <span onClick={() => setIsEditing(true)} style={{ color: '#2874f0', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}>Edit</span>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div><label style={checkoutLabelStyle}>Full Name</label><input type="text" value={isEditing ? formData.name : user?.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} readOnly={!isEditing} style={{ ...checkoutInputStyle, background: isEditing ? 'white' : '#fafafa', border: isEditing ? '1px solid #2874f0' : '1px solid #e0e0e0', cursor: isEditing ? 'text' : 'not-allowed' }} /></div>
                                <div><label style={checkoutLabelStyle}>Email Address (Cannot be changed)</label><input type="text" value={user?.email || ''} readOnly style={{...checkoutInputStyle, background: '#fafafa', cursor: 'not-allowed'}} /></div>
                                <div><label style={checkoutLabelStyle}>Mobile Number</label><input type="tel" placeholder="Add phone number" value={isEditing ? formData.phone : user?.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} readOnly={!isEditing} style={{ ...checkoutInputStyle, background: isEditing ? 'white' : '#fafafa', border: isEditing ? '1px solid #2874f0' : '1px solid #e0e0e0', cursor: isEditing ? 'text' : 'not-allowed' }} /></div>
                                <div><label style={checkoutLabelStyle}>Account Type</label><input type="text" value={user?.role || 'BUYER'} readOnly style={{...checkoutInputStyle, background: '#fafafa', cursor: 'not-allowed'}} /></div>
                            </div>
                            {isEditing && (
                                <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                                    <button onClick={handleSaveProfile} disabled={isSaving} style={{ padding: '12px 30px', background: '#2874f0', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'wait' : 'pointer', fontSize: '14px' }}>{isSaving ? 'Saving...' : 'SAVE CHANGES'}</button>
                                    <button onClick={() => { setIsEditing(false); setFormData({ name: user.name, phone: user.phone || '' }); }} style={{ padding: '12px 30px', background: 'white', color: '#2874f0', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>CANCEL</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. SAVED ADDRESSES TAB */}
                    {activeTab === 'addresses' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#212121', fontWeight: '500' }}>Manage Addresses</h2>
                                {!isAddingAddress && (
                                    <button onClick={() => { handleCancelAddressForm(); setIsAddingAddress(true); }} style={{ padding: '10px 15px', background: 'white', color: '#2874f0', border: '1px solid #e0e0e0', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>+</span> ADD A NEW ADDRESS
                                    </button>
                                )}
                            </div>

                            {isAddingAddress ? (
                                <div style={{ background: '#f5faff', padding: '30px', borderRadius: '4px', border: '1px solid #d6e4ff' }}>
                                    <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#2874f0', textTransform: 'uppercase', fontWeight: 'bold' }}>{editingAddressId ? 'Edit Address' : 'Add a new address'}</h3>
                                    
                                    {addressError && <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', border: '1px solid #f5c6cb' }}>{addressError}</div>}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div><label style={checkoutLabelStyle}>Full Name *</label><input type="text" name="fullName" value={newAddress.fullName} onChange={handleAddressInputChange} style={checkoutInputStyle} placeholder="John Doe" /></div>
                                        <div><label style={checkoutLabelStyle}>Mobile Number *</label><input type="tel" name="phone" value={newAddress.phone} onChange={handleAddressInputChange} style={{...checkoutInputStyle, borderColor: newAddress.phone && newAddress.phone.length < 10 ? '#ffc107' : '#ccc'}} placeholder="10-digit number" /></div>
                                    </div>
                                    
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={checkoutLabelStyle}>Street Address *</label>
                                        <input type="text" name="addressLine" value={newAddress.addressLine} onChange={handleAddressInputChange} style={checkoutInputStyle} placeholder="House/Flat No., Building Name, Street" />
                                    </div>

                                    <div style={{ marginBottom: '15px', position: 'relative' }}>
                                        <label style={checkoutLabelStyle}>PIN Code *</label>
                                        <input type="text" name="pincode" value={newAddress.pincode} onChange={handleAddressInputChange} style={{...checkoutInputStyle, width: '50%'}} placeholder="560001" />
                                        {isFetchingPin && <span style={{ position: 'absolute', left: '53%', top: '38px', fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>⏳ Fetching location...</span>}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '15px', marginBottom: '30px' }}>
                                        <div><label style={checkoutLabelStyle}>City/Block *</label><input type="text" name="city" value={newAddress.city} onChange={handleAddressInputChange} style={checkoutInputStyle} placeholder="Bengaluru" /></div>
                                        <div><label style={checkoutLabelStyle}>District</label><input type="text" name="district" value={newAddress.district} onChange={handleAddressInputChange} style={checkoutInputStyle} placeholder="Bengaluru Urban" /></div>
                                        <div>
                                            <label style={checkoutLabelStyle}>State *</label>
                                            <select name="state" value={newAddress.state} onChange={handleAddressInputChange} style={{...checkoutInputStyle, cursor: 'pointer', backgroundColor: 'white', padding: '11px'}}>
                                                <option value="" disabled>Select State</option>
                                                {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button onClick={handleSaveAddress} style={{ padding: '12px 40px', background: '#2874f0', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>SAVE</button>
                                        <button onClick={handleCancelAddressForm} style={{ padding: '12px 40px', background: 'transparent', color: '#2874f0', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>CANCEL</button>
                                    </div>
                                </div>
                            ) : addresses.length === 0 ? (
                                <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', padding: '60px 20px', textAlign: 'center', background: '#fff' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '10px', color: '#e91e63' }}>📍</div>
                                    <h3 style={{ margin: '0 0 8px 0', color: '#212121', fontSize: '18px', fontWeight: '500' }}>No Addresses Saved</h3>
                                    <p style={{ margin: 0, color: '#878787', fontSize: '14px' }}>You haven't saved any addresses yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                    {addresses.map(addr => (
                                        <div key={addr.AddressId} style={{ border: '1px solid #e0e0e0', borderRadius: '4px', padding: '20px', background: '#fff', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '2px', fontSize: '10px', color: '#878787', fontWeight: 'bold', letterSpacing: '0.5px' }}>HOME</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#212121' }}>{addr.FullName}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                    <span onClick={() => handleEditAddressClick(addr)} style={{ color: '#2874f0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>EDIT</span>
                                                    <span onClick={() => handleDeleteAddress(addr.AddressId)} style={{ color: '#dc3545', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>DELETE</span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#212121', lineHeight: '1.6', marginBottom: '15px' }}>
                                                {addr.AddressLine}<br/>
                                                {addr.City}, {addr.District ? addr.District + ', ' : ''}{addr.State} - <span style={{ fontWeight: 'bold' }}>{addr.Pincode}</span>
                                            </div>
                                            <div style={{ fontWeight: '500', fontSize: '14px', color: '#212121' }}>Mobile: {addr.Phone}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. WISHLIST TAB */}
                    {activeTab === 'wishlist' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
                            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#212121', fontWeight: '500', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' }}>
                                My Wishlist ({wishlistItems.length})
                            </h2>
                            
                            {isLoadingWishlist ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#878787' }}>Loading your wishlist...</div>
                            ) : wishlistItems.length === 0 ? (
                                <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '60px', marginBottom: '20px', opacity: 0.8 }}>❤️</div>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#212121', fontSize: '20px', fontWeight: '500' }}>Empty Wishlist</h3>
                                    <p style={{ color: '#878787', fontSize: '14px', margin: '0 0 25px 0' }}>You have no items in your wishlist. Start adding!</p>
                                    <button onClick={onClose} style={{ padding: '12px 30px', background: '#2874f0', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>START SHOPPING</button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                                    {wishlistItems.map(item => {
                                        const images = getImages(item.imageUrl);
                                        const thumb = images.length > 0 ? images[0] : 'https://via.placeholder.com/200';
                                        
                                        return (
                                            <div 
                                                key={item.id} 
                                                // 🔥 1. Make the whole card clickable to navigate!
                                                onClick={() => onVisitShop && onVisitShop(item.sellerId, item.storeName, item.id)}
                                                style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', position: 'relative', transition: 'all 0.2s', background: 'white', cursor: 'pointer' }} 
                                                onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} 
                                                onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >
                                                
                                                <div 
                                                    // 🔥 2. Added e.stopPropagation() so clicking delete doesn't ALSO click the card!
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveFromWishlist(item.id); }}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.2)', fontSize: '16px' }}
                                                    title="Remove from Wishlist"
                                                >
                                                    🗑️
                                                </div>
                                                
                                                <div style={{ height: '180px', background: '#f9f9f9', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                    <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: item.qty <= 0 ? 0.5 : 1 }} />
                                                </div>
                                                
                                                <div style={{ padding: '15px' }}>
                                                    <div style={{ fontSize: '14px', color: '#212121', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }} title={item.name}>{item.name}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#212121' }}>₹{item.price}</span>
                                                        {item.originalPrice > item.price && <span style={{ fontSize: '12px', color: '#878787', textDecoration: 'line-through' }}>₹{item.originalPrice}</span>}
                                                    </div>
                                                    {item.qty <= 0 && <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '6px', fontWeight: 'bold' }}>Out of Stock</div>}
                                                    
                                                    {/* 🔥 3. Visual indicator that they can go to the shop */}
                                                    <div style={{ fontSize: '12px', color: '#2874f0', marginTop: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        🏪 View in {item.storeName || 'Shop'} ➔
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. WALLET & CARDS TAB */}
                    {activeTab === 'wallet' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box' }}>
                            <div style={{ background: 'linear-gradient(135deg, #2874f0 0%, #0053c8 100%)', padding: '30px', borderRadius: '8px', color: 'white', marginBottom: '30px', boxShadow: '0 4px 10px rgba(40,116,240,0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>MyMarket Wallet Balance</div>
                                        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>₹0.00</div>
                                    </div>
                                    <div style={{ fontSize: '40px', opacity: 0.5 }}>💳</div>
                                </div>
                                <button style={{ marginTop: '20px', padding: '8px 20px', background: 'rgba(255,255,255,0.2)', border: '1px solid white', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ ADD MONEY</button>
                            </div>
                            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#212121', fontWeight: '500', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>Saved Cards</h2>
                            <div style={{ padding: '30px', textAlign: 'center', border: '1px dashed #ccc', borderRadius: '4px', color: '#878787' }}>No cards saved for faster checkout.</div>
                        </div>
                    )}

                    {/* 5. COUPONS TAB */}
                    {activeTab === 'coupons' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box' }}>
                            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#212121', fontWeight: '500', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' }}>Available Coupons</h2>
                            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginBottom: '15px' }}>
                                <div style={{ background: '#e8f5e9', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px dashed #ccc', minWidth: '100px' }}><span style={{ fontSize: '24px', color: '#26a541', fontWeight: 'bold' }}>%</span></div>
                                <div style={{ padding: '20px', flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#212121', marginBottom: '5px' }}>WELCOME50</div>
                                    <div style={{ fontSize: '14px', color: '#878787', marginBottom: '10px' }}>Get 50% off on your first order (Up to ₹500).</div>
                                    <div style={{ fontSize: '12px', color: '#26a541', fontWeight: '500' }}>Valid till 31st Dec 2026</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box' }}>
                            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#212121', fontWeight: '500', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' }}>All Notifications</h2>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ width: '40px', height: '40px', background: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎉</div>
                                <div>
                                    <div style={{ fontWeight: '500', color: '#212121', fontSize: '14px', marginBottom: '4px' }}>Welcome to MyMarket!</div>
                                    <div style={{ fontSize: '13px', color: '#878787', lineHeight: '1.4' }}>Your account has been successfully created. Start exploring amazing products from verified sellers today.</div>
                                    <div style={{ fontSize: '11px', color: '#a0a0a0', marginTop: '6px' }}>Just now</div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};

const checkoutLabelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' };
const checkoutInputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' };

export default BuyerAccountModal;