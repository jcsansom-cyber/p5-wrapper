import type { UploadedAsset } from './types';

const DB_NAME = 'p5-ai-studio';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open asset database.'));
  });
}

export async function loadAssets(): Promise<UploadedAsset[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result as UploadedAsset[]) ?? []);
    request.onerror = () => reject(request.error || new Error('Failed to load assets.'));
    tx.oncomplete = () => db.close();
  });
}

export async function saveAssets(assets: UploadedAsset[]): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error || new Error('Failed to clear stored assets.'));

    clearRequest.onsuccess = () => {
      for (const asset of assets) {
        store.put(asset);
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to save assets.'));
    };
  });
}

export async function clearAssets(): Promise<void> {
  await saveAssets([]);
}

