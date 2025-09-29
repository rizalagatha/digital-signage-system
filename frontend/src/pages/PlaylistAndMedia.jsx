import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-toastify";
import axios from "axios";
import LoadingSpinner from "../components/LoadingSpinner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import "./PlaylistAndMedia.css"; // Impor file CSS

const MySwal = withReactContent(Swal);

// --- SUB-KOMPONEN ---

const SortablePlaylistItem = React.memo(
  ({ id, item, onRemoveItem, onPreviewClick, onDurationChange, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="playlist-item"
      >
        <span
          {...listeners}
          className="drag-handle"
          title="Geser untuk urutkan"
        >
          ⠿
        </span>
        <div
          onClick={() => onPreviewClick(item)}
          className="playlist-item-info"
        >
          <div className="playlist-item-thumbnail">
            {item.type === "image" ? (
              <img
                src={item.url}
                loading="lazy"
                alt={item.filename}
                className="media-thumbnail-img"
              />
            ) : (
              <video
                src={item.url}
                preload="metadata"
                muted
                className="media-thumbnail-img"
              />
            )}
          </div>
          <span className="playlist-item-filename" title={item.filename}>
            {item.filename}
          </span>
        </div>
        <div className="playlist-item-controls">
          {item.type === "image" && (
            <input
              type="number"
              value={item.duration}
              onChange={(e) => onDurationChange(index, e.target.value)}
              className="duration-input"
              onClick={(e) => e.stopPropagation()} // Mencegah preview terbuka saat klik durasi
            />
          )}
          <button
            onClick={() => onRemoveItem(item.id)}
            className="remove-item-btn"
            title="Hapus dari playlist"
          >
            ×
          </button>
        </div>
      </div>
    );
  }
);

const GalleryItem = React.memo(
  ({ item, onAddItem, onDeleteItem, onPreviewItem }) => (
    <div className="gallery-item-card">
      <div
        onClick={() => onPreviewItem(item)}
        className="gallery-item-thumbnail"
      >
        {item.type === "image" ? (
          <img
            src={item.url}
            loading="lazy"
            alt={item.filename}
            className="media-thumbnail-img"
          />
        ) : (
          <>
            <video
              src={item.url}
              preload="metadata"
              muted
              className="media-thumbnail-img"
            />
            <div className="video-icon-overlay">▶</div>
          </>
        )}
        <div className="thumbnail-overlay">
          <span className="preview-icon">👁️</span>
        </div>
      </div>
      <p className="gallery-item-filename" title={item.filename}>
        {item.filename}
      </p>
      <div className="gallery-item-actions">
        <button
          onClick={() => onAddItem(item.id)}
          className="add-to-playlist-btn"
          title="Tambah ke playlist aktif"
        >
          + Tambah
        </button>
        <button
          onClick={() => onDeleteItem(item.id)}
          className="delete-media-btn"
          title="Hapus media permanen"
        >
          Hapus
        </button>
      </div>
    </div>
  )
);

