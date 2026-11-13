const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createGenerationRouter, splitSections } = require('../routes/generate');

test('generation validates requests, keeps credentials server-side, and handles provider failures', async t => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-server-only-key';
  t.after(() => {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  });
  let calls = 0;
  let mode = 'valid';
  const summary = { tldr: 'Cells are living units.', keyPoints: ['Cells divide.'], terms: [] };
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use('/generate', createGenerationRouter(async (url, options) => {
    calls++;
    assert.equal(options.headers.Authorization, 'Bearer test-server-only-key');
    const body = JSON.parse(options.body);
    assert.equal(body.messages[1].content, 'Study cells');
    if (mode === 'rate-limit') return { ok: false, status: 429 };
    if (mode === 'timeout') throw new DOMException('Timeout', 'TimeoutError');
    return { ok: true, json: async () => ({ choices: [{ message: {
      content: mode === 'invalid' ? '{bad' : JSON.stringify(mode === 'incomplete' ? { summary: {} } : { summary, extra: 'ignored' })
    } }] }) };
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const valid = { content: 'Study cells', selectedOutputs: ['summary'] };
  for (const invalid of [{ ...valid, content: 'x'.repeat(500001) }, { ...valid, selectedOutputs: ['unknown'] }, { ...valid, settings: { quizCount: 999 } }]) {
    assert.equal((await post(invalid)).status, 400);
  }
  assert.equal(calls, 0);
  const response = await post(valid);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { summary });
  for (const [value, status] of [['invalid', 502], ['incomplete', 502], ['rate-limit', 429], ['timeout', 504]]) {
    mode = value;
    assert.equal((await post(valid)).status, status);
  }
  delete process.env.GROQ_API_KEY;
  assert.equal((await post(valid)).status, 503);
});

test('section splitting preserves source text and Unicode at boundaries', () => {
  for (const content of [
    'Paragraph content.\n'.repeat(5000),
    'word '.repeat(15000),
    'x'.repeat(23999) + '😀' + 'y'.repeat(30000)
  ]) {
    const sections = splitSections(content);
    assert.equal(sections.join(''), content);
    assert.ok(sections.every(section => section.length <= 24000));
    assert.ok(sections.every(section => !/[\uD800-\uDBFF]$/.test(section)));
  }
});

test('large documents cover all sections, preserve counts, reduce summaries, and fail atomically', async t => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'offline-test-key';
  t.after(() => {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  });

  async function fixture(t, respond) {
    const requests = [];
    const app = express();
    app.use(express.json({ limit: '4mb' }));
    app.use('/generate', createGenerationRouter(async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push(body);
      return respond(body, requests.length);
    }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    return { requests, post: body => fetch(`http://127.0.0.1:${server.address().port}/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }) };
  }
  const summary = { tldr: 'Document summary', keyPoints: ['Key concept'], terms: [] };
  const reply = data => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(data) } }] }) });

  await t.test('all outputs include every section and keep document-wide card counts', async t => {
    const content = 'Section material.\n'.repeat(4000) + 'FINAL SOURCE MARKER';
    const sections = splitSections(content);
    const flashcards = Array.from({ length: 4 }, (_, i) => ({ question: `Q${i}`, answer: 'Answer' }));
    const quiz = Array.from({ length: 3 }, (_, i) => ({ question: `Q${i}`, options: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'Because' }));
    const { requests, post } = await fixture(t, (body, index) => index <= sections.length
      ? reply({ notes: { sections: [{ heading: `Section ${index}`, body: 'Detailed notes', bullets: [] }] }, summary: { ...summary, tldr: `Section ${index} summary` } })
      : reply({ flashcards, quiz, summary }));
    const response = await post({ content, selectedOutputs: ['notes', 'flashcards', 'quiz', 'summary'], settings: { flashcardCount: 4, quizCount: 3 } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.notes.sections.length, sections.length);
    assert.deepEqual(data.flashcards, flashcards);
    assert.deepEqual(data.quiz, quiz);
    assert.deepEqual(data.summary, summary);
    assert.equal(requests.slice(0, sections.length).map(r => r.messages[1].content).join(''), content);
    assert.equal(requests.length, sections.length + 1);
    for (let i = 1; i <= sections.length; i++) assert.ok(requests.at(-1).messages[1].content.includes(`Section ${i} summary`));
  });

  await t.test('maximum-length Unicode documents use bounded recursive reduction', async t => {
    const content = '文'.repeat(500000);
    const sourceSections = splitSections(content);
    const { requests, post } = await fixture(t, () => reply({ summary: { ...summary, tldr: 'S'.repeat(5800) } }));
    const response = await post({ content, selectedOutputs: ['summary'] });
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(await response.json()), ['summary']);
    assert.ok(requests.length > sourceSections.length + 1, 'summaries require a reduction round');
    assert.ok(requests.every(r => r.messages[1].content.length <= 24000));
    assert.equal(requests.slice(0, sourceSections.length).map(r => r.messages[1].content).join(''), content);
  });

  await t.test('notes-only requests retain notes without summary calls', async t => {
    const { requests, post } = await fixture(t, () => reply({ notes: { sections: [{ heading: 'Topic', body: 'Details', bullets: [] }] } }));
    const response = await post({ content: 'a'.repeat(35001), selectedOutputs: ['notes'] });
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(await response.json()), ['notes']);
    assert.equal(requests.length, 2);
  });

  await t.test('a failed section returns an error without partial results', async t => {
    const { requests, post } = await fixture(t, (body, index) => index === 2 ? { ok: false, status: 429 } : reply({ summary }));
    const response = await post({ content: 'a'.repeat(60000), selectedOutputs: ['summary'] });
    assert.equal(response.status, 429);
    assert.deepEqual(Object.keys(await response.json()), ['error']);
    assert.equal(requests.length, 2);
  });

  await t.test('unbounded intermediate summaries fail instead of looping', async t => {
    const { requests, post } = await fixture(t, () => reply({ summary: { ...summary, tldr: 'a'.repeat(6001) } }));
    const response = await post({ content: 'a'.repeat(35001), selectedOutputs: ['summary'] });
    assert.equal(response.status, 502);
    assert.equal(requests.length, 1);
  });
});
