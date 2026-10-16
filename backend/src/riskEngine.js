/**
 * FinDose - Deterministic Risk & Financial Dosage Engine
 * Skor berbasis faktor gaya hidup + riwayat penyakit + penyakit kronik.
 * Setiap faktor menyumbang poin ke kondisi terkait; poin -> level -> estimasi biaya.
 */
import { QUESTIONS, CONDITIONS, HISTORY_OPTIONS, CHRONIC_OPTIONS } from './catalog.js';

export class ValidationError extends Error {}

const LEVEL_PROBABILITY = { Rendah: 0.1, Sedang: 0.3, Tinggi: 0.6 };
const MIN_WEEKLY = 10000;
const STREAK_DISCOUNT = 5000;

function levelFor(score) {
  if (score >= 6) return 'Tinggi';
  if (score >= 3) return 'Sedang';
  return 'Rendah';
}

const roundUp = (value, step) => Math.ceil(value / step) * step;

// Aturan skor: [questionId, poin (map nilai -> poin, atau fungsi), alasan singkat]
const has = symptom => list => (list.includes(symptom) ? 3 : 0);
const RULES = {
  maag: [
    ['meal', { kadang_telat: 2, sering_telat: 4 }, 'Jadwal makan tidak teratur'],
    ['caffeine', v => (v >= 3 ? 2 : v >= 2 ? 1 : 0), 'Kafein ≥ 2 cangkir/hari'],
    ['spicy', { kadang: 1, sering: 2 }, 'Sering makan pedas / berminyak'],
    ['stress', { sedang: 1, tinggi: 2 }, 'Stres memicu asam lambung'],
    ['smoke', { kadang: 1, rutin: 2 }, 'Rokok / vape mengiritasi lambung'],
    ['symptoms', has('perut_perih'), 'Sudah ada keluhan perut perih']
  ],
  ispa: [
    ['sleep', { kurang_5: 4, lima_enam: 2 }, 'Kurang tidur menurunkan imun'],
    ['exercise', { tidak: 1 }, 'Jarang olahraga'],
    ['water', { kurang_1l: 1 }, 'Kurang minum air'],
    ['stress', { tinggi: 1 }, 'Stres berat melemahkan imun'],
    ['smoke', { kadang: 1, rutin: 2 }, 'Rokok / vape mengiritasi saluran napas'],
    ['commute', { harian_singkat: 1, harian_lama: 2 }, 'Sering terpapar polusi & hujan'],
    ['symptoms', has('batuk_pilek'), 'Sudah batuk / pilek']
  ],
  headache: [
    ['posture', { empat_enam: 2, lebih_6: 3 }, 'Duduk lama tanpa jeda'],
    ['sleep', { kurang_5: 2, lima_enam: 1 }, 'Kurang tidur'],
    ['water', { kurang_1l: 1 }, 'Kurang minum air'],
    ['stress', { sedang: 1, tinggi: 2 }, 'Stres'],
    ['caffeine', v => (v >= 4 ? 1 : 0), 'Kafein berlebih'],
    ['screen', { lebih_6: 1 }, 'Screen time tinggi'],
    ['symptoms', has('sakit_kepala'), 'Sudah sering sakit kepala']
  ],
  back: [
    ['posture', { empat_enam: 2, lebih_6: 4 }, 'Duduk lama tanpa jeda'],
    ['exercise', { tidak: 2, satu_dua: 1 }, 'Otot jarang dilatih'],
    ['screen', { lebih_6: 1 }, 'Postur menunduk ke HP'],
    ['symptoms', has('pegal'), 'Sudah pegal leher / punggung']
  ],
  eye: [
    ['posture', { empat_enam: 1, lebih_6: 2 }, 'Lama menatap layar laptop'],
    ['screen', { tiga_enam: 1, lebih_6: 3 }, 'Screen time tinggi'],
    ['sleep', { kurang_5: 1 }, 'Mata kurang istirahat'],
    ['symptoms', has('mata_lelah'), 'Sudah ada mata lelah / kering']
  ],
  digest: [
    ['streetFood', { kadang: 2, sering: 4 }, 'Sering jajan di luar'],
    ['water', { kurang_1l: 1 }, 'Kurang cairan'],
    ['symptoms', has('diare'), 'Sudah diare minggu ini']
  ],
  dehydration: [
    ['water', { kurang_1l: 4, satu_dua: 1 }, 'Kurang minum air'],
    ['caffeine', v => (v >= 3 ? 1 : 0), 'Kafein bersifat diuretik'],
    ['exercise', { tiga_plus: 1 }, 'Banyak berkeringat saat olahraga']
  ],
  sleep: [
    ['sleep', { kurang_5: 3, lima_enam: 1 }, 'Durasi tidur pendek'],
    ['stress', { sedang: 1, tinggi: 3 }, 'Stres'],
    ['caffeine', v => (v >= 3 ? 2 : v >= 2 ? 1 : 0), 'Kafein mengganggu tidur'],
    ['screen', { lebih_6: 1 }, 'Layar sebelum tidur'],
    ['symptoms', has('susah_tidur'), 'Sudah susah tidur']
  ],
  dysmenorrhea: [
    ['symptoms', has('nyeri_haid'), 'Sedang mengalami nyeri haid'],
    ['stress', { tinggi: 1 }, 'Stres memperberat kram'],
    ['exercise', { tidak: 1 }, 'Jarang olahraga']
  ]
};

