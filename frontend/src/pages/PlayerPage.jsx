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

  // useEffect HANYA untuk slideshow GAMBAR
  useEffect(() => {
    // Selalu bersihkan timer dari efek sebelumnya
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);

    // Buat variabel untuk interval 'keep-alive'
    let keepAliveInterval = null;

    const currentItem = playlist?.Media?.[currentIndex];

    // Jalankan logika ini HANYA jika item saat ini adalah gambar
    if (currentItem?.type === "image") {
      // Timer utama untuk durasi gambar
      const duration = (currentItem.PlaylistMedia?.duration || 10) * 1000;
      imageTimerRef.current = setTimeout(goToNextItem, duration);

      // "PING" KECIL UNTUK MENJAGA KONEKSI SETIAP 30 DETIK
      keepAliveInterval = setInterval(() => {
        // Kirim request kecil ke server, hasilnya kita abaikan
        fetch(`${API_BASE_URL}/api/ping`).catch(() => {});
        console.log("Ping to keep network alive..."); // Log untuk debugging
      }, 30000);
    }

    // Fungsi cleanup akan membersihkan kedua timer
    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, [currentIndex, playlist, goToNextItem, API_BASE_URL]);

  // useEffect HANYA untuk mengontrol VIDEO
  useEffect(() => {
    const currentItem = playlist?.Media?.[currentIndex];
    const videoElement = videoRef.current; // Ambil referensi saat ini

    // Variabel untuk melacak apakah cleanup sudah dijalankan
    let isCleanedUp = false;

    // Fungsi ini akan dieksekusi HANYA jika item saat ini adalah VIDEO
    const setupVideo = () => {
      if (isCleanedUp) return; // Jangan lakukan apa-apa jika sudah di-cleanup

      if (videoElement) {
        // Pasang event listener 'onended'
        const handleEnd = () => {
          if (!isCleanedUp) {
            // Pastikan hanya dijalankan sekali
            goToNextItem();
          }
        };
        videoElement.addEventListener("ended", handleEnd);

        // Coba putar video
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Hanya log error jika BUKAN karena interupsi yang disengaja
            if (error.name !== "AbortError" && !isCleanedUp) {
              console.error("Autoplay video gagal:", error);
              // Jika autoplay gagal karena alasan lain, coba lanjut
              setTimeout(goToNextItem, 500);
            }
          });
        }

        // Kembalikan fungsi cleanup spesifik untuk video ini
        return () => {
          isCleanedUp = true; // Tandai bahwa cleanup sudah berjalan
          videoElement.removeEventListener("ended", handleEnd);
          // Penting: Hentikan video saat berpindah item
          videoElement.pause();
          videoElement.src = ""; // Kosongkan sumber untuk membebaskan memori
          videoElement.load();
        };
      }
    };

    // Jalankan setup HANYA jika item adalah video
    if (currentItem?.type === "video") {
      return setupVideo(); // Jalankan setup dan kembalikan cleanup-nya
    }

    // Jika bukan video, pastikan tidak ada sisa cleanup video sebelumnya
    // (Meskipun seharusnya sudah ditangani oleh return di atas)
    return () => {
      isCleanedUp = true;
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
