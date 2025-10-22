import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./PlayerPage.css"; // Tetap gunakan CSS

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PlayerPage() {
  const { deviceId } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(true); // State unmute kembali
  const videoRef = useRef(null);
  const imageTimerRef = useRef(null);

  // 1. Fetch data hanya sekali saat komponen dimuat
  useEffect(() => {
    const fetchInitialPlaylist = async () => {
      try {
        setError("");
        const response = await fetch(`${API_BASE_URL}/api/player/${deviceId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Playlist tidak ditemukan");
        }
        const playlistData = await response.json();
        setPlaylist(playlistData);
        setCurrentIndex(0);
      } catch (err) {
        console.error("Gagal memuat playlist:", err);
        setError(err.message);
        setPlaylist(null);
      }
    };
    fetchInitialPlaylist();
  }, [deviceId]);

  // 2. Fungsi sederhana untuk pindah ke item berikutnya
  const goToNext = useCallback(() => {
    if (!playlist?.Media?.length) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.Media.length);
  }, [playlist?.Media?.length, setCurrentIndex]);

  // 3. useEffect HANYA untuk timer gambar
  useEffect(() => {
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);

    const currentItem = playlist?.Media?.[currentIndex];

    if (currentItem?.type === "image") {
      const duration = (currentItem.PlaylistMedia?.duration || 10) * 1000;
      imageTimerRef.current = setTimeout(goToNext, duration);
    }

    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    };
  }, [currentIndex, playlist, goToNext]);

  // Fungsi handleUnmute kembali
  const handleUnmute = () => {
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  };

  // --- Render ---
  if (error)
    return (
      <div className="player-container">
        <p>
          Error: {error} (Perangkat: {deviceId})
        </p>
      </div>
    );
  if (!playlist)
    return (
      <div className="player-container">
        <p>Memuat playlist...</p>
      </div>
    );
  if (!playlist.Media || playlist.Media.length === 0)
    return (
      <div className="player-container">
        <p>Playlist kosong.</p>
      </div>
    );

  const currentItem = playlist.Media[currentIndex];
  if (!currentItem)
    return (
      <div className="player-container">
        <p>Memuat media...</p>
      </div>
    );

  return (
    <div className="player-container">
      {/* Tombol Unmute kembali */}
      {currentItem.type === "video" && isMuted && (
        <button onClick={handleUnmute} className="unmute-button">
          🔇
        </button>
      )}

      {currentItem.type === "image" && (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.filename}
          className="player-media"
        />
      )}
      {currentItem.type === "video" && (
        <video
          key={currentItem.id}
          ref={videoRef}
          src={currentItem.url}
          autoPlay
          muted={isMuted} // Gunakan state isMuted
          onEnded={goToNext}
          onError={() => {
            console.error("Gagal memuat video:", currentItem.url);
            goToNext();
          }}
          className="player-media"
        />
      )}
    </div>
  );
}

export default PlayerPage;
