# Sistem Digital Signage Berbasis Web

Aplikasi digital signage berbasis web yang memungkinkan admin mengelola media, membuat playlist, dan menugaskannya ke berbagai perangkat TV secara real-time.

## Fitur Utama
- Manajemen Media (Upload gambar & video)
- Pembuatan Playlist dengan sistem drag-and-drop
- Penugasan Playlist ke Perangkat TV
- Monitoring Status Perangkat (Online/Offline) secara real-time via WebSocket
- Update Playlist di TV secara otomatis tanpa perlu me-restart.

## Teknologi yang Digunakan
* **Frontend:** React.js, Vite, Socket.io-client
* **Backend:** Node.js, Express.js, Sequelize (ORM), MySQL
* **Real-time:** Socket.io
* **Deployment:** Nginx, PM2

## Cara Menjalankan Secara Lokal
1. Clone repository ini.
2. Jalankan `npm install` di folder `frontend` dan `backend`.
3. Buat database MySQL dan konfigurasi file `.env` di backend.
4. Jalankan backend dengan `npm start`.
5. Jalankan frontend dengan `npm run dev`.
