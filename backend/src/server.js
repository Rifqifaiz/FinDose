import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, '..', '.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const { db, DEMO_ENABLED } = await import('./db.js');
const { HttpError, AUTH_PROVIDER, register, login, demoLogin, logout, authenticate } = await import('./auth.js');
const { hit } = await import('./limits.js');
const services = await import('./services.js');
const fifin = await import('./fifin.js');
const { publicCatalog } = await import('./catalog.js');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const FRONTEND_DIR = path.join(__dirname, '..', '..');
const MAX_BODY = 100 * 1024;

// Hanya file frontend ini yang disajikan (folder root berisi file lain yang tidak boleh terekspos)
const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/api.js': ['api.js', 'text/javascript; charset=utf-8'],
  '/config.js': ['config.js', 'text/javascript; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/icon.svg': ['icon.svg', 'image/svg+xml']
};

const PRODUCTION = process.env.NODE_ENV === 'production';

// Frontend disajikan dari origin yang sama, jadi CORS tertutup kecuali CORS_ORIGIN diisi
const CORS_HEADERS = process.env.CORS_ORIGIN ? {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  Vary: 'Origin'
} : {};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self'${process.env.SUPABASE_URL ? ` ${process.env.SUPABASE_URL}` : ''}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'"
  ].join('; '),
  ...(PRODUCTION ? { 'Strict-Transport-Security': 'max-age=15552000' } : {})
};

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...CORS_HEADERS });
  res.end(JSON.stringify(data));
}

// Di balik proxy hosting, IP klien ada di header yang ditambahkan proxy (entri terakhir X-Forwarded-For)
function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(v => v.trim()).filter(Boolean);
  return req.headers['fly-client-ip'] || forwarded.at(-1) || req.socket.remoteAddress || 'unknown';
}

function limit(bucket, key, max, windowMs, message = 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.') {
  if (!hit(bucket, key, max, windowMs)) throw new HttpError(429, message);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Data terlalu besar')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve({});
      try {
        const parsed = JSON.parse(text);
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch { reject(new HttpError(400, 'Body harus JSON valid')); }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const routes = [];
function route(method, pattern, handler, { auth = true } = {}) {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, regex, keys, handler, auth });
}

const state = async userId => services.buildState(userId, await fifin.fifinMode());

route('GET', '/api/health', () => {
  db.prepare('SELECT 1').get(); // pastikan database dapat diakses
  return { status: 'ok', service: 'findose-backend', timestamp: new Date().toISOString() };
}, { auth: false });
route('GET', '/api/catalog', () => ({ ...publicCatalog(), authProvider: AUTH_PROVIDER, demo: DEMO_ENABLED && AUTH_PROVIDER === 'local' }), { auth: false });

// Auth
route('POST', '/api/auth/register', async ({ body, ip }) => {
  limit('register', ip, 10, 60 * 60 * 1000, 'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi nanti.');
  const { token, userId } = register(body);
  return { token, state: await state(userId) };
}, { auth: false });
route('POST', '/api/auth/login', async ({ body, ip }) => {
  limit('login', ip, 40, 10 * 60 * 1000, 'Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.');
  const { token, userId } = login(body);
  return { token, state: await state(userId) };
}, { auth: false });
route('POST', '/api/auth/demo', async ({ ip }) => {
  limit('demo', ip, 20, 60 * 60 * 1000);
  const { token, userId } = demoLogin();
  return { token, state: await state(userId) };
}, { auth: false });
route('POST', '/api/auth/logout', ({ session }) => { logout(session.token); return { ok: true }; });

// State & profil
route('GET', '/api/state', ({ session }) => state(session.userId));
route('PATCH', '/api/profile', async ({ session, body }) => { services.updateProfile(session.userId, body); return { state: await state(session.userId) }; });
route('PUT', '/api/health-profile', async ({ session, body }) => { services.saveHealthProfile(session.userId, body); return { state: await state(session.userId) }; });

