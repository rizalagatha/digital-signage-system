import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { FixedSizeGrid as Grid } from "react-window";

const MySwal = withReactContent(Swal);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Anda bisa mengimpor kembali komponen-komponen lama jika mau, atau gabungkan di sini
// Untuk kesederhanaan, kita gabungkan
const SortablePlaylistItem = React.memo(function SortablePlaylistItem({
  id,
  item,
  index,
  onDurationChange,
  onRemoveItem,
  onPreviewClick,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "5px",
    padding: "5px",
    border: "1px solid #f0f0f0",
    backgroundColor: "white",
  };

  return (
    // div utama TIDAK lagi memiliki {...listeners}
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* 1. BUAT AREA KHUSUS UNTUK DRAG HANDLE */}
      <span
        {...listeners}
        style={{ padding: "8px", cursor: "grab", touchAction: "none" }}
      >
        ⠿
      </span>

      <div
        onClick={() => onPreviewClick(item)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexGrow: 1,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "40px",
            backgroundColor: "black",
            flexShrink: 0,
          }}
        >
          {item.type === "image" ? (
            <img
              src={item.url}
              loading="lazy"
              alt={item.filename}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <video
              src={item.url}
              preload="metadata"
              muted
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
        <span style={{ fontSize: "12px" }}>{item.filename}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {item.type === "image" && (
          <input
            type="number"
            value={item.duration}
            onChange={(e) => onDurationChange(index, e.target.value)}
            style={{ width: "60px" }}
          />
        )}
        {/* 2. TOMBOL DELETE TIDAK PERLU LAGI e.stopPropagation() */}
        <button
          onClick={() => onRemoveItem(item.id)}
          style={{
            width: "auto",
            backgroundColor: "#6c757d",
            padding: "2px 8px",
          }}
        >
          X
        </button>
      </div>
    </div>
  );
});

