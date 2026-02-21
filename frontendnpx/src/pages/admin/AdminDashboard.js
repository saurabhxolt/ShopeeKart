import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ user }) {
  const [allSellers, setAllSellers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const fetchData = async () => {
    try {
      const sellerRes = await axios.get('http://localhost:7071/api/GetSellers?all=true');
      setAllSellers(sellerRes.data);
      
      const userRes = await axios.get('http://localhost:7071/api/GetUsers');
      setAllUsers(userRes.data);
    } catch (err) {
      console.error("Failed to load admin data");
    }
  };

  const handleAction = async (action, targetId) => {
    if (action === 'DELETE_USER') {
      if (!window.confirm("⚠️ Are you sure? This will 'Soft Delete' the user and hide their data.")) return;
    }

    try {
      await axios.post('http://localhost:7071/api/super-task', { action, targetId });
      alert("Success!");
      fetchData(); 
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getRowStyle = (isDeleted) => ({
    background: isDeleted ? '#f5f5f5' : 'white',
    color: isDeleted ? '#999' : '#333',
    borderBottom: '1px solid #eee',
    opacity: isDeleted ? 0.8 : 1
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* --- SECTION 1: SHOP APPROVALS --- */}
      <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '10px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#0d47a1', marginTop: 0 }}>🛡️ Shop Approval Control</h2>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1976d2', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Store Name</th>
              <th style={{ padding: '12px' }}>Owner</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allSellers.map((s) => (
              <tr key={s.SellerId} style={getRowStyle(s.IsDeleted)}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.StoreName}</td>
                <td style={{ padding: '12px' }}>{s.FullName}</td>
                <td style={{ padding: '12px' }}>{s.Email}</td>
                <td style={{ fontWeight: 'bold' }}>
                  {s.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : 
                   s.IsApproved ? <span style={{color:'green'}}>✅ Active</span> : 
                   <span style={{color:'orange'}}>⏳ Pending</span>}
                </td>
                <td>
                  {!s.IsDeleted && (
                    <>
                      {!s.IsApproved && (
                        <button onClick={() => handleAction('APPROVE', s.SellerId)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor:'pointer', marginRight: '8px' }}>
                          Approve
                        </button>
                      )}
                      {s.IsApproved && (
                        <button onClick={() => handleAction('BAN', s.SellerId)} style={{ background: '#ffc107', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor:'pointer', marginRight: '8px' }}>
                          Ban Shop
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- SECTION 2: SELLER USER ACCOUNTS --- */}
      <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '10px', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#856404', marginTop: 0 }}>🏪 Seller User Management</h2>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#ffc107', textAlign: 'left', color: '#333' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th>Account Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.filter(u => u.Role === 'SELLER').map((u) => (
              <tr key={u.UserId} style={getRowStyle(u.IsDeleted)}>
                <td style={{ padding: '12px' }}>{u.FullName}</td>
                <td style={{ padding: '12px' }}>{u.Email}</td>
                <td style={{ fontWeight: 'bold' }}>
                  {u.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : <span style={{color:'green'}}>✅ Active</span>}
                </td>
                <td style={{ textAlign: 'center', padding: '12px' }}>
                  {!u.IsDeleted && (
                    <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleAction('DELETE_USER', u.UserId)}>
                      Delete User
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- SECTION 3: BUYER ACCOUNTS --- */}
      <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#0c5460', marginTop: 0 }}>🛍️ Buyer Account Management</h2>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#17a2b8', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.filter(u => u.Role === 'BUYER').map((u) => (
              <tr key={u.UserId} style={getRowStyle(u.IsDeleted)}>
                <td style={{ padding: '12px' }}>{u.FullName}</td>
                <td>{u.Email}</td>
                <td style={{ fontWeight: 'bold' }}>
                  {u.IsDeleted ? <span style={{color:'red'}}>🔴 Deleted</span> : 
                   u.IsBanned ? <span style={{color:'orange'}}>⛔ Banned</span> : 
                   <span style={{color:'green'}}>✅ Active</span>}
                </td>
                <td style={{ textAlign: 'center', padding: '12px' }}>
                  {!u.IsDeleted && (
                    <>
                      <button 
                        onClick={() => handleAction(u.IsBanned ? 'UNBAN_USER' : 'BAN_USER', u.UserId)}
                        style={{ background: u.IsBanned ? '#28a745' : '#ffc107', color: u.IsBanned ? 'white' : 'black', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
                      >
                        {u.IsBanned ? 'Unban' : 'Ban User'}
                      </button>
                      <button style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleAction('DELETE_USER', u.UserId)}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;