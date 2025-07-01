export class Repository {
  constructor(database, storeName) {
    this.db = database;
    this.storeName = storeName;
  }

  insert(record) {
    return this.db.exec(this.storeName, 'readwrite', (store) =>
      store.add(record),
    );
  }

  getAll() {
    return this.db.exec(this.storeName, 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  get(id) {
    return this.db.exec(this.storeName, 'readonly', (store) => {
      const req = store.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  update(record) {
    return this.db.exec(this.storeName, 'readwrite', (store) =>
      store.put(record),
    );
  }

  delete(id) {
    return this.db.exec(this.storeName, 'readwrite', (store) =>
      store.delete(id),
    );
  }
}

export class Service {
  constructor(repository) {
    this.repository = repository;
  }
}
