import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

function DashboardLayout() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const linkStyle = { textDecoration: 'none', color: '#333', padding: '10px 15px', borderRadius: '5px' };
  const activeLinkStyle = { ...linkStyle, backgroundColor: '#e0e0e0', fontWeight: 'bold' };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      
      <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <NavLink to="/" end style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Perangkat TV
        </NavLink>
        <NavLink to="/media" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Playlist & Media
        </NavLink>
      </nav>

      {/* Konten halaman (Perangkat atau Playlist) akan dirender di sini */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;