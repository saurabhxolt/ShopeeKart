import React from 'react';

const SellerSubscriptionView = ({ user, isMobile, revenue }) => {
    const currentPlan = user.plan || 'Starter';

    // Break-even Math based on provided strategy
    const starterComm = revenue * 0.15;
    const growthComm = (revenue * 0.05) + 1999;
    const proComm = 4999;

    const plans = [
        { name: 'Starter', fee: '₹0', comm: '10% - 15%', color: '#6c757d', perks: ['Zero upfront risk', 'Standard Support'], calc: starterComm },
        { name: 'Growth', fee: '₹1999', comm: '5%', color: '#2874f0', perks: ['Priority support', 'Higher search ranking'], calc: growthComm },
        { name: 'Pro', fee: '₹4,999', comm: '0%', color: '#10b981', perks: ['Premium Badge', 'Top Visibility', 'Dedicated Manager'], calc: proComm }
    ];

    const potentialSavings = starterComm - Math.min(growthComm, proComm);

    return (
        <div style={{ padding: '10px' }}>
            {potentialSavings > 500 && (
                <div style={{ background: '#fff9e6', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#856404' }}>
                    <strong>🧮 Profit Alert:</strong> Based on your sales of ₹{revenue.toLocaleString()}, switching to a higher plan could have saved you approx <strong>₹{potentialSavings.toLocaleString()}</strong> in commissions last month!
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px' }}>
                {plans.map(p => (
                    <div key={p.name} style={{ background: 'white', padding: '25px', borderRadius: '12px', border: currentPlan === p.name ? `2px solid ${p.color}` : '1px solid #eee', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        {currentPlan === p.name && <div style={{ background: p.color, color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 10px', borderRadius: '10px', width: 'fit-content', margin: '0 auto 10px' }}>ACTIVE PLAN</div>}
                        <h3 style={{ margin: '0 0 10px 0', color: p.color }}>{p.name} Plan</h3>
                        <div style={{ fontSize: '28px', fontWeight: '900' }}>{p.fee}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>/mo</span></div>
                        <p style={{ margin: '10px 0', fontSize: '14px', fontWeight: '600' }}>{p.comm} Commission</p>
                        <div style={{ textAlign: 'left', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' }}>
                            {p.perks.map(perk => <div key={perk} style={{ fontSize: '13px', marginBottom: '5px' }}>✅ {perk}</div>)}
                        </div>
                        <button disabled={currentPlan === p.name} style={{ width: '100%', marginTop: '20px', padding: '10px', borderRadius: '6px', border: 'none', background: currentPlan === p.name ? '#eee' : p.color, color: currentPlan === p.name ? '#999' : 'white', fontWeight: 'bold', cursor: currentPlan === p.name ? 'default' : 'pointer' }}>
                            {currentPlan === p.name ? 'Current' : 'Upgrade Now'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SellerSubscriptionView;