import React, { useState } from 'react';
import axios from 'axios';

// 🔥 Website Name
const SITE_NAME = "ArivKart"; 

// --- DYNAMIC MODAL COMPONENT (MOBILE OPTIMIZED) ---
const Modal = ({ isOpen, onClose, children, title, setPolicyLang, policyLang }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '15px', border: 'none', background: 'none', fontSize: '28px', cursor: 'pointer', color: '#666', zIndex: 10 }}>&times;</button>
        
        {/* HEADER & LANGUAGE SWITCHER (Flex-wrap for mobile) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px', paddingRight: '20px' }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '20px', lineHeight: '1.3' }}>{title}</h2>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setPolicyLang('en')} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #2874f0', background: policyLang === 'en' ? '#2874f0' : 'white', color: policyLang === 'en' ? 'white' : '#2874f0', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', transition: '0.2s' }}>English</button>
                <button onClick={() => setPolicyLang('hi')} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #2874f0', background: policyLang === 'hi' ? '#2874f0' : 'white', color: policyLang === 'hi' ? 'white' : '#2874f0', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', transition: '0.2s' }}>हिंदी</button>
                <button onClick={() => setPolicyLang('mr')} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #2874f0', background: policyLang === 'mr' ? '#2874f0' : 'white', color: policyLang === 'mr' ? 'white' : '#2874f0', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', transition: '0.2s' }}>मराठी</button>
            </div>
        </div>

        {/* Scrollable Content Area */}
        {children}
      </div>
    </div>
  );
};

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

  // --- STATES FOR T&C MODAL & DOCUMENTS ---
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [viewedDocs, setViewedDocs] = useState({ terms: false, specific: false }); // 🔥 Tracks BOTH documents
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activePolicyTitle, setActivePolicyTitle] = useState('');
  const [policyContent, setPolicyContent] = useState(''); 
  const [policyLang, setPolicyLang] = useState('en'); 

  // --- FETCH DOCUMENT LOGIC ---
  const openPolicyDocument = async (fileName, title) => {
      // 🔥 Mark the specific document as viewed
      if (fileName === 'terms') {
          setViewedDocs(prev => ({ ...prev, terms: true }));
      } else {
          setViewedDocs(prev => ({ ...prev, specific: true }));
      }

      setActivePolicyTitle(title);
      setShowTermsModal(true);
      setPolicyLang('en'); 
      setPolicyContent('<p style="text-align:center; padding: 20px; color:#666;">Loading document...</p>');

      try {
          const response = await fetch(`/policies/${fileName}.html`);
          if (!response.ok) throw new Error("Document not found");
          const text = await response.text();
          setPolicyContent(text);
      } catch (error) {
          setPolicyContent('<p style="color:red; padding: 20px;">Failed to load the policy document. Please make sure the HTML files are inside the public/policies folder.</p>');
      }
  };

  const showNotification = (text, type = 'success') => {
      setNotify({ text, type });
      setTimeout(() => setNotify({ text: '', type: '' }), 4500); 
  };

  const switchView = (newView) => {
      setView(newView);
      setIsVerifying(false); 
      setOtp('');            
      setNewPassword('');  
      setNotify({ text: '', type: '' });
      setAgreedToTerms(false);
      setViewedDocs({ terms: false, specific: false }); // Reset trackers on view change
  };

  const logSecurityEvent = (attemptEmail, userId, actionType) => {
      axios.post('http://localhost:7071/api/LogSecurityEvent', {
          email: attemptEmail,
          userId: userId,
          action: actionType
      }).catch(err => console.warn("Security log failed silently", err));
  };

  const validateInputs = () => {
    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    if (!nameRegex.test(fullName)) {
        showNotification("Name must be at least 3 characters and contain only letters.", "error");
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification("Please enter a valid email address.", "error");
        return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        showNotification("Password must be 8+ chars with 1 uppercase, 1 lowercase, and 1 number.", "error");
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
    if (!validateInputs()) return;

    if (!agreedToTerms) return showNotification("You must agree to the Terms & Policies to register.", "error");

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
      
      if (userData.role === 'SELLER') alert(`✅ Welcome, ${userData.name}! Your shop is pending admin approval.`);
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
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return showNotification("New password must be 8+ chars with uppercase, lowercase, and a number.", "error");
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
      
      logSecurityEvent(email, userId, 'LOGIN_SUCCESS');
      onUserAuthenticated(userData);
    } catch (err) {
      logSecurityEvent(email, null, 'LOGIN_FAILED');
      if (err.response && err.response.data) showNotification(err.response.data, "error"); 
      else showNotification("Login Failed. Please check your details.", "error");
    }
  };

  const inputStyle = {
      width: '100%', padding: '14px', marginBottom: '15px', borderRadius: '8px', 
      border: '1px solid #d1d5db', fontSize: '15px', boxSizing: 'border-box', 
      backgroundColor: '#f9fafb', outline: 'none', transition: 'border 0.2s ease'
  };

  const btnStyle = {
      width: '100%', padding: '14px', background: '#2874f0', color: 'white', 
      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', 
      fontSize: '16px', marginTop: '10px', boxShadow: '0 4px 6px rgba(40, 116, 240, 0.2)',
      transition: 'background 0.3s ease'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* --- CSS MAGIC --- */}
      <style>{`
        .policy-wrapper .lang-en, .policy-wrapper .lang-hi, .policy-wrapper .lang-mr { display: none; }
        .policy-wrapper.show-en .lang-en { display: block; }
        .policy-wrapper.show-hi .lang-hi { display: block; }
        .policy-wrapper.show-mr .lang-mr { display: block; }

        .auth-left-panel { display: flex; }
        .mobile-brand { display: none; }
        @media (max-width: 768px) { 
            .auth-left-panel { display: none !important; } 
            .mobile-brand { display: block; text-align: center; margin-bottom: 30px; }
        }
        .input-field:focus { border-color: #2874f0 !important; background-color: #fff !important; }
        .auth-btn:hover { background: #0056b3 !important; }
        .text-link:hover { text-decoration: underline; }
      `}</style>

      {/* --- MODAL RENDERING THE HTML --- */}
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title={activePolicyTitle} setPolicyLang={setPolicyLang} policyLang={policyLang}>
          <div 
              className={`policy-wrapper show-${policyLang}`}
              style={{ 
                  flex: 1, 
                  fontSize: '14px', 
                  lineHeight: '1.6', 
                  color: '#444', 
                  overflowY: 'auto', 
                  maxHeight: '55vh',
                  paddingRight: '15px',
                  marginBottom: '15px'
              }}
              dangerouslySetInnerHTML={{ __html: policyContent }} 
          />
          <button onClick={() => setShowTermsModal(false)} style={{ width: '100%', padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: 'auto' }}>
              I Understand & Close
          </button>
      </Modal>

      {/* LEFT PANEL: Branded Graphic */}
      <div className="auth-left-panel" style={{ flex: 1, background: 'linear-gradient(135deg, #2874f0 0%, #00449e 100%)', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>🛒</div>
          <h1 style={{ fontSize: '46px', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-1px' }}>{SITE_NAME}</h1>
          <p style={{ fontSize: '18px', margin: 0, opacity: 0.9, maxWidth: '400px', lineHeight: '1.5' }}>
              Discover thousands of products from local sellers, or start your own store today.
          </p>
      </div>

      {/* RIGHT PANEL: Auth Form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
              
              <div className="mobile-brand">
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛒</div>
                  <h1 style={{ fontSize: '28px', margin: '0', color: '#2874f0', fontWeight: '900', letterSpacing: '-0.5px' }}>{SITE_NAME}</h1>
              </div>

              <h2 style={{ fontSize: '28px', color: '#1f2937', marginBottom: '8px', fontWeight: '700' }}>
                  {view === 'login' ? 'Sign In' : view === 'register' ? 'Create Account' : 'Reset Password'}
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '30px', fontSize: '15px' }}>
                  {view === 'login' ? 'Please enter your details to continue.' : view === 'register' ? `Join ${SITE_NAME} today.` : 'We will send you an OTP to verify your identity.'}
              </p>
            
              {notify.text && (
                  <div style={{ padding: '14px', marginBottom: '20px', borderRadius: '8px', backgroundColor: notify.type === 'error' ? '#fef2f2' : '#f0fdf4', color: notify.type === 'error' ? '#991b1b' : '#166534', fontSize: '14px', border: `1px solid ${notify.type === 'error' ? '#fecaca' : '#bbf7d0'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{notify.type === 'error' ? '⚠️' : '✅'}</span>
                      {notify.text}
                  </div>
              )}

              {view === 'register' && !isVerifying && (
                  <>
                      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '4px', marginBottom: '20px' }}>
                          <div onClick={() => { setRole('BUYER'); setViewedDocs({ terms: false, specific: false }); setAgreedToTerms(false); }} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s', background: role === 'BUYER' ? 'white' : 'transparent', color: role === 'BUYER' ? '#2874f0' : '#6b7280', boxShadow: role === 'BUYER' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                              🛍️ I'm a Buyer
                          </div>
                          <div onClick={() => { setRole('SELLER'); setViewedDocs({ terms: false, specific: false }); setAgreedToTerms(false); }} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s', background: role === 'SELLER' ? 'white' : 'transparent', color: role === 'SELLER' ? '#2874f0' : '#6b7280', boxShadow: role === 'SELLER' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                              🏪 I'm a Seller
                          </div>
                      </div>

                      <input className="input-field" placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} style={inputStyle} />
                      {role === 'SELLER' && (
                          <input className="input-field" placeholder="Your Store Name" value={storeName} onChange={e=>setStoreName(e.target.value)} style={inputStyle} />
                      )}
                  </>
              )}

              {isVerifying ? (
                  <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>Check your email</h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '25px' }}>We sent a verification code to <strong>{email}</strong></p>
                      <input className="input-field" placeholder="Enter 6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value)} style={{...inputStyle, textAlign: 'center', letterSpacing: '4px', fontSize: '20px', fontWeight: 'bold'}} maxLength={6} />
                      {view === 'forgot-password' && <input className="input-field" placeholder="Enter New Password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={inputStyle} />}
                      <button className="auth-btn" onClick={view === 'forgot-password' ? handleFinalizeReset : handleCompleteSignup} style={{...btnStyle, background: '#10b981', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'}}>Verify & Continue</button>
                  </div>
              ) : (
                  <>
                      {view !== 'forgot-password' && (
                          <>
                              {/* Removed Checkbox from here. Input blocks continue naturally... */}
                              <input className="input-field" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} />
                              <input className="input-field" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
                              
                              {view === 'login' && (
                                  <div style={{ textAlign: 'right', marginBottom: '20px' }}><span className="text-link" onClick={()=>switchView('forgot-password')} style={{ color: '#2874f0', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>Forgot password?</span></div>
                              )}

                              {/* --- 🔥 CHECKBOX MOVED HERE: Right above the Create Account button! --- */}
                              {view === 'register' && (
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '15px', fontSize: '13px', color: '#6b7280', textAlign: 'left' }}>
                                      <input 
                                          type="checkbox" 
                                          id="terms" 
                                          checked={agreedToTerms} 
                                          onChange={(e) => {
                                              // 🔥 Stop checking if they haven't opened BOTH policies yet!
                                              if (e.target.checked && (!viewedDocs.terms || !viewedDocs.specific)) {
                                                  showNotification("Please open and read both required policies before agreeing.", "error");
                                                  return;
                                              }
                                              setAgreedToTerms(e.target.checked);
                                          }} 
                                          style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }} 
                                      />
                                      <label htmlFor="terms" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                          I agree to the <span onClick={(e) => { e.preventDefault(); openPolicyDocument('terms', 'General Terms & Conditions'); }} style={{ color: '#2874f0', textDecoration: 'underline', fontWeight: '500', cursor: 'pointer' }}>Terms & Conditions</span>
                                          {role === 'BUYER' ? (
                                              <>
                                                  {' '}and <span onClick={(e) => { e.preventDefault(); openPolicyDocument('buyer', 'Buyer Policy'); }} style={{ color: '#2874f0', textDecoration: 'underline', fontWeight: '500', cursor: 'pointer' }}>Buyer Policy</span>.
                                              </>
                                          ) : (
                                              <>
                                                  {' '}and <span onClick={(e) => { e.preventDefault(); openPolicyDocument('seller', 'Seller Agreement'); }} style={{ color: '#2874f0', textDecoration: 'underline', fontWeight: '500', cursor: 'pointer' }}>Seller Agreement</span>.
                                              </>
                                          )}
                                      </label>
                                  </div>
                              )}

                              <button className="auth-btn" onClick={view === 'login' ? handleLogin : handleInitiateSignup} style={btnStyle}>{view === 'login' ? 'Sign In' : 'Create Account'}</button>
                          </>
                      )}
                  </>
              )}

              {view === 'forgot-password' && !isVerifying && (
                  <div>
                      <input className="input-field" placeholder="Enter your registered email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} />
                      <button className="auth-btn" onClick={handleInitiateReset} style={btnStyle}>Send Recovery OTP</button>
                  </div>
              )}

              {!isVerifying && (
                  <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '15px', color: '#6b7280' }}>
                      {view === 'login' ? (
                          <>Don't have an account? <span className="text-link" onClick={()=>switchView('register')} style={{ color: '#2874f0', cursor: 'pointer', fontWeight: '600' }}>Sign up</span></>
                      ) : (
                          <>Already have an account? <span className="text-link" onClick={()=>switchView('login')} style={{ color: '#2874f0', cursor: 'pointer', fontWeight: '600' }}>Sign in</span></>
                      )}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default AuthScreen;