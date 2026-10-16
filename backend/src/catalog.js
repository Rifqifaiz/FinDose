/**
 * FinDose - Katalog data statis (sumber tunggal untuk engine & frontend)
 * Pertanyaan check-in, kondisi risiko, riwayat penyakit, penyakit kronik,
 * faskes, dan artikel edukasi. Dikirim ke klien via GET /api/catalog.
 */

// ---------------------------------------------------------------------------
// Pertanyaan check-in. mode: 'basic' tampil di semua mode, 'advanced' hanya mode Lanjutan.
// ---------------------------------------------------------------------------
export const QUESTIONS = [
  {
    id: 'meal', mode: 'basic', icon: '🍽️', title: 'Jadwal makan', hint: '3–7 hari terakhir',
    type: 'choice', default: 'teratur',
    options: [
      { value: 'teratur', label: 'Teratur' },
      { value: 'kadang_telat', label: 'Kadang telat' },
      { value: 'sering_telat', label: 'Sering telat' }
    ]
  },
  {
    id: 'caffeine', mode: 'basic', icon: '☕', title: 'Kopi / minuman energi', hint: 'Cangkir per hari',
    type: 'counter', min: 0, max: 8, default: 1
  },
  {
    id: 'sleep', mode: 'basic', icon: '🌙', title: 'Durasi tidur malam', hint: 'Rata-rata minggu ini',
    type: 'choice', default: 'lebih_7',
    options: [
      { value: 'kurang_5', label: '< 5 jam' },
      { value: 'lima_enam', label: '5–6 jam' },
      { value: 'lebih_7', label: '≥ 7 jam' }
    ]
  },
  {
    id: 'posture', mode: 'basic', icon: '💻', title: 'Duduk belajar tanpa jeda', hint: 'Per hari',
    type: 'choice', default: 'kurang_4',
    options: [
      { value: 'kurang_4', label: '< 4 jam' },
      { value: 'empat_enam', label: '4–6 jam' },
      { value: 'lebih_6', label: '> 6 jam' }
    ]
  },
  {
    id: 'water', mode: 'basic', icon: '💧', title: 'Air putih', hint: 'Per hari',
    type: 'choice', default: 'lebih_2l',
    options: [
      { value: 'kurang_1l', label: '< 1 liter' },
      { value: 'satu_dua', label: '1–2 liter' },
      { value: 'lebih_2l', label: '> 2 liter' }
    ]
  },
  {
    id: 'exercise', mode: 'basic', icon: '🏃', title: 'Olahraga', hint: 'Minimal 30 menit, per minggu',
    type: 'choice', default: 'satu_dua',
    options: [
      { value: 'tidak', label: 'Tidak sama sekali' },
      { value: 'satu_dua', label: '1–2 kali' },
      { value: 'tiga_plus', label: '≥ 3 kali' }
    ]
  },
  {
    id: 'stress', mode: 'basic', icon: '🧠', title: 'Tingkat stres', hint: 'Tugas, ujian, organisasi',
    type: 'choice', default: 'sedang',
    options: [
      { value: 'rendah', label: 'Santai' },
      { value: 'sedang', label: 'Lumayan' },
      { value: 'tinggi', label: 'Berat' }
    ]
  },
  {
    id: 'spicy', mode: 'advanced', icon: '🌶️', title: 'Makanan pedas / berminyak', hint: 'Seberapa sering',
    type: 'choice', default: 'kadang',
    options: [
      { value: 'jarang', label: 'Jarang' },
      { value: 'kadang', label: 'Kadang' },
      { value: 'sering', label: 'Hampir tiap hari' }
    ]
  },
  {
    id: 'streetFood', mode: 'advanced', icon: '🥡', title: 'Jajan di luar', hint: 'Kebersihan tidak pasti',
    type: 'choice', default: 'kadang',
    options: [
      { value: 'jarang', label: 'Jarang' },
      { value: 'kadang', label: '2–4x seminggu' },
      { value: 'sering', label: 'Hampir tiap hari' }
    ]
  },
  {
    id: 'screen', mode: 'advanced', icon: '📱', title: 'Screen time di luar tugas', hint: 'Per hari',
    type: 'choice', default: 'tiga_enam',
    options: [
      { value: 'kurang_3', label: '< 3 jam' },
      { value: 'tiga_enam', label: '3–6 jam' },
      { value: 'lebih_6', label: '> 6 jam' }
    ]
  },
  {
    id: 'smoke', mode: 'advanced', icon: '🚭', title: 'Rokok / vape', hint: '',
    type: 'choice', default: 'tidak',
    options: [
      { value: 'tidak', label: 'Tidak' },
      { value: 'kadang', label: 'Kadang' },
      { value: 'rutin', label: 'Rutin' }
    ]
  },
  {
    id: 'commute', mode: 'advanced', icon: '🛵', title: 'Perjalanan di jalan raya', hint: 'Terpapar polusi & hujan',
    type: 'choice', default: 'harian_singkat',
    options: [
      { value: 'jarang', label: 'Jarang' },
      { value: 'harian_singkat', label: 'Harian < 30 mnt' },
      { value: 'harian_lama', label: 'Harian > 30 mnt' }
    ]
  },
  {
    id: 'symptoms', mode: 'advanced', icon: '🩺', title: 'Keluhan ringan minggu ini', hint: 'Boleh pilih lebih dari satu',
    type: 'multi', default: [],
    options: [
      { value: 'perut_perih', label: 'Perut perih / kembung' },
      { value: 'batuk_pilek', label: 'Batuk / pilek' },
      { value: 'sakit_kepala', label: 'Sakit kepala' },
      { value: 'pegal', label: 'Pegal leher / punggung' },
      { value: 'mata_lelah', label: 'Mata lelah / kering' },
      { value: 'susah_tidur', label: 'Susah tidur' },
      { value: 'diare', label: 'Diare' },
      { value: 'nyeri_haid', label: 'Nyeri haid' }
    ]
  }
];

