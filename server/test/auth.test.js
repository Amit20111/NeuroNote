const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createDatabase } = require('../db');

test('Google sign-in verifies ID token, creates or reuses user, and guards password login', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuronote-auth-test-'));
  t.after(() => {
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  });

  const prevSecret = process.env.JWT_SECRET;
  const prevClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.JWT_SECRET = 'test-only-secret';
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
  t.after(() => {
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
    if (prevClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = prevClientId;
  });

  const { createAuthRouter } = require('../routes/auth');
  const { User } = createDatabase(path.join(dir, 'db.json'));

  const mockFetch = async url => {
    if (url.includes('valid-token')) {
      return {
        ok: true,
        async json() {
          return {
            aud: process.env.GOOGLE_CLIENT_ID,
            email: 'Alice@Example.com',
            email_verified: 'true',
            given_name: 'Alice',
            family_name: 'Smith',
            sub: 'google-sub-123'
          };
        }
      };
    }
    if (url.includes('wrong-aud-token')) {
      return {
        ok: true,
        async json() {
          return {
            aud: 'other-client-id',
            email: 'alice@example.com',
            email_verified: 'true',
            sub: 'google-sub-123'
          };
        }
      };
    }
    return { ok: false, status: 400 };
  };

  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(mockFetch, User));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const post = (endpoint, body) => fetch(`http://127.0.0.1:${server.address().port}/auth${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  assert.equal((await post('/google', {})).status, 400);
  assert.equal((await post('/google', { credential: 'bad-token' })).status, 401);
  assert.equal((await post('/google', { credential: 'wrong-aud-token' })).status, 401);

  const first = await post('/google', { credential: 'valid-token' });
  assert.equal(first.status, 200);
  const firstPayload = await first.json();
  assert.ok(firstPayload.token);
  assert.equal(firstPayload.user.email, 'alice@example.com');
  assert.equal(firstPayload.user.firstName, 'Alice');

  const second = await post('/google', { credential: 'valid-token' });
  assert.equal(second.status, 200);
  const secondPayload = await second.json();
  assert.equal(secondPayload.user.id, firstPayload.user.id);

  const passwordLogin = await post('/login', { email: 'alice@example.com', password: 'secret' });
  assert.equal(passwordLogin.status, 400);
});