// ---------------------------------------------------------------------------
// Validasi & normalisasi jawaban check-in
// ---------------------------------------------------------------------------
export function normalizeAnswers(raw = {}, mode = 'basic') {
  if (!['basic', 'advanced'].includes(mode)) throw new ValidationError('Mode check-in tidak dikenal');
  const answers = {};
  for (const q of QUESTIONS) {
    const active = q.mode === 'basic' || mode === 'advanced';
    const value = raw[q.id];
    if (!active || value === undefined || value === null) {
      answers[q.id] = structuredClone(q.default);
      continue;
    }
    if (q.type === 'choice') {
      if (!q.options.some(o => o.value === value)) throw new ValidationError(`Jawaban "${q.title}" tidak valid`);
      answers[q.id] = value;
    } else if (q.type === 'counter') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < q.min || n > q.max) throw new ValidationError(`"${q.title}" harus ${q.min}–${q.max}`);
      answers[q.id] = n;
    } else if (q.type === 'multi') {
      if (!Array.isArray(value)) throw new ValidationError(`Jawaban "${q.title}" harus berupa daftar`);
      const allowed = new Set(q.options.map(o => o.value));
      if (!value.every(v => allowed.has(v))) throw new ValidationError(`Pilihan "${q.title}" tidak valid`);
      answers[q.id] = [...new Set(value)];
    }
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Validasi profil kesehatan
// ---------------------------------------------------------------------------
export function normalizeHealthProfile(raw = {}) {
  const historyIds = new Set(HISTORY_OPTIONS.map(h => h.id));
  const chronicById = new Map(CHRONIC_OPTIONS.map(c => [c.id, c]));

  const history = Array.isArray(raw.history) ? [...new Set(raw.history)] : [];
  if (!history.every(id => historyIds.has(id))) throw new ValidationError('Riwayat penyakit tidak valid');

  const chronicRaw = Array.isArray(raw.chronic) ? raw.chronic : [];
  if (chronicRaw.length > 10) throw new ValidationError('Maksimal 10 penyakit kronik');
  const seen = new Set();
  const chronic = chronicRaw.map(item => {
    const option = chronicById.get(item?.id);
    if (!option) throw new ValidationError('Penyakit kronik tidak valid');
    const cost = Number(item.monthlyCost ?? option.monthlyCost);
    if (!Number.isFinite(cost) || cost < 0 || cost > 5000000) throw new ValidationError('Biaya obat bulanan harus 0–5.000.000');
    const name = option.id === 'lainnya' ? String(item.name || '').trim().slice(0, 40) : option.label;
    if (!name) throw new ValidationError('Isi nama penyakit kronik lainnya');
    const key = option.id === 'lainnya' ? `lainnya:${name.toLowerCase()}` : option.id;
    if (seen.has(key)) throw new ValidationError(`${name} tercatat dua kali`);
    seen.add(key);
    return { id: option.id, name, monthlyCost: Math.round(cost) };
  });

  const allergies = String(raw.allergies || '').trim().slice(0, 200);
  return { history, chronic, allergies };
}

