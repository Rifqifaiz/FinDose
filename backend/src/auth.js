/**
 * FinDose - Autentikasi
 * AUTH_PROVIDER=local    -> email + password disimpan di SQLite (scrypt), token sesi opak.
 * AUTH_PROVIDER=supabase -> klien login lewat Supabase Auth; backend memverifikasi access token
 *                           ke Supabase lalu membuat/menyinkronkan baris user lokal.
 */
import { db, createUserRecords, seedDemoData, cleanupDemoUsers, DEMO_ENABLED, DEMO_EMAIL_DOMAIN } from './db.js';
import { hashPassword, verifyPassword, newToken, sha256, newId } from './security.js';
import { hit, reset } from './limits.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const AUTH_PROVIDER = process.env.AUTH_PROVIDER === 'supabase' ? 'supabase' : 'local';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateCredentials({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) throw new HttpError(400, 'Format email tidak valid');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password minimal 8 karakter');
  if (password.length > 128) throw new HttpError(400, 'Password terlalu panjang');
  return { email: cleanEmail, password };
}

function createSession(userId) {
  const token = newToken();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, Date.now() + SESSION_TTL_MS);
  return token;
}

function requireLocalProvider() {
  if (AUTH_PROVIDER !== 'local') throw new HttpError(400, 'Login dikelola Supabase di sisi klien');
}

export function register({ name, email, password, campus }) {
  requireLocalProvider();
  const creds = validateCredentials({ email, password });
  const cleanName = String(name || '').trim();
  if (cleanName.length < 2 || cleanName.length > 60) throw new HttpError(400, 'Nama harus 2–60 karakter');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(creds.email)) throw new HttpError(409, 'Email sudah terdaftar. Silakan masuk.');

  const id = newId('user');
  createUserRecords({ id, email: creds.email, name: cleanName, campus: String(campus || '').trim().slice(0, 80), passwordHash: hashPassword(creds.password) });
  return { token: createSession(id), userId: id };
}

export function login({ email, password }) {
  requireLocalProvider();
  const creds = validateCredentials({ email, password });
  if (!hit('login-email', creds.email, 10, 10 * 60 * 1000)) {
    throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.');
  }
  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ? AND auth_provider = 'local'").get(creds.email);
  if (!user || !verifyPassword(creds.password, user.password_hash)) throw new HttpError(401, 'Email atau password salah');
  reset('login-email', creds.email);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return { token: createSession(user.id), userId: user.id };
}

export function demoLogin() {
  if (!DEMO_ENABLED || AUTH_PROVIDER !== 'local') throw new HttpError(404, 'Akun demo tidak tersedia');
  cleanupDemoUsers();
  const id = newId('demo');
  createUserRecords({ id, email: `${id}@${DEMO_EMAIL_DOMAIN}`, name: 'Rifqi', campus: 'Universitas Indonesia', passwordHash: null });
  seedDemoData(id);
  return { token: createSession(id), userId: id };
}

export function logout(token) {
  if (token && AUTH_PROVIDER === 'local') db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

async function verifySupabaseToken(token) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new HttpError(500, 'SUPABASE_URL / SUPABASE_ANON_KEY belum diset');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const sbUser = await res.json();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(sbUser.id);
  if (!existing) {
    createUserRecords({
      id: sbUser.id,
      email: sbUser.email,
      name: sbUser.user_metadata?.name || sbUser.email.split('@')[0],
      provider: 'supabase'
    });
  }
  return sbUser.id;
}

/** Mengembalikan { userId, token } atau melempar 401. */
export async function authenticate(req) {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'Silakan masuk terlebih dahulu');
  if (AUTH_PROVIDER === 'supabase') {
    const userId = await verifySupabaseToken(token);
    if (!userId) throw new HttpError(401, 'Sesi berakhir, silakan masuk lagi');
    return { userId, token };
  }
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(sha256(token));
  if (!session || session.expires_at < Date.now()) throw new HttpError(401, 'Sesi berakhir, silakan masuk lagi');
  return { userId: session.user_id, token };
}
