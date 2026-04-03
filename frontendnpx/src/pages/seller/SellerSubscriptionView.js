import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SellerSubscriptionView = ({ user, isMobile, revenue }) => {
    const [livePlan, setLivePlan] = useState(user.plan || 'Starter'); 
    const [liveCommission, setLiveCommission] = useState(user.commissionRate !== undefined ? parseFloat(user.commissionRate) : 0.10);
    
    const [isUpgrading, setIsUpgrading] = useState(null);
    const [isLoadingLive, setIsLoadingLive] = useState(true);

    useEffect(() => {
        const fetchLiveProfile = async () => {
            if (!user || !user.userId) return;
            try {
                const res = await axios.get(`http://localhost:7071/api/GetSellerProfile?userId=${user.userId}`);
                if (res.data) {
                    setLivePlan(res.data.plan || 'Starter');
                    setLiveCommission(res.data.commissionRate !== undefined ? parseFloat(res.data.commissionRate) : 0.10);
                }
            } catch (err) {
                console.error("Failed to fetch live profile data", err);
            } finally {
                setIsLoadingLive(false);
            }
        };
        fetchLiveProfile();
    }, [user.userId]);

    // 🔥 BULLETPROOF MATH: Compare standard 10% vs Pro 0% for their all-time revenue
    const baselineFee = revenue * 0.10; 

    const plans = [
        { name: 'Starter', fee: '₹0', comm: '10%', rate: 0.10, color: '#6c757d', perks: ['Zero upfront risk', 'Standard Support'] },
        { name: 'Growth', fee: '₹1999', comm: '5%', rate: 0.05, color: '#2874f0', perks: ['Priority support', 'Higher search ranking'] },
        { name: 'Pro', fee: '₹4,999', comm: '0%', rate: 0.00, color: '#10b981', perks: ['Premium Badge', 'Top Visibility', 'Dedicated Manager'] }
    ];

    const handleUpgrade = async (planName, rate) => {
        if (!window.confirm(`Are you sure you want to upgrade to the ${planName} plan?`)) return;
        
        setIsUpgrading(planName);
        try {
            await axios.post('http://localhost:7071/api/UpdateSellerPlan', {
                userId: user.userId,
                planName: planName,
                commissionRate: rate
            });
            
            alert(`🎉 Success! You are now on the ${planName} Plan. Your new commission rate of ${(rate * 100).toFixed(0)}% will apply to all future orders.`);
            
            setLivePlan(planName);
            setLiveCommission(rate);
        } catch (err) {
            alert("Upgrade failed. Please try again.");
            console.error(err);
        } finally {
            setIsUpgrading(null);
        }
    };

    if (isLoadingLive) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>⏳ Loading your active plan details...</div>;
    }

    return (
        <div style={{ padding: '10px' }}>
            
            {/* LIVE STATUS BANNER */}
            <div style={{ background: '#e3f2fd', border: '1px solid #b6d4fe', padding: isMobile ? '15px' : '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div>
                    <div style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Your Active Plan</div>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0d47a1' }}>
                        {livePlan} {livePlan.includes('Custom') && '🛠️'}
                    </div>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Current Commission Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2874f0' }}>
                        {(liveCommission * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* 🔥 BULLETPROOF PROFIT ALERT */}
            {revenue > 5000 && !livePlan.includes('Pro') && (
                <div style={{ background: '#fff9e6', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', marginBottom: '25px', color: '#856404' }}>
                    <strong>🧮 Profit Insight:</strong> On your all-time sales of ₹{revenue.toLocaleString()}, the standard 10% rate costs approx <strong>₹{baselineFee.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong> in fees. Upgrading to the Pro plan drops your fee to 0% on all future orders!
                </div>
            )}

            {/* SUBSCRIPTION CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px' }}>
                {plans.map(p => {
                    const isCurrentCard = livePlan === p.name;
                    
                    return (
                        <div key={p.name} style={{ background: 'white', padding: '25px', borderRadius: '12px', border: isCurrentCard ? `2px solid ${p.color}` : '1px solid #eee', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'relative' }}>
                            
                            {isCurrentCard && (
                                <div style={{ background: p.color, color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px', width: 'fit-content', margin: '0 auto 15px' }}>
                                    ACTIVE PLAN
                                </div>
                            )}
                            
                            <h3 style={{ margin: '0 0 10px 0', color: p.color }}>{p.name} Plan</h3>
                            <div style={{ fontSize: '28px', fontWeight: '900' }}>{p.fee}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>/mo</span></div>
                            <p style={{ margin: '10px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>{p.comm} Commission</p>
                            
                            <div style={{ textAlign: 'left', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                                {p.perks.map(perk => <div key={perk} style={{ fontSize: '13px', marginBottom: '8px', color: '#555' }}>✅ {perk}</div>)}
                            </div>
                            
                            <button 
                                onClick={() => handleUpgrade(p.name, p.rate)}
                                disabled={isCurrentCard || isUpgrading !== null} 
                                style={{ 
                                    width: '100%', marginTop: '20px', padding: '12px', borderRadius: '8px', border: 'none', 
                                    background: isCurrentCard ? '#eee' : p.color, 
                                    color: isCurrentCard ? '#999' : 'white', 
                                    fontWeight: 'bold', fontSize: '15px',
                                    cursor: (isCurrentCard || isUpgrading !== null) ? 'default' : 'pointer',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {isUpgrading === p.name ? 'Upgrading...' : (isCurrentCard ? 'Current' : 'Upgrade Now')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SellerSubscriptionView;