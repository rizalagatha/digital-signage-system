import React, { useState, useEffect } from "react";
// Impor 'useData' dari DataContext asli Anda
import { useData } from "../context/DataContext";
// Impor 'LoadingSpinner' dari komponen asli Anda
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import "./DeviceManager.css";

function DeviceManager() {
  // Kode ini sekarang akan mengambil data asli dari DataContext Anda
  const { devices, fetchData, isLoading } = useData();
  const [now, setNow] = useState(new Date());

  // State lokal untuk komponen ini
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Efek untuk timer yang memperbarui waktu dinamis
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
        ? { text: "Online", color: "#28a745" }
        : { text: "Offline", color: "#dc3545" };
    const timeAgo =
      diffMinutes < 1
        ? "Baru saja"
        : formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: id });

    return { ...status, timeAgo };
  };

  const handleRegisterDevice = (e) => {
    e.preventDefault();
    console.log("Mendaftarkan perangkat:", { newDeviceName, newDeviceId });
    // TODO: Tambahkan logika fetch API untuk register...
    setNewDeviceName("");
    setNewDeviceId("");
  };

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="device-manager-container">
      <h1>Manajemen Perangkat TV</h1>

      {/* KARTU 1: FORM PENDAFTARAN */}
      <div className="card">
        <h2>Daftarkan Perangkat Baru</h2>
        <form onSubmit={handleRegisterDevice} className="register-form">
          <div className="form-group">
            <label htmlFor="deviceName">Nama Perangkat</label>
            <input
              id="deviceName"
              type="text"
              placeholder="misal: TV Toko A"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="deviceId">ID Unik</label>
            <input
              id="deviceId"
              type="text"
              placeholder="misal: TV-001"
              value={newDeviceId}
              onChange={(e) => setNewDeviceId(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn">
            Daftarkan
          </button>
        </form>
      </div>

      {/* KARTU 2: DAFTAR PERANGKAT */}
      <div className="card">
        <div className="card-header">
          <h2>Daftar Perangkat</h2>
          <input
            type="text"
            placeholder="Cari perangkat..."
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
                <th>Playlist Aktif</th>
                <th>Terakhir Dilihat</th>
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
                    <td>{device.Playlist ? device.Playlist.name : "–"}</td>
                    <td
                      title={
                        device.lastSeen
                          ? new Date(device.lastSeen).toLocaleString("id-ID")
                          : ""
                      }
                    >
                      {timeAgo}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DeviceManager;
