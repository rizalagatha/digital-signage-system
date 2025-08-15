// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;  

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // 1. Ubah fungsi ini untuk menerima 'event'
  const handleLogin = async (event) => {
    event.preventDefault(); // 2. Mencegah halaman refresh saat form disubmit
    setMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        navigate('/');
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Tidak bisa terhubung ke server backend.');
    }
  };

  return (
    <div className="app-container">
      {/* 3. Bungkus semua input dan button dengan <form> */}
      <form className="login-container" onSubmit={handleLogin}>
        <h1>Admin Login</h1>
        {message && <p className="error-message">{message}</p>}
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {/* 4. Pastikan tombol memiliki type="submit" */}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;