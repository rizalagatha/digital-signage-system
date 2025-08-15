import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import DeviceManager from './pages/DeviceManager';
import PlaylistAndMedia from './pages/PlaylistAndMedia';
import PlayerPage from './pages/PlayerPage'; // 1. Impor komponen PlayerPage

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* 2. Tambahkan rute untuk player di sini */}
        <Route path="/player/:deviceId" element={<PlayerPage />} />
        
        {/* Rute untuk Dashboard yang dilindungi */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DataProvider>
                <DashboardLayout />
              </DataProvider>
            </ProtectedRoute>
          }
        >
          {/* Rute-rute ini akan dirender di dalam <Outlet /> DashboardLayout */}
          <Route index element={<DeviceManager />} />
          <Route path="media" element={<PlaylistAndMedia />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;