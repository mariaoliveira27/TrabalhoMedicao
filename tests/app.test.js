import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { validateResponse, csvCell } from '../server/validation.js';
import { estimateDensity, numericValues, quantile } from '../public/charts.js';
import { networkData } from '../public/network.js';

const questionnaire = JSON.parse(readFileSync(new URL('../config/questionnaire.json', import.meta.url)));
function payload() {
  const answers = {};
  for (const q of questionnaire.sections.flatMap(s => s.questions)) answers[q.id] = q.type === 'number' ? 0 : q.type === 'multiselect' ? [q.options[0]] : q.options ? q.options[0] : 'Uma resposta de teste';
  return { name: 'Participante Teste', company: 'Empresa teste', version: questionnaire.version, consent: true, answers };
}
async function fixture(t, env = {}) {
  const store = createStore(':memory:');
  let identity = { sub: 'user-a', name: 'Participante', email: 'admin@example.com', email_verified: true };
  const { app } = createApp({ store, env: { PUBLIC_URL: 'http://localhost:3015/medicao', GOOGLE_CLIENT_ID: 'test-client', ADMIN_EMAILS: 'admin@example.com', ...env }, verifyGoogle: async () => identity });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookies = '', csrf = '';
  async function request(path, options = {}) {
    const response = await fetch(`${origin}${path}`, { ...options, headers: { origin: 'http://localhost:3015', cookie: cookies, 'content-type': 'application/json', 'x-csrf-token': csrf, ...options.headers } });
    const set = response.headers.getSetCookie();
    for (const value of set) {
      const [pair] = value.split(';'), name = pair.split('=')[0];
      cookies = cookies.split('; ').filter(v => v && !v.startsWith(`${name}=`)).concat(pair).join('; ');
    }
    return response;
  }
  async function login(overrides = {}) {
    const challenge = await (await request('/medicao/api/auth/challenge')).json();
    identity = { sub: 'user-a', name: 'Participante', email: 'admin@example.com', email_verified: true, nonce: challenge.nonce, ...overrides };
    const response = await request('/medicao/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: 'test' }) });
    if (response.ok) csrf = (await (await request('/medicao/api/me')).json()).csrf;
    return response;
  }
  return { request, login, store };
}
test('protected routes reject anonymous access and missing login challenge', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/admin/responses')).status, 401);
  assert.equal((await f.request('/api/responses', { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await f.request('/api/auth/google', { method: 'POST', body: '{"credential":"forged"}' })).status, 401);
});
test('Google identity requires verified email, matching nonce, and one-time challenge', async t => {
  const f = await fixture(t);
  assert.equal((await f.login({ email_verified: false })).status, 401);
  assert.equal((await f.login({ nonce: 'wrong' })).status, 401);
  assert.equal((await f.login()).status, 200);
  assert.equal((await f.request('/api/auth/google', { method: 'POST', body: '{"credential":"replay"}' })).status, 401);
});
test('origin and CSRF checks protect mutations; invalid JSON is handled', async t => {
  const f = await fixture(t); await f.login();
  const options = { method: 'POST', body: JSON.stringify(payload()) };
  assert.equal((await f.request('/api/responses', { ...options, headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.request('/api/responses', { ...options, headers: { 'x-csrf-token': 'wrong' } })).status, 403);
  assert.equal((await f.request('/api/responses', { method: 'POST', body: '{' })).status, 400);
});
test('response is persisted once per subject, own receipt isolated, admin protected, logout revokes', async t => {
  const f = await fixture(t); await f.login();
  const options = { method: 'POST', body: JSON.stringify(payload()) };
  const saved = await f.request('/medicao/api/responses', options);
  assert.equal(saved.status, 201);
  const receipt = (await saved.json()).receipt;
  assert.equal((await f.request('/api/responses', options)).status, 409);
  const results = await (await f.request('/api/admin/responses')).json();
  assert.equal(results.responses.length, 1); assert.equal(results.responses[0].answers.tempo_semanal, 0);
  assert.equal('subject' in results.responses[0], false);
  assert.match(await (await f.request('/api/admin/export')).text(), /Participante Teste/);
  await f.login({ sub: 'user-b', email: 'other@example.com' });
  assert.equal((await (await f.request('/api/me')).json()).receipt, null);
  assert.equal((await f.request('/api/admin/responses')).status, 403);
  assert.equal((await f.request('/api/admin/export')).status, 403);
  await f.login();
  assert.equal((await (await f.request('/api/me')).json()).receipt.id, receipt.id);
  assert.equal((await f.request('/api/auth/logout', { method: 'POST' })).status, 200);
  assert.equal((await f.request('/api/me')).status, 401);
});
test('validation rejects changed questionnaire, out-of-range numbers and contradictory options', () => {
  assert.deepEqual(validateResponse(payload(), questionnaire).errors, {});
  const invalid = payload(); invalid.version = 'old'; invalid.answers.tempo_semanal = -1; invalid.answers.quantidade_indicadores = 1.5; invalid.answers.ferramentas = ['Nenhuma', 'Planilhas']; invalid.consent = false;
  const errors = validateResponse(invalid, questionnaire).errors;
  for (const key of ['version', 'tempo_semanal', 'quantidade_indicadores', 'ferramentas', 'consent']) assert.ok(errors[key]);
  invalid.answers.tempo_semanal = false; assert.ok(validateResponse(invalid, questionnaire).errors.tempo_semanal);
});
test('public URL, QR, base paths and gateway authentication', async t => {
  const f = await fixture(t);
  for (const path of ['/api/config', '/medicao/api/config']) assert.equal((await f.request(path)).status, 200);
  for (const path of ['/', '/medicao', '/medicao/', '/medicao/charts.js']) assert.equal((await f.request(path)).status, 200);
  assert.match(await (await f.request('/medicao')).text(), /<base href="\/medicao\/">/);
  const qr = await f.request('/api/qr'); assert.equal(qr.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await qr.arrayBuffer()).subarray(1, 4).toString(), 'PNG');
  const locked = await fixture(t, { PUBLIC_URL: 'https://arsenal.dev.br/medicao', ARSENAL_ROUTE: '/medicao', ARSENAL_PROXY_TOKEN: 'proxy-test' });
  assert.equal((await locked.request('/api/config')).status, 403);
  assert.equal((await locked.request('/api/config', { headers: { 'x-arsenal-proxy-token': 'proxy-test' } })).status, 200);
});
test('saved responses survive reopening the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'medicao-test-'));
  try {
    let store = createStore(directory);
    store.db.prepare('INSERT INTO responses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('a', 'id', 'a@example.com', 'Nome', 'Empresa', '1', '{}', 'date', 'date'); store.close();
    store = createStore(directory); assert.equal(store.response('a').id, 'id'); store.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('CSV neutralizes formula injection and quotes user content', () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell('A,B'), '"A,B"');
  assert.equal(csvCell('  +123'), '"\'  +123"');
});
test('density handles insufficient, constant and zero values without inventing samples', () => {
  assert.equal(estimateDensity([1, 2, 3]), null);
  assert.equal(estimateDensity([1, 1, 1, 1, 1]), null);
  const values = numericValues([{ answers: { x: null } }, { answers: { x: 0 } }, { answers: { x: '' } }, { answers: { x: 2 } }], 'x');
  assert.deepEqual(values, [0, 2]); assert.equal(quantile([0, 1, 2, 3, 4], .5), 2);
  const model = estimateDensity([0, 10, 20, 30, 40, 50]);
  assert.ok(model.points.every(p => Number.isFinite(p.y) && p.y >= 0));
  const dx = model.max / 180;
  const integral = model.points.slice(1).reduce((sum, p, i) => sum + (p.y + model.points[i].y) * dx / 2, 0);
  assert.ok(Math.abs(integral - 1) < .01);
});
test('network aggregates sector/tool pairs, excludes None and applies edge filter', () => {
  const rows = [
    { answers: { setor: 'Serviços', ferramentas: ['Planilhas', 'Planilhas', 'BI'] } },
    { answers: { setor: 'Serviços', ferramentas: ['Planilhas'] } },
    { answers: { setor: 'Saúde', ferramentas: ['Nenhuma'] } }
  ];
  const graph = networkData(rows); assert.equal(graph.nodes.length, 3); assert.equal(graph.links.length, 2);
  assert.equal(graph.nodes.find(n => n.id === 's:Serviços').count, 2);
  assert.equal(networkData(rows, 2).links.length, 1); assert.equal(networkData(rows, 3).nodes.length, 0);
});
