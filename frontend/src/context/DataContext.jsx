import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [gallery, setGallery] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true); 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchData = useCallback(async () => {
    setIsLoading(true); 
    try {
      const [mediaRes, playlistRes, deviceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/media`),
        fetch(`${API_BASE_URL}/api/playlists`),
        fetch(`${API_BASE_URL}/api/devices`)
      ]);
      const mediaData = await mediaRes.json();
      const playlistData = await playlistRes.json();
      const deviceData = await deviceRes.json();
      setGallery(Array.isArray(mediaData) ? mediaData : []);
      setPlaylists(Array.isArray(playlistData) ? playlistData : []);
      setDevices(Array.isArray(deviceData) ? deviceData : []);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
    } finally {
      setIsLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value = {
    gallery,
    playlists,
    setPlaylists,
    devices,
    fetchData,
    isLoading 
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};