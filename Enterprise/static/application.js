import { Database } from './database.js';
import { UserRepository, UserService } from './user.js';

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

const action = (id, handler) => {
  const element = document.getElementById(id);
  if (!element) return;
  element.onclick = () => {
    handler().catch((error) => {
      logger.log(error.message);
    });
  };
};

const db = new Database('EnterpriseApplication', 1, (db) => {
  if (!db.objectStoreNames.contains('user')) {
    db.createObjectStore('user', { keyPath: 'id', autoIncrement: true });
  }
});
await db.connect();
const userRepository = new UserRepository(db, 'user');
const userService = new UserService(userRepository);

action('add', async () => {
  const name = prompt('Enter user name:');
  const age = parseInt(prompt('Enter age:'), 10);
  const user = await userService.createUser(name, age);
  logger.log('Added:', user);
});

action('get', async () => {
  const users = await userRepository.getAll();
  logger.log('Users:', users);
});

action('update', async () => {
  const user = await userService.incrementAge(1);
  logger.log('Updated:', user);
});

action('delete', async () => {
  await userRepository.delete(2);
  logger.log('Deleted user with id=2');
});

action('adults', async () => {
  const adults = await userService.findAdults();
  logger.log('Adults:', adults);
});