// ---------------------------------------------------------------------------
// Kondisi risiko akut. cost = estimasi out-of-pocket per episode (Rp).
// ---------------------------------------------------------------------------
export const CONDITIONS = [
  {
    id: 'maag', name: 'Maag / Gastritis', icon: '🫄',
    cost: { Rendah: 15000, Sedang: 30000, Tinggi: 45000 },
    meds: [
      { name: 'Antasida tablet kunyah / sirup', price: 15000 },
      { name: 'Famotidine (penghambat asam)', price: 20000 },
      { name: 'Suplemen pelindung lambung', price: 10000 }
    ],
    tip: 'Makan kecil tapi teratur, dan jangan minum kopi saat perut kosong.'
  },
  {
    id: 'ispa', name: 'Flu / Batuk / ISPA', icon: '🤧',
    cost: { Rendah: 15000, Sedang: 25000, Tinggi: 35000 },
    meds: [
      { name: 'Obat flu & batuk bebas', price: 18000 },
      { name: 'Tablet hisap (lozenges)', price: 10000 },
      { name: 'Vitamin C / Zinc', price: 7000 }
    ],
    tip: 'Kejar tidur 7 jam dan pakai masker saat di jalan.'
  },
  {
    id: 'headache', name: 'Sakit Kepala Tegang', icon: '🤕',
    cost: { Rendah: 10000, Sedang: 15000, Tinggi: 20000 },
    meds: [
      { name: 'Parasetamol 500 mg (1 strip)', price: 10000 },
      { name: 'Minyak angin / balsem', price: 10000 }
    ],
    tip: 'Istirahat 5 menit tiap 50 menit belajar, dan regangkan leher.'
  },
  {
    id: 'back', name: 'Nyeri Leher & Punggung', icon: '🧍',
    cost: { Rendah: 10000, Sedang: 20000, Tinggi: 35000 },
    meds: [
      { name: 'Koyo / plester hangat', price: 12000 },
      { name: 'Gel pereda nyeri otot', price: 23000 }
    ],
    tip: 'Atur layar sejajar mata dan berdiri tiap jam.'
  },
  {
    id: 'eye', name: 'Mata Lelah (Digital Strain)', icon: '👁️',
    cost: { Rendah: 10000, Sedang: 15000, Tinggi: 25000 },
    meds: [
      { name: 'Tetes mata air mata buatan', price: 18000 },
      { name: 'Kompres hangat', price: 7000 }
    ],
    tip: 'Pakai aturan 20-20-20 dan kurangi kecerahan layar di malam hari.'
  },
  {
    id: 'digest', name: 'Diare / Keracunan Makanan', icon: '🦠',
    cost: { Rendah: 10000, Sedang: 20000, Tinggi: 40000 },
    meds: [
      { name: 'Oralit (5 sachet)', price: 8000 },
      { name: 'Zinc tablet', price: 12000 },
      { name: 'Probiotik', price: 20000 }
    ],
    tip: 'Pilih penjual yang bersih dan cuci tangan sebelum makan.'
  },
  {
    id: 'dehydration', name: 'Dehidrasi & ISK', icon: '🚰',
    cost: { Rendah: 5000, Sedang: 15000, Tinggi: 30000 },
    meds: [
      { name: 'Oralit / minuman elektrolit', price: 10000 },
      { name: 'Konsultasi klinik bila nyeri saat BAK', price: 20000 }
    ],
    tip: 'Bawa botol minum dan targetkan 8 gelas sehari.'
  },
  {
    id: 'sleep', name: 'Insomnia & Kelelahan', icon: '😵‍💫',
    cost: { Rendah: 10000, Sedang: 15000, Tinggi: 30000 },
    meds: [
      { name: 'Multivitamin B kompleks', price: 15000 },
      { name: 'Konseling kampus (sering gratis)', price: 15000 }
    ],
    tip: 'Matikan layar 30 menit sebelum tidur dan stop kafein setelah jam 3 sore.'
  },
  {
    id: 'dysmenorrhea', name: 'Nyeri Haid', icon: '🌸', optional: true,
    cost: { Rendah: 10000, Sedang: 15000, Tinggi: 25000 },
    meds: [
      { name: 'Ibuprofen 400 mg', price: 10000 },
      { name: 'Kompres / koyo hangat perut', price: 12000 }
    ],
    tip: 'Kompres hangat dan olahraga ringan membantu meredakan kram.'
  }
];

