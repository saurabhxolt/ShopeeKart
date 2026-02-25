import React from 'react';

// --- MANAGE ORDER MODAL ---
export const ManageOrderModal = ({ managingOrder, setManagingOrder, handleAction }) => {
  if (!managingOrder) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '600px', maxWidth: '100%', padding: '30px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>Manage Order #{managingOrder.OrderId}</h2>
              <button onClick={() => setManagingOrder(null)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888' }}>&times;</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>🛍️ Buyer Info</h4>
                  <p style={{ margin: '0 0 5px 0' }}><strong>Name:</strong> {managingOrder.BuyerName}</p>
                  <p style={{ margin: '0' }}><strong>Email:</strong> {managingOrder.BuyerEmail}</p>
              </div>
              <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>🏪 Seller Info</h4>
                  <p style={{ margin: '0 0 5px 0' }}><strong>Store:</strong> {managingOrder.StoreName || 'N/A'}</p>
                  <p style={{ margin: '0' }}><strong>Phone:</strong> {managingOrder.SellerPhone || 'N/A'}</p>
              </div>
          </div>

          <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', marginBottom: '25px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Order Total: <strong>₹{managingOrder.TotalAmount}</strong></p>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Current Status: <strong>{managingOrder.Status}</strong></p>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Time since placed: {managingOrder.HoursSincePlaced} hours</p>
          </div>

          <div style={{ borderTop: '2px solid #eee', paddingTop: '20px', display: 'flex', gap: '15px' }}>
              {managingOrder.Status !== 'Cancelled' ? (
                  <button onClick={() => handleAction('FORCE_CANCEL_ORDER', managingOrder.OrderId)} style={{ flex: 1, padding: '12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                      🚫 Admin: Force Cancel
                  </button>
              ) : (
                  <div style={{ flex: 1, padding: '12px', background: '#f8d7da', color: '#721c24', textAlign: 'center', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #f5c6cb' }}>
                      This order is already Cancelled.
                  </div>
              )}
              <button onClick={() => setManagingOrder(null)} style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Close Window</button>
          </div>
      </div>
    </div>
  );
};

// --- PRODUCT REVIEW MODAL ---
export const ProductReviewModal = ({ viewingProduct, setViewingProduct }) => {
  if (!viewingProduct) return null;
  
  let imgs = [];
  if (viewingProduct.MainImage) {
      try { imgs = JSON.parse(viewingProduct.MainImage); } catch(e) { imgs = [viewingProduct.MainImage]; }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>{viewingProduct.Name}</h2>
              <button onClick={() => setViewingProduct(null)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888' }}>&times;</button>
          </div>

          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '20px' }}>
              {imgs.length === 0 ? (
                  <div style={{width:'120px', height:'120px', background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'8px'}}>No Image</div>
              ) : (
                  imgs.map((imgUrl, i) => (
                      <img key={i} src={imgUrl} alt={`Product ${i}`} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  ))
              )}
          </div>

          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
              <p><strong>Category:</strong> {viewingProduct.Category}</p>
              <p><strong>Price:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>₹{viewingProduct.Price}</span> (MRP: ₹{viewingProduct.OriginalPrice})</p>
              <p><strong>Stock:</strong> {viewingProduct.StockQuantity}</p>
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <strong>Description:</strong>
                  <p style={{ margin: '5px 0 0 0', color: '#555' }}>{viewingProduct.Description || 'No description provided.'}</p>
              </div>
          </div>

          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #b8daff' }}>
              <p><strong>Store:</strong> {viewingProduct.StoreName}</p>
              <p><strong>Owner:</strong> {viewingProduct.SellerEmail}</p>
              {viewingProduct.AdminMessage && <p style={{ color: '#dc3545' }}><strong>Admin Note:</strong> {viewingProduct.AdminMessage}</p>}
          </div>
      </div>
    </div>
  );
};

// --- SELLER REVIEW MODAL ---
export const SellerReviewModal = ({ reviewingSeller, setReviewingSeller, handleAction }) => {
  if (!reviewingSeller) return null;

  const openDocSafe = (docString) => {
      if (docString.startsWith('data:')) {
          const mimeType = docString.split(';')[0].split(':')[1];
          const base64Data = docString.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
          const file = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
          window.open(URL.createObjectURL(file), '_blank');
      } else {
          window.open(docString, '_blank');
      }
  };

  let docs = [];
  try { docs = JSON.parse(reviewingSeller.VerificationDoc); } catch(e) { docs = [reviewingSeller.VerificationDoc]; }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
          <div style={{ width: '100%', height: '150px', backgroundColor: '#ddd', position: 'relative' }}>
              {reviewingSeller.StoreBanner ? <img src={reviewingSeller.StoreBanner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', paddingTop: '60px', color: '#888' }}>No Banner Provided</div>}
              <div style={{ position: 'absolute', bottom: '-40px', left: '30px', width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'white', border: '4px solid white', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                  {reviewingSeller.StoreLogo ? <img src={reviewingSeller.StoreLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏪</div>}
              </div>
          </div>
          <div style={{ padding: '60px 30px 30px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                      <h2 style={{ margin: '0 0 5px 0' }}>{reviewingSeller.StoreName || 'Unnamed Store'}</h2>
                      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Owner: {reviewingSeller.FullName} ({reviewingSeller.Email})</p>
                  </div>
                  <button onClick={() => setReviewingSeller(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}>&times;</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                      <h4 style={{ color: '#007bff', margin: '0 0 10px 0' }}>Contact & Compliance</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Phone:</strong> {reviewingSeller.SupportPhone || '-'}</p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Support Email:</strong> {reviewingSeller.SupportEmail || '-'}</p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>GSTIN / PAN:</strong> <span style={{ color: '#dc3545', fontWeight: 'bold' }}>{reviewingSeller.GSTIN || 'MISSING'}</span></p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Pickup Address:</strong> {reviewingSeller.PickupAddress || '-'}</p>
                      {reviewingSeller.VerificationDoc && reviewingSeller.VerificationDoc !== '[]' && reviewingSeller.VerificationDoc !== 'null' ? (
                          <div style={{ marginTop: '10px' }}>
                              <strong style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Uploaded Documents:</strong>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {docs.map((docUrl, idx) => (
                                      <button key={idx} onClick={() => openDocSafe(docUrl)} style={{ background: '#17a2b8', color: 'white', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>📄 View Document {idx + 1}</button>
                                  ))}
                              </div>
                          </div>
                      ) : <span style={{ display: 'inline-block', marginTop: '10px', color: '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>⚠️ No KYC Document</span>}
                  </div>
                  <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
                      <h4 style={{ color: '#28a745', margin: '0 0 10px 0' }}>Payout Information</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Bank Account:</strong> {reviewingSeller.BankAccount || '-'}</p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>IFSC Code:</strong> {reviewingSeller.IFSC || '-'}</p>
                  </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={() => setReviewingSeller(null)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                  <button onClick={() => handleAction('APPROVE', reviewingSeller.SellerId)} style={{ flex: 2, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>✅ Approve & Publish Shop</button>
              </div>
          </div>
      </div>
    </div>
  );
};