export function chronicSummary(chronic = []) {
  const monthlyTotal = chronic.reduce((sum, c) => sum + c.monthlyCost, 0);
  return {
    items: chronic,
    monthlyTotal,
    weeklyReserve: monthlyTotal > 0 ? roundUp((monthlyTotal * 12) / 52, 1000) : 0
  };
}

// ---------------------------------------------------------------------------
// Kalkulasi utama
// ---------------------------------------------------------------------------
export function calculateRiskAndDosage(answers, { mode = 'basic', profile = {}, healthyStreakWeeks = 0 } = {}) {
  const history = profile.history || [];
  const chronic = profile.chronic || [];
  const boostSources = [
    ...HISTORY_OPTIONS.filter(h => history.includes(h.id)).map(h => ({ label: `Riwayat ${h.label.toLowerCase()}`, boosts: h.boosts })),
    ...CHRONIC_OPTIONS.filter(c => chronic.some(x => x.id === c.id)).map(c => ({ label: `Kondisi kronik: ${c.label.toLowerCase()}`, boosts: c.boosts }))
  ];

  // Hanya faktor yang benar-benar ditanyakan di mode ini yang dihitung
  const activeQuestions = new Set(QUESTIONS.filter(q => q.mode === 'basic' || mode === 'advanced').map(q => q.id));

  const risks = CONDITIONS.map(condition => {
    const contributions = [];
    for (const [questionId, points, reason] of RULES[condition.id]) {
      if (!activeQuestions.has(questionId)) continue;
      const value = answers[questionId];
      const p = typeof points === 'function' ? points(value) : (points[value] || 0);
      if (p > 0) contributions.push({ points: p, reason });
    }
    for (const source of boostSources) {
      const p = source.boosts[condition.id] || 0;
      if (p > 0) contributions.push({ points: p, reason: source.label });
    }
    const score = contributions.reduce((s, c) => s + c.points, 0);
    const level = levelFor(score);
    return {
      id: condition.id,
      name: condition.name,
      icon: condition.icon,
      optional: Boolean(condition.optional),
      score,
      level,
      cost: condition.cost[level],
      reasons: contributions.sort((a, b) => b.points - a.points).slice(0, 3).map(c => c.reason),
      meds: condition.meds,
      tip: condition.tip
    };
  })
    // Kondisi opsional (mis. nyeri haid) hanya tampil bila ada pemicu
    .filter(r => !r.optional || r.score > 0)
    .sort((a, b) => b.score - a.score);

  const elevated = risks.filter(r => r.level !== 'Rendah');
  const totalExposure = elevated.reduce((s, r) => s + r.cost, 0);
  const expectedCost = risks.reduce((s, r) => s + r.cost * LEVEL_PROBABILITY[r.level], 0);

  let acuteWeekly = Math.max(MIN_WEEKLY, roundUp(expectedCost / 4, 5000));
  const streakDiscountApplied = healthyStreakWeeks >= 2 && acuteWeekly > MIN_WEEKLY;
  if (streakDiscountApplied) acuteWeekly = Math.max(MIN_WEEKLY, acuteWeekly - STREAK_DISCOUNT);

  const chronicInfo = chronicSummary(chronic);
  const answeredFactors = activeQuestions.size;

  return {
    mode,
    risks,
    topRisk: risks[0] ? { id: risks[0].id, name: risks[0].name, level: risks[0].level } : null,
    totalExposure,
    acuteWeekly,
    chronic: chronicInfo,
    recommendedWeeklyDeposit: acuteWeekly + chronicInfo.weeklyReserve,
    streakDiscountApplied,
    streakDiscount: streakDiscountApplied ? STREAK_DISCOUNT : 0,
    factorsUsed: answeredFactors + history.length + chronic.length
  };
}
