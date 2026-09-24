(() => {
  "use strict";

  const DB_NAME = "ctrlcd-local-media";
  const STORE_NAME = "photo-evidence";
  const DB_VERSION = 1;

  function open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponível neste navegador."));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("recordId", "recordId", { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento local."));
    });
  }

  async function put(photo) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(photo);
      transaction.oncomplete = () => { db.close(); resolve(photo.id); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Não foi possível salvar a fotografia.")); };
    });
  }

  async function list(recordId) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("recordId").getAll(recordId);
      request.onsuccess = () => { db.close(); resolve(request.result || []); };
      request.onerror = () => { db.close(); reject(request.error || new Error("Não foi possível ler as fotografias.")); };
    });
  }

  async function remove(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Não foi possível remover a fotografia.")); };
    });
  }

  window.CtrlCDPhotoStore = Object.freeze({ put, list, remove });
})();