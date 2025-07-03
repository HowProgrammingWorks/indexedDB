class Database {
  #name;
  #version;
  #schemas;
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
        const options = { keyPath: 'id', autoIncrement: true };
        const store = db.createObjectStore(name, options);
        for (const [field, def] of Object.entries(schema)) {
          if (name !== 'id' && def.index) {
            store.createIndex(field, field, { unique: false });
          }
        }
      }
    }
  }

  #exec(store, operation, mode = 'readwrite') {
    if (!this.#active) {
      return Promise.reject(new Error('Database not connected'));
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.#instance.transaction(store, mode);
        const objectStore = tx.objectStore(store);
        const result = operation(objectStore);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? new Error('Transaction error'));
      } catch (error) {
        reject(error);
      }
    });
  }

  validate({ store, record }) {
    const schema = this.#schemas[store];
    if (!schema) throw new Error(`Schema for ${store} is not defined`);
    for (const [key, val] of Object.entries(record)) {
      const field = schema[key];
      const name = `Field ${store}.${key}`;
      if (!field) throw new Error(`${name} is not defined`);
      if (field.type === 'int') {
        if (Number.isInteger(val)) continue;
        throw new Error(`${name} expected to be integer`);
      } else if (field.type === 'str') {
        if (typeof val === 'string') continue;
        throw new Error(`${name} expected to be string`);
      }
    }
  }

  insert({ store, record }) {
    this.validate({ store, record });
    return this.#exec(store, (objectStore) => objectStore.add(record));
  }

  update({ store, record }) {
    this.validate({ store, record });
    return this.#exec(store, (objectStore) => objectStore.put(record));
  }

  delete({ store, id }) {
    return this.#exec(store, (objectStore) => objectStore.delete(id));
  }

  get({ store, id }) {
    const op = (objectStore) => {
      const req = objectStore.get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error(`Can't get ${id}`));
      });
    };
    return this.#exec(store, op, 'readonly');
  }

  select({ store, where, limit, offset, order, filter, sort }) {
    const op = (objectStore) => {
      const result = [];
      let skipped = 0;
      return new Promise((resolve, reject) => {
        const reply = () => {
          if (sort) result.sort(sort);
          if (order) Database.#sort(result, order);
          resolve(result);
        };
        const req = objectStore.openCursor();
        req.onerror = () => reject(req.error);
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return void reply();
          const record = cursor.value;
          const check = ([key, val]) => record[key] === val;
          const match = !where || Object.entries(where).every(check);
          const valid = !filter || filter(record);
          if (match && valid) {
            if (!offset || skipped >= offset) result.push(record);
            else skipped++;
            if (limit && result.length >= limit) return void reply();
          }
          cursor.continue();
        };
      });
    };
    return this.#exec(store, op, 'readonly');
  }

  static #sort(arr, order) {
    if (typeof order !== 'object') return;
    const rule = Object.entries(order)[0];
    if (!Array.isArray(rule)) return;
    const [field, dir = 'asc'] = rule;
    const sign = dir === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      const x = a[field];
      const y = b[field];
      if (x === y) return 0;
      return x > y ? sign : -sign;
    });
  }
}

export { Database };