// ---------------------------------------------------------------------------
// Riwayat penyakit (pernah dialami) -> menambah skor kondisi terkait.
// ---------------------------------------------------------------------------
export const HISTORY_OPTIONS = [
  { id: 'maag', label: 'Maag / gastritis', boosts: { maag: 2 } },
  { id: 'tipes', label: 'Tifus', boosts: { digest: 2 } },
  { id: 'ispa_berulang', label: 'Flu / batuk berulang', boosts: { ispa: 2 } },
  { id: 'alergi', label: 'Alergi debu / cuaca', boosts: { ispa: 1 } },
  { id: 'migrain', label: 'Migrain', boosts: { headache: 2 } },
  { id: 'isk', label: 'Infeksi saluran kemih', boosts: { dehydration: 2 } },
  { id: 'punggung', label: 'Cedera punggung / saraf kejepit', boosts: { back: 2 } },
  { id: 'mata', label: 'Mata minus / silinder', boosts: { eye: 1 } },
  { id: 'insomnia', label: 'Gangguan tidur / cemas', boosts: { sleep: 2 } },
  { id: 'dismenore', label: 'Nyeri haid berat', boosts: { dysmenorrhea: 2 } }
];

// ---------------------------------------------------------------------------
// Penyakit kronik -> biaya obat rutin bulanan (estimasi, bisa diubah user)
// dan menambah skor kondisi akut terkait.
// ---------------------------------------------------------------------------
export const CHRONIC_OPTIONS = [
  { id: 'asma', label: 'Asma', monthlyCost: 60000, note: 'Inhaler pereda', boosts: { ispa: 2 } },
  { id: 'gerd', label: 'GERD / maag kronis', monthlyCost: 75000, note: 'Obat asam lambung rutin', boosts: { maag: 3 } },
  { id: 'hipertensi', label: 'Hipertensi', monthlyCost: 50000, note: 'Obat tekanan darah', boosts: { headache: 1 } },
  { id: 'diabetes', label: 'Diabetes', monthlyCost: 150000, note: 'Obat gula / insulin', boosts: { dehydration: 2 } },
  { id: 'migrain_kronis', label: 'Migrain kronis', monthlyCost: 50000, note: 'Obat pencegah migrain', boosts: { headache: 3 } },
  { id: 'rinitis', label: 'Rinitis alergi', monthlyCost: 40000, note: 'Antihistamin', boosts: { ispa: 1 } },
  { id: 'dermatitis', label: 'Dermatitis / eksim', monthlyCost: 60000, note: 'Krim & pelembap', boosts: {} },
  { id: 'anemia', label: 'Anemia', monthlyCost: 30000, note: 'Tablet zat besi', boosts: { sleep: 1 } },
  { id: 'lainnya', label: 'Lainnya', monthlyCost: 50000, note: 'Isi sendiri', boosts: {} }
];

// ---------------------------------------------------------------------------
// Fasilitas kesehatan. Data prototipe: verifikasi nomor sebelum rilis.
// ---------------------------------------------------------------------------
export const FASKES = [
  {
    id: 'makara', name: 'Klinik Satelit Makara UI', distance: '0.8 km', tag: 'Klinik kampus',
    services: 'Dokter umum, farmasi BPJS, gigi', hours: 'Sen–Jum, 08.00–16.00',
    phone: '021-78881234', mapsQuery: 'Klinik Satelit Makara UI Depok'
  },
  {
    id: 'rsui', name: 'Rumah Sakit Universitas Indonesia', distance: '1.5 km', tag: 'IGD 24 jam',
    services: 'IGD, spesialis, laboratorium', hours: '24 jam',
    phone: '021-50829292', mapsQuery: 'Rumah Sakit Universitas Indonesia'
  }
];

