import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { Database } from '../static/database.js';
import { Repository, Service } from '../static/core.js';

test('Enterprise: Repository', async () => {
  const db = new Database('RepoTestDB', 1, (db) => {
    db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
  });
  await db.connect();

  const repo = new Repository(db, 'items');

  const item = { name: 'Item1' };
  await repo.insert(item);

  const items = await repo.getAll();
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Item1');

  const id = items[0].id;
  const one = await repo.get(id);
  assert.equal(one.name, 'Item1');

  one.name = 'Item1Updated';
  await repo.update(one);

  const updated = await repo.get(id);
  assert.equal(updated.name, 'Item1Updated');

  await repo.delete(id);
  const afterDelete = await repo.getAll();
  assert.equal(afterDelete.length, 0);
});

test('Enterprise: Service', () => {
  const fakeRepo = { insert: () => {}, get: () => {} };
  const service = new Service(fakeRepo);
  assert.equal(service.repository, fakeRepo);
});
