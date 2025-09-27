import React, { useState, useEffect, useContext, createContext } from "react";
import { useData } from "../context/DataContext";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import "./DeviceManager.css"; // Pastikan file CSS ini ada

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

  const handleRegisterDevice = ({ name, deviceId }) => {
    console.log("Mendaftarkan perangkat:", { name, deviceId });
    // TODO: Ganti dengan logika fetch API Anda, termasuk notifikasi toast
  };

  const handleAssignPlaylist = (deviceId, playlistId) => {
    console.log(`Menugaskan playlist ${playlistId} ke perangkat ${deviceId}`);
    // TODO: Ganti dengan logika fetch API Anda
  };

  const handleDeleteDevice = (device) => {
    console.log(`Menghapus perangkat: ${device.name}`);
    // TODO: Ganti dengan logika fetch API Anda, termasuk konfirmasi Swal
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
