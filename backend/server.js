require("dotenv").config();

const { DataTypes } = require("sequelize");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const sequelize = require("./config/database");
const { Op } = require("sequelize");
const axios = require("axios");

// Impor Model
const User = require("./models/User");
const Media = require("./models/Media");
const Playlist = require("./models/Playlist");
const Device = require("./models/Device");

// === DEKLARASI HUBUNGAN ANTAR TABEL ===
// Playlist bisa memiliki banyak Media, dan Media bisa ada di banyak Playlist
// Sequelize akan membuat tabel perantara (junction table) bernama 'PlaylistMedia'
const PlaylistMedia = sequelize.define("PlaylistMedia", {
  duration: {
    type: DataTypes.INTEGER, // <-- UBAH MENJADI INI
    defaultValue: 5,
  },
});
Playlist.belongsToMany(Media, { through: PlaylistMedia });
Media.belongsToMany(Playlist, { through: PlaylistMedia });
Playlist.hasMany(Device);
Device.belongsTo(Playlist);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // 4. Inisialisasi socket.io
  cors: {
    origin: "*", // Izinkan koneksi dari mana saja
  },
});
const port = 3001;

app.use(cors({}));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "..", "public")));

io.on("connection", (socket) => {
  // Kita tidak langsung menampilkan log di sini, tapi menunggu player "memperkenalkan diri"

  // 1. Saat player mengirim ID-nya
  socket.on("player:join", (deviceId) => {
    // Simpan deviceId ke dalam objek socket agar bisa kita gunakan nanti
    socket.deviceId = deviceId;

    // Tampilkan log yang lebih informatif
    console.log(
      `[CONNECT] Player '${deviceId}' terhubung (Socket ID: ${socket.id})`
    );

    socket.join(deviceId);
  });

  // Listener untuk laporan error dari player
  socket.on("player:error", (errorData) => {
    const deviceId = socket.deviceId || "UNKNOWN";
    const logMessage = `[ERROR REPORT from ${deviceId}]: Gagal memuat ${errorData.url}`;

    // Tetap tampilkan di log PM2
    console.error(logMessage, errorData.errorMessage);

    // Kirim notifikasi ke Telegram
    sendTelegramNotification(logMessage);
  });

  // 2. Saat player terputus
  socket.on("disconnect", () => {
    // Gunakan ID yang sudah kita simpan untuk mengetahui siapa yang terputus
    if (socket.deviceId) {
      console.log(`[DISCONNECT] Player '${socket.deviceId}' terputus.`);
    } else {
      // Fallback jika player terputus sebelum sempat mengirim ID
      console.log(
        `[DISCONNECT] Player tanpa ID terputus (Socket ID: ${socket.id})`
      );
    }
  });
});

function sendTelegramNotification(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        return console.log("Variabel Telegram belum diatur di .env");
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    axios.post(url, {
        chat_id: chatId,
        text: message
    }).catch(err => {
        console.error("Gagal mengirim notifikasi Telegram:", err.message);
    });
}

// server.js
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pastikan folder ada, jika tidak, buat folder tersebut
    const uploadPath = path.join(__dirname, "..", "public/uploads/");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
});
const upload = multer({ storage: storage });

// === API ENDPOINTS ===

// ping
app.get('/api/ping', (req, res) => res.status(200).send('pong'));

// Auth
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(401).json({ message: "User tidak ditemukan." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Password salah." });

  res.json({ success: true, message: "Login berhasil!" });
});

// Media
app.post("/api/upload", upload.single("mediafile"), async (req, res) => {
  if (!req.file) return res.status(400).send("Tidak ada file yang di-upload.");

  const fileType = req.file.mimetype.startsWith("image") ? "image" : "video";
  const newMedia = await Media.create({
    filename: req.file.filename,
    url: `${process.env.BASE_URL}/public/uploads/${req.file.filename}`,
    type: fileType,
  });
  res.status(201).json({ message: "File berhasil di-upload!", file: newMedia });
});

app.get("/api/media", async (req, res) => {
  try {
    const mediaItems = await Media.findAll({ order: [["createdAt", "DESC"]] });
    res.json(mediaItems);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil media" });
  }
});

// Playlist
app.post("/api/playlists", async (req, res) => {
  const { name } = req.body;
  const newPlaylist = await Playlist.create({ name });
  res.status(201).json(newPlaylist);
});

app.get("/api/playlists", async (req, res) => {
  const playlists = await Playlist.findAll({
    include: [{ model: Media }],
    order: [
      ["createdAt", "DESC"], // Urutkan playlist dari yang terbaru
      [Media, PlaylistMedia, "createdAt", "ASC"],
    ],
  });
  res.json(playlists);
});

// Menambahkan media ke playlist
app.post("/api/playlists/:playlistId/media", async (req, res) => {
  const { mediaId, duration } = req.body;
  const playlist = await Playlist.findByPk(req.params.playlistId);
  const media = await Media.findByPk(mediaId);

  if (!playlist || !media)
    return res.status(404).send("Playlist atau Media tidak ditemukan");

  await playlist.addMedia(media, { through: { duration: duration || 5 } });
  res.send("Media ditambahkan ke playlist");
});

