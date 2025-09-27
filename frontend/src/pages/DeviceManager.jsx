import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import LoadingSpinner from "../components/LoadingSpinner";

import { toast } from "react-toastify";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const MySwal = withReactContent(Swal);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function DeviceManager() {
  const { devices, playlists, fetchData, isLoading } = useData();
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Timer ini akan memicu update setiap 30 detik
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(intervalId); // Membersihkan timer
  }, []);

  // Fungsi untuk mendaftarkan perangkat baru
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

  // Fungsi untuk menugaskan playlist ke perangkat
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

  const getDeviceStatus = (lastSeen) => {
    if (!lastSeen) {
      return { text: "Offline", color: "#6c757d", timeAgo: "Belum pernah" };
    }

    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / (1000 * 60);

    const status =
      diffMinutes < 5
        ? { text: "Online", color: "#28a745" }
        : { text: "Offline", color: "#6c757d" };

    // Logika untuk membuat teks dinamis
    const timeAgo =
      diffMinutes < 1
        ? "Baru saja"
        : formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: id });

    return { ...status, timeAgo };
  };

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div
      className="device-section"
      style={{ padding: "20px", background: "white", borderRadius: "8px" }}
    >
      <h2>Manajemen Perangkat TV</h2>

      {/* Form untuk mendaftarkan perangkat baru */}
      <form
        onSubmit={handleRegisterDevice}
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Nama Perangkat (misal: TV Toko A)"
          value={newDeviceName}
          onChange={(e) => setNewDeviceName(e.target.value)}
          style={{
            flexGrow: 1,
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          required
        />
        <input
          type="text"
          placeholder="ID Unik (misal: TV-001)"
          value={newDeviceId}
          onChange={(e) => setNewDeviceId(e.target.value)}
          style={{
            flexGrow: 1,
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          required
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            border: "none",
            background: "#007bff",
            color: "white",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Daftarkan
        </button>
      </form>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Cari nama perangkat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: "8px", width: "300px" }}
        />
      </div>

      {/* Tabel untuk menampilkan daftar perangkat */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2", textAlign: "left" }}>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>
              Status
            </th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>
              Nama Perangkat
            </th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>
              ID Unik
            </th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>
              Terakhir Dilihat
            </th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>
              Playlist Aktif
            </th>
            <th
              style={{
                padding: "10px",
                border: "1px solid #ddd",
                width: "200px",
              }}
            >
              {/* Tambah width */}
              Tugaskan Playlist
            </th>
            <th
              style={{
                padding: "10px",
                border: "1px solid #ddd",
                textAlign: "center",
              }}
            >
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredDevices.map((device) => {
            const { text, color, timeAgo } = getDeviceStatus(device.lastSeen);
            return (
              <tr key={device.id}>
                {/* Kolom Status (sudah benar) */}
                <td
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  <span
                    style={{
                      height: "10px",
                      width: "10px",
                      backgroundColor: color,
                      borderRadius: "50%",
                      display: "inline-block",
                      marginRight: "8px",
                    }}
                  ></span>
                  {text}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {device.name}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  <code>{device.deviceId}</code>
                </td>
                <td
                  style={{ padding: "10px", border: "1px solid #ddd" }}
                  title={
                    device.lastSeen
                      ? new Date(device.lastSeen).toLocaleString("id-ID")
                      : ""
                  }
                >
                  {timeAgo}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {device.Playlist ? device.Playlist.name : "–"}
                </td>
                <td
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    whiteSpace: "nowrap",
                  }}
                >
                  {" "}
                  {/* Tambah white-space */}
                  <select
                    onChange={(e) =>
                      handleAssignPlaylist(device.id, e.target.value)
                    }
                    value={device.PlaylistId || ""}
                    style={{
                      padding: "5px",
                      width: "calc(100% - 70px)",
                    }} /* Kurangi lebar untuk memberi ruang */
                  >
                    <option value="">- Lepaskan Playlist -</option>
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  {" "}
                  {/* Tambah flex layout */}
                  <button
                    onClick={() => handleDeleteDevice(device.id)}
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DeviceManager;
