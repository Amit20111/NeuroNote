const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createDatabase } = require('../../database/db');
const { createLibraryRouter } = require('../routes/library');

test('library API saves, lists and deletes only entries owned by the authenticated user', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuronote-library-test-'));
  t.after(() => {
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  });
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret';
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  const app = express();
  app.use(express.json());
  app.use('/library', createLibraryRouter(createDatabase(path.join(dir, 'db.json')).Library));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (method, endpoint, user, body) => fetch(`http://127.0.0.1:${server.address().port}/library${endpoint}`, {
    method, headers: {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET)}` } : {})
    }, body: body === undefined ? undefined : JSON.stringify(body)
  });
  assert.equal((await request('GET', '', null)).status, 401);
  const saved = await request('POST', '', 'alice', { content: { title: 'Biology', results: {} } });
  assert.equal(saved.status, 201);
  const entry = await saved.json();
  assert.equal((await (await request('GET', '', 'bob')).json()).length, 0);
  assert.equal((await (await request('GET', '', 'alice')).json()).length, 1);
  assert.equal((await request('DELETE', `/${entry._id}`, 'bob')).status, 404);
  assert.equal((await request('DELETE', `/${entry._id}`, 'alice')).status, 200);
  assert.equal((await request('DELETE', `/${entry._id}`, 'alice')).status, 404);
  assert.equal((await (await request('GET', '', 'alice')).json()).length, 0);
});
