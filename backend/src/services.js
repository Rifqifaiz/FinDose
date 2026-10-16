/**
 * FinDose - Layanan domain: state user, kantong sehat, autodebet,
 * potongan obat kronik bulanan, streak sehat, dan check-in.
 */
import { db, json } from './db.js';
import { HttpError } from './auth.js';
import { newId } from './security.js';
import { CONDITIONS, CHRONIC_OPTIONS } from './catalog.js';
import { normalizeAnswers, normalizeHealthProfile, calculateRiskAndDosage, chronicSummary, ValidationError } from './riskEngine.js';

const DAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_MS = 86400000;

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function requireInt(value, min, max, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${label} harus antara Rp${min.toLocaleString('id-ID')} dan Rp${max.toLocaleString('id-ID')}`);
  }
  return n;
}

function insertTransaction(userId, { title, amount, type, category, note, createdAt }) {
  const id = newId('TX');
  db.prepare('INSERT INTO transactions (id, user_id, title, amount, type, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, title, amount, type, category, note || '', createdAt || new Date().toISOString());
  db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(amount, userId);
  return id;
}

// ---------------------------------------------------------------------------
// Profil kesehatan
// ---------------------------------------------------------------------------
export function getHealthProfile(userId) {
  const row = db.prepare('SELECT * FROM health_profiles WHERE user_id = ?').get(userId);
  return {
    history: json.parse(row.history, []),
    chronic: json.parse(row.chronic, []),
    allergies: row.allergies,
    chronicAutodeduct: Boolean(row.chronic_autodeduct)
  };
}

export function saveHealthProfile(userId, body) {
  let profile;
  try { profile = normalizeHealthProfile(body); } catch (err) { throw asHttp(err); }
  const autodeduct = body.chronicAutodeduct === undefined ? 1 : (body.chronicAutodeduct ? 1 : 0);
  db.prepare('UPDATE health_profiles SET history = ?, chronic = ?, allergies = ?, chronic_autodeduct = ?, updated_at = ? WHERE user_id = ?')
    .run(json.stringify(profile.history), json.stringify(profile.chronic), profile.allergies, autodeduct, new Date().toISOString(), userId);
}

function asHttp(err) {
  return err instanceof ValidationError ? new HttpError(400, err.message) : err;
}

// ---------------------------------------------------------------------------
// Proses otomatis saat state dibaca: autodebet mingguan (simulasi) & potongan obat kronik
// ---------------------------------------------------------------------------
function processAutodebit(userId) {
  const w = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  if (!w.autodebit_enabled) return;
  const now = new Date();
  if (!w.autodebit_last_run) {
    db.prepare('UPDATE wallets SET autodebit_last_run = ? WHERE user_id = ?').run(now.toISOString(), userId);
    return;
  }
  const cursor = new Date(w.autodebit_last_run);
  cursor.setHours(8, 0, 0, 0);
  let runs = 0;
  while (runs < 8) {
    cursor.setTime(cursor.getTime() + DAY_MS);
    if (cursor > now) break;
    if (cursor.getDay() === w.autodebit_day) {
      insertTransaction(userId, {
        title: 'Autodebet mingguan', amount: w.autodebit_amount, type: 'in', category: 'autodebit',
        note: 'Simulasi: rekening utama → Kantong Sehat', createdAt: cursor.toISOString()
      });
      runs += 1;
    }
  }
  db.prepare('UPDATE wallets SET autodebit_last_run = ? WHERE user_id = ?').run(now.toISOString(), userId);
}

function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function processChronicDeduction(userId) {
  const profile = getHealthProfile(userId);
  const { monthlyTotal } = chronicSummary(profile.chronic);
  if (!profile.chronicAutodeduct || monthlyTotal <= 0) return;

  const period = currentPeriod();
  const row = db.prepare('SELECT * FROM chronic_deductions WHERE user_id = ? AND period = ?').get(userId, period);
  if (row?.status === 'paid') return;

  const { balance } = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(userId);
  const amount = monthlyTotal;
  const status = balance >= amount ? 'paid' : 'pending';
  if (status === 'paid') {
    insertTransaction(userId, {
      title: 'Potongan obat rutin', amount: -amount, type: 'out', category: 'chronic',
      note: profile.chronic.map(c => c.name).join(', ')
    });
  }
  db.prepare(`INSERT INTO chronic_deductions (user_id, period, amount, status) VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, period) DO UPDATE SET amount = excluded.amount, status = excluded.status`)
    .run(userId, period, amount, status);
}

// ---------------------------------------------------------------------------
// Streak sehat: minggu berturut-turut dengan check-in tanpa risiko "Tinggi"
// ---------------------------------------------------------------------------
function weekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeStreak(userId, now = new Date()) {
  const rows = db.prepare('SELECT result, created_at FROM checkins WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const latestPerWeek = new Map();
  for (const row of rows) {
    const key = weekKey(row.created_at);
    if (!latestPerWeek.has(key)) latestPerWeek.set(key, json.parse(row.result, { risks: [] }));
  }
  const isHealthy = result => !result.risks.some(r => r.level === 'Tinggi');
  let cursor = new Date(now);
  if (!latestPerWeek.has(weekKey(cursor))) cursor = new Date(cursor.getTime() - 7 * DAY_MS);
  let streak = 0;
  while (latestPerWeek.has(weekKey(cursor)) && isHealthy(latestPerWeek.get(weekKey(cursor)))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 7 * DAY_MS);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// State lengkap untuk klien
// ---------------------------------------------------------------------------
function mapCheckin(row, full = false) {
  const result = json.parse(row.result, {});
  const base = {
    id: row.id,
    mode: row.mode,
    createdAt: row.created_at,
    topRisk: result.topRisk,
    recommendedWeeklyDeposit: result.recommendedWeeklyDeposit,
    totalExposure: result.totalExposure
  };
  return full ? { ...base, answers: json.parse(row.answers, {}), result } : base;
}

export function buildState(userId, fifinMode) {
  transaction(() => {
    processAutodebit(userId);
    processChronicDeduction(userId);
  });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new HttpError(401, 'Akun tidak ditemukan');
  const w = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  const health = getHealthProfile(userId);
  const period = currentPeriod();
  const deduction = db.prepare('SELECT period, amount, status FROM chronic_deductions WHERE user_id = ? AND period = ?').get(userId, period) || null;
  const transactions = db.prepare('SELECT id, title, amount, type, category, note, created_at AS createdAt FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').all(userId);
  const lastRow = db.prepare('SELECT * FROM checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthTx = transactions.filter(t => new Date(t.createdAt) >= monthStart);

  return {
    user: { id: user.id, name: user.name, email: user.email, campus: user.campus, hasConsented: Boolean(user.has_consented), provider: user.auth_provider },
    wallet: {
      balance: w.balance,
      target: w.target,
      progress: w.target > 0 ? Math.min(100, Math.round((Math.max(0, w.balance) / w.target) * 100)) : 0,
      autodebit: { enabled: Boolean(w.autodebit_enabled), day: w.autodebit_day, dayLabel: DAY_LABELS[w.autodebit_day], amount: w.autodebit_amount }
    },
    health: { ...health, summary: chronicSummary(health.chronic), deduction },
    streakWeeks: computeStreak(userId),
    lastCheckin: lastRow ? mapCheckin(lastRow, true) : null,
    checkinThisWeek: lastRow ? weekKey(lastRow.created_at) === weekKey(new Date()) : false,
    transactions,
    stats: {
      monthIn: monthTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      monthOut: monthTx.filter(t => t.amount < 0).reduce((s, t) => s - t.amount, 0)
    },
    fifin: { mode: fifinMode }
  };
}

// ---------------------------------------------------------------------------
// Mutasi
// ---------------------------------------------------------------------------
export function updateProfile(userId, body) {
  const user = db.prepare('SELECT name, campus, has_consented FROM users WHERE id = ?').get(userId);
  const name = body.name === undefined ? user.name : cleanText(body.name, 60);
  if (name.length < 2) throw new HttpError(400, 'Nama minimal 2 karakter');
  const campus = body.campus === undefined ? user.campus : cleanText(body.campus, 80);
  const consented = body.hasConsented === undefined ? user.has_consented : (body.hasConsented ? 1 : 0);
  db.prepare('UPDATE users SET name = ?, campus = ?, has_consented = ? WHERE id = ?').run(name, campus, consented, userId);
}

export function updateWalletSettings(userId, body) {
  const w = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  const target = body.target === undefined ? w.target : requireInt(body.target, 10000, 10000000, 'Target');
  const day = body.autodebitDay === undefined ? w.autodebit_day : Number(body.autodebitDay);
  if (!Number.isInteger(day) || day < 0 || day > 6) throw new HttpError(400, 'Hari autodebet tidak valid');
  const amount = body.autodebitAmount === undefined ? w.autodebit_amount : requireInt(body.autodebitAmount, 5000, 1000000, 'Nominal autodebet');
  const enabled = body.autodebitEnabled === undefined ? w.autodebit_enabled : (body.autodebitEnabled ? 1 : 0);
  // Saat baru diaktifkan, mulai hitung dari sekarang (tanpa menagih minggu-minggu lalu)
  const lastRun = enabled && !w.autodebit_enabled ? new Date().toISOString() : w.autodebit_last_run;
  db.prepare('UPDATE wallets SET target = ?, autodebit_day = ?, autodebit_amount = ?, autodebit_enabled = ?, autodebit_last_run = ? WHERE user_id = ?')
    .run(target, day, amount, enabled, lastRun, userId);
}

export function deposit(userId, body) {
  const amount = requireInt(body.amount, 1000, 5000000, 'Nominal setoran');
  return insertTransaction(userId, {
    title: cleanText(body.title, 60) || 'Setoran manual',
    amount, type: 'in', category: body.category === 'nudge' ? 'nudge' : 'manual',
    note: cleanText(body.note, 120) || 'Top-up Kantong Sehat'
  });
}

const CLAIM_CATEGORIES = new Map([
  ...CONDITIONS.map(c => [c.id, c.name]),
  ...CHRONIC_OPTIONS.map(c => [`chronic:${c.id}`, `Obat rutin ${c.label.toLowerCase()}`]),
  ['klinik', 'Konsultasi klinik'],
  ['lainnya', 'Kebutuhan kesehatan lain']
]);

export function claim(userId, body) {
  const label = CLAIM_CATEGORIES.get(body.category);
  if (!label) throw new HttpError(400, 'Pilih kebutuhan pencairan');
  const amount = requireInt(body.amount, 1000, 5000000, 'Nominal pencairan');
  return transaction(() => {
    const { balance } = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(userId);
    if (balance < amount) throw new HttpError(400, 'Saldo Kantong Sehat tidak mencukupi');
    return insertTransaction(userId, {
      title: `Pencairan: ${label}`, amount: -amount, type: 'out', category: body.category,
      note: cleanText(body.note, 120) || 'Ditransfer ke rekening utama'
    });
  });
}

export function submitCheckin(userId, body) {
  const mode = body.mode === 'advanced' ? 'advanced' : 'basic';
  try {
    const answers = normalizeAnswers(body.answers || {}, mode);
    if (mode === 'advanced' && body.health) saveHealthProfile(userId, body.health);
    const profile = getHealthProfile(userId);
    const result = calculateRiskAndDosage(answers, { mode, profile, healthyStreakWeeks: computeStreak(userId) });
    const { lastInsertRowid } = db.prepare('INSERT INTO checkins (user_id, mode, answers, result) VALUES (?, ?, ?, ?)')
      .run(userId, mode, json.stringify(answers), json.stringify(result));
    return Number(lastInsertRowid);
  } catch (err) {
    throw asHttp(err);
  }
}

export function listCheckins(userId) {
  return db.prepare('SELECT * FROM checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 52').all(userId).map(r => mapCheckin(r));
}

export function getCheckin(userId, id) {
  const row = db.prepare('SELECT * FROM checkins WHERE user_id = ? AND id = ?').get(userId, Number(id));
  if (!row) throw new HttpError(404, 'Check-in tidak ditemukan');
  return mapCheckin(row, true);
}
