class Database {
  #name;
  #version = 1;
  #schemas = null;
  #instance = null;
  #active = false;

  constructor(name, { version, schemas }) {
    this.#name = name;
    if (version) this.#version = version;
    if (schemas) this.#schemas = schemas;
    return this.#open();
  }

  async #open() {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#name, this.#version);
      request.onupgradeneeded = (event) => this.#upgrade(event.target.result);
      request.onsuccess = (event) => {
        this.#active = true;
        this.#instance = event.target.result;
        resolve();
      };
      request.onerror = (event) => {
        let { error } = event.target;
        if (!error) error = new Error(`IndexedDB: can't open ${this.#name}`);
        reject(error);
      };
    });
    return this;
  }

  #upgrade(db) {
    for (const [name, schema] of Object.entries(this.#schemas)) {
      if (!db.objectStoreNames.contains(name)) {
        const store = db.createObjectStore(name, schema);
        const indexes = schema.indexes || [];
        for (const index of Object.entries(indexes)) {
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
        tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      } catch (error) {
        reject(error);
      }
    });
  }

  async insert(entity, record) {
    return this.#exec(entity, (store) => store.add(record));
  }

  async update(entity, record) {
    return this.#exec(entity, (store) => store.put(record));
  }

  async delete(entity, { id }) {
    return this.#exec(entity, (store) => store.delete(id));
  }

  async get(entity, { id }) {
    return this.#exec(
      entity,
      (store) => {
        const req = store.get(id);
        return new Promise((resolve, reject) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error || new Error(`Can't get ${id}`));
        });
      },
      'readonly',
    );
  }

  async select(entity, { where, limit, offset, order, filter, sort } = {}) {
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
              const sorted = sort
                ? filtered.toSorted(sort)
                : Database.#order(filtered, order);
              return void resolve(sorted);
            }
            const record = cursor.value;
            const match =
              !where ||
              Object.entries(where).every(([key, val]) => record[key] === val);
            if (match) {
              if (!offset || skipped >= offset) {
                results.push(record);
                if (limit && results.length >= limit) {
                  return void resolve(results);
                }
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
    const [[field, dir]] = Object.entries(order);
    const sign = dir === 'desc' ? -1 : 1;
    return [...arr].sort((a, b) => {
      if (a[field] === b[field]) return 0;
      return a[field] > b[field] ? sign : -sign;
    });
  }
}

export { Database };