export const EMERGENCY = { label: 'Ambulans & gawat darurat', phone: '119' };

// ---------------------------------------------------------------------------
// Artikel edukasi singkat.
// ---------------------------------------------------------------------------
export const ARTICLES = [
  {
    id: 'mata-202020', cat: 'Kebiasaan', icon: '👁️', title: 'Aturan 20-20-20', minutes: 1,
    body: [
      'Setiap 20 menit menatap layar, lihat benda sejauh ±6 meter selama 20 detik.',
      'Kedip dengan sengaja beberapa kali agar mata tidak kering.',
      'Atur kecerahan layar sama dengan cahaya ruangan.'
    ]
  },
  {
    id: 'kafein', cat: 'Kebiasaan', icon: '☕', title: 'Kafein yang ramah lambung', minutes: 1,
    body: [
      'Jangan minum kopi saat perut kosong; makan biskuit atau pisang dulu.',
      'Batasi maksimal 2 cangkir sehari, dan stop setelah jam 3 sore agar tidur tidak terganggu.',
      'Minuman energi mengandung gula tinggi: anggap setara 1–2 cangkir kopi.'
    ]
  },
  {
    id: 'tidur', cat: 'Kebiasaan', icon: '🌙', title: 'Tidur 7 jam saat musim tugas', minutes: 2,
    body: [
      'Tidur < 6 jam beberapa malam berturut-turut menurunkan daya tahan tubuh.',
      'Pilih jam tidur yang sama setiap hari, termasuk akhir pekan.',
      'Taruh HP jauh dari kasur dan matikan notifikasi 30 menit sebelum tidur.'
    ]
  },
  {
    id: 'peregangan', cat: 'Kebiasaan', icon: '🧘', title: 'Peregangan 2 menit di meja', minutes: 1,
    body: [
      'Putar bahu ke belakang 10 kali.',
      'Miringkan kepala ke kiri dan kanan, tahan masing-masing 15 detik.',
      'Berdiri dan jinjit 15 kali untuk melancarkan aliran darah.'
    ]
  },
  {
    id: 'jajan', cat: 'Kebiasaan', icon: '🥡', title: 'Jajan aman', minutes: 1,
    body: [
      'Pilih makanan yang dimasak saat dipesan dan disajikan panas.',
      'Hindari es batu dan sambal yang dibiarkan terbuka lama.',
      'Selalu cuci tangan atau pakai hand sanitizer sebelum makan.'
    ]
  },
  {
    id: 'dana-darurat', cat: 'Keuangan', icon: '💰', title: 'Kenapa perlu kantong sehat?', minutes: 2,
    body: [
      'Sakit ringan sering datang saat uang bulanan menipis, misalnya menjelang ujian.',
      'Menyisihkan Rp10–20 ribu per minggu terasa ringan, tetapi cukup untuk obat dan ongkos ke klinik.',
      'Pisahkan kantong ini dari uang jajan supaya tidak terpakai.'
    ]
  },
  {
    id: 'bpjs', cat: 'Keuangan', icon: '🪪', title: 'Cek status BPJS kamu', minutes: 1,
    body: [
      'Banyak mahasiswa masih tercatat di BPJS keluarga. Cek status kepesertaan di aplikasi Mobile JKN.',
      'Klinik kampus yang bekerja sama dengan BPJS bisa menekan biaya berobat.',
      'Obat rutin penyakit kronik sering bisa ditebus lewat BPJS; sesuaikan biaya bulanan di profil kesehatan.'
    ]
  },
  {
    id: 'kapan-dokter', cat: 'Waspada', icon: '🚨', title: 'Kapan harus ke dokter?', minutes: 1,
    body: [
      'Demam lebih dari 3 hari, atau di atas 39°C.',
      'Sesak napas, nyeri dada, muntah darah, atau BAB hitam: segera ke IGD atau hubungi 119.',
      'Diare disertai lemas berat dan jarang buang air kecil.',
      'Sakit kepala hebat yang tiba-tiba, atau disertai kaku leher.'
    ]
  }
];

export function publicCatalog() {
  return {
    questions: QUESTIONS,
    conditions: CONDITIONS.map(({ id, name, icon, cost }) => ({ id, name, icon, cost })),
    history: HISTORY_OPTIONS.map(({ id, label }) => ({ id, label })),
    chronic: CHRONIC_OPTIONS.map(({ id, label, monthlyCost, note }) => ({ id, label, monthlyCost, note })),
    faskes: FASKES,
    emergency: EMERGENCY,
    articles: ARTICLES
  };
}
