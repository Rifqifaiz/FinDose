import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newId } from './security.js';
import { normalizeAnswers, calculateRiskAndDosage } from './riskEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.FINDOSE_DB || path.join(__dirname, '..', 'findose.db');
const SCHEMA_VERSION = 2;

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

// Skema v1 (single user) tidak kompatibel dengan multi-user. Backup lama ada di backend/backup/.
const { user_version: currentVersion } = db.prepare('PRAGMA user_version').get();
if (currentVersion < SCHEMA_VERSION) {
  db.exec(`
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS checkins;
    DROP TABLE IF EXISTS wallets;
    DROP TABLE IF EXISTS users;
  `);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    campus TEXT DEFAULT '',
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'local',
    has_consented INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    target INTEGER NOT NULL DEFAULT 100000,
    autodebit_enabled INTEGER NOT NULL DEFAULT 0,
    autodebit_day INTEGER NOT NULL DEFAULT 5,
    autodebit_amount INTEGER NOT NULL DEFAULT 15000,
    autodebit_last_run TEXT
  );

  CREATE TABLE IF NOT EXISTS health_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    history TEXT NOT NULL DEFAULT '[]',
    chronic TEXT NOT NULL DEFAULT '[]',
    allergies TEXT NOT NULL DEFAULT '',
    chronic_autodeduct INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    answers TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in','out')),
    category TEXT NOT NULL DEFAULT 'manual',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS chronic_deductions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('paid','pending')),
    PRIMARY KEY (user_id, period)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content TEXT NOT NULL,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_checkin_user ON checkins(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, id);
`);
db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);

export const json = {
  parse: (text, fallback) => { try { return JSON.parse(text); } catch { return fallback; } },
  stringify: value => JSON.stringify(value)
};

export function createUserRecords({ id, email, name, campus = '', passwordHash = null, provider = 'local' }) {
  db.prepare(`INSERT INTO users (id, email, name, campus, password_hash, auth_provider) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, email, name, campus, passwordHash, provider);
  db.prepare('INSERT INTO wallets (user_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO health_profiles (user_id) VALUES (?)').run(id);
}

// ---------------------------------------------------------------------------
// Akun demo sementara: tiap pengunjung mendapat akun sendiri berisi data contoh,
// jadi saldo dan chat Fifin tidak terlihat oleh pengunjung lain. Dihapus setelah 24 jam.
// ---------------------------------------------------------------------------
export const DEMO_ENABLED = process.env.ENABLE_DEMO !== 'false';
export const DEMO_EMAIL_DOMAIN = 'demo.findose.id';
const DEMO_TTL_MS = 24 * 60 * 60 * 1000;

export function seedDemoData(id) {
  db.prepare('UPDATE users SET has_consented = 1 WHERE id = ?').run(id);
  db.prepare('UPDATE wallets SET balance = 69000, autodebit_enabled = 1, autodebit_day = 5, autodebit_amount = 15000, autodebit_last_run = ? WHERE user_id = ?')
    .run(new Date().toISOString(), id);

  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
  const insertTx = db.prepare('INSERT INTO transactions (id, user_id, title, amount, type, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertTx.run(newId('TX'), id, 'Setoran awal Kantong Sehat', 64000, 'in', 'manual', 'Pembukaan Kantong FinDose', daysAgo(27));
  insertTx.run(newId('TX'), id, 'Autodebet mingguan', 15000, 'in', 'autodebit', 'Rekening utama → Kantong Sehat', daysAgo(20));
  insertTx.run(newId('TX'), id, 'Pencairan obat maag', -25000, 'out', 'maag', 'Apotek kampus', daysAgo(13));
  insertTx.run(newId('TX'), id, 'Autodebet mingguan', 15000, 'in', 'autodebit', 'Rekening utama → Kantong Sehat', daysAgo(6));

  // Dua check-in sehat di minggu-minggu sebelumnya -> streak 2 minggu
  const answers = normalizeAnswers({ meal: 'teratur', caffeine: 1, sleep: 'lebih_7', posture: 'empat_enam', water: 'lebih_2l', exercise: 'satu_dua', stress: 'sedang' });
  const result = calculateRiskAndDosage(answers);
  const insertCheckin = db.prepare('INSERT INTO checkins (user_id, mode, answers, result, created_at) VALUES (?, ?, ?, ?, ?)');
  insertCheckin.run(id, 'basic', json.stringify(answers), json.stringify(result), daysAgo(14));
  insertCheckin.run(id, 'basic', json.stringify(answers), json.stringify(result), daysAgo(7));
}

export function cleanupDemoUsers() {
  const cutoff = new Date(Date.now() - DEMO_TTL_MS).toISOString();
  const { changes } = db.prepare('DELETE FROM users WHERE email LIKE ? AND created_at < ?').run(`%@${DEMO_EMAIL_DOMAIN}`, cutoff);
  return Number(changes);
}
cleanupDemoUsers();
