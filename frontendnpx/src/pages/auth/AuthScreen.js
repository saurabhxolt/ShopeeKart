import React, { useState } from 'react';
import axios from 'axios';

const AuthScreen = ({ onUserAuthenticated }) => {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('BUYER');
  const [storeName, setStoreName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [notify, setNotify] = useState({ text: '', type: '' });

  const showNotification = (text, type = 'success') => {
      setNotify({ text, type });
      setTimeout(() => setNotify({ text: '', type: '' }), 4500); // Slightly longer to read constraints
  };

  const switchView = (newView) => {
      setView(newView);
      setIsVerifying(false); 
      setOtp('');            
      setNewPassword('');  
      setNotify({ text: '', type: '' });
  };

  // 🔥 NEW: Validation Logic
  const validateInputs = () => {
    // 1. Name Validation (Min 3 chars, Alphabets & Spaces only)
    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    if (!nameRegex.test(fullName)) {
        showNotification("Name must be at least 3 characters and contain only letters.", "error");
        return false;
    }

    // 2. Email Validation (Standard Email Format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification("Please enter a valid email address.", "error");
        return false;
    }

    // 3. Password Validation (Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        showNotification("Password must be 8+ characters with at least one uppercase, one lowercase, and one number.", "error");
        return false;
    }

    if (role === 'SELLER' && !storeName.trim()) {
        showNotification("Please enter your Store Name.", "error");
        return false;
    }

    return true;
  };

  const handleInitiateSignup = async () => {
    if (!email || !password || !fullName) return showNotification("Please fill all fields", "error");
    
    // 🔥 Trigger Constraints Check
    if (!validateInputs()) return;

    try {
        await axios.post('http://localhost:7071/api/SendOTP', { email });
        setIsVerifying(true);
        showNotification(`OTP sent to ${email}`, "success");
    } catch (err) {
        if (err.response && err.response.status === 409) {
            showNotification("⚠️ This email is already registered! Please log in.", "error");
            switchView('login'); 
        } else {
            showNotification("Failed to send OTP. Try again.", "error");
        }
    }
  };

  const handleCompleteSignup = async () => {
    try {
      const res = await axios.post('http://localhost:7071/api/VerifyOTP', { email, otp, fullName, password, role, storeName });
      const userData = { 
          userId: res.data.userId, 
          role: res.data.role, 
          name: res.data.name, 
          token: res.data.token,
          isApproved: false 
      };
      setIsVerifying(false);
      
      if (userData.role === 'SELLER') alert(`✅ Welcome, ${userData.name}! Your shop is currently pending admin approval.`);
      else alert(`✅ Welcome, ${userData.name}! Happy Shopping.`);
      
      onUserAuthenticated(userData);
    } catch (err) {
      showNotification("❌ Invalid or Expired OTP. Please try again.", "error");
    }
  };

  const handleInitiateReset = async () => {
    if(!email) return showNotification("Please enter email", "error");
    try {
        await axios.post('http://localhost:7071/api/SendOTP', { email, isReset: true }); 
        setIsVerifying(true);
        showNotification(`OTP sent to ${email}`, "success");
    } catch (err) {
        showNotification("Failed to send OTP. Check if email exists.", "error");
    }
  };

  const handleFinalizeReset = async () => {
    // 🔥 Validate New Password during reset too
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return showNotification("New password must be 8+ characters with uppercase, lowercase, and a number.", "error");
    }

    if(!otp) return showNotification("Please enter OTP", "error");

    try {
        await axios.post('http://localhost:7071/api/ResetPassword', { email, otp, newPassword });
        showNotification("✅ Password Updated! Please login.", "success");
        setTimeout(() => switchView('login'), 2000); 
    } catch (err) {
        showNotification(err.response?.data || "Failed to reset password", "error");
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:7071/api/Login', { email, password });
      const { userId, role, name, token, isApproved, email: userEmail, phone } = res.data;
      const userData = { userId, role, name, token, isApproved, email: userEmail, phone };
      onUserAuthenticated(userData);
    } catch (err) {
      if (err.response && err.response.data) showNotification(err.response.data, "error"); 
      else showNotification("Login Failed. Please check your details.", "error");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f4f6f8' }}>
      <div style={{ width: 380, background: 'white', padding: 40, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>
            {view === 'login' ? 'Welcome Back' : view === 'register' ? 'Join Us' : 'Reset Password'}
        </h2>
        
        {notify.text && (
            <div style={{
                padding: '12px',
                marginBottom: '15px',
                borderRadius: '6px',
                backgroundColor: notify.type === 'error' ? '#f8d7da' : '#d4edda',
                color: notify.type === 'error' ? '#721c24' : '#155724',
                fontSize: '13px',
                textAlign: 'left',
                border: `1px solid ${notify.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
                lineHeight: '1.4'
            }}>
                {notify.text}
            </div>
        )}

        {view === 'register' && !isVerifying && (
            <>
                <input placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} style={{width:'100%', padding:10, marginBottom:10, borderRadius:4, border:'1px solid #ccc', boxSizing: 'border-box'}} />
                <select value={role} onChange={e=>setRole(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:10, borderRadius:4, boxSizing: 'border-box', border:'1px solid #ccc'}}>
                    <option value="BUYER">Buyer</option><option value="SELLER">Seller</option>
                </select>
                {role === 'SELLER' && <input placeholder="Store Name" value={storeName} onChange={e=>setStoreName(e.target.value)} style={{width:'100%', padding:10, marginBottom:10, borderRadius:4, border:'1px solid #ccc', boxSizing: 'border-box'}} />}
            </>
        )}

        {isVerifying ? (
            <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #c8e6c9' }}>
                <p style={{fontSize: '13px', color: '#666', marginTop: 0}}>Enter OTP sent to {email}</p>
                <input placeholder="OTP" value={otp} onChange={e=>setOtp(e.target.value)} style={{width:'100%', padding:12, marginBottom:10, border:'1px solid #ddd', borderRadius:5, boxSizing: 'border-box'}} />
                {view === 'forgot-password' && <input placeholder="New Password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{width:'100%', padding:12, marginBottom:10, border:'1px solid #ddd', borderRadius:5, boxSizing: 'border-box'}} />}
                <button onClick={view==='forgot-password'?handleFinalizeReset:handleCompleteSignup} style={{width:'100%', padding:12, background:'green', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:'bold'}}>Verify</button>
            </div>
        ) : (
            <>
                {view !== 'forgot-password' && (
                    <>
                        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%', padding:10, marginBottom:10, borderRadius:4, border:'1px solid #ccc', boxSizing: 'border-box'}} />
                        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%', padding:10, marginBottom:10, borderRadius:4, border:'1px solid #ccc', boxSizing: 'border-box'}} />
                        <button onClick={view==='login'?handleLogin:handleInitiateSignup} style={{width:'100%', padding:12, background:'#007bff', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:'bold', fontSize:'1rem'}}>{view==='login'?'Login':'Sign Up'}</button>
                    </>
                )}
            </>
        )}

        {view === 'forgot-password' && !isVerifying && (
            <div>
                <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%', padding:10, marginBottom:10, boxSizing: 'border-box', border:'1px solid #ccc', borderRadius:4}} />
                <button onClick={handleInitiateReset} style={{width:'100%', padding:12, background:'#ffc107', border:'none', borderRadius:6, cursor:'pointer', fontWeight:'bold'}}>Send OTP</button>
            </div>
        )}

        <div style={{textAlign:'center', marginTop:20, fontSize:13}}>
            {view === 'login' ? (
                <>
                    <span onClick={()=>switchView('forgot-password')} style={{color:'#007bff', cursor:'pointer'}}>Forgot Password?</span>
                    <br /><br />
                    <span onClick={()=>switchView('register')} style={{color:'#007bff', cursor:'pointer'}}>Create an account</span>
                </>
            ) : (
                <span onClick={()=>switchView('login')} style={{color:'#007bff', cursor:'pointer'}}>Back to Login</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;