import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'findose-test-'));
process.env.FINDOSE_DB = path.join(dir, 'test.db');
process.env.FIFIN_AI = 'off';
process.env.AUTH_PROVIDER = 'local';

let server;
let base;

before(async () => {
  const { createServer } = await import('../src/server.js');
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

async function call(method, url, { body, token } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json() };
}

test('alur lengkap: daftar → consent → check-in → setor → tarik → Fifin', async () => {
  const reg = await call('POST', '/api/auth/register', { body: { name: 'Uji Coba', email: 'uji@kampus.ac.id', password: 'rahasia123' } });
  assert.equal(reg.status, 200);
  const token = reg.data.token;
  assert.equal(reg.data.state.user.hasConsented, false);

  assert.equal((await call('GET', '/api/state')).status, 401);
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Lagi', email: 'uji@kampus.ac.id', password: 'rahasia123' } })).status, 409);
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'uji@kampus.ac.id', password: 'salahsalah' } })).status, 401);

  const consent = await call('PATCH', '/api/profile', { token, body: { hasConsented: true } });
  assert.equal(consent.data.state.user.hasConsented, true);

  const checkin = await call('POST', '/api/checkin', {
    token,
    body: {
      mode: 'advanced',
      answers: { meal: 'sering_telat', caffeine: 3, sleep: 'kurang_5', symptoms: ['perut_perih'] },
      health: { history: ['maag'], chronic: [{ id: 'asma', monthlyCost: 60000 }], allergies: 'Aspirin' }
    }
  });
  assert.equal(checkin.status, 200);
  assert.equal(checkin.data.checkin.result.risks[0].id, 'maag');
  assert.equal(checkin.data.state.health.chronic[0].id, 'asma');

  const dep = await call('POST', '/api/wallet/deposit', { token, body: { amount: 100000 } });
  assert.equal(dep.status, 200);
  // Saldo cukup -> potongan obat rutin bulan ini otomatis dibayar
  assert.equal(dep.data.state.health.deduction.status, 'paid');
  assert.equal(dep.data.state.wallet.balance, 40000);

  assert.equal((await call('POST', '/api/wallet/claim', { token, body: { category: 'maag', amount: 999999 } })).status, 400);
  const claimRes = await call('POST', '/api/wallet/claim', { token, body: { category: 'maag', amount: 30000 } });
  assert.equal(claimRes.data.state.wallet.balance, 10000);

  const settings = await call('PUT', '/api/wallet/settings', { token, body: { autodebitEnabled: true, autodebitDay: 1, autodebitAmount: 20000, target: 150000 } });
  assert.equal(settings.data.state.wallet.autodebit.enabled, true);
  assert.equal(settings.data.state.wallet.target, 150000);

  const chat = await call('POST', '/api/fifin/chat', { token, body: { message: 'Berapa aku harus menabung?' } });
  assert.equal(chat.status, 200);
  assert.equal(chat.data.source, 'lokal');
  assert.match(chat.data.reply, /Rp/);

  const danger = await call('POST', '/api/fifin/chat', { token, body: { message: 'aku sesak napas dari tadi' } });
  assert.equal(danger.data.source, 'safety');
  assert.match(danger.data.reply, /119/);

  const history = await call('GET', '/api/fifin/history', { token });
  assert.equal(history.data.messages.length, 4);

  await call('POST', '/api/auth/logout', { token });
  assert.equal((await call('GET', '/api/state', { token })).status, 401);
});

test('akun demo terpisah per pengunjung (saldo & chat tidak dibagi)', async () => {
  const a = await call('POST', '/api/auth/demo', { body: {} });
  const b = await call('POST', '/api/auth/demo', { body: {} });
  assert.equal(a.status, 200);
  assert.equal(a.data.state.streakWeeks, 2);
  assert.equal(a.data.state.wallet.balance, 69000);
  assert.notEqual(a.data.state.user.id, b.data.state.user.id);

  await call('POST', '/api/wallet/deposit', { token: a.data.token, body: { amount: 10000 } });
  await call('POST', '/api/fifin/chat', { token: a.data.token, body: { message: 'Halo Fifin' } });
  const stateB = await call('GET', '/api/state', { token: b.data.token });
  const chatB = await call('GET', '/api/fifin/history', { token: b.data.token });
  assert.equal(stateB.data.wallet.balance, 69000);
  assert.equal(chatB.data.messages.length, 0);
});

test('header keamanan ada dan CORS tertutup secara default', async () => {
  const res = await fetch(`${base}/`, { headers: { Origin: 'https://situs-lain.example' } });
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  const api = await fetch(`${base}/api/catalog`, { headers: { Origin: 'https://situs-lain.example' } });
  assert.equal(api.headers.get('access-control-allow-origin'), null);
  assert.equal(api.headers.get('cache-control'), 'no-store');
});

test('percobaan login berulang dibatasi', async () => {
  let last;
  for (let i = 0; i < 12; i++) {
    last = await call('POST', '/api/auth/login', { body: { email: 'korban@kampus.ac.id', password: 'salahsalah' } });
  }
  assert.equal(last.status, 429);
});

test('chat Fifin dibatasi per user', async () => {
  const demo = await call('POST', '/api/auth/demo', { body: {} });
  let last;
  for (let i = 0; i < 22; i++) {
    last = await call('POST', '/api/fifin/chat', { token: demo.data.token, body: { message: 'tips tidur' } });
  }
  assert.equal(last.status, 429);
});

test('file sensitif di root tidak disajikan', async () => {
  const res = await fetch(`${base}/ai_bridge.py`);
  assert.equal(res.status, 404);
  const css = await fetch(`${base}/style.css`);
  assert.equal(css.status, 200);
});