app.put("/api/playlists/:id", async (req, res) => {
  try {
    const { items } = req.body;
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).send("Playlist tidak ditemukan.");

    await playlist.setMedia([]);
    for (const item of items) {
      const media = await Media.findByPk(item.mediaId);
      if (media) {
        await playlist.addMedia(media, {
          through: { duration: item.duration },
        });
      }
    }

    // --- TAMBAHAN LOGIKA SOCKET.IO ---
    // Cari semua device yang menggunakan playlist ini
    const devicesToUpdate = await Device.findAll({
      where: { PlaylistId: req.params.id },
    });

    // Kirim perintah 'playlist:updated' ke setiap device tersebut
    devicesToUpdate.forEach((device) => {
      console.log(`Mengirim sinyal update ke room: ${device.deviceId}`);
      io.to(device.deviceId).emit("playlist:updated");
    });
    // -------------------------------

    res.json({ message: "Playlist berhasil diperbarui." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal memperbarui playlist", error: error.message });
  }
});

app.delete("/api/media/:id", async (req, res) => {
  const idFromUrl = req.params.id;
  try {
    const media = await Media.findByPk(req.params.id);

    if (!media) {
      return res.status(404).send("Media tidak ditemukan.");
    }
    // Hapus file fisik dari folder /public/uploads
    const filePath = path.join(__dirname, "public", "uploads", media.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Hapus record dari database
    await media.destroy();
    res.send("Media berhasil dihapus.");
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus media.", error });
  }
});

// MENGHAPUS PLAYLIST
app.delete("/api/playlists/:id", async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).send("Playlist tidak ditemukan.");

    await playlist.destroy();
    res.send("Playlist berhasil dihapus.");
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus playlist.", error });
  }
});

// MENGHAPUS ITEM DARI DALAM PLAYLIST
app.delete("/api/playlists/:playlistId/media/:mediaId", async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.playlistId);
    const media = await Media.findByPk(req.params.mediaId);

    if (!playlist || !media)
      return res.status(404).send("Playlist atau Media tidak ditemukan");

    await playlist.removeMedia(media); // Sequelize otomatis menghapus asosiasi
    res.send("Item berhasil dihapus dari playlist.");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal menghapus item dari playlist.", error });
  }
});

// Mendaftarkan perangkat baru
app.post("/api/devices", async (req, res) => {
  try {
    const { name, deviceId } = req.body;
    const newDevice = await Device.create({ name, deviceId });
    res.status(201).json(newDevice);
  } catch (error) {
    res.status(500).json({ message: "Gagal mendaftarkan perangkat", error });
  }
});

// Mengambil semua perangkat
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await Device.findAll({ include: Playlist });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data perangkat" });
  }
});

// Menugaskan playlist ke perangkat
app.put("/api/devices/:id/assign", async (req, res) => {
  try {
    const { playlistId } = req.body;
    const device = await Device.findByPk(req.params.id);
    if (!device) return res.status(404).send("Perangkat tidak ditemukan");

    device.PlaylistId = playlistId || null;
    await device.save();

    // --- TAMBAHAN LOGIKA SOCKET.IO ---
    // Kirim perintah 'playlist:updated' ke device yang baru saja diubah.
    console.log(
      `Menugaskan playlist, mengirim sinyal update ke room: ${device.deviceId}`
    );
    io.to(device.deviceId).emit("playlist:updated");
    // -------------------------------

    res.json(device);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal menugaskan playlist", error: error.message });
  }
});

// API KUNCI UNTUK PLAYER DI TV
app.get("/api/player/:deviceId", async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { deviceId: req.params.deviceId },
      include: {
        model: Playlist,
        include: [
          {
            model: Media,
            through: {
              attributes: ["duration"],
            },
          },
        ],
      },
      order: [[Playlist, Media, PlaylistMedia, "createdAt", "ASC"]],
    });

    if (!device || !device.Playlist) {
      return res
        .status(404)
        .json({ message: "Tidak ada playlist yang ditugaskan." });
    }
    // Mengembalikan data playlist lengkap
    res.json(device.Playlist);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data untuk player." });
  }
});

app.delete("/api/devices/:id", async (req, res) => {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) {
      return res.status(404).send("Perangkat tidak ditemukan.");
    }
    await device.destroy();
    res.status(200).send("Perangkat berhasil dihapus.");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal menghapus perangkat", error: error.message });
  }
});

app.put("/api/devices/heartbeat/:deviceId", async (req, res) => {
  try {
    const device = await Device.findOne({
      where: { deviceId: req.params.deviceId },
    });
    if (device) {
      device.lastSeen = new Date(); // Update waktu 'lastSeen' ke waktu sekarang
      await device.save();
      res.status(200).send("Heartbeat received");
    } else {
      res.status(404).send("Device not found");
    }
  } catch (error) {
    res.status(500).json({ message: "Heartbeat failed", error: error.message });
  }
});

// === SINKRONISASI DATABASE & JALANKAN SERVER ===
sequelize.sync().then(() => {
  // tanpa alter
  console.log("Database & tabel berhasil disinkronkan.");
  server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
  });
});
