import React, { useState } from 'react';

const ReadMore = ({ text, limit = 100 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return <p style={{ fontSize: '0.9rem', color: '#888' }}>No description available.</p>;

  if (text.length <= limit) {
    return <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: '1.4', margin: '8px 0', whiteSpace: 'pre-wrap' }}>{text}</p>;
  }

  return (
    <div style={{ margin: '8px 0' }}>
      <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: '1.4', whiteSpace: 'pre-wrap', margin: 0, display: 'inline' }}>
        {isExpanded ? text : text.substring(0, limit) + '...'}
      </p>
      <span 
        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
        style={{ color: '#007bff', cursor: 'pointer', marginLeft: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}
      >
        {isExpanded ? 'View Less' : 'View More'}
      </span>
    </div>
  );
};

export default ReadMore;