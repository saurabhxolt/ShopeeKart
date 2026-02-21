import React from 'react';

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>&times;</button>
        <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '15px', color: '#333' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;