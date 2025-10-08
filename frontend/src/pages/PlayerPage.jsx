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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PlayerPage() {
  const { deviceId } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [mediaError] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  // State baru untuk mencegah transisi saat data sedang dimuat
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef(null);
  const mediaTimerRef = useRef(null);
  const socketRef = useRef(null);

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
          // Jika ini adalah update dari socket.io, jangan reset indeks jika playlist tidak berubah
          if (
            isUpdate &&
            JSON.stringify(prevPlaylist?.Media) ===
              JSON.stringify(newPlaylistData.Media)
          ) {
            return prevPlaylist;
          }
          // Jika playlist baru atau berbeda, reset ke awal
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

  const debouncedFetchPlaylist = useMemo(
    () =>
      debounce(() => fetchPlaylist(true), 2000, {
        leading: false,
        trailing: true,
      }),
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

    socketRef.current = socket;

    return () => {
      debouncedFetchPlaylist.cancel();
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [deviceId, fetchPlaylist, debouncedFetchPlaylist]);

  // Fungsi untuk pindah ke item berikutnya
  const goToNextItem = useCallback(() => {
    // Gunakan isTransitioning
    if (isTransitioning || !playlist?.Media?.length) return;

    setIsTransitioning(true); // Kunci dimulai

    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.Media.length);
      setIsTransitioning(false); // Kunci dilepas
    }, 500);
  }, [playlist, isTransitioning]);

  // useEffect untuk slideshow gambar, sekarang menggunakan Ref untuk timer
  useEffect(() => {
    // Hapus semua timer/event listener sebelumnya
    if (mediaTimerRef.current) clearTimeout(mediaTimerRef.current);
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.onended = null; // Hapus event listener lama
    }

    const currentItem = playlist?.Media?.[currentIndex];
    if (!currentItem) return;

    // Logika untuk GAMBAR
    if (currentItem.type === "image") {
      const duration = (currentItem.PlaylistMedia?.duration || 10) * 1000;
      mediaTimerRef.current = setTimeout(goToNextItem, duration);
    }
    // Logika untuk VIDEO
    else if (currentItem.type === "video") {
      if (videoElement) {
        videoElement.onended = goToNextItem; // Pasang event listener baru
        videoElement.play().catch((error) => {
          console.error(
            "Autoplay pada video gagal, melompat ke item berikutnya:",
            error
          );
          // Jika autoplay gagal (misalnya karena interaksi browser), lewati video ini
          setTimeout(goToNextItem, 500);
        });
      }
    }

    // Fungsi cleanup untuk membersihkan timer saat komponen berganti
    return () => {
      if (mediaTimerRef.current) clearTimeout(mediaTimerRef.current);
    };
  }, [currentIndex, playlist, goToNextItem]);

  const handleUnmute = () => {
    setIsMuted(false);
    if (videoRef.current) videoRef.current.muted = false;
  };

  // Tampilan saat loading atau error
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

  if (!currentItem) {
    return (
      <div className="player-container">
        <p>Playlist valid, menunggu item media...</p>
      </div>
    );
  }

  return (
    <div className="player-container">
      {currentItem.type === "video" && isMuted && (
        <button onClick={handleUnmute} className="unmute-button">
          {isMuted ? "🔇" : "🔊"}
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
          onEnded={goToNextItem}
          onError={(e) => {
            console.error("PLAYER ERROR: Gagal memuat media", {
              url: currentItem.url,
              errorCode: e.target.error?.code,
            });
            setTimeout(goToNextItem, 1000);
          }}
          className={`player-media ${isTransitioning ? "fading" : ""}`}
        />
      )}
    </div>
  );
}

export default PlayerPage;
