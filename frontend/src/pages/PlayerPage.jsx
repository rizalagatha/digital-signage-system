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
  const [isMuted, setIsMuted] = useState(true);
  // State baru untuk mencegah transisi saat data sedang dimuat
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef(null);
  const imageTimerRef = useRef(null);
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

  useEffect(() => {
    // Cek apakah browser mendukung Service Worker
    if ("serviceWorker" in navigator) {
      // Daftarkan file sw.js
      navigator.serviceWorker
        .register("/sw.js") // Pastikan path '/sw.js' benar
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
    // Gunakan isTransitioning
    if (isTransitioning || !playlist?.Media?.length) return;

    setIsTransitioning(true); // Kunci dimulai

    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.Media.length);
      setIsTransitioning(false); // Kunci dilepas
    }, 500);
  }, [playlist, isTransitioning]);

  useEffect(() => {
    // 1. Logika Cleanup Universal (Dijalankan Setiap Kali Item Berubah)
    // Hapus timer gambar sebelumnya
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null; // Reset ref
    }
    // Hapus interval keep-alive sebelumnya
    // let keepAliveInterval = null; // Deklarasi di sini agar cleanup bisa akses
    if (window.playerKeepAliveInterval) {
      // Gunakan window object untuk menyimpan ID interval
      clearInterval(window.playerKeepAliveInterval);
      window.playerKeepAliveInterval = null;
    }
    // Cleanup video sebelumnya (jika ada)
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.onended = null; // Hapus listener lama
      videoElement.onerror = null; // Hapus listener error lama
      // Hentikan & kosongkan sumber video lama jika perlu (opsional tapi aman)
      if (!videoElement.paused) {
        videoElement.pause();
      }
      // videoElement.src = ""; // Bisa menyebabkan flicker, hati-hati
      // videoElement.load();
    }

    // 2. Logika Setup Berdasarkan Tipe Item Saat Ini
    const currentItem = playlist?.Media?.[currentIndex];
    if (!currentItem) return; // Keluar jika item tidak valid

    // Setup untuk GAMBAR
    if (currentItem.type === "image") {
      const duration = (currentItem.PlaylistMedia?.duration || 10) * 1000;
      imageTimerRef.current = setTimeout(goToNextItem, duration);

      // "Ping" keep-alive HANYA saat gambar ditampilkan
      window.playerKeepAliveInterval = setInterval(() => {
        fetch(`${API_BASE_URL}/api/ping`).catch(() => {});
        console.log("Ping to keep network alive...");
      }, 30000);
    }
    // Setup untuk VIDEO
    else if (currentItem.type === "video") {
      // Kita butuh sedikit jeda agar elemen video baru benar-benar siap di DOM
      // setelah React mengganti dari <img> ke <video>
      const setupVideoTimeout = setTimeout(() => {
        const currentVideoElement = videoRef.current; // Ambil ref lagi
        if (currentVideoElement) {
          // Pasang listener onended
          currentVideoElement.onended = goToNextItem;

          // Pasang listener onerror
          currentVideoElement.onerror = (e) => {
            console.error(
              "PLAYER ERROR: Gagal memuat video:",
              currentItem.url,
              e.target.error
            );
            // Di sini Anda bisa menambahkan logika retry jika mau
            setTimeout(goToNextItem, 1000); // Langsung lanjut jika error
          };

          // Coba putar video
          const playPromise = currentVideoElement.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              if (error.name !== "AbortError") {
                // Abaikan AbortError
                console.error("Autoplay video gagal:", error);
                setTimeout(goToNextItem, 500);
              }
            });
          }
        }
      }, 100); // Jeda 100ms, sesuaikan jika perlu

      // Simpan ID timeout agar bisa dibersihkan
      imageTimerRef.current = setupVideoTimeout; // Gunakan ref yang sama untuk menyimpan ID timeout
    }

    // 3. Fungsi Cleanup Utama (Dijalankan Saat Keluar Halaman atau Item Berubah)
    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      if (window.playerKeepAliveInterval)
        clearInterval(window.playerKeepAliveInterval);
      // Cleanup video (listener dihapus saat elemen video di-unmount oleh React Key)
      // Kita hanya perlu memastikan video berhenti jika sedang berjalan
      const videoElem = videoRef.current;
      if (videoElem && !videoElem.paused) {
        videoElem.pause();
      }
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
          // onEnded sekarang dikelola oleh useEffect
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
