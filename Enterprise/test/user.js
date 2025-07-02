import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { Database } from '../static/database.js';
import { UserModel, UserRepository, UserService } from '../static/user.js';

test('Enterprise: UserModel validation', async () => {
  assert.throws(() => new UserModel('', 25), /Invalid name/);
  assert.throws(() => new UserModel('Faustina', -1), /Invalid age/);
  assert.throws(() => new UserModel('Lucius', 3.14), /Invalid age/);

  const user = new UserModel('Titus', 42);
  assert.ok(user instanceof UserModel);
  assert.strictEqual(user.name, 'Titus');
  assert.strictEqual(user.age, 42);
});

test('Enterprise: UserRepository', async () => {
  const db = new Database('UserRepositoryTestDB', 1, (db) => {
    if (!db.objectStoreNames.contains('user')) {
      db.createObjectStore('user', { keyPath: 'id', autoIncrement: true });
    }
  });
  await db.connect();

  const userRepo = new UserRepository(db, 'user');

  const user1 = new UserModel('Lucius', 17);
  await userRepo.insert(user1);
  const user2 = new UserModel('Antoninus', 33);
  await userRepo.insert(user2);
  const user3 = new UserModel('Faustina', 18);
  await userRepo.insert(user3);

  const user = await userRepo.get(1);
  assert.equal(user.name, 'Lucius');

  user.age += 1;
  await userRepo.update(user);
  assert.equal(user.age, 18);

  const users = await userRepo.getAll();
  assert.equal(users.length, 3);
  assert.equal(users[1].age, 33);
});

test('Enterprise: UserService', async () => {
  const db = new Database('ServiceTestDB', 1, (db) => {
    if (!db.objectStoreNames.contains('user')) {
      db.createObjectStore('user', { keyPath: 'id', autoIncrement: true });
    }
  });
  await db.connect();

  const userRepo = new UserRepository(db, 'user');
  const userService = new UserService(userRepo);

  await userService.createUser('Lucius', 17);
  await userService.createUser('Antoninus', 33);
  await userService.createUser('Faustina', 18);

  const adults = await userService.findAdults();
  assert.equal(adults.length, 2);
  assert.ok(adults.some((user) => user.name === 'Antoninus'));

  const updatedUser = await userService.incrementAge(2);
  assert.equal(updatedUser.age, 34);

  await assert.rejects(
    () => userService.incrementAge(999),
    /User with id=1 not found/,
  );
});
