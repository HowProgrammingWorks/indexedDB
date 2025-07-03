import { Database } from './storage.js';

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
const schemas = {
  user: {
    id: { type: 'int', primary: true },
    name: { type: 'str', index: true },
    age: { type: 'int' },
  },
};
const db = await new Database('Example', { version: 1, schemas });

const actions = {
  add: async () => {
    const name = prompt('Enter user name:');
    const age = parseInt(prompt('Enter age:'), 10);
    const user = { name, age };
    await db.insert({ store: 'user', record: user });
    logger.log('Added:', user);
  },

  get: async () => {
    const users = await db.select({ store: 'user' });
    logger.log('Users:', users);
  },

  update: async () => {
    const user = await db.get({ store: 'user', id: 1 });
    if (user) {
      user.age += 1;
      await db.update({ store: 'user', record: user });
      logger.log('Updated:', user);
    } else {
      logger.log('User with id=1 not found');
    }
  },

  delete: async () => {
    await db.delete({ store: 'user', id: 2 });
    logger.log('Deleted user with id=2');
  },

  adults: async () => {
    const users = await db.select({
      store: 'user',
      filter: (user) => user.age >= 18,
      order: { name: 'asc' },
      limit: 10,
    });
    logger.log('Adults:', users);
  },
};

const action = (id, handler) => {
  const element = document.getElementById(id);
  if (!element) return;
  element.onclick = () => {
    handler().catch((error) => {
      logger.log(error.message);
    });
  };
};

for (const [id, handler] of Object.entries(actions)) {
  action(id, handler);
}
