import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import "./DashboardLayout.css"; // Impor file CSS

// Komponen Ikon sederhana untuk UI yang lebih baik
const TvIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
    <polyline points="17 2 12 7 7 2"></polyline>
  </svg>
);
const PlaylistIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
    <path d="m10 8 6 4-6 4V8z"></path>
  </svg>
);
const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <div className="dashboard-layout">
      {/* --- SIDEBAR NAVIGASI --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">Signage Kaosan</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="nav-link">
            <TvIcon />
            <span>Perangkat TV</span>
          </NavLink>
          <NavLink to="/media" className="nav-link">
            <PlaylistIcon />
            <span>Playlist & Media</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- KONTEN UTAMA HALAMAN --- */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
