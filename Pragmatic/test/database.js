import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { Database } from '../static/storage.js';

const schemas = {
  user: {
    id: { type: 'int', primary: true },
    name: { type: 'str', index: true },
    age: { type: 'int' },
  },
};

test('Pragmatic: Database CRUD + DSL', async () => {
  const db = await new Database('PragmaticDB', { version: 1, schemas });

  // Insert
  await db.insert({ store: 'user', record: { name: 'Marcus', age: 20 } });
  await db.insert({ store: 'user', record: { name: 'Lucius', age: 20 } });
  await db.insert({ store: 'user', record: { name: 'Antoninus', age: 40 } });

  // Select all
  const allUsers = await db.select({ store: 'user' });
  assert.equal(allUsers.length, 3);

  // Get
  const marcus = await db.get({ store: 'user', id: 1 });
  assert.equal(marcus.name, 'Marcus');

  // Update
  marcus.age = 31;
  await db.update({ store: 'user', record: marcus });
  const updated = await db.get({ store: 'user', id: 1 });
  assert.equal(updated.age, 31);

  // Delete
  await db.delete({ store: 'user', id: 2 });
  const afterDelete = await db.select({ store: 'user' });
  assert.equal(afterDelete.length, 2);

  // Select with where
  const list = await db.select({ store: 'user', where: { name: 'Marcus' } });
  assert.equal(list.length, 1);
  assert.equal(list[0].age, 31);

  // Select with filter
  const adults = await db.select({
    store: 'user',
    filter: (u) => u.age >= 30,
  });
  assert.equal(adults.length, 2);
  assert.equal(adults[0].name, 'Marcus');

  // Select with order
  const ordered = await db.select({
    store: 'user',
    order: { age: 'desc' },
  });
  assert.equal(ordered[0].name, 'Antoninus');
  assert.equal(ordered[1].name, 'Marcus');

  // Select with offset
  const skipped = await db.select({
    store: 'user',
    offset: 1,
    order: { name: 'asc' },
  });
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].name, 'Antoninus');

  // Select with limit
  const limited = await db.select({
    store: 'user',
    limit: 1,
  });
  assert.equal(limited.length, 1);
});

test('Pragmatic: Complex DSL', async () => {
  const db = await new Database('ComplexDB', { version: 1, schemas });

  await db.insert({ store: 'user', record: { name: 'Marcus', age: 20 } });
  await db.insert({ store: 'user', record: { name: 'Lucius', age: 20 } });
  await db.insert({ store: 'user', record: { name: 'Antoninus', age: 40 } });

  const list = await db.select({
    store: 'user',
    where: { age: 20 },
    filter: (user) => user.age < 30,
    sort: (a, b) => a.age - b.age,
    order: { name: 'desc' },
    offset: 1,
    limit: 1,
  });

  assert.equal(list.length, 1);
  assert.equal(list[0].age, 20);
});