function PlaylistAndMedia() {
  const { gallery, playlists, setPlaylists, fetchData, isLoading } = useData();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewingMedia, setPreviewingMedia] = useState(null);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");

  useEffect(() => {
    if (selectedPlaylist) {
      const updatedPlaylist = playlists.find(
        (p) => p.id === selectedPlaylist.id
      );
      if (updatedPlaylist && updatedPlaylist.Media) {
        const itemsWithCorrectData = updatedPlaylist.Media.map((media) => ({
          ...media,
          url: media.url || `${API_BASE_URL}/uploads/${media.filename}`,
          duration: media.PlaylistMedia?.duration || 5,
        }));
        setPlaylistItems(itemsWithCorrectData);
      } else {
        setPlaylistItems([]);
      }
    } else {
      setPlaylistItems([]);
    }
  }, [selectedPlaylist, playlists]);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);

  const handleUpload = async () => {
    if (!selectedFile) {
      MySwal.fire({
        icon: "warning",
        title: "Oops...",
        text: "Pilih file terlebih dahulu!",
      });
      return;
    }

    const formData = new FormData();
    formData.append("mediafile", selectedFile);

    MySwal.fire({
      title: "Mengunggah...",
      text: "Mohon tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        MySwal.showLoading();
      },
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        MySwal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "File Anda telah berhasil di-upload.",
        });
        fetchData();
      } else {
        throw new Error("Gagal mengunggah file.");
      }
    } catch (error) {
      MySwal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message || "Tidak bisa terhubung ke server.",
      });
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName)
      return toast.warn("Nama playlist tidak boleh kosong!");
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName }),
      });
      if (res.ok) {
        toast.success(`Playlist "${newPlaylistName}" berhasil dibuat!`);
        setNewPlaylistName("");
        await fetchData();
      } else {
        toast.error("Gagal membuat playlist.");
      }
    } catch (error) {
      toast.error("Gagal terhubung ke server.");
      console.error("Gagal membuat playlist:", error);
    }
  };

  const handleDeletePlaylist = (playlistId) => {
    MySwal.fire({
      title: "Anda Yakin?",
      text: "Playlist yang dihapus tidak bisa dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`${API_BASE_URL}/api/playlists/${playlistId}`, {
            method: "DELETE",
          });
          MySwal.fire(
            "Dihapus!",
            "Playlist Anda telah berhasil dihapus.",
            "success"
          );
          setSelectedPlaylist(null);
          fetchData();
        } catch {
          MySwal.fire(
            "Gagal!",
            "Terjadi kesalahan saat menghapus playlist.",
            "error"
          );
        }
      }
    });
  };

  const handleDeleteMedia = (mediaId) => {
    MySwal.fire({
      title: "Anda Yakin?",
      text: "Media ini akan dihapus secara permanen dari server dan galeri!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus permanen!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/media/${mediaId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            throw new Error("Gagal menghapus file di server.");
          }

          MySwal.fire(
            "Dihapus!",
            "Media Anda telah berhasil dihapus.",
            "success"
          );

          await fetchData(); // Refresh data setelah notifikasi sukses
        } catch (error) {
          console.error("Gagal menghapus media:", error);
          MySwal.fire(
            "Gagal!",
            "Terjadi kesalahan saat menghapus media.",
            "error"
          );
        }
      }
    });
  };

  const handleAddItemToPlaylist = async (mediaId) => {
    if (!selectedPlaylist) {
      toast.warn("Pilih sebuah playlist terlebih dahulu!");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/playlists/${selectedPlaylist.id}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        }
      );

      if (res.ok) {
        toast.success("Media berhasil ditambahkan!");

        // Logika refresh dinamis
        const newPlaylistsRes = await fetch(`${API_BASE_URL}/api/playlists`);
        const newPlaylists = await newPlaylistsRes.json();
        setPlaylists(newPlaylists);
        const updatedPlaylist = newPlaylists.find(
          (p) => p.id === selectedPlaylist.id
        );
        setSelectedPlaylist(updatedPlaylist || null);
      } else {
        toast.error("Gagal menambahkan media.");
      }
    } catch (error) {
      toast.error("Gagal terhubung ke server.");
      console.error("Error:", error);
    }
  };

  const handleRemoveMediaFromPlaylist = (mediaId) => {
    if (!selectedPlaylist) return; // Pengecekan awal

    MySwal.fire({
      title: "Hapus Item Ini?",
      text: "Media hanya akan dihapus dari playlist ini, tidak dari galeri.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/playlists/${selectedPlaylist.id}/media/${mediaId}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error("Gagal menghapus item dari server.");

          // Panggil fetchData untuk refresh semua data secara dinamis
          await fetchData();

          // Tidak perlu notifikasi sukses karena UI langsung ter-update
          // Tapi jika Anda mau, bisa tambahkan toast.success('Item dihapus');
        } catch (error) {
          console.error("Gagal menghapus item:", error);
          MySwal.fire(
            "Gagal!",
            "Terjadi kesalahan saat menghapus item dari playlist.",
            "error"
          );
        }
      }
    });
  };

  const openPreview = (media) => setPreviewingMedia(media);
  const closePreview = () => setPreviewingMedia(null);

  const handleDurationChange = (index, newDuration) => {
    const updatedItems = [...playlistItems];
    updatedItems[index].duration = parseInt(newDuration, 10) || 5;
    setPlaylistItems(updatedItems);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPlaylistItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedPlaylist) return;
    const itemsToSave = playlistItems.map((item) => ({
      mediaId: item.id,
      duration: item.duration,
    }));
    try {
      await fetch(`${API_BASE_URL}/api/playlists/${selectedPlaylist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });
      toast.success("Perubahan berhasil disimpan!");
      fetchData();
    } catch {
      toast.error("Gagal menyimpan perubahan.");
    }
  };

  const filteredPlaylists = playlists.filter((pl) =>
    pl.name.toLowerCase().includes(playlistSearch.toLowerCase())
  );
  const filteredGallery = useMemo(
    () =>
      gallery.filter((item) =>
        item.filename.toLowerCase().includes(mediaSearch.toLowerCase())
      ),
    [gallery, mediaSearch]
  );

  const GalleryCell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 4 + columnIndex; // 4 adalah jumlah kolom
    const item = filteredGallery[index];
    if (!item) return null; // Jangan render sel kosong di baris terakhir

    return (
      <div style={style}>
        <div style={{ padding: "10px" }}>
          <div
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              borderRadius: "8px",
              position: "relative",
            }}
          >
            <button
              onClick={() => handleDeleteMedia(item.id)}
              style={{
                position: "absolute",
                top: "5px",
                right: "5px",
                zIndex: 1,
                // Ukuran
                width: "22px",
                height: "22px",
                padding: "0",
                fontSize: "14px",
                // Tampilan
                backgroundColor: "rgba(220, 53, 69, 0.8)", // Merah dengan sedikit transparan
                color: "white",
                border: "1px solid white",
                borderRadius: "50%", // Lingkaran sempurna
                cursor: "pointer",
                // Posisi 'x' di tengah
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              x
            </button>
            <div
              onClick={() => openPreview(item)}
              style={{
                width: "150px",
                height: "100px",
                backgroundColor: "#000",
                marginBottom: "10px",
                cursor: "pointer",
              }}
            >
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt={item.filename}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <video
                  src={item.url}
                  preload="metadata"
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <p
              style={{
                fontSize: "12px",
                wordBreak: "break-all",
                height: "32px",
              }}
            >
              {item.filename}
            </p>
            <button
              onClick={() => handleAddItemToPlaylist(item.id)}
              style={{ width: "100%" }}
            >
              + Tambah
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" }}
      >
        <div
          className="playlist-column"
          style={{ background: "white", padding: "20px", borderRadius: "8px" }}
        >
          <h2>Manajemen Playlist</h2>
          <form
            onSubmit={handleCreatePlaylist}
            style={{
              marginBottom: "20px",
              padding: "15px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Nama Playlist Baru"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              style={{ width: "calc(100% - 70px)" }}
              required
            />
            {/* 2. UBAH TIPE BUTTON MENJADI "submit" */}
            <button type="submit" style={{ marginLeft: "10px", width: "60px" }}>
              Buat
            </button>
          </form>
          <div className="playlist-list">
            <h3>Daftar Playlist</h3>
            <input
              type="text"
              placeholder="Cari playlist..."
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              style={{ padding: "8px", width: "95%", marginBottom: "10px" }}
            />
            {filteredPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylist(pl)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  border: "1px solid #eee",
                  marginBottom: "5px",
                  cursor: "pointer",
                  backgroundColor:
                    selectedPlaylist?.id === pl.id ? "#e0f7fa" : "white",
                }}
              >
                <span>
                  {pl.name} ({pl.Media ? pl.Media.length : 0} item)
                </span>
                <button
                  onClick={() => handleDeletePlaylist(pl.id)}
                  style={{
                    width: "auto",
                    backgroundColor: "#dc3545",
                    marginLeft: "10px",
                    padding: "2px 8px",
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <hr style={{ margin: "20px 0" }} />
          <h3>
            Isi Playlist:{" "}
            {selectedPlaylist ? selectedPlaylist.name : "(Pilih playlist)"}
          </h3>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={playlistItems}
              strategy={verticalListSortingStrategy}
            >
              {playlistItems.map((item, index) => (
                <SortablePlaylistItem
                  key={item.id}
                  id={item.id}
                  item={item}
                  index={index}
                  onDurationChange={handleDurationChange}
                  onRemoveItem={handleRemoveMediaFromPlaylist}
                  onPreviewClick={openPreview}
                />
              ))}
            </SortableContext>
          </DndContext>
          {selectedPlaylist && (
            <button
              onClick={handleSaveChanges}
              style={{ width: "100%", marginTop: "20px", padding: "10px" }}
            >
              Simpan Perubahan Playlist
            </button>
          )}
        </div>

        {/* === KOLOM KANAN: UPLOAD & GALERI MEDIA === */}
        <div className="media-column">
          <div
            className="upload-section"
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "30px",
            }}
          >
            <h3>Upload Media Baru</h3>
            <input type="file" onChange={handleFileChange} />
            <button
              onClick={handleUpload}
              style={{ marginLeft: "10px", width: "auto" }}
            >
              Upload
            </button>
          </div>

          <div
            className="gallery-section"
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h2>Galeri Media</h2>
            <input
              type="text"
              placeholder="Cari media..."
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              style={{ padding: "8px", width: "97%", marginBottom: "20px" }}
            />

            <Grid
              columnCount={4}
              columnWidth={190}
              height={600}
              rowCount={Math.ceil(filteredGallery.length / 4)}
              rowHeight={220}
              width={800} // Sesuaikan lebar ini jika perlu
            >
              {GalleryCell}
            </Grid>
          </div>
        </div>
      </div>

      {/* === MODAL PREVIEW === */}
      {previewingMedia && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePreview}>
              X
            </button>
            {previewingMedia.type === "image" ? (
              <img src={previewingMedia.url} alt="Preview" />
            ) : (
              <video
                key={previewingMedia.id}
                src={previewingMedia.url}
                controls
                autoPlay
                muted
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PlaylistAndMedia;
