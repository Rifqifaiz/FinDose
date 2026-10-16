import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswers, normalizeHealthProfile, calculateRiskAndDosage, ValidationError } from '../src/riskEngine.js';

const risky = { meal: 'sering_telat', caffeine: 3, sleep: 'kurang_5', posture: 'lebih_6', water: 'kurang_1l', exercise: 'tidak', stress: 'tinggi' };
const healthy = { meal: 'teratur', caffeine: 0, sleep: 'lebih_7', posture: 'kurang_4', water: 'lebih_2l', exercise: 'tiga_plus', stress: 'rendah' };

test('pola hidup berisiko menghasilkan maag & ISPA tinggi', () => {
  const r = calculateRiskAndDosage(normalizeAnswers(risky));
  const level = id => r.risks.find(x => x.id === id).level;
  assert.equal(level('maag'), 'Tinggi');
  assert.equal(level('ispa'), 'Tinggi');
  assert.ok(r.totalExposure > 0);
  assert.ok(r.recommendedWeeklyDeposit > 10000);
});

test('pola hidup sehat menghasilkan setoran minimum dan tanpa risiko tinggi', () => {
  const r = calculateRiskAndDosage(normalizeAnswers(healthy));
  assert.ok(r.risks.every(x => x.level !== 'Tinggi'));
  assert.equal(r.recommendedWeeklyDeposit, 10000);
});

test('streak ≥ 2 minggu memotong Rp5.000 tapi tidak di bawah minimum', () => {
  const answers = normalizeAnswers(risky);
  const base = calculateRiskAndDosage(answers);
  const discounted = calculateRiskAndDosage(answers, { healthyStreakWeeks: 2 });
  assert.equal(base.acuteWeekly - discounted.acuteWeekly, 5000);
  assert.ok(discounted.acuteWeekly >= 10000);
});

test('riwayat & penyakit kronik menaikkan skor dan menambah cadangan obat', () => {
  const answers = normalizeAnswers(healthy, 'advanced');
  const plain = calculateRiskAndDosage(answers, { mode: 'advanced' });
  const profile = normalizeHealthProfile({ history: ['maag'], chronic: [{ id: 'gerd', monthlyCost: 52000 }] });
  const withProfile = calculateRiskAndDosage(answers, { mode: 'advanced', profile });
  const maag = r => r.risks.find(x => x.id === 'maag').score;
  assert.equal(maag(withProfile) - maag(plain), 5);
  assert.equal(withProfile.chronic.monthlyTotal, 52000);
  assert.equal(withProfile.chronic.weeklyReserve, 12000); // 52.000 × 12 / 52 = 12.000
  assert.equal(withProfile.recommendedWeeklyDeposit, withProfile.acuteWeekly + 12000);
});

test('nyeri haid hanya muncul bila ada pemicu', () => {
  const without = calculateRiskAndDosage(normalizeAnswers(healthy, 'advanced'), { mode: 'advanced' });
  assert.ok(!without.risks.some(r => r.id === 'dysmenorrhea'));
  const withSymptom = calculateRiskAndDosage(normalizeAnswers({ ...healthy, symptoms: ['nyeri_haid'] }, 'advanced'), { mode: 'advanced' });
  assert.ok(withSymptom.risks.some(r => r.id === 'dysmenorrhea'));
});

test('mode dasar mengabaikan jawaban lanjutan', () => {
  const answers = normalizeAnswers({ ...healthy, streetFood: 'sering' }, 'basic');
  assert.equal(answers.streetFood, 'kadang'); // default
  // Faktor yang tidak ditanyakan tidak boleh menyumbang skor
  const r = calculateRiskAndDosage(answers, { mode: 'basic' });
  assert.ok(!r.risks.some(x => x.reasons.includes('Sering makan pedas / berminyak')));
  assert.equal(r.risks.find(x => x.id === 'digest').score, 0);
});

test('jawaban tidak valid ditolak', () => {
  assert.throws(() => normalizeAnswers({ meal: 'kadang' }), ValidationError);
  assert.throws(() => normalizeAnswers({ caffeine: 99 }), ValidationError);
  assert.throws(() => normalizeAnswers({ symptoms: ['xx'] }, 'advanced'), ValidationError);
  assert.throws(() => normalizeHealthProfile({ chronic: [{ id: 'asma', monthlyCost: -1 }] }), ValidationError);
  assert.throws(() => normalizeHealthProfile({ chronic: [{ id: 'lainnya', name: '' }] }), ValidationError);
});
