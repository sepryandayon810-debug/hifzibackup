const CACHE_NAME = 'webpos-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './page-kasir.html',
  './page-riwayat.html',
  './page-produk.html',
  './page-setting.html',
  './page-hutang.html',
  './page-kas-masuk.html',
  './page-kas-keluar.html',
  './js/firebase-config.js',
  './js/utils.js',
  './js/auth.js',
  './js/db-offline.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js'
];

// Install: cache aset statis
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.log('SW cache error:', err))
  );
  self.skipWaiting();
});

// Activate: langsung ambil alih
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
});

// Fetch: strategi beda untuk aset vs API
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Aset statis (CSS, JS, font, HTML): Cache First
  if (request.mode === 'navigate' || 
      url.pathname.match(/\.(css|js|woff2|png|jpg|jpeg|svg|json)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          // Optional: simpan hasil fetch baru ke cache
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        }).catch(() => {
          // Kalau fetch gagal & ini request page, fallback ke index.html
          if (request.mode === 'navigate') {
            return caches.match('./page-kasir.html');
          }
        });
      })
    );
    return;
  }

  // 2. Firebase/API calls: Network Only (jangan dicache, supaya data fresh)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(request).catch(() => {
      // Kalau Firebase gagal & ini navigation, tetap tampilkan halaman
      if (request.mode === 'navigate') {
        return caches.match('./page-kasir.html');
      }
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  // 3. Default: coba cache dulu
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
