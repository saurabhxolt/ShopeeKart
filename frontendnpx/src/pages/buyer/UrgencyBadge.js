import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UrgencyBadge = ({ productId }) => {
    const [viewCount, setViewCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!productId) return;

        const fetchViews = async () => {
            try {
                const res = await axios.get(`http://localhost:7071/api/GetLiveProductViews?productId=${productId}`);
                if (res.data.views > 1) { // Only show if more than 1 person is looking!
                    setViewCount(res.data.views);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error("Failed to fetch live views");
            }
        };

        fetchViews();
        
        // Optional: Refresh the count every 30 seconds to make it feel "live"
        const interval = setInterval(fetchViews, 30000);
        return () => clearInterval(interval);
    }, [productId]);

    if (!isVisible) return null;

    return (
        <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: '#fff0f2', 
            border: '1px solid #ffccd5', 
            padding: '8px 12px', 
            borderRadius: '6px',
            marginTop: '15px',
            animation: 'pulse 2s infinite'
        }}>
            <span style={{ fontSize: '18px' }}>🔥</span>
            <span style={{ color: '#e03131', fontWeight: 'bold', fontSize: '14px' }}>
                {viewCount} people are viewing this right now
            </span>
            
            {/* Add this simple CSS animation inline for a subtle pulse effect */}
            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.8; transform: scale(0.99); }
                        100% { opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};

export default UrgencyBadge;