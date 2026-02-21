import React, { useState } from 'react';
import { parseImages } from '../../utils/imageHelpers';

function ImageGallery({ images }) {
  const [index, setIndex] = useState(0);
  const imgs = parseImages(images);

  if (imgs.length === 0) return <div style={{ height: '300px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px', backgroundColor: '#f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
      <img 
        src={imgs[index]} 
        alt="product" 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
      />
      
      {imgs.length > 1 && (
        <>
          <button 
            onClick={() => setIndex(index === 0 ? imgs.length - 1 : index - 1)}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: '1px solid #ccc', borderRadius: '50%', width: 35, height: 35, cursor: 'pointer', fontWeight: 'bold' }}
          >
            ←
          </button>
          <button 
            onClick={() => setIndex(index === imgs.length - 1 ? 0 : index + 1)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: '1px solid #ccc', borderRadius: '50%', width: 35, height: 35, cursor: 'pointer', fontWeight: 'bold' }}
          >
            →
          </button>
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
            {index + 1} / {imgs.length}
          </div>
        </>
      )}
    </div>
  );
}

export default ImageGallery;