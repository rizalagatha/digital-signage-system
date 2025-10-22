// frontend/public/sw.js

const CACHE_NAME = "media-cache-v1"; // Nama cache (ubah versi jika ada update)

// Daftar URL API yang TIDAK ingin di-cache (opsional)
// const urlsToSkipCache = ['/api/player/', '/api/devices/heartbeat/'];

// Event 'install': Dipanggil saat SW pertama kali diinstal
self.addEventListener("install", (event) => {
  console.log("Service Worker: Menginstal...");
  // Lewati tahap 'waiting' agar SW langsung aktif setelah instalasi
  event.waitUntil(self.skipWaiting());
});

// Event 'activate': Dipanggil saat SW aktif (setelah instalasi atau update)
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Aktif.");
  // Ambil kontrol atas halaman yang sudah terbuka agar cache bisa langsung bekerja
  event.waitUntil(self.clients.claim());
  // Opsional: Hapus cache lama jika CACHE_NAME berubah
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Event 'fetch': Dipanggil setiap kali halaman membuat permintaan jaringan
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // === STRATEGI UNTUK MEDIA (/public/uploads/) ===
  // Coba ambil dari cache dulu, jika tidak ada, baru ambil dari jaringan & simpan ke cache.
  if (requestUrl.pathname.startsWith("/public/uploads/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Jika ada di cache, langsung kembalikan
        if (cachedResponse) {
          // console.log('SW: Menyajikan media dari cache:', event.request.url);
          return cachedResponse;
        }

        // Jika tidak ada di cache, ambil dari jaringan
        return fetch(event.request)
          .then((networkResponse) => {
            // Penting: Clone respons karena kita akan menggunakannya dua kali (ke cache & ke browser)
            const responseToCache = networkResponse.clone();

            // Buka cache dan simpan respons jaringan
            caches.open(CACHE_NAME).then((cache) => {
              console.log("SW: Menyimpan media ke cache:", event.request.url);
              cache.put(event.request, responseToCache);
            });

            // Kembalikan respons jaringan ke browser
            return networkResponse;
          })
          .catch((error) => {
            console.error("SW: Gagal mengambil media dari jaringan:", error);
            // Anda bisa mengembalikan respons error default di sini jika mau
            // return new Response("Media offline tidak tersedia", { status: 404 });
          });
      })
    );
  }
  // === Untuk permintaan lain (API, dll), gunakan strategi Network First (selalu coba jaringan dulu) ===
  // else if (!urlsToSkipCache.some(urlPart => requestUrl.pathname.includes(urlPart))) {
  //     // Opsional: Logika caching untuk file lain (misalnya aset JS/CSS)
  // }

  // Jika tidak cocok dengan strategi di atas, biarkan browser menangani seperti biasa
});
