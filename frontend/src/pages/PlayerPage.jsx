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
import "./PlayerPage.css";

// Pastikan variabel ini sudah benar di file .env Anda
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PlayerPage() {
  const { deviceId } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef(null);
  const imageTimerRef = useRef(null);
  const socketRef = useRef(null);

  // Fungsi untuk mengambil data playlist
  const fetchPlaylist = useCallback(
    async (isUpdate = false) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/player/${deviceId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Playlist tidak ditemukan");
        }
        const newPlaylistData = await response.json();

        setPlaylist((prevPlaylist) => {
          if (
            isUpdate &&
            JSON.stringify(prevPlaylist?.Media) ===
              JSON.stringify(newPlaylistData.Media)
          ) {
            return prevPlaylist;
          }
          setCurrentIndex(0);
          return newPlaylistData;
        });
        setError("");
      } catch (err) {
        console.error("Gagal memuat playlist:", err);
        setError(err.message);
        setPlaylist(null);
      }
    },
    [deviceId]
  );

  // Fungsi debounce untuk fetch data
  const debouncedFetchPlaylist = useMemo(
    () =>
      debounce(() => fetchPlaylist(true), 2000, {
        leading: false,
        trailing: true,
      }),
    [fetchPlaylist]
  );

  // useEffect untuk koneksi, heartbeat, dan update playlist
  useEffect(() => {
    fetchPlaylist(); // Ambil data saat pertama kali dimuat
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

    socketRef.current = socket;

    return () => {
      debouncedFetchPlaylist.cancel();
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [deviceId, fetchPlaylist, debouncedFetchPlaylist]);

  // useEffect untuk registrasi Service Worker (jika Anda masih menggunakannya)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker berhasil didaftarkan:", registration);
        })
        .catch((error) => {
          console.error("Pendaftaran Service Worker gagal:", error);
        });
    }
  }, []);

  // Fungsi untuk pindah ke item berikutnya
  const goToNextItem = useCallback(() => {
    if (isTransitioning || !playlist?.Media?.length) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.Media.length);
      setIsTransitioning(false);
    }, 500);
  }, [playlist, isTransitioning]);

  // useEffect untuk mengelola logika pemutaran (gambar & video)
  useEffect(() => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
    if (window.playerKeepAliveInterval) {
      clearInterval(window.playerKeepAliveInterval);
      window.playerKeepAliveInterval = null;
    }

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.onended = null;
      videoElement.onerror = null;
      if (!videoElement.paused) {
        videoElement.pause();
      }
    }

    const currentItem = playlist?.Media?.[currentIndex];
    if (!currentItem) return;

    if (currentItem.type === "image") {
      const duration = (currentItem.PlaylistMedia?.duration || 10) * 1000;
      imageTimerRef.current = setTimeout(goToNextItem, duration);

      window.playerKeepAliveInterval = setInterval(() => {
        fetch(`${API_BASE_URL}/api/ping`).catch(() => {});
      }, 30000);
    } else if (currentItem.type === "video") {
      const setupVideoTimeout = setTimeout(() => {
        const currentVideoElement = videoRef.current;
        if (currentVideoElement) {
          currentVideoElement.onended = goToNextItem;
          currentVideoElement.onerror = (e) => {
            console.error(
              "PLAYER ERROR: Gagal memuat video:",
              currentItem.url,
              e.target.error
            );
            setTimeout(goToNextItem, 1000);
          };

          const playPromise = currentVideoElement.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              if (error.name !== "AbortError") {
                console.error("Autoplay video gagal:", error);
                setTimeout(goToNextItem, 500);
              }
            });
          }
        }
      }, 100);
      imageTimerRef.current = setupVideoTimeout;
    }

    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      if (window.playerKeepAliveInterval)
        clearInterval(window.playerKeepAliveInterval);
      const videoElem = videoRef.current;
      if (videoElem && !videoElem.paused) {
        videoElem.pause();
      }
    };
  }, [currentIndex, playlist, goToNextItem, API_BASE_URL]); // API_BASE_URL ditambahkan untuk "ping"

  const handleUnmute = () => {
    setIsMuted(false);
    if (videoRef.current) videoRef.current.muted = false;
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
        <p>Memuat playlist untuk perangkat: {deviceId}...</p>
      </div>
    );
  if (!playlist.Media || playlist.Media.length === 0)
    return (
      <div className="player-container">
        <p>Playlist ini kosong.</p>
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
          className={`player-media ${isTransitioning ? "fading" : ""}`}
        />
      )}
      {currentItem.type === "video" && (
        <video
          key={currentItem.id}
          ref={videoRef}
          src={currentItem.url}
          autoPlay
          muted={isMuted}
          onError={(e) => {
            console.error(
              "PLAYER ERROR: Gagal memuat video:",
              currentItem.url,
              e.target.error
            );
            setTimeout(goToNextItem, 1000);
          }}
          className={`player-media ${isTransitioning ? "fading" : ""}`}
        />
      )}
    </div>
  );
}

export default PlayerPage;