// Kantong
route('PUT', '/api/wallet/settings', async ({ session, body }) => { services.updateWalletSettings(session.userId, body); return { state: await state(session.userId) }; });
route('POST', '/api/wallet/deposit', async ({ session, body }) => {
  const transactionId = services.deposit(session.userId, body);
  return { transactionId, state: await state(session.userId) };
});
route('POST', '/api/wallet/claim', async ({ session, body }) => {
  const transactionId = services.claim(session.userId, body);
  return { transactionId, state: await state(session.userId) };
});

// Check-in
route('POST', '/api/checkin', async ({ session, body }) => {
  const id = services.submitCheckin(session.userId, body);
  return { checkin: services.getCheckin(session.userId, id), state: await state(session.userId) };
});
route('GET', '/api/checkins', ({ session }) => ({ checkins: services.listCheckins(session.userId) }));
route('GET', '/api/checkins/:id', ({ session, params }) => ({ checkin: services.getCheckin(session.userId, params.id) }));

// Fifin
route('GET', '/api/fifin/history', async ({ session }) => ({ messages: fifin.getHistory(session.userId), mode: await fifin.fifinMode() }));
route('DELETE', '/api/fifin/history', ({ session }) => { fifin.clearHistory(session.userId); return { ok: true }; });
route('POST', '/api/fifin/chat', async ({ session, body }) => {
  limit('chat', session.userId, 20, 10 * 60 * 1000, 'Kamu mengirim terlalu banyak pesan. Tunggu beberapa menit ya.');
  const result = await fifin.chat(session.userId, body.message, await state(session.userId));
  if (!result) throw new HttpError(400, 'Pesan tidak boleh kosong');
  return { ...result, mode: await fifin.fifinMode() };
});

// ---------------------------------------------------------------------------
async function serveStatic(pathname, method, res) {
  const entry = STATIC_FILES[pathname];
  if (!entry) return false;
  try {
    const content = await readFile(path.join(FRONTEND_DIR, entry[0]));
    res.writeHead(200, { 'Content-Type': entry[1], 'Content-Length': content.length, 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
    res.end(method === 'HEAD' ? undefined : content);
  } catch {
    send(res, 404, { error: 'File tidak ditemukan' });
  }
  return true;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (req.method === 'OPTIONS') { res.writeHead(204, { ...SECURITY_HEADERS, ...CORS_HEADERS }); return res.end(); }

    try {
      if (!pathname.startsWith('/api/')) {
        if ((req.method === 'GET' || req.method === 'HEAD') && await serveStatic(pathname, req.method, res)) return;
        return send(res, 404, { error: 'Not found' });
      }

      for (const r of routes) {
        if (r.method !== req.method) continue;
        const match = pathname.match(r.regex);
        if (!match) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
        const session = r.auth ? await authenticate(req) : null;
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
        return send(res, 200, await r.handler({ req, params, body, session, ip: clientIp(req) }));
      }
      return send(res, 404, { error: 'Route tidak ditemukan' });
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error('API Error:', err);
      return send(res, 500, { error: 'Terjadi kesalahan di server' });
    }
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
}

if (import.meta.main) {
  const server = createServer();
  server.listen(PORT, HOST, async () => {
    console.log(`🚀 FinDose berjalan di http://localhost:${PORT}`);
    for (const ip of lanAddresses()) console.log(`📱 Buka di HP (Wi-Fi yang sama): http://${ip}:${PORT}`);
    console.log(`🔐 Auth: ${AUTH_PROVIDER} | 🤖 Fifin: ${await fifin.fifinMode()} | 🎭 Demo: ${DEMO_ENABLED ? 'aktif' : 'mati'}${PRODUCTION ? ' | mode produksi' : ''}`);
  });

  // Hosting menghentikan container dengan SIGTERM: selesaikan request berjalan lalu tutup database dengan rapi
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      console.log(`${signal} diterima, menutup server…`);
      server.close(() => { db.close(); process.exit(0); });
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
}
