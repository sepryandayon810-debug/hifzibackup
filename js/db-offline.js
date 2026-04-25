const DB_NAME = 'WebPOS_Offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains('productsCache')) {
        db.createObjectStore('productsCache', { keyPath: 'id' });
      }
    };
  });
}

// ===== SIMPAN TRANSAKSI OFFLINE =====
async function saveOfflineTransaction(data) {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const localId = 'OFF_' + Date.now();
  await store.put({ localId, data, createdAt: Date.now(), synced: false });
  db.close();
  return localId;
}

// ===== AMBIL TRANSAKSI PENDING =====
async function getPendingTransactions() {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const store = tx.objectStore('syncQueue');
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result.filter(item => !item.synced));
    };
  });
}

// ===== HAPUS SETELAH SUKSES SYNC =====
async function removeSyncedTransaction(localId) {
  const db = await openDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  tx.objectStore('syncQueue').delete(localId);
  db.close();
}

// ===== CACHE PRODUK UNTUK OFFLINE =====
async function saveProductsToCache(products) {
  const db = await openDB();
  const tx = db.transaction('productsCache', 'readwrite');
  const store = tx.objectStore('productsCache');
  for (const p of products) {
    store.put(p);
  }
  db.close();
}

async function getProductsFromCache() {
  const db = await openDB();
  const tx = db.transaction('productsCache', 'readonly');
  const store = tx.objectStore('productsCache');
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result || []);
    };
  });
}
