import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import "./DeviceManager.css"; // Pastikan file CSS ini ada

const MySwal = withReactContent(Swal);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Komponen Modal untuk Form Pendaftaran
const RegisterDeviceModal = ({ isOpen, onClose, onRegister }) => {
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister({ name, deviceId });
    // Kosongkan form & tutup modal setelah submit
    setName("");
    setDeviceId("");
    onClose();
  };

  // Tambahkan handler untuk menutup modal saat ESC ditekan
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.keyCode === 27) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      // Cegah scroll pada body saat modal terbuka
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2>Daftarkan Perangkat Baru</h2>
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="deviceName">Nama Perangkat</label>
            <input
              id="deviceName"
              type="text"
              placeholder="misal: TV Toko A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="deviceId">ID Unik</label>
            <input
              id="deviceId"
              type="text"
              placeholder="misal: TV-001"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              Daftarkan Perangkat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function DeviceManager() {
  const { devices, playlists, fetchData, isLoading } = useData();
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // State untuk mengontrol modal

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(intervalId);
  }, []);

  const getDeviceStatus = (lastSeen) => {
    if (!lastSeen)
      return { text: "Offline", color: "#6c757d", timeAgo: "Belum pernah" };
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / (1000 * 60);
    const status =
      diffMinutes < 5
        ? { text: "Online", color: "#1e8e3e" }
        : { text: "Offline", color: "#d93025" };
    const timeAgo =
      diffMinutes < 1
        ? "Baru saja"
        : formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: id });
    return { ...status, timeAgo };
  };

  const handleRegisterDevice = async (event) => {
    event.preventDefault();

    if (!newDeviceName || !newDeviceId) {
      // Tidak perlu alert/toast, karena atribut 'required' pada input sudah menangani ini
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeviceName, deviceId: newDeviceId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal mendaftarkan perangkat.");
      }

      MySwal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Perangkat "${newDeviceName}" telah berhasil didaftarkan.`,
        timer: 2000, // Pop-up akan tertutup setelah 2 detik
        showConfirmButton: false,
      });
      setNewDeviceName("");
      setNewDeviceId("");
      fetchData();
    } catch (error) {
      console.error("Gagal mendaftarkan perangkat", error);
      MySwal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message,
      });
    }
  };

  const handleAssignPlaylist = async (deviceId, playlistId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/devices/${deviceId}/assign`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: playlistId || null }),
        }
      );

      if (!res.ok) throw new Error("Gagal menugaskan playlist");

      // Beri notifikasi singkat menggunakan toast
      toast.info("Playlist berhasil diperbarui.");
      await fetchData();
    } catch (error) {
      console.error("Gagal menugaskan playlist", error);
      toast.error("Gagal menugaskan playlist.");
    }
  };

  const handleDeleteDevice = (deviceId) => {
    MySwal.fire({
      title: "Anda Yakin?",
      text: "Perangkat ini akan dihapus secara permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/devices/${deviceId}`, {
            method: "DELETE",
          });

          if (!res.ok) throw new Error("Gagal menghapus perangkat di server.");

          MySwal.fire(
            "Dihapus!",
            "Perangkat telah berhasil dihapus.",
            "success"
          );
          await fetchData(); // Refresh data setelah notifikasi sukses
        } catch (error) {
          console.error("Gagal menghapus perangkat:", error);
          MySwal.fire(
            "Gagal!",
            "Terjadi kesalahan saat menghapus perangkat.",
            "error"
          );
        }
      }
    });
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <RegisterDeviceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRegister={handleRegisterDevice}
      />
      <div className="device-manager-container">
        <div className="page-header">
          <h1>Manajemen Perangkat TV</h1>
          {/* Pindahkan button langsung ke header tanpa wrapper form-actions */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="add-device-btn"
          >
            + Daftarkan Perangkat
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Daftar Perangkat ({devices.length})</h2>
            <input
              type="text"
              placeholder="Cari nama atau ID perangkat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nama Perangkat</th>
                  <th>ID Unik</th>
                  <th>Terakhir Dilihat</th>
                  <th style={{ width: "220px" }}>Tugaskan Playlist</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const { text, color, timeAgo } = getDeviceStatus(
                    device.lastSeen
                  );
                  return (
                    <tr key={device.id}>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: color }}
                        >
                          {text}
                        </span>
                      </td>
                      <td className="device-name">{device.name}</td>
                      <td>
                        <code>{device.deviceId}</code>
                      </td>
                      <td
                        title={
                          device.lastSeen
                            ? new Date(device.lastSeen).toLocaleString("id-ID")
                            : ""
                        }
                      >
                        {timeAgo}
                      </td>
                      <td>
                        <select
                          className="playlist-select"
                          value={device.PlaylistId || ""}
                          onChange={(e) =>
                            handleAssignPlaylist(device.id, e.target.value)
                          }
                        >
                          <option value="">- Lepaskan Playlist -</option>
                          {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteDevice(device)}
                          className="delete-btn"
                          title="Hapus Perangkat"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeviceManager;
