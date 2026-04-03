import React from 'react';

const Footer = ({ user, onOpenPolicy }) => {
  // Check if the user is a buyer
  const isBuyer = user?.role === 'BUYER';

  return (
    <footer style={{ background: '#212121', color: '#878787', padding: '40px 60px', marginTop: 'auto', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '30px' }}>
            
            <div style={{ minWidth: '200px', marginBottom: '20px' }}>
                <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '14px' }}>ABOUT</h4>
                <p onClick={() => onOpenPolicy('about', 'About Us')} style={{ cursor: 'pointer', margin: '8px 0', fontSize: '13px' }}>About Us</p>
                <p onClick={() => onOpenPolicy('contact', 'Contact Us')} style={{ cursor: 'pointer', margin: '8px 0', fontSize: '13px' }}>Contact Us</p>
            </div>

            <div style={{ minWidth: '200px', marginBottom: '20px' }}>
                <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '14px' }}>POLICY</h4>
                <p onClick={() => onOpenPolicy('terms', 'General Terms & Conditions')} style={{ cursor: 'pointer', margin: '8px 0', fontSize: '13px' }}>Terms & Conditions</p>
                <p onClick={() => onOpenPolicy('buyer', 'Buyer Policy')} style={{ cursor: 'pointer', margin: '8px 0', fontSize: '13px' }}>Buyer & Refund Policy</p>
                <p onClick={() => onOpenPolicy('privacy', 'Privacy Policy')} style={{ cursor: 'pointer', margin: '8px 0', fontSize: '13px' }}>Privacy Policy</p>
                
                {/* 🔥 HIDE SELLER AGREEMENT FOR BUYERS */}
                {!isBuyer && (
                    <p onClick={() => onOpenPolicy('seller', 'Seller Agreement')} style={{ cursor: 'pointer', margin: '8px 0', fontSize: '13px' }}>Seller Agreement</p>
                )}
            </div>

            <div style={{ minWidth: '200px', marginBottom: '20px' }}>
                <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '14px' }}>HELP</h4>
                <p style={{ margin: '8px 0', fontSize: '13px' }}>Payments</p>
                <p style={{ margin: '8px 0', fontSize: '13px' }}>Shipping & Delivery</p>
                <p style={{ margin: '8px 0', fontSize: '13px' }}>FAQ</p>
            </div>

            <div style={{ minWidth: '200px', marginBottom: '20px' }}>
                <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '14px' }}>GRIEVANCE OFFICER</h4>
                <p style={{ margin: '8px 0', fontSize: '13px' }}>Name: Nodal Officer</p>
                <p style={{ margin: '8px 0', fontSize: '13px' }}>Email: grievance@arivkart.com</p>
            </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
            © 2026 ArivKart. All rights reserved.
        </div>
    </footer>
  );
};

export default Footer;