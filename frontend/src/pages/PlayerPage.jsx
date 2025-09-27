import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import debounce from "lodash/debounce";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL;

function PlayerPage() {
  const { deviceId } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const fetchPlaylist = useCallback(async () => {
    try {
      setError("");
      const response = await fetch(`${API_BASE_URL}/api/player/${deviceId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Playlist tidak ditemukan");
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

  useEffect(() => {
    fetchPlaylist();
    const socket = io(API_BASE_URL);
    socket.on("connect", () => {
      console.log("Terhubung via WebSocket, mengirim ID:", deviceId);
      socket.emit("player:join", deviceId);
    });
    socket.on("playlist:updated", () => {
      console.log("Sinyal update diterima, memuat ulang playlist...");
      debouncedFetchPlaylist();
    });
    const sendHeartbeat = () => {
      fetch(`${API_BASE_URL}/api/devices/heartbeat/${deviceId}`, {
        method: "PUT",
      }).catch((err) => console.error("Gagal mengirim heartbeat:", err));
    };
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 60000);
    const playlistInterval = setInterval(fetchPlaylist, 300000);
    return () => {
      debouncedFetchPlaylist.cancel();
      clearInterval(playlistInterval);
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [deviceId, fetchPlaylist, debouncedFetchPlaylist]);

  const goToNextItem = useCallback(() => {
    if (!playlist || !playlist.Media || playlist.Media.length === 0) return;

    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.Media.length);
      setIsFading(false);
    }, 500); // Durasi transisi fade
  }, [playlist]);

  useEffect(() => {
    if (playlist?.Media?.[currentIndex]?.type === "image") {
      const duration =
        (playlist.Media[currentIndex].PlaylistMedia?.duration || 10) * 1000;
      const timer = setTimeout(goToNextItem, duration);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, playlist, goToNextItem]);

  const handleUnmute = () => {
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  };

  if (error) {
    return (
      <div className="player-container">
        <p>
          Error: {error} (Perangkat: {deviceId})
        </p>
      </div>
    );
  }
  if (!playlist) {
    return (
      <div className="player-container">
        <p>Memuat playlist untuk perangkat: {deviceId}...</p>
      </div>
    );
  }
  if (!playlist.Media || playlist.Media.length === 0) {
    return (
      <div className="player-container">
        <p>Playlist ini kosong.</p>
      </div>
    );
  }

  const currentItem = playlist.Media[currentIndex];

  // ==========================================================
  // PERUBAHAN UTAMA ADA DI BAGIAN RENDER INI
  // ==========================================================
  return (
    <div className="player-container">
      {currentItem.type === "video" && isMuted && (
        <button onClick={handleUnmute} className="unmute-button">
          {isMuted ? "🔇" : "🔊"}
        </button>
      )}

      {/* Kita hanya me-render SATU media yang aktif saat ini */}
      {currentItem.type === "image" && (
        <img
          // KUNCI UTAMA: `key` akan memaksa React membuang elemen lama
          // dan membuat yang baru setiap kali currentIndex berubah.
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.filename}
          className={`player-media ${isFading ? "fading" : ""}`}
        />
      )}
      {currentItem.type === "video" && (
        <video
          // KUNCI UTAMA: Sama seperti gambar, `key` memastikan elemen video lama dibersihkan.
          key={currentItem.id}
          ref={videoRef}
          src={currentItem.url}
          autoPlay
          muted={isMuted}
          onEnded={goToNextItem} // Pemicu untuk pindah ke item berikutnya
          className={`player-media ${isFading ? "fading" : ""}`}
        />
      )}
    </div>
  );
}

export default PlayerPage;
