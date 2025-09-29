import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css"; // Impor file CSS baru

// Komponen Ikon sederhana untuk mempercantik form
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); // State baru untuk loading
  const navigate = useNavigate();

  // Menggunakan variabel lingkungan yang benar sesuai permintaan Anda
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true); // Mulai loading
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("isLoggedIn", "true");
        navigate("/");
      } else {
        setMessage(data.message || "Terjadi kesalahan.");
      }
    } catch (error) {
      setMessage("Tidak bisa terhubung ke server. Periksa koneksi Anda.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false); // Selesai loading
    }
  };

  return (
    <div className="login-page-container">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-header">
          <h2>Signage Kencana</h2>
          <p>Silakan masuk untuk melanjutkan ke dashboard</p>
        </div>

        {message && <p className="error-message">{message}</p>}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <div className="input-wrapper">
            <UserIcon />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username Anda"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <LockIcon />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              required
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? <div className="spinner"></div> : "Login"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
