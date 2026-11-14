const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase } = require('../../database/db');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuronote-test-'));
  t.after(() => {
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  });
  const file = path.join(dir, 'db.json');
  return { file, db: createDatabase(file) };
}

test('local entries persist, keep a backup, and enforce ownership on delete', async t => {
  const { file, db } = fixture(t);
  const entry = await db.Library.create({ userId: 'alice', content: { title: 'Biology' } });
  const reopened = createDatabase(file);
  assert.equal((await reopened.Library.find({ userId: 'alice' }).sort().lean()).length, 1);
  assert.equal((await reopened.Library.deleteOne({ _id: entry._id, userId: 'bob' })).deletedCount, 0);
  assert.equal((await reopened.Library.deleteOne({ _id: entry._id, userId: 'alice' })).deletedCount, 1);
  assert.equal(JSON.parse(fs.readFileSync(`${file}.bak`)).library.length, 1);
  assert.equal((await reopened.Library.find({ userId: 'alice' }).sort().lean()).length, 0);
});

test('corrupt and invalid databases cannot be silently overwritten', async t => {
  const { file, db } = fixture(t);
  for (const content of ['broken JSON', '{"users":[]}']) {
    fs.writeFileSync(file, content);
    await assert.rejects(db.Library.create({ userId: 'alice', content: {} }));
    assert.equal(fs.readFileSync(file, 'utf8'), content);
  }
});

test('concurrent duplicate account attempts cannot create duplicate local users', async t => {
  const { db } = fixture(t);
  const results = await Promise.allSettled([
    db.User.create({ email: 'a@example.com', password: 'hash' }),
    db.User.create({ email: 'a@example.com', password: 'hash' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 11000);
});
