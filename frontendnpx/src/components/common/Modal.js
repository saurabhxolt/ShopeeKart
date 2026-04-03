import React, { useState, useEffect } from 'react';

const Modal = ({ isOpen, onClose, children, title, width }) => {
  // 🔥 ADDED: Viewport detection for global modal responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        display: 'flex', justifyContent: 'center', 
        alignItems: isMobile ? 'flex-end' : 'center', // Slide from bottom on mobile
        zIndex: 9999, 
        padding: isMobile ? '0' : '20px' // 🔥 FIX 1: Removes the grey gap on mobile!
    }}>
      <div style={{ 
          backgroundColor: 'white', 
          borderRadius: isMobile ? '0' : '12px', // 🔥 FIX 2: Flat edges on mobile, rounded on desktop
          width: '100%', 
          maxWidth: width || '800px', 
          height: isMobile ? '100vh' : 'auto', // 🔥 FIX 3: Forces full screen height on mobile
          maxHeight: isMobile ? '100vh' : '90vh', 
          overflow: 'hidden', // Hide overflow here, scroll in the content body instead
          position: 'relative', 
          boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
      }}>
        
        {/* 🔥 FIX 4: Sticky Header so the Title & Close Button never scroll out of view */}
        <div style={{ 
            position: 'sticky', 
            top: 0, 
            background: 'white', 
            zIndex: 50,
            padding: isMobile ? '15px 20px' : '25px 30px 15px 30px',
            borderBottom: '1px solid #eee',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexShrink: 0
        }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '20px' : '24px' }}>{title}</h2>
            <button 
                onClick={onClose} 
                style={{ border: 'none', background: 'none', fontSize: '32px', cursor: 'pointer', color: '#666', padding: '0 5px', lineHeight: '1' }}
            >
                &times;
            </button>
        </div>
        
        {/* Content Body (Scrolls independently of the header) */}
        <div style={{ 
            padding: isMobile ? '15px' : '0 30px 30px 30px', 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden',
            boxSizing: 'border-box' 
        }}>
            {children}
        </div>

      </div>
    </div>
  );
};

export default Modal;