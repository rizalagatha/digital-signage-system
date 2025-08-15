import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from "socket.io-client";
import debounce from 'lodash/debounce';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PlayerPage() {
  const { deviceId } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [isFading, setIsFading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const fetchPlaylist = useCallback(async () => {
    try {
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/player/${deviceId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Playlist tidak ditemukan');
      }
      const playlistData = await response.json();
      setPlaylist(playlistData);
    } catch (err) {
      console.error("Gagal memuat playlist:", err);
      setError(err.message);
      setPlaylist(null);
    }
  }, [deviceId]);

  const debouncedFetchPlaylist = useMemo(
    () => debounce(fetchPlaylist, 2000, { leading: false, trailing: true }),
    [fetchPlaylist]
  );

  // useEffect untuk semua koneksi (data, websocket, heartbeat)
  useEffect(() => {
    fetchPlaylist();

    // Koneksi WebSocket
    const socket = io(API_BASE_URL);
    socket.on('connect', () => {
      console.log('Terhubung via WebSocket, mengirim ID:', deviceId);
      socket.emit('player:join', deviceId);
    });

    socket.on('playlist:updated', () => {
      console.log('Sinyal update diterima, menjalankan debounce...');
      debouncedFetchPlaylist();
    });

    // Heartbeat
    const sendHeartbeat = () => {
      fetch(`${API_BASE_URL}/api/devices/heartbeat/${deviceId}`, { method: 'PUT' })
        .catch(err => console.error("Gagal mengirim heartbeat:", err));
    };
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 60000);

    // Interval polling sebagai cadangan
    const playlistInterval = setInterval(fetchPlaylist, 300000);

    // Fungsi cleanup untuk semua koneksi
    return () => {
      debouncedFetchPlaylist.cancel();
      clearInterval(playlistInterval);
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [deviceId, fetchPlaylist, debouncedFetchPlaylist]);

  // Fungsi untuk pindah ke slide berikutnya
  const goToNext = useCallback(() => {
    setIsFading(true);
    const transitionTimeout = setTimeout(() => {
      if (playlist && playlist.Media && playlist.Media.length > 0) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.Media.length);
        setIsFading(false);
      }
    }, 500);
    return () => clearTimeout(transitionTimeout);
  }, [playlist]);

  // useEffect untuk slideshow otomatis (HANYA UNTUK GAMBAR)
  useEffect(() => {
    if (!playlist || !playlist.Media || playlist.Media.length === 0 || !playlist.Media[currentIndex]) {
      return;
    }
    const currentItem = playlist.Media[currentIndex];
    if (currentItem && currentItem.type === 'image') {
      const duration = (currentItem.PlaylistMedia?.duration || 10) * 1000;
      const timer = setTimeout(goToNext, duration);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, playlist, goToNext]);

  const handleUnmute = () => {
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false; // Pastikan elemen video benar-benar unmute
    }
  };

  // Tampilan saat loading atau error
  if (error) { return <div className="player-container"><p>Error: {error} (Perangkat: {deviceId})</p></div>; }
  if (!playlist) { return <div className="player-container"><p>Memuat playlist untuk perangkat: {deviceId}...</p></div>; }
  if (!playlist.Media || playlist.Media.length === 0) { return <div className="player-container"><p>Playlist ini kosong.</p></div>; }

  const currentItem = playlist.Media[currentIndex];

  return (
    <div className="player-container">

      {/* Tombol Unmute yang akan muncul dan menghilang */}
      {currentItem.type === 'video' && isMuted && (
        <button onClick={handleUnmute} className="unmute-button">
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}

      {currentItem.type === 'image' && (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.filename}
          className={`player-media ${isFading ? 'fading' : ''}`}
        />
      )}
      {currentItem.type === 'video' && (
        <video
          ref={videoRef} // Tambahkan ref di sini
          key={currentItem.id}
          src={currentItem.url}
          autoPlay
          muted={isMuted} // Atribut muted sekarang dikontrol oleh state
          loop={playlist.Media.length === 1}
          onEnded={playlist.Media.length > 1 ? goToNext : null}
          className={`player-media ${isFading ? 'fading' : ''}`}
        />
      )}
    </div>
  );
}

export default PlayerPage;