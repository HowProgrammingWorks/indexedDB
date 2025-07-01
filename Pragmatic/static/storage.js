class Database {
  #name;
  #version = 1;
  #schemas = {};
  #instance = null;
  #active = false;

  constructor(name, { version = 1, schemas = {} } = {}) {
    this.#name = name;
    this.#version = version;
    this.#schemas = schemas;
    return this.#open();
  }

  async #open() {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#name, this.#version);
      request.onupgradeneeded = (event) => this.#upgrade(event.target.result);
      request.onsuccess = (event) => {
        this.#instance = event.target.result;
        this.#active = true;
        resolve();
      };
      request.onerror = (event) => {
        reject(
          event.target.error ??
            new Error(`IndexedDB: can't open ${this.#name}`),
        );
      };
    });
    return this;
  }

  #upgrade(db) {
    for (const [name, schema] of Object.entries(this.#schemas)) {
      if (!db.objectStoreNames.contains(name)) {
        const store = db.createObjectStore(name, schema.options ?? schema);
        const indexes = schema.indexes ?? [];
        for (const index of indexes) {
          store.createIndex(index.name, index.keyPath, index.options);
        }
      }
    }
  }

  #exec(entity, operation, mode = 'readwrite') {
    if (!this.#active) {
      return Promise.reject(new Error('Database not connected'));
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#instance.transaction(entity, mode);
        const store = tx.objectStore(entity);
        const result = operation(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? new Error('Transaction error'));
      } catch (error) {
        reject(error);
      }
    });
  }

  insert(entity, record) {
    return this.#exec(entity, (store) => store.add(record));
  }

  update(entity, record) {
    return this.#exec(entity, (store) => store.put(record));
  }

  delete(entity, { id }) {
    return this.#exec(entity, (store) => store.delete(id));
  }

  get(entity, { id }) {
    return this.#exec(
      entity,
      (store) => {
        const req = store.get(id);
        return new Promise((resolve, reject) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error ?? new Error(`Can't get ${id}`));
        });
      },
      'readonly',
    );
  }

  select(entity, { where, limit, offset, order, filter, sort } = {}) {
    return this.#exec(
      entity,
      (store) => {
        const results = [];
        let skipped = 0;
        return new Promise((resolve, reject) => {
          const req = store.openCursor();
          req.onerror = () => reject(req.error);
          req.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
              const filtered = filter ? results.filter(filter) : results;
              if (sort) return void resolve(filtered.toSorted(sort));
              return resolve(Database.#order(filtered, order));
            }
            const record = cursor.value;
            const check = ([k, v]) => record[k] === v;
            const match = !where || Object.entries(where).every(check);
            if (match) {
              if (!offset || skipped >= offset) {
                results.push(record);
                if (limit && results.length >= limit) return resolve(results);
              } else {
                skipped++;
              }
            }
            cursor.continue();
          };
        });
      },
      'readonly',
    );
  }

  static #order(arr, order) {
    if (!order || typeof order !== 'object') return arr;
    const [[field, dir = 'asc']] = Object.entries(order);
    const sign = dir === 'desc' ? -1 : 1;
    return [...arr].sort((a, b) => {
      if (a[field] === b[field]) return 0;
      return a[field] > b[field] ? sign : -sign;
    });
  }
}

export { Database };
