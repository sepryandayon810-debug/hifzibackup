// ===== WEBPOS OFFLINE DATABASE (IndexedDB) =====
const DB_NAME = 'WebPOS_Offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('productsCache')) {
        db.createObjectStore('productsCache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        db.createObjectStore('pendingTransactions', { keyPath: 'localId', autoIncrement: true });
      }
    };
  });
}

// ===== PRODUCTS CACHE =====
async function saveProductsToCache(products) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productsCache', 'readwrite');
      const store = tx.objectStore('productsCache');
      store.clear();
      products.forEach(p => store.put(p));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) {
    console.error('saveProductsToCache error:', e);
  }
}

async function getProductsFromCache() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('productsCache', 'readonly');
      const store = tx.objectStore('productsCache');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch(e) {
    console.error('getProductsFromCache error:', e);
    return [];
  }
}

// ===== PENDING TRANSACTIONS (OFFLINE QUEUE) =====
async function saveOfflineTransaction(transactionData) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');
      store.add({ data: transactionData, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) {
    console.error('saveOfflineTransaction error:', e);
    throw e;
  }
}

async function getPendingTransactions() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingTransactions', 'readonly');
      const store = tx.objectStore('pendingTransactions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch(e) {
    return [];
  }
}

async function removeSyncedTransaction(localId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');
      store.delete(localId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) {
    console.error('removeSyncedTransaction error:', e);
  }
}
