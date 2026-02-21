import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';

const SellerProfileModal = ({ isOpen, onClose, userId }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [profile, setProfile] = useState({
        storeName: '', description: '', supportEmail: '', supportPhone: '',
        pickupAddress: '', gstin: '', bankAccount: '', ifsc: '',
        storeLogo: '', storeBanner: ''
    });

    // --- CROPPER STATE ---
    const [cropConfig, setCropConfig] = useState({ src: null, type: null, aspect: 1 });
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    useEffect(() => {
        if (isOpen && userId) fetchProfile();
    }, [isOpen, userId]);

    const fetchProfile = async () => {
        setLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await axios.get(`http://localhost:7071/api/GetSellerProfile?userId=${userId}`);
            if (res.data) setProfile(res.data);
        } catch (err) {
            console.log("No existing profile found");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

    // 1. User picks a NEW file -> Load into Cropper
    const onFileChange = (e, type) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setCropConfig({
                    src: reader.result,
                    type: type,
                    aspect: type === 'storeLogo' ? 1 : 3 / 1
                });
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            };
            e.target.value = null; // Reset input
        }
    };

    // 2. User clicks "Confirm Crop" -> Extract Base64 and save to state
    const handleCropComplete = async () => {
        try {
            const croppedBase64 = await getCroppedImg(cropConfig.src, croppedAreaPixels);
            
            setProfile(prev => ({ ...prev, [cropConfig.type]: croppedBase64 }));
            setCropConfig({ src: null, type: null, aspect: 1 }); // Close crop studio
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Failed to process image. (CORS issue if using remote image)', type: 'error' });
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            await axios.post('http://localhost:7071/api/UpdateSellerProfile', { userId, ...profile });
            setMessage({ text: '✅ Profile updated! Awaiting Admin Verification.', type: 'success' });
            setTimeout(onClose, 3000);
        } catch (err) {
            setMessage({ text: '❌ Failed to save profile.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* --- MAIN PROFILE MODAL --- */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
                <div style={{ backgroundColor: '#f4f6f8', borderRadius: '12px', width: '800px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                    
                    <div style={{ background: 'white', padding: '20px 30px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                        <h2 style={{ margin: 0, color: '#333' }}>⚙️ Store Settings</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888' }}>&times;</button>
                    </div>

                    <div style={{ padding: '30px' }}>
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <div><strong>Security Notice:</strong> Any updates made to your profile will temporarily require <strong>Admin Approval</strong> before your store updates go live.</div>
                        </div>

                        {message.text && (
                            <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
                                {message.text}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>Loading profile details...</div>
                        ) : (
                            <>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#007bff', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>🛍️ Public Storefront</h4>
                                    
                                    {/* STORE LOGO & BANNER UI */}
                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' }}>
                                        
                                        {/* --- STORE LOGO AREA --- */}
                                        <div style={{ width: '140px', textAlign: 'center' }}>
                                            <label style={labelStyle}>Store Logo</label>
                                            <div style={{ width: '100px', height: '100px', margin: '0 auto 10px', borderRadius: '50%', background: 'white', border: '2px dashed #bbb', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                {profile.storeLogo ? <img src={profile.storeLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px', color: '#ccc' }}>🏪</span>}
                                            </div>
                                            
                                            {/* 🔥 RECROP & REMOVE BUTTONS */}
                                            {profile.storeLogo && (
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '8px' }}>
                                                    <button type="button" onClick={() => setCropConfig({ src: profile.storeLogo, type: 'storeLogo', aspect: 1 })} style={{ background: '#ffc107', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✂️ Recrop</button>
                                                    <button type="button" onClick={() => setProfile({...profile, storeLogo: ''})} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🗑️</button>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'storeLogo')} style={{ fontSize: '11px', width: '100%' }} />
                                        </div>

                                        {/* --- STORE BANNER AREA --- */}
                                        <div style={{ flex: 1 }}>
                                            <label style={labelStyle}>Store Banner</label>
                                            <div style={{ width: '100%', height: '100px', marginBottom: '10px', borderRadius: '8px', background: 'white', border: '2px dashed #bbb', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                                {profile.storeBanner ? <img src={profile.storeBanner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '13px', color: '#aaa', fontWeight: 'bold' }}>Upload a wide banner image</span>}
                                            </div>
                                            
                                            {/* 🔥 RECROP & REMOVE BUTTONS */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'storeBanner')} style={{ fontSize: '11px' }} />
                                                
                                                {profile.storeBanner && (
                                                    <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                                                        <button type="button" onClick={() => setCropConfig({ src: profile.storeBanner, type: 'storeBanner', aspect: 3/1 })} style={{ background: '#ffc107', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>✂️ Recrop</button>
                                                        <button type="button" onClick={() => setProfile({...profile, storeBanner: ''})} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>🗑️ Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div><label style={labelStyle}>Store Name</label><input name="storeName" value={profile.storeName} onChange={handleChange} style={inputStyle} /></div>
                                        <div><label style={labelStyle}>Support Phone</label><input name="supportPhone" value={profile.supportPhone} onChange={handleChange} style={inputStyle} /></div>
                                    </div>
                                    <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Support Email</label><input name="supportEmail" value={profile.supportEmail} onChange={handleChange} style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Store Description</label><textarea name="description" value={profile.description} onChange={handleChange} style={{ ...inputStyle, height: '80px' }} /></div>
                                </div>

                                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#28a745', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>🚚 Logistics & Compliance</h4>
                                    <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Pickup Address</label><textarea name="pickupAddress" value={profile.pickupAddress} onChange={handleChange} style={{ ...inputStyle, height: '60px' }} /></div>
                                    <div><label style={labelStyle}>GSTIN / PAN Number</label><input name="gstin" value={profile.gstin} onChange={handleChange} style={inputStyle} /></div>
                                </div>

                                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#dc3545', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>💰 Payout Information</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div><label style={labelStyle}>Bank Account Number</label><input type="password" name="bankAccount" value={profile.bankAccount} onChange={handleChange} style={inputStyle} /></div>
                                        <div><label style={labelStyle}>Bank IFSC Code</label><input name="ifsc" value={profile.ifsc} onChange={handleChange} style={inputStyle} /></div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
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
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ color: 'white', marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                        Crop your {cropConfig.type === 'storeLogo' ? 'Store Logo' : 'Store Banner'}
                    </div>
                    
                    <div style={{ position: 'relative', width: '80%', height: '60%', backgroundColor: '#222', borderRadius: '8px', overflow: 'hidden' }}>
                        <Cropper
                            image={cropConfig.src}
                            crop={crop}
                            zoom={zoom}
                            aspect={cropConfig.aspect}
                            onCropChange={setCrop}
                            onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                            onZoomChange={setZoom}
                            cropShape={cropConfig.type === 'storeLogo' ? 'round' : 'rect'}
                        />
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: 'white' }}>
                        <span>Zoom Out</span>
                        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} style={{ width: '200px' }} />
                        <span>Zoom In</span>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', gap: '20px' }}>
                        <button onClick={() => setCropConfig({ src: null, type: null, aspect: 1 })} style={{ padding: '12px 24px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel Crop</button>
                        <button onClick={handleCropComplete} style={{ padding: '12px 24px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Confirm Crop</button>
                    </div>
                </div>
            )}
        </>
    );
};

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none' };

export default SellerProfileModal;