// --- KOMPONEN UTAMA ---
function PlaylistAndMedia() {
  const { gallery, playlists, fetchData, isLoading } = useData();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewingMedia, setPreviewingMedia] = useState(null);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (selectedPlaylist && playlists) {
      const updatedPlaylist = playlists.find(
        (p) => p.id === selectedPlaylist.id
      );
      if (updatedPlaylist?.Media) {
        const itemsWithDuration = updatedPlaylist.Media.map((media) => ({
          ...media,
          duration: media.PlaylistMedia?.duration || 5,
        }));
        setPlaylistItems(itemsWithDuration);
      } else {
        setPlaylistItems([]);
      }
    } else {
      setPlaylistItems([]);
    }
  }, [selectedPlaylist, playlists]);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);

  const handleUpload = async () => {
    if (!selectedFile) return toast.warn("Pilih file terlebih dahulu!");
    const formData = new FormData();
    formData.append("mediafile", selectedFile);
    try {
      await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        onUploadProgress: (e) =>
          setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      toast.success("File berhasil di-upload!");
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal mengunggah file.");
    } finally {
      setSelectedFile(null);
      if (document.getElementById("file-input"))
        document.getElementById("file-input").value = null;
      setUploadProgress(0);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName)
      return toast.warn("Nama playlist tidak boleh kosong!");
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName }),
      });
      if (!res.ok) throw new Error("Gagal membuat playlist");
      toast.success(`Playlist "${newPlaylistName}" berhasil dibuat!`);
      setNewPlaylistName("");
      await fetchData();
    } catch (error) {
      toast.error(error.message || "Gagal terhubung ke server.");
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    const result = await MySwal.fire({
      title: "Anda Yakin?",
      text: "Playlist yang dihapus tidak bisa dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });
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
  };

  const handleDeleteMedia = async (mediaId) => {
    const result = await MySwal.fire({
      title: "Anda Yakin?",
      text: "Media ini akan dihapus permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });
    if (result.isConfirmed) {
      try {
        await fetch(`${API_BASE_URL}/api/media/${mediaId}`, {
          method: "DELETE",
        });
        toast.success("Media berhasil dihapus.");
        await fetchData();
      } catch (error) {
        toast.error("Gagal menghapus media.", error);
      }
    }
  };

  const handleAddItemToPlaylist = async (mediaId) => {
    if (!selectedPlaylist)
      return toast.warn("Pilih sebuah playlist terlebih dahulu!");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/playlists/${selectedPlaylist.id}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        }
      );
      if (!res.ok) throw new Error("Gagal menambahkan media.");
      toast.success("Media berhasil ditambahkan ke playlist!");
      await fetchData();
    } catch (error) {
      toast.error(error.message || "Gagal terhubung ke server.");
    }
  };

  const handleRemoveMediaFromPlaylist = async (mediaId) => {
    if (!selectedPlaylist) return;
    try {
      await fetch(
        `${API_BASE_URL}/api/playlists/${selectedPlaylist.id}/media/${mediaId}`,
        { method: "DELETE" }
      );
      await fetchData();
      toast.info("Item dihapus dari playlist.");
    } catch (error) {
      toast.error("Gagal menghapus item dari playlist.", error);
    }
  };

  const handleDurationChange = (index, newDuration) => {
    const updatedItems = [...playlistItems];
    updatedItems[index].duration = parseInt(newDuration, 10) || 5;
    setPlaylistItems(updatedItems);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
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
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/playlists/${selectedPlaylist.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToSave }),
        }
      );
      if (!res.ok) throw new Error("Gagal menyimpan.");
      toast.update(toastId, {
        render: "Perubahan berhasil disimpan!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      await fetchData();
    } catch (error) {
      toast.update(toastId, {
        render: "Gagal menyimpan perubahan.",
        error,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
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

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="page-container playlist-media-page">
        {/* Kolom Kiri */}
        <div className="column playlist-management-column">
          <div className="card">
            <h2>Manajemen Playlist</h2>
            <form
              onSubmit={handleCreatePlaylist}
              className="create-playlist-form"
            >
              <input
                type="text"
                placeholder="Nama Playlist Baru..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                required
              />
              <button type="submit">Buat</button>
            </form>
            <hr />
            <input
              type="text"
              placeholder="Cari playlist..."
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              className="search-input"
            />
            <div className="playlist-list">
              {filteredPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className={`playlist-list-item ${
                    selectedPlaylist?.id === pl.id ? "active" : ""
                  }`}
                >
                  <span>
                    {pl.name} ({pl.Media?.length || 0} item)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(pl.id);
                    }}
                    className="delete-playlist-btn"
                    title="Hapus playlist"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card playlist-editor">
            <h3>
              Isi Playlist:{" "}
              {selectedPlaylist
                ? `"${selectedPlaylist.name}"`
                : "(Pilih playlist)"}
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={playlistItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="playlist-items-container">
                  {playlistItems.length > 0 ? (
                    playlistItems.map((item, index) => (
                      <SortablePlaylistItem
                        key={item.id}
                        id={item.id}
                        item={item}
                        index={index}
                        onRemoveItem={handleRemoveMediaFromPlaylist}
                        onPreviewClick={setPreviewingMedia}
                        onDurationChange={handleDurationChange}
                      />
                    ))
                  ) : (
                    <p className="empty-state">
                      Playlist ini kosong. <br /> Tambahkan media dari galeri di
                      sebelah kanan.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
            {selectedPlaylist && (
              <button onClick={handleSaveChanges} className="save-playlist-btn">
                Simpan Perubahan
              </button>
            )}
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="column media-gallery-column">
          <div className="card upload-section">
            <h3>Upload Media Baru</h3>
            <div className="upload-controls">
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                className="file-input"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploadProgress > 0}
                className="upload-btn"
              >
                {uploadProgress > 0
                  ? `Mengunggah... ${uploadProgress}%`
                  : "Upload"}
              </button>
            </div>
            {uploadProgress > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-bar-inner"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>

          <div className="card gallery-section">
            <h2>Galeri Media</h2>
            <input
              type="text"
              placeholder="Cari media..."
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              className="search-input"
            />
            <div className="gallery-grid">
              {filteredGallery.length > 0 ? (
                filteredGallery.map((item) => (
                  <GalleryItem
                    key={item.id}
                    item={item}
                    onAddItem={handleAddItemToPlaylist}
                    onDeleteItem={handleDeleteMedia}
                    onPreviewItem={setPreviewingMedia}
                  />
                ))
              ) : (
                <p className="empty-state">
                  Galeri kosong. Silakan upload media baru.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {previewingMedia && (
        <div className="modal-overlay" onClick={() => setPreviewingMedia(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setPreviewingMedia(null)}
            >
              ×
            </button>
            {previewingMedia.type === "image" ? (
              <img
                src={previewingMedia.url}
                alt="Preview"
                className="preview-media"
              />
            ) : (
              <video
                key={previewingMedia.id}
                src={previewingMedia.url}
                controls
                autoPlay
                muted
                className="preview-media"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PlaylistAndMedia;
