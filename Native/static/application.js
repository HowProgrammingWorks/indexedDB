class Logger {
  #output;

  constructor(outputId) {
    this.#output = document.getElementById(outputId);
  }

  log(...args) {
    const lines = args.map(Logger.#serialize);
    this.#output.textContent += lines.join(' ') + '\n';
    this.#output.scrollTop = this.#output.scrollHeight;
  }

  static #serialize(x) {
    return typeof x === 'object' ? JSON.stringify(x, null, 2) : x;
  }
}

const logger = new Logger('output');

const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('Example', 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('user')) {
      db.createObjectStore('user', { keyPath: 'id', autoIncrement: true });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

document.getElementById('add').onclick = () => {
  const name = prompt('Enter user name:');
  if (!name) return;
  const age = parseInt(prompt('Enter age:'), 10);
  if (!Number.isInteger(age)) return;
  const tx = db.transaction('user', 'readwrite');
  tx.objectStore('user').add({ name, age });
  tx.oncomplete = () => logger.log('Added:', { name, age });
  tx.onerror = () => logger.log('Add failed');
};

document.getElementById('get').onclick = () => {
  const tx = db.transaction('user', 'readonly');
  const store = tx.objectStore('user');
  const req = store.getAll();
  req.onsuccess = () => logger.log('Users:', req.result);
  req.onerror = () => logger.log('Get failed');
};

document.getElementById('update').onclick = () => {
  const tx = db.transaction('user', 'readwrite');
  const store = tx.objectStore('user');
  const req = store.get(1);
  req.onsuccess = () => {
    const user = req.result;
    if (!user) {
      logger.log('User with id=1 not found');
      return;
    }
    user.age += 1;
    store.put(user);
    tx.oncomplete = () => logger.log('Updatued:', user);
  };
  req.onerror = () => logger.log('Update failed');
};

document.getElementById('delete').onclick = () => {
  const tx = db.transaction('user', 'readwrite');
  tx.objectStore('user').delete(2);
  tx.oncomplete = () => logger.log('Deleted user with id=2');
  tx.onerror = () => logger.log('Delete failed');
};

document.getElementById('adults').onclick = () => {
  const tx = db.transaction('user', 'readonly');
  const store = tx.objectStore('user');
  const req = store.openCursor();
  const adults = [];
  req.onsuccess = (event) => {
    const cursor = event.target.result;
    if (!cursor) {
      logger.log('Adults:', adults);
      return;
    }
    const user = cursor.value;
    if (user.age >= 18) adults.push(user);
    cursor.continue();
  };
  req.onerror = () => logger.log('Adult query failed');
};
