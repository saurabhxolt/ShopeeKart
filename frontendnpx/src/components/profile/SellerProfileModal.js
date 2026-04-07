import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';

const SellerProfileModal = ({ isOpen, onClose, userId }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // 🔥 Holds dynamically fetched categories from the DB
    const [mainCategories, setMainCategories] = useState([]);

    const [profile, setProfile] = useState({
        storeName: '', description: '', supportEmail: '', supportPhone: '',
        pickupAddress: '', gstin: '', bankAccount: '', ifsc: '',
        storeLogo: '', storeBanner: '', verificationDoc: [],
        pan: '', aadhar: '', panDoc: '', gstDoc: '', chequeDoc: '', signature: '',
        shopCategories: [] // Array of numeric IDs
    });

    const [cropConfig, setCropConfig] = useState({ src: null, type: null, aspect: 1 });
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 🔥 FIX: Fetch categories and use numeric database IDs
    useEffect(() => {
        axios.get('http://localhost:7071/api/GetCategories')
            .then(res => {
                // Get Level 1 categories only
                const level1 = res.data.filter(c => c.categoryLevel === 1);
                
                // Map to the actual numeric categoryId from your SQL table
                const formattedCats = level1.map(c => ({
                    id: c.categoryId, // e.g., 5 or 6
                    name: c.name 
                }));
                
                setMainCategories(formattedCats);
            })
            .catch(err => console.error("Failed to load categories for profile", err));
    }, []);

    useEffect(() => {
        if (isOpen && userId) fetchProfile();
    }, [isOpen, userId]);

    const fetchProfile = async () => {
        setLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await axios.get(`http://localhost:7071/api/GetSellerProfile?userId=${userId}`);
            if (res.data) {
                let parsedDocs = [];
                if (res.data.verificationDoc) {
                    try { parsedDocs = JSON.parse(res.data.verificationDoc); }
                    catch(e) { parsedDocs = [res.data.verificationDoc]; } 
                }
                
                let parsedCategories = [];
                if (res.data.shopCategories) {
                    try { 
                        parsedCategories = typeof res.data.shopCategories === 'string' 
                            ? JSON.parse(res.data.shopCategories) 
                            : res.data.shopCategories; 
                    }
                    catch(e) { parsedCategories = []; }
                }

                // Ensure shopCategories contains numbers for strict comparison
                const numericCategories = (parsedCategories || []).map(id => Number(id));

                setProfile({ ...res.data, verificationDoc: parsedDocs, shopCategories: numericCategories });
            }
        } catch (err) {
            console.log("No profile found");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

    const onFileChange = (e, type) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setCropConfig({ src: reader.result, type: type, aspect: type === 'storeLogo' ? 1 : 3/1 });
                setZoom(1); setCrop({ x: 0, y: 0 });
            };
            e.target.value = null; 
        }
    };

    const handleKycFileChange = (e, fieldName) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setProfile(prev => ({ ...prev, [fieldName]: reader.result }));
            };
        }
    };

    const handleCropComplete = async () => {
        try {
            const croppedBase64 = await getCroppedImg(cropConfig.src, croppedAreaPixels);
            setProfile(prev => ({ ...prev, [cropConfig.type]: croppedBase64 }));
            setCropConfig({ src: null, type: null, aspect: 1 }); 
        } catch (err) {
            setMessage({ text: 'Failed to crop image.', type: 'error' });
        }
    };

    const openDocSafe = (docString) => {
        if (!docString) return;
        if (docString.startsWith('data:')) {
            const mimeType = docString.split(';')[0].split(':')[1];
            const base64Data = docString.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const file = new Blob([byteArray], { type: mimeType });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        } else {
            window.open(docString, '_blank');
        }
    };

    const handleSaveProfile = async () => {
        if (!profile.shopCategories || profile.shopCategories.length === 0) {
            return setMessage({ text: '❌ Please select at least one Shop Category!', type: 'error' });
        }
        if (!profile.storeName || !profile.pan || !profile.gstin || !profile.bankAccount || !profile.ifsc) {
            return setMessage({ text: '❌ Store Name, PAN, GSTIN, and Bank Details are mandatory!', type: 'error' });
        }

        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            await axios.post('http://localhost:7071/api/UpdateSellerProfile', { 
                userId, 
                ...profile,
                shopCategories: JSON.stringify(profile.shopCategories) 
            });
            setMessage({ text: '✅ Profile updated! Awaiting Admin Verification.', type: 'success' });
            setTimeout(onClose, 2500);
        } catch (err) {
            setMessage({ text: '❌ Failed to save profile.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: isMobile ? '0' : '20px' }}>
                <div style={{ backgroundColor: '#f4f6f8', borderRadius: isMobile ? '0' : '12px', width: '100%', maxWidth: '800px', height: isMobile ? '100vh' : 'auto', maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Header */}
                    <div style={{ background: 'white', padding: isMobile ? '15px' : '20px 30px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
                        <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '18px' : '24px' }}>⚙️ Store Settings</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888', padding: '0 5px' }}>&times;</button>
                    </div>

                    <div style={{ padding: isMobile ? '15px' : '30px', flex: 1 }}>
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
                            ⚠️ <strong>Security Notice:</strong> Profile updates require <strong>Admin Approval</strong> before going live.
                        </div>
                        
                        {message.text && (
                            <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
                                {message.text}
                            </div>
                        )}

                        {loading ? <div style={{ textAlign: 'center', padding: '40px' }}>Loading profile...</div> : (
                            <>
                                {/* --- BASIC STORE INFO --- */}
                                <div style={{ background: 'white', padding: isMobile ? '15px' : '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#007bff', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>🛍️ Public Storefront</h4>
                                    
                                    {/* DYNAMIC SHOP CATEGORY SELECTION */}
                                    <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                                        <label style={labelStyle}>What does your shop sell? (Select all that apply) *</label>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '15px' }}>
                                            {mainCategories.length === 0 ? (
                                                <span style={{ fontSize: '13px', color: '#888' }}>No categories available.</span>
                                            ) : (
                                                mainCategories.map(cat => {
                                                    const isSelected = profile.shopCategories?.includes(cat.id);
                                                    return (
                                                        <label key={cat.id} style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '8px', 
                                                            cursor: 'pointer', 
                                                            background: isSelected ? '#e7f3ff' : 'white', 
                                                            padding: '10px 15px', 
                                                            borderRadius: '6px', 
                                                            border: isSelected ? '2px solid #007bff' : '1px solid #ccc', 
                                                            fontSize: '14px', 
                                                            fontWeight: isSelected ? 'bold' : 'normal', 
                                                            transition: 'all 0.2s ease',
                                                            color: isSelected ? '#007bff' : '#333'
                                                        }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected || false} 
                                                                onChange={(e) => {
                                                                    const currentCats = profile.shopCategories || [];
                                                                    if (e.target.checked) {
                                                                        setProfile({...profile, shopCategories: [...currentCats, cat.id]});
                                                                    } else {
                                                                        setProfile({...profile, shopCategories: currentCats.filter(id => id !== cat.id)});
                                                                    }
                                                                }}
                                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                            />
                                                            {cat.name}
                                                        </label>
                                                    )
                                                })
                                            )}
                                        </div>

                                        <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '6px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '18px' }}>⚖️</span>
                                            <div style={{ fontSize: '12px', color: '#c53030', lineHeight: '1.4' }}>
                                                <strong>Legal Requirement:</strong> Your <strong>GST Certificate</strong> must mention business activities related to selected categories. Violations may result in suspension.
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' }}>
                                        <div style={{ width: isMobile ? '100%' : '140px', textAlign: 'center' }}>
                                            <label style={labelStyle}>Store Logo</label>
                                            <div style={{ width: '100px', height: '100px', margin: '0 auto 10px', borderRadius: '50%', background: 'white', border: '2px dashed #bbb', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                {profile.storeLogo ? <img src={profile.storeLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px', color: '#ccc' }}>🏪</span>}
                                            </div>
                                            {profile.storeLogo && (
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '8px' }}>
                                                    <button type="button" onClick={() => setCropConfig({ src: profile.storeLogo, type: 'storeLogo', aspect: 1 })} style={{ background: '#ffc107', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✂️ Recrop</button>
                                                    <button type="button" onClick={() => setProfile({...profile, storeLogo: ''})} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🗑️</button>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'storeLogo')} style={{ fontSize: '11px', width: '100%' }} />
                                        </div>

                                        <div style={{ flex: 1, borderTop: isMobile ? '1px dashed #ddd' : 'none', paddingTop: isMobile ? '15px' : '0' }}>
                                            <label style={labelStyle}>Store Banner</label>
                                            <div style={{ width: '100%', height: isMobile ? '80px' : '100px', marginBottom: '10px', borderRadius: '8px', background: 'white', border: '2px dashed #bbb', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                {profile.storeBanner ? <img src={profile.storeBanner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '13px', color: '#aaa', fontWeight: 'bold' }}>Upload store banner</span>}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px' }}>
                                                <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'storeBanner')} style={{ fontSize: '11px', width: '100%' }} />
                                                {profile.storeBanner && (
                                                    <div style={{ display: 'flex', gap: '5px', marginLeft: isMobile ? '0' : 'auto', marginTop: isMobile ? '5px' : '0' }}>
                                                        <button type="button" onClick={() => setCropConfig({ src: profile.storeBanner, type: 'storeBanner', aspect: 3/1 })} style={{ background: '#ffc107', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✂️ Recrop</button>
                                                        <button type="button" onClick={() => setProfile({...profile, storeBanner: ''})} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🗑️ Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div><label style={labelStyle}>Store Name *</label><input name="storeName" value={profile.storeName} onChange={handleChange} style={inputStyle} /></div>
                                        <div><label style={labelStyle}>Support Phone</label><input type="tel" name="supportPhone" value={profile.supportPhone} onChange={handleChange} style={inputStyle} /></div>
                                    </div>
                                    <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Support Email</label><input type="email" name="supportEmail" value={profile.supportEmail} onChange={handleChange} style={inputStyle} /></div>
                                    <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Store Description</label><textarea name="description" value={profile.description} onChange={handleChange} style={{ ...inputStyle, height: '80px', fontFamily: 'inherit' }} /></div>
                                    <div><label style={labelStyle}>Pickup Address</label><textarea name="pickupAddress" value={profile.pickupAddress} onChange={handleChange} style={{ ...inputStyle, height: '60px', fontFamily: 'inherit' }} /></div>
                                </div>

                                {/* --- LEGAL & KYC INFO --- */}
                                <div style={{ background: 'white', padding: isMobile ? '15px' : '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '4px solid #856404' }}>
                                    <h4 style={{ margin: '0 0 5px 0', color: '#856404' }}>⚖️ Legal & KYC Compliance</h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={labelStyle}>PAN Number *</label>
                                            <input name="pan" value={profile.pan} onChange={handleChange} maxLength="10" placeholder="ABCDE1234F" style={{...inputStyle, textTransform: 'uppercase'}} />
                                        </div>
                                        <div>
                                            <label style={{...labelStyle, display: 'flex', justifyContent: 'space-between'}}>
                                                PAN Card *
                                                {profile.panDoc && <span onClick={() => openDocSafe(profile.panDoc)} style={{color: '#007bff', cursor: 'pointer', textTransform: 'none'}}>👁️ View</span>}
                                            </label>
                                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleKycFileChange(e, 'panDoc')} style={{ fontSize: '11px', width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px' }} />
                                        </div>

                                        <div>
                                            <label style={labelStyle}>GSTIN Number *</label>
                                            <input name="gstin" value={profile.gstin} onChange={handleChange} maxLength="15" placeholder="22AAAAA0000A1Z5" style={{...inputStyle, textTransform: 'uppercase'}} />
                                        </div>
                                        <div>
                                            <label style={{...labelStyle, display: 'flex', justifyContent: 'space-between'}}>
                                                GST Certificate *
                                                {profile.gstDoc && <span onClick={() => openDocSafe(profile.gstDoc)} style={{color: '#007bff', cursor: 'pointer', textTransform: 'none'}}>👁️ View</span>}
                                            </label>
                                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleKycFileChange(e, 'gstDoc')} style={{ fontSize: '11px', width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px' }} />
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Aadhar Number</label>
                                            <input name="aadhar" value={profile.aadhar} onChange={handleChange} maxLength="12" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={{...labelStyle, display: 'flex', justifyContent: 'space-between'}}>
                                                Signature *
                                                {profile.signature && <span onClick={() => openDocSafe(profile.signature)} style={{color: '#007bff', cursor: 'pointer', textTransform: 'none'}}>👁️ View</span>}
                                            </label>
                                            <input type="file" accept="image/*" onChange={(e) => handleKycFileChange(e, 'signature')} style={{ fontSize: '11px', width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* --- BANKING INFO --- */}
                                <div style={{ background: 'white', padding: isMobile ? '15px' : '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '4px solid #17a2b8' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#17a2b8' }}>🏦 Payout Details</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                                        <div><label style={labelStyle}>Bank Account *</label><input type="password" name="bankAccount" value={profile.bankAccount} onChange={handleChange} style={inputStyle} /></div>
                                        <div><label style={labelStyle}>IFSC Code *</label><input name="ifsc" value={profile.ifsc} onChange={handleChange} style={{...inputStyle, textTransform: 'uppercase'}} /></div>
                                        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                            <label style={{...labelStyle, display: 'flex', justifyContent: 'space-between'}}>
                                                Cancelled Cheque *
                                                {profile.chequeDoc && <span onClick={() => openDocSafe(profile.chequeDoc)} style={{color: '#007bff', cursor: 'pointer', textTransform: 'none'}}>👁️ View</span>}
                                            </label>
                                            <input type="file" accept="image/*,.pdf" onChange={(e) => handleKycFileChange(e, 'chequeDoc')} style={{ fontSize: '11px', width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px' }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '15px', marginTop: '20px' }}>
                                    <button onClick={onClose} style={{ flex: 1, padding: '14px', border: '1px solid #ccc', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                    <button onClick={handleSaveProfile} disabled={saving} style={{ flex: 2, padding: '14px', border: 'none', background: '#007bff', color: 'white', borderRadius: '8px', cursor: saving ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                                        {saving ? 'Saving...' : 'Save Settings & Request Approval'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CROP STUDIO OVERLAY --- */}
            {cropConfig.src && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: isMobile ? '10px' : '0' }}>
                    <div style={{ color: 'white', marginBottom: '20px', fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold', textAlign: 'center' }}>
                        Crop your {cropConfig.type === 'storeLogo' ? 'Store Logo' : 'Store Banner'}
                    </div>
                    
                    <div style={{ position: 'relative', width: isMobile ? '100%' : '80%', height: isMobile ? '50%' : '60%', backgroundColor: '#222', borderRadius: '8px', overflow: 'hidden' }}>
                        <Cropper image={cropConfig.src} crop={crop} zoom={zoom} aspect={cropConfig.aspect} onCropChange={setCrop} onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)} onZoomChange={setZoom} cropShape={cropConfig.type === 'storeLogo' ? 'round' : 'rect'} />
                    </div>
                    
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: 'white' }}>
                        <span style={{ fontSize: '12px' }}>Zoom Out</span>
                        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} style={{ width: isMobile ? '120px' : '200px' }} />
                        <span style={{ fontSize: '12px' }}>Zoom In</span>
                    </div>
                    
                    <div style={{ marginTop: '30px', display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '15px', width: isMobile ? '100%' : 'auto' }}>
                        <button onClick={() => setCropConfig({ src: null, type: null, aspect: 1 })} style={{ padding: '12px 24px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>Cancel Crop</button>
                        <button onClick={handleCropComplete} style={{ padding: '12px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: isMobile ? '100%' : 'auto' }}>✅ Confirm Crop</button>
                    </div>
                </div>
            )}
        </>
    );
};

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none' };

export default SellerProfileModal;