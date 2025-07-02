import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { Database } from '../static/database.js';
import { Repository } from '../static/core.js';
import { UserModel } from '../static/user.js';

test('Enterprise: Database CRUD + queries', async () => {
  const db = new Database('TestDB', 1, (db) => {
    if (!db.objectStoreNames.contains('user')) {
      db.createObjectStore('user', { keyPath: 'id', autoIncrement: true });
    }
  });
  await db.connect();

  const repo = new Repository(db, 'user');
  const marcus = new UserModel('Marcus', 28);

  await repo.insert(marcus);
  const allUsers = await repo.getAll();
  assert.equal(allUsers.length, 1);
  assert.equal(allUsers[0].name, 'Marcus');

  const user = await repo.get(1);
  user.age = 29;
  await repo.update(user);

  const updated = await repo.get(1);
  assert.equal(updated.age, 29);

  await repo.delete(1);
  const empty = await repo.getAll();
  assert.equal(empty.length, 0);
});
