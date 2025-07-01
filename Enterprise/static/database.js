export class Database {
  #db;

  constructor(name, version = 1, upgradeCallback) {
    this.name = name;
    this.version = version;
    this.upgradeCallback = upgradeCallback;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (this.upgradeCallback) this.upgradeCallback(db);
      };

      request.onsuccess = () => {
        this.#db = request.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  transaction(storeName, mode = 'readonly') {
    const tx = this.#db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  exec(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = operation(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }
}
