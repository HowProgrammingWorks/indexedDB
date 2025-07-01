import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { Database } from '../static/storage.js';

test('Database basic CRUD', async () => {
  const schemas = {
    user: { keyPath: 'id', autoIncrement: true },
  };
  const db = await new Database('TestDatabase', { version: 1, schemas });

  await db.insert('user', { name: 'Marcus', age: 30 });
  await db.insert('user', { name: 'Lucius', age: 20 });

  const users = await db.select('user');
  assert.equal(users.length, 2);

  const record = await db.get('user', { id: 1 });
  assert.equal(record.name, 'Marcus');

  record.age++;
  await db.update('user', record);

  const updated = await db.get('user', { id: 1 });
  assert.equal(updated.age, 31);

  await db.delete('user', { id: 2 });
  const remaining = await db.select('user');
  assert.equal(remaining.length, 1);
});
