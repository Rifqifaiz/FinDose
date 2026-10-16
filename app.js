/**
 * FinDose - Aplikasi klien (vanilla JS, tanpa build step)
 * Router berbasis hash, view dirender dari state, aksi lewat event delegation (data-action).
 * Data & auth lewat window.FinDoseAPI (api.js).
 */
(() => {
  'use strict';

  const API = window.FinDoseAPI;
  const $app = document.getElementById('app');
  const $sheet = document.getElementById('sheet-root');
  const $toast = document.getElementById('toast');

  const S = {
    catalog: null,
    state: null,
    authed: false,
    authTab: 'login',
    draft: null,          // wizard check-in: { mode, step, answers, health }
    healthDraft: null,    // editor profil kesehatan
    results: {},          // cache detail check-in per id
    checkins: null,
    historyTab: 'tx',
    txFilter: 'all',
    eduCat: 'Semua',
    chat: { messages: null, sending: false, mode: 'lokal', pending: null }
  };

  // ---------------------------------------------------------------------------
  // Ikon (stroke 24×24)
  // ---------------------------------------------------------------------------
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 3h6v3H9z"/><path d="m9 13 2 2 4-4"/>',
    sparkles: '<path d="M11 3l1.8 4.7L17.5 9.5l-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    withdraw: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M8 7h7"/>',
    mapPin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.6 2 3 0-3 .5-5.5.5-8z"/>',
    pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1"/>',
    heart: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    nav: '<path d="M3 11 21 3l-8 18-2-8z"/>'
  };

  // ---------------------------------------------------------------------------
  // Helper
  // ---------------------------------------------------------------------------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = n => `Rp${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
  const num = n => Math.round(Number(n) || 0).toLocaleString('id-ID');
  const parseMoney = v => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => new Intl.DateTimeFormat('id-ID', opts).format(new Date(iso));
  const initials = name => String(name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const firstName = () => S.state.user.name.split(' ')[0];
  const conditionMeta = id => S.catalog.conditions.find(c => c.id === id);
  const DAYS = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']];

  function formatText(text) {
    const lines = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
      const item = line.match(/^\s*[-•]\s+(.*)/);
      if (item) { html += `${inList ? '' : '<ul>'}<li>${item[1]}</li>`; inList = true; continue; }
      if (inList) { html += '</ul>'; inList = false; }
      html += `${line}\n`;
    }
    return (inList ? `${html}</ul>` : html).replace(/\n+$/, '');
  }

  function showToast(message, type = 'ok') {
    $toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    $toast.innerHTML = `${icon(type === 'error' ? 'alert' : 'check')}<span>${esc(message)}</span>`;
    requestAnimationFrame(() => $toast.classList.add('show'));
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => $toast.classList.remove('show'), 3200);
  }

  function handleError(err, form) {
    if (err?.status === 401 && S.authed) {
      expireSession('Sesi berakhir, silakan masuk lagi');
      return;
    }
    const message = err?.message || 'Terjadi kesalahan';
    const box = form?.querySelector('.form-error');
    if (box) box.textContent = message; else showToast(message, 'error');
  }

  async function withBusy(btn, fn) {
    const original = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
    try { return await fn(); } finally {
      if (btn?.isConnected) { btn.disabled = false; btn.innerHTML = original; }
    }
  }

  function setState(state) { S.state = state; S.checkins = null; }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  function route() {
    const [name = 'home', ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    return { name, params };
  }
  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  function render() {
    if (!S.catalog) return;
    const r = route();
    if (!S.authed) $app.innerHTML = viewAuth();
    else if (!S.state.user.hasConsented) $app.innerHTML = viewConsent();
    else $app.innerHTML = (VIEWS[r.name] || VIEWS.home)(...r.params);
    afterRender(r);
  }

  function afterRender(r) {
    if (!S.authed || !S.state.user.hasConsented) return;
    if (r.name === 'fifin') {
      scrollChat();
      if (S.chat.messages === null) loadChat();
    }
    if (r.name === 'history' && S.historyTab === 'checkin' && S.checkins === null) loadCheckins();
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  function page({ title, sub = '', back = '', right = '', body, nav = '' }) {
    return `
      <header class="topbar">
        ${back ? `<button class="icon-btn" data-action="go" data-to="${back}" aria-label="Kembali">${icon('arrowLeft')}</button>` : ''}
        <div style="flex:1;min-width:0"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
        ${right}
      </header>
      <main class="content">${body}</main>
      ${nav ? navBar(nav) : ''}`;
  }

  function navBar(active) {
    const item = (id, label, ic) => `<button class="nav-item ${active === id ? 'active' : ''}" data-action="go" data-to="#/${id}">${icon(ic)}<span>${label}</span></button>`;
    return `<nav class="nav">
      ${item('home', 'Beranda', 'home')}
      ${item('checkin', 'Check-in', 'clipboard')}
      <button class="nav-item" data-action="go" data-to="#/fifin"><span class="fab">${icon('sparkles')}</span><span>Fifin</span></button>
      ${item('history', 'Riwayat', 'clock')}
      ${item('profile', 'Profil', 'user')}
    </nav>`;
  }

  // ---------------------------------------------------------------------------
  // View: Auth
  // ---------------------------------------------------------------------------
  function viewAuth() {
    const isLogin = S.authTab === 'login';
    return `
      <div class="auth">
        <div class="logo-mark lg"></div>
        <div class="brand">Fin<span>Dose</span></div>
        <p class="tagline">Lindungi dompet sebelum sakit datang.</p>
        <div class="seg">
          <button class="${isLogin ? 'on' : ''}" data-action="auth-tab" data-tab="login">Masuk</button>
          <button class="${isLogin ? '' : 'on'}" data-action="auth-tab" data-tab="register">Daftar</button>
        </div>
        <form data-form="auth" novalidate>
          ${isLogin ? '' : `
            <label class="field"><span>Nama</span>
              <div class="input-wrap">${icon('user')}<input class="input" name="name" autocomplete="name" placeholder="Nama panggilan" required></div>
            </label>`}
          <label class="field"><span>Email</span>
            <div class="input-wrap">${icon('mail')}<input class="input" name="email" type="email" inputmode="email" autocomplete="email" placeholder="nama@kampus.ac.id" required></div>
          </label>
          <label class="field"><span>Password</span>
            <div class="input-wrap">${icon('lock')}<input class="input" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="Minimal 8 karakter" required>
              <button type="button" class="icon-btn suffix" style="width:34px;height:34px;background:none" data-action="toggle-password" aria-label="Lihat password">${icon('eye')}</button>
            </div>
          </label>
          <div class="form-error"></div>
          <button class="btn btn-primary" type="submit">${isLogin ? 'Masuk' : 'Buat akun'}</button>
        </form>
        ${isLogin && S.catalog.demo && API.auth.demo ? `<div class="divider">atau</div><button class="btn btn-soft" data-action="demo-login">Coba akun demo</button>` : ''}
        <p class="fine">${API.provider === 'supabase' ? 'Login aman lewat Supabase' : 'Akun tersimpan di server FinDose'} · Data kamu hanya dipakai untuk perhitungan risiko.</p>
      </div>`;
  }

  function viewConsent() {
    const point = (ic, title, text) => `<div class="point"><div class="ico">${icon(ic)}</div><div><h3>${title}</h3><p>${text}</p></div></div>`;
    return `
      <div class="auth">
        <div class="logo-mark"></div>
        <div class="brand" style="font-size:24px">Hai, ${esc(firstName())}</div>
        <p class="tagline">Tiga hal sebelum mulai.</p>
        ${point('shield', 'Data untuk hitung risiko', 'Jawaban check-in & riwayat kesehatan hanya dipakai untuk estimasi.')}
        ${point('wallet', 'Dana masih simulasi', 'Saldo, autodebet, dan pencairan di prototipe ini belum terhubung ke bank.')}
        ${point('info', 'Bukan diagnosis', 'Hasilnya edukatif dan preventif, bukan pengganti dokter.')}
        <details class="more">
          <summary>Disclaimer lengkap ${icon('chevronDown')}</summary>
          Prediksi FinDose memakai aturan deterministik dari pola gaya hidup, riwayat penyakit, dan kondisi kronik yang kamu isi. Hasilnya adalah estimasi kebutuhan biaya out-of-pocket, bukan diagnosis medis. Saran obat terbatas pada obat bebas; selalu baca aturan pakai dan konsultasikan ke apoteker atau dokter. Dalam keadaan darurat, hubungi 119.
        </details>
        <label class="check"><input type="checkbox" data-bind="consent"> <span>Saya setuju data saya diproses untuk perhitungan dosis risiko.</span></label>
        <button class="btn btn-primary" id="consent-btn" data-action="consent" disabled>Mulai</button>
        <button class="btn btn-ghost" data-action="logout-now">Keluar</button>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // View: Beranda
  // ---------------------------------------------------------------------------
  function viewHome() {
    const st = S.state;
    const w = st.wallet;
    const last = st.lastCheckin;
    const h = st.health;

    let chronicCard = '';
    if (h.chronic.length) {
      const d = h.deduction;
      const status = !h.chronicAutodeduct ? 'Potongan otomatis nonaktif'
        : d?.status === 'paid' ? `Terpotong bulan ${fmtDate(new Date(), { month: 'long' })}`
          : d?.status === 'pending' ? 'Menunggu saldo cukup' : 'Dipotong tiap awal bulan';
      chronicCard = `
        <button class="list row" data-action="go" data-to="#/health" style="margin-top:14px">
          <div class="ico">${icon('pill')}</div>
          <div class="grow"><div class="title">Obat rutin</div><div class="meta ${d?.status === 'pending' ? 'danger-text' : ''}">${status}</div></div>
          <div class="end">${rp(h.summary.monthlyTotal)}<div class="small muted" style="font-weight:500">/bulan</div></div>
        </button>`;
    }

    let weekCard;
    if (last && st.checkinThisWeek && last.result.topRisk) {
      const top = last.result.risks[0];
      weekCard = `
        <button class="card tap risk-glance" data-action="go" data-to="#/result/${last.id}" style="width:100%;text-align:left">
          <div class="emoji">${top.icon}</div>
          <div class="grow" style="flex:1">
            <div class="small muted">Risiko tertinggi</div>
            <div style="font-weight:700">${esc(top.name)}</div>
            <div class="small muted">Dosis ${rp(last.result.recommendedWeeklyDeposit)}/minggu</div>
          </div>
          <span class="badge ${top.level}">${top.level}</span>
        </button>`;
    } else {
      weekCard = `
        <div class="card cta-card">
          <div style="font-weight:700">Belum check-in minggu ini</div>
          <div class="small muted" style="margin-top:2px">±1 menit, dosis tabungan langsung dihitung.</div>
          <button class="btn btn-primary" style="margin-top:14px" data-action="go" data-to="#/checkin">${icon('clipboard')} Mulai check-in</button>
        </div>`;
    }

    const quick = (ic, label, to) => `<button data-action="go" data-to="${to}"><span class="ico">${icon(ic)}</span>${label}</button>`;
    const ad = w.autodebit;

    return `
      <header class="topbar">
        <div style="flex:1;min-width:0">
          <h1>Halo, ${esc(firstName())}</h1>
          <div class="sub">${fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button class="avatar" data-action="go" data-to="#/profile" aria-label="Profil">${esc(initials(st.user.name))}</button>
      </header>
      <main class="content">
        <section class="hero">
          <div class="label"><span>Kantong Dana Sehat</span><span>${w.progress}%</span></div>
          <div class="amount">${rp(w.balance)}</div>
          <div class="progress-label"><span>Target aman</span><span>${rp(w.target)}</span></div>
          <div class="progress"><div style="width:${w.progress}%"></div></div>
          <div class="btn-row">
            <button class="btn btn-glass" data-action="sheet-deposit">${icon('plus')} Setor</button>
            <button class="btn btn-glass" data-action="sheet-claim">${icon('withdraw')} Tarik</button>
          </div>
        </section>

        <div class="mini-stats" style="margin-top:14px">
          <div class="mini"><div class="k">${icon('flame')} Streak sehat</div><div class="v">${st.streakWeeks} minggu</div></div>
          <button class="mini" data-action="sheet-wallet"><div class="k">${icon('calendar')} Autodebet</div>
            <div class="v">${ad.enabled ? `${ad.dayLabel} · ${rp(ad.amount)}` : '<span class="muted">Nonaktif</span>'}</div></button>
        </div>
        ${chronicCard}

        <div class="section-title"><h2>Minggu ini</h2>${last ? '<button data-action="go" data-to="#/history" data-tab="checkin">Riwayat</button>' : ''}</div>
        ${weekCard}

        <div class="section-title"><h2>Jelajah</h2></div>
        <div class="quick">
          ${quick('clipboard', 'Check-in', '#/checkin')}
          ${quick('sparkles', 'Tanya Fifin', '#/fifin')}
          ${quick('book', 'Edukasi', '#/edukasi')}
          ${quick('mapPin', 'Faskes', '#/faskes')}
        </div>
      </main>
      ${navBar('home')}`;
  }

  // ---------------------------------------------------------------------------
  // View: Check-in (pilih mode → wizard)
  // ---------------------------------------------------------------------------
  function viewCheckin(mode) {
    if (mode === 'basic' || mode === 'advanced') {
      if (!S.draft || S.draft.mode !== mode) startDraft(mode);
      return viewWizard();
    }
    const last = S.state.lastCheckin;
    const basicCount = S.catalog.questions.filter(q => q.mode === 'basic').length;
    const advCount = S.catalog.questions.length + 1;
    return page({
      title: 'Check-in Mingguan',
      sub: last ? `Terakhir ${fmtDate(last.createdAt)}` : 'Belum pernah check-in',
      nav: 'checkin',
      body: `
        <div class="stack">
          <button class="card tap mode-card" data-action="go" data-to="#/checkin/basic">
            <div class="ico">⚡</div>
            <div><h3>Cepat</h3><p>${basicCount} pertanyaan · ±1 menit</p></div>
          </button>
          <button class="card tap mode-card featured" data-action="go" data-to="#/checkin/advanced">
            <div class="ico">🩺</div>
            <div><h3>Lanjutan <span class="badge info" style="margin-left:4px">Lebih akurat</span></h3>
              <p>${advCount} langkah · gaya hidup, keluhan, riwayat penyakit & obat rutin</p></div>
          </button>
        </div>
        <p class="disclaimer">Jawabanmu minggu lalu diisi otomatis, tinggal ubah yang berbeda.</p>`
    });
  }

  function startDraft(mode) {
    const prev = S.state.lastCheckin?.answers || {};
    const answers = {};
    for (const q of S.catalog.questions) answers[q.id] = structuredClone(prev[q.id] ?? q.default);
    const h = S.state.health;
    S.draft = {
      mode, step: 0, answers,
      health: { history: [...h.history], chronic: h.chronic.map(c => ({ ...c })), allergies: h.allergies }
    };
  }

  function draftSteps() {
    const qs = S.catalog.questions.filter(q => q.mode === 'basic' || S.draft.mode === 'advanced');
    return S.draft.mode === 'advanced' ? [...qs, { id: '__health', type: 'health' }] : qs;
  }

  function viewWizard() {
    const steps = draftSteps();
    const i = Math.min(S.draft.step, steps.length - 1);
    const q = steps[i];
    const isLast = i === steps.length - 1;
    const pct = Math.round(((i + 1) / steps.length) * 100);
    const val = S.draft.answers[q.id];

    let body;
    if (q.type === 'choice') {
      body = `<div class="options">${q.options.map(o => `
        <button class="option ${val === o.value ? 'on' : ''}" data-action="answer" data-value="${o.value}">
          <span>${esc(o.label)}</span><span class="dot">${val === o.value ? icon('check') : ''}</span>
        </button>`).join('')}</div>`;
    } else if (q.type === 'counter') {
      body = `
        <div class="counter">
          <button data-action="counter" data-delta="-1" aria-label="Kurangi">${icon('minus')}</button>
          <span class="val">${val}</span>
          <button data-action="counter" data-delta="1" aria-label="Tambah">${icon('plus')}</button>
        </div>
        <p class="counter-note">${val === 0 ? 'Tidak minum kafein' : `${val} cangkir per hari`}</p>`;
    } else if (q.type === 'multi') {
      body = `<div class="chips" style="margin-top:24px">
        <button class="chip ${val.length === 0 ? 'on' : ''}" data-action="multi-none">Tidak ada</button>
        ${q.options.map(o => `<button class="chip ${val.includes(o.value) ? 'on' : ''}" data-action="multi" data-value="${o.value}">${esc(o.label)}</button>`).join('')}
      </div>`;
    } else {
      body = healthEditor(S.draft.health, 'draft');
    }

    const head = q.type === 'health'
      ? `<div class="q-emoji">📋</div><h2 class="q-title">Riwayat kesehatan</h2><p class="q-hint">Disimpan ke profil, jadi cukup diisi sekali.</p>`
      : `<div class="q-emoji">${q.icon}</div><h2 class="q-title">${esc(q.title)}</h2>${q.hint ? `<p class="q-hint">${esc(q.hint)}</p>` : ''}`;

    return `
      <div class="wizard-top">
        <button class="icon-btn" data-action="wizard-exit" aria-label="Tutup">${icon('x')}</button>
        <div class="progress light"><div style="width:${pct}%"></div></div>
        <span class="count">${i + 1}/${steps.length}</span>
      </div>
      <div class="wizard" data-step="${i}">${head}${body}</div>
      <div class="wizard-foot">
        ${i > 0 ? `<button class="btn btn-soft" data-action="wizard-prev" aria-label="Sebelumnya">${icon('arrowLeft')}</button>` : ''}
        <button class="btn btn-primary" data-action="wizard-next">${isLast ? `Lihat hasil ${icon('chevronRight')}` : 'Lanjut'}</button>
      </div>`;
  }

  function healthEditor(h, target) {
    const chronicOpts = S.catalog.chronic;
    const items = h.chronic.map((c, idx) => {
      const opt = chronicOpts.find(o => o.id === c.id);
      return `
        <div class="chronic-item">
          <div class="grow">${esc(c.id === 'lainnya' ? 'Lainnya' : c.name)}<small>${esc(opt?.note || '')} · biaya/bulan</small>
            ${c.id === 'lainnya' ? `<input class="input name" data-bind="chronic-name" data-target="${target}" data-idx="${idx}" placeholder="Nama penyakit" value="${esc(c.name === 'Lainnya' ? '' : c.name)}" maxlength="40">` : ''}
          </div>
          <input class="input" inputmode="numeric" data-bind="chronic-cost" data-target="${target}" data-idx="${idx}" value="${num(c.monthlyCost)}" aria-label="Biaya obat per bulan">
        </div>`;
    }).join('');
    return `
      <div class="group-label">Pernah mengalami</div>
      <div class="chips">${S.catalog.history.map(o => `<button class="chip ${h.history.includes(o.id) ? 'on' : ''}" data-action="toggle-history" data-target="${target}" data-id="${o.id}">${esc(o.label)}</button>`).join('')}</div>

      <div class="group-label">Penyakit kronik & obat rutin</div>
      <div class="chips">${chronicOpts.map(o => `<button class="chip ${h.chronic.some(c => c.id === o.id) ? 'on' : ''}" data-action="toggle-chronic" data-target="${target}" data-id="${o.id}">${esc(o.label)}</button>`).join('')}</div>
      ${items}
      ${h.chronic.length ? `<p class="small muted" style="margin-top:10px" id="chronic-summary-${target}">${chronicSummaryText(h)}</p>` : ''}

      <div class="group-label">Alergi obat</div>
      <input class="input" data-bind="allergies" data-target="${target}" placeholder="Mis. aspirin, amoksisilin" value="${esc(h.allergies)}" maxlength="200">`;
  }

  function chronicSummaryText(h) {
    const monthly = h.chronic.reduce((s, c) => s + (Number(c.monthlyCost) || 0), 0);
    const weekly = monthly > 0 ? Math.ceil((monthly * 12) / 52 / 1000) * 1000 : 0;
    return `Total <b>${rp(monthly)}/bulan</b> · disisihkan ${rp(weekly)}/minggu dan dipotong otomatis tiap awal bulan.`;
  }

  async function submitDraft(btn) {
    const d = S.draft;
    const body = { mode: d.mode, answers: d.answers };
    if (d.mode === 'advanced') body.health = d.health;
    try {
      const res = await withBusy(btn, () => API.submitCheckin(body));
      setState(res.state);
      S.results[res.checkin.id] = res.checkin;
      S.draft = null;
      go(`#/result/${res.checkin.id}`);
      showToast('Analisis risiko selesai');
    } catch (err) { handleError(err); }
  }

  // ---------------------------------------------------------------------------
  // View: Hasil analisis
  // ---------------------------------------------------------------------------
  function viewResult(id) {
    const c = S.results[id] || (String(S.state.lastCheckin?.id) === String(id) ? S.state.lastCheckin : null);
    if (!c) {
      API.checkin(id).then(res => { S.results[id] = res.checkin; render(); })
        .catch(err => { handleError(err); go('#/history'); });
      return page({ title: 'Hasil Analisis', back: '#/history', body: '<div class="empty">Memuat…</div>' });
    }
    const r = c.result;
    const elevated = r.risks.filter(x => x.level !== 'Rendah');
    const low = r.risks.filter(x => x.level === 'Rendah');
    const ad = S.state.wallet.autodebit;
    const autodebitSet = ad.enabled && ad.amount === r.recommendedWeeklyDeposit;

    const riskItem = x => `
      <div class="risk">
        <button class="risk-head" data-action="toggle-open">
          <span class="emoji">${x.icon}</span>
          <div><div class="name">${esc(x.name)}</div><span class="badge ${x.level}">${x.level}</span></div>
          <div class="cost">${rp(x.cost)}<div class="small muted" style="font-weight:500">jika terjadi</div></div>
          ${icon('chevronDown', 'chev')}
        </button>
        <div class="risk-body">
          ${x.reasons.length ? `<h4>Pemicu</h4>${x.reasons.map(t => `<span class="reason">${esc(t)}</span>`).join('')}` : ''}
          <h4>Perkiraan obat bebas</h4>
          ${x.meds.map(m => `<div class="med"><span>${esc(m.name)}</span><b>${rp(m.price)}</b></div>`).join('')}
          <div class="tip">💡 ${esc(x.tip)}</div>
        </div>
      </div>`;

    return page({
      title: 'Hasil Analisis',
      sub: `${fmtDate(c.createdAt)} · Mode ${c.mode === 'advanced' ? 'Lanjutan' : 'Cepat'}`,
      back: '#/home',
      body: `
        <div class="card soft dose">
          <div class="k">Dosis tabungan kamu</div>
          <div class="v">${rp(r.recommendedWeeklyDeposit)}<small> /minggu</small></div>
          <div class="dose-split">
            <span>Risiko akut <b>${rp(r.acuteWeekly)}</b></span>
            ${r.chronic.weeklyReserve ? `<span>Obat rutin <b>${rp(r.chronic.weeklyReserve)}</b></span>` : ''}
          </div>
          ${r.streakDiscountApplied ? '<span class="badge info" style="margin-top:12px">🔥 Bonus streak −Rp5.000</span>' : ''}
        </div>

        <div class="section-title"><h2>Prediksi risiko</h2><span class="small muted">Paparan ${rp(r.totalExposure)}</span></div>
        ${elevated.length ? elevated.map(riskItem).join('') : '<div class="card soft" style="text-align:center">🎉 Semua risiko rendah. Pertahankan!</div>'}
        ${low.length ? `
          <div id="low-risks" hidden style="margin-top:10px">${low.map(riskItem).join('')}</div>
          <button class="btn btn-ghost" data-action="show-low">Tampilkan ${low.length} risiko rendah</button>` : ''}

        ${r.chronic.items.length ? `
          <div class="section-title"><h2>Obat rutin</h2><span class="small muted">${rp(r.chronic.monthlyTotal)}/bulan</span></div>
          <div class="list">${r.chronic.items.map(i => `<div class="row"><div class="ico">${icon('pill')}</div><div class="grow"><div class="title">${esc(i.name)}</div></div><div class="end">${rp(i.monthlyCost)}</div></div>`).join('')}</div>
          <p class="small muted" style="margin-top:8px">Dipotong otomatis dari Kantong Sehat tiap awal bulan.</p>` : ''}

        ${c.mode === 'basic' ? `
          <button class="card tap row" style="margin-top:16px;padding:14px" data-action="go" data-to="#/checkin/advanced">
            <div class="ico">🩺</div><div class="grow"><div class="title">Mau lebih akurat?</div><div class="meta">Coba mode Lanjutan dengan riwayat penyakit</div></div>${icon('chevronRight')}
          </button>` : ''}

        <div style="margin-top:20px">
          <button class="btn btn-primary" data-action="sheet-deposit" data-amount="${r.recommendedWeeklyDeposit}" data-source="nudge">Sisihkan ${rp(r.recommendedWeeklyDeposit)} sekarang</button>
          ${autodebitSet
            ? `<div class="btn btn-ghost">${icon('check')} Autodebet ${rp(ad.amount)} tiap ${ad.dayLabel} aktif</div>`
            : `<button class="btn btn-soft" style="margin-top:10px" data-action="set-autodebit" data-amount="${r.recommendedWeeklyDeposit}">${icon('calendar')} Jadikan autodebet mingguan</button>`}
          <button class="btn btn-ghost" data-action="ask-fifin" data-q="Jelaskan hasil check-in terakhirku dan apa yang sebaiknya aku lakukan minggu ini.">${icon('sparkles')} Tanya Fifin soal hasil ini</button>
        </div>
        <p class="disclaimer">Estimasi edukatif, bukan diagnosis medis.</p>`
    });
  }

  // ---------------------------------------------------------------------------
  // View: Fifin
  // ---------------------------------------------------------------------------
  function suggestions() {
    const top = S.state.lastCheckin?.result.risks[0];
    return [
      top && top.level !== 'Rendah' ? `Kenapa risiko ${top.name.split(' /')[0].toLowerCase()} aku ${top.level.toLowerCase()}?` : 'Kebiasaan apa yang paling berpengaruh ke risikoku?',
      'Berapa aku harus menabung minggu ini?',
      'Obat apa yang perlu aku siapkan?',
      'Tips tidur cukup saat musim ujian'
    ];
  }

  function chatHtml() {
    const msgs = S.chat.messages;
    if (msgs === null) return '<div class="empty">Memuat percakapan…</div>';
    if (!msgs.length && !S.chat.sending) {
      return `
        <div class="chat-empty">
          <div class="fifin-avatar">${icon('sparkles')}</div>
          <h2>Hai, aku Fifin</h2>
          <p class="muted" style="margin-top:4px">Tanya soal risiko kesehatan, tabungan, atau kebiasaan sehat.</p>
          <div class="suggest">${suggestions().map(s => `<button data-action="suggest" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        </div>`;
    }
    return msgs.map(m => `<div class="bubble ${m.role} ${m.source === 'safety' ? 'safety' : ''}">${formatText(m.content)}</div>`).join('')
      + (S.chat.sending ? '<div class="bubble assistant typing"><span></span><span></span><span></span></div>' : '');
  }

  function viewFifin() {
    const mode = S.chat.mode;
    return `
      <header class="topbar">
        <button class="icon-btn" data-action="go" data-to="#/home" aria-label="Kembali">${icon('arrowLeft')}</button>
        <div class="fifin-avatar">${icon('sparkles')}</div>
        <div style="flex:1;min-width:0"><h1>Fifin</h1><div class="sub"><span class="status-dot ${mode}"></span>${mode === 'ai' ? 'Asisten AI aktif' : 'Mode jawaban lokal'}</div></div>
        ${S.chat.messages?.length ? `<button class="icon-btn" data-action="sheet-clear-chat" aria-label="Hapus percakapan">${icon('trash')}</button>` : ''}
      </header>
      <div class="chat" id="chat">${chatHtml()}</div>
      <form class="composer" data-form="chat">
        <textarea id="chat-input" rows="1" placeholder="Tanya Fifin…" maxlength="1000" data-bind="autogrow"></textarea>
        <button class="send" type="submit" aria-label="Kirim" ${S.chat.sending ? 'disabled' : ''}>${icon('send')}</button>
      </form>`;
  }

  function refreshChat() {
    const box = document.getElementById('chat');
    if (!box) return;
    box.innerHTML = chatHtml();
    const send = document.querySelector('.composer .send');
    if (send) send.disabled = S.chat.sending;
    scrollChat();
  }

  function scrollChat() {
    const box = document.getElementById('chat');
    if (box) box.scrollTop = box.scrollHeight;
  }

  async function loadChat() {
    try {
      const res = await API.chatHistory();
      S.chat.messages = res.messages;
      S.chat.mode = res.mode;
    } catch (err) {
      S.chat.messages = [];
      handleError(err);
    }
    if (route().name === 'fifin') render();
    if (S.chat.pending) {
      const q = S.chat.pending;
      S.chat.pending = null;
      sendChat(q);
    }
  }

  async function sendChat(text) {
    const message = text.trim();
    if (!message || S.chat.sending) return;
    S.chat.messages = [...(S.chat.messages || []), { role: 'user', content: message }];
    S.chat.sending = true;
    refreshChat();
    try {
      const res = await API.chat(message);
      S.chat.messages = [...S.chat.messages, { role: 'assistant', content: res.reply, source: res.source }];
      if (S.chat.mode !== res.mode) { S.chat.mode = res.mode; }
    } catch (err) {
      S.chat.messages = S.chat.messages.slice(0, -1);
      handleError(err);
    } finally {
      S.chat.sending = false;
      if (route().name === 'fifin') render();
      document.getElementById('chat-input')?.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // View: Riwayat
  // ---------------------------------------------------------------------------
  function txIcon(t) {
    if (t.category === 'autodebit') return `<div class="ico in">${icon('calendar')}</div>`;
    if (t.amount > 0) return `<div class="ico in">${icon('plus')}</div>`;
    return `<div class="ico out">${icon('pill')}</div>`;
  }

  function viewHistory() {
    const st = S.state;
    let body;
    if (S.historyTab === 'tx') {
      const list = st.transactions.filter(t => S.txFilter === 'all' || (S.txFilter === 'in' ? t.amount > 0 : t.amount < 0));
      const groups = new Map();
      for (const t of list) {
        const key = fmtDate(t.createdAt, { month: 'long', year: 'numeric' });
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
      }
      const filter = (id, label) => `<button class="chip ${S.txFilter === id ? 'on' : ''}" data-action="tx-filter" data-filter="${id}">${label}</button>`;
      body = `
        <div class="summary-duo">
          <div class="mini"><div class="k">Masuk bulan ini</div><div class="v plus">+${rp(st.stats.monthIn)}</div></div>
          <div class="mini"><div class="k">Keluar bulan ini</div><div class="v">−${rp(st.stats.monthOut)}</div></div>
        </div>
        <div class="chips" style="margin-top:14px">${filter('all', 'Semua')}${filter('in', 'Masuk')}${filter('out', 'Keluar')}</div>
        ${list.length ? [...groups].map(([month, items]) => `
          <div class="month-label">${month}</div>
          <div class="list">${items.map(t => `
            <button class="row" data-action="sheet-tx" data-id="${esc(t.id)}">
              ${txIcon(t)}
              <div class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${fmtDate(t.createdAt, { day: 'numeric', month: 'short' })} · ${esc(t.note)}</div></div>
              <div class="end ${t.amount > 0 ? 'plus' : 'minus'}">${t.amount > 0 ? '+' : '−'}${rp(Math.abs(t.amount))}</div>
            </button>`).join('')}</div>`).join('')
        : '<div class="empty"><div class="big">🧾</div>Belum ada transaksi.</div>'}`;
    } else {
      const list = S.checkins;
      body = list === null ? '<div class="empty">Memuat…</div>'
        : !list.length ? `<div class="empty"><div class="big">📝</div>Belum ada check-in.<button class="btn btn-primary" style="margin-top:16px" data-action="go" data-to="#/checkin">Mulai check-in</button></div>`
          : `<div class="list" style="margin-top:4px">${list.map(c => {
            const top = c.topRisk;
            const meta = top ? conditionMeta(top.id) : null;
            return `
              <button class="row" data-action="go" data-to="#/result/${c.id}">
                <div class="ico">${meta?.icon || '📝'}</div>
                <div class="grow"><div class="title">${fmtDate(c.createdAt)}</div><div class="meta">${c.mode === 'advanced' ? 'Lanjutan' : 'Cepat'} · dosis ${rp(c.recommendedWeeklyDeposit)}/mgg</div></div>
                ${top ? `<span class="badge ${top.level}">${top.level}</span>` : ''}
                ${icon('chevronRight')}
              </button>`;
          }).join('')}</div>`;
    }
    return page({
      title: 'Riwayat',
      nav: 'history',
      body: `
        <div class="seg" style="margin-bottom:16px">
          <button class="${S.historyTab === 'tx' ? 'on' : ''}" data-action="history-tab" data-tab="tx">Transaksi</button>
          <button class="${S.historyTab === 'checkin' ? 'on' : ''}" data-action="history-tab" data-tab="checkin">Check-in</button>
        </div>
        ${body}`
    });
  }

  async function loadCheckins() {
    try {
      S.checkins = (await API.checkins()).checkins;
    } catch (err) {
      S.checkins = [];
      handleError(err);
    }
    if (route().name === 'history') render();
  }

  // ---------------------------------------------------------------------------
  // View: Profil & kesehatan
  // ---------------------------------------------------------------------------
  function viewProfile() {
    const st = S.state;
    const h = st.health;
    const row = (ic, title, meta, action, extra = '') => `
      <button class="row" data-action="${action}" ${extra}>
        <div class="ico">${icon(ic)}</div>
        <div class="grow"><div class="title">${title}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</div>
        ${icon('chevronRight')}
      </button>`;
    const healthMeta = [
      h.history.length ? `${h.history.length} riwayat` : '',
      h.chronic.length ? `${h.chronic.length} kronik · ${rp(h.summary.monthlyTotal)}/bln` : ''
    ].filter(Boolean).join(' · ') || 'Belum diisi';
    const ad = st.wallet.autodebit;

    return page({
      title: 'Profil',
      nav: 'profile',
      body: `
        <div class="profile-head">
          <div class="avatar xl" style="margin:0 auto">${esc(initials(st.user.name))}</div>
          <h2>${esc(st.user.name)}</h2>
          <div class="small muted">${esc(st.user.email)}${st.user.campus ? ` · ${esc(st.user.campus)}` : ''}</div>
        </div>
        <div class="section-title"><h2>Akun & kesehatan</h2></div>
        <div class="list">
          ${row('edit', 'Edit profil', 'Nama & kampus', 'sheet-profile')}
          ${row('heart', 'Riwayat kesehatan & obat rutin', healthMeta, 'go', 'data-to="#/health"')}
          ${row('target', 'Target & autodebet', `Target ${rp(st.wallet.target)} · ${ad.enabled ? `${ad.dayLabel} ${rp(ad.amount)}` : 'autodebet nonaktif'}`, 'sheet-wallet')}
        </div>
        <div class="section-title"><h2>Bantuan</h2></div>
        <div class="list">
          ${row('book', 'Edukasi', 'Tips singkat kebiasaan sehat', 'go', 'data-to="#/edukasi"')}
          ${row('mapPin', 'Faskes terdekat', 'Klinik, IGD & nomor darurat', 'go', 'data-to="#/faskes"')}
          ${row('shield', 'Privasi & disclaimer', '', 'sheet-privacy')}
        </div>
        <div class="list" style="margin-top:14px">
          <button class="row danger-text" data-action="sheet-logout"><div class="ico out">${icon('logout')}</div><div class="grow"><div class="title">Keluar</div></div></button>
        </div>
        <p class="disclaimer">FinDose 2.0 · Auth ${API.provider === 'supabase' ? 'Supabase' : 'lokal'}</p>`
    });
  }

  function viewHealth() {
    if (!S.healthDraft) {
      const h = S.state.health;
      S.healthDraft = { history: [...h.history], chronic: h.chronic.map(c => ({ ...c })), allergies: h.allergies, chronicAutodeduct: h.chronicAutodeduct };
    }
    const d = S.healthDraft;
    return page({
      title: 'Profil Kesehatan',
      sub: 'Membuat prediksi lebih relevan',
      back: '#/profile',
      body: `
        ${healthEditor(d, 'profile')}
        <div class="card soft row" style="margin-top:20px;padding:14px">
          <div class="grow"><div class="title">Potong obat rutin otomatis</div><div class="meta">Dari Kantong Sehat tiap awal bulan</div></div>
          <label class="switch"><input type="checkbox" data-bind="autodeduct" ${d.chronicAutodeduct ? 'checked' : ''}><span></span></label>
        </div>
        <button class="btn btn-primary" style="margin-top:20px" data-action="save-health">Simpan</button>`
    });
  }

  // ---------------------------------------------------------------------------
  // View: Edukasi & Faskes
  // ---------------------------------------------------------------------------
  function viewEdukasi() {
    const cats = ['Semua', ...new Set(S.catalog.articles.map(a => a.cat))];
    const list = S.catalog.articles.filter(a => S.eduCat === 'Semua' || a.cat === S.eduCat);
    return page({
      title: 'Edukasi',
      back: '#/home',
      body: `
        <div class="chips" style="margin-bottom:14px">${cats.map(c => `<button class="chip ${S.eduCat === c ? 'on' : ''}" data-action="edu-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="list">${list.map(a => `
          <button class="row" data-action="sheet-article" data-id="${a.id}">
            <div class="ico article-ico">${a.icon}</div>
            <div class="grow"><div class="title">${esc(a.title)}</div><div class="meta">${esc(a.cat)} · ${a.minutes} menit</div></div>
            ${icon('chevronRight')}
          </button>`).join('')}</div>`
    });
  }

  function viewFaskes() {
    const em = S.catalog.emergency;
    return page({
      title: 'Faskes Terdekat',
      back: '#/home',
      body: `
        <a class="sos" href="tel:${em.phone}">
          <div class="ico">${icon('phone')}</div>
          <div class="grow" style="flex:1"><strong>Darurat? Telepon ${em.phone}</strong><div class="small">${esc(em.label)}</div></div>
          ${icon('chevronRight')}
        </a>
        <div class="section-title"><h2>Klinik & rumah sakit</h2></div>
        ${S.catalog.faskes.map(f => `
          <div class="list clinic" style="margin-top:10px">
            <button class="row" data-action="toggle-open">
              <div class="ico">${icon('mapPin')}</div>
              <div class="grow"><div class="title">${esc(f.name)}</div><div class="meta">${esc(f.distance)} · ${esc(f.tag)}</div></div>
              ${icon('chevronDown', 'chev')}
            </button>
            <div class="clinic-body">
              <div>${esc(f.services)}</div>
              <div>Buka: ${esc(f.hours)}</div>
              <div class="btn-row">
                <a class="btn btn-soft" href="tel:${esc(f.phone.replace(/[^\d+]/g, ''))}">${icon('phone')} Telepon</a>
                <a class="btn btn-soft" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.mapsQuery)}" target="_blank" rel="noopener">${icon('nav')} Arah</a>
              </div>
            </div>
          </div>`).join('')}`
    });
  }

  const VIEWS = {
    home: viewHome,
    checkin: viewCheckin,
    result: viewResult,
    fifin: viewFifin,
    history: viewHistory,
    profile: viewProfile,
    health: viewHealth,
    edukasi: viewEdukasi,
    faskes: viewFaskes
  };

  // ---------------------------------------------------------------------------
  // Bottom sheets
  // ---------------------------------------------------------------------------
  let sheetCloseTimer = null;
  function openSheet(html) {
    clearTimeout(sheetCloseTimer); // jangan biarkan animasi tutup sheet sebelumnya menghapus sheet baru
    $sheet.innerHTML = `<div class="overlay" data-action="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $sheet.classList.add('show')));
  }
  function closeSheet() {
    clearTimeout(sheetCloseTimer);
    if (!$sheet.classList.contains('show')) { $sheet.innerHTML = ''; return; }
    $sheet.classList.remove('show');
    sheetCloseTimer = setTimeout(() => { $sheet.innerHTML = ''; }, 320);
  }

  const moneyField = (name, value, label = '') => `
    <label class="field">${label ? `<span>${label}</span>` : ''}
      <div class="input-wrap"><span class="prefix">Rp</span><input class="input money" name="${name}" inputmode="numeric" data-bind="money" value="${value ? num(value) : ''}" placeholder="0"></div>
    </label>`;

  function sheetDeposit(amount = 15000, source = 'manual') {
    openSheet(`
      <h2>Setor ke Kantong</h2>
      <p class="lead">Saldo sekarang ${rp(S.state.wallet.balance)}</p>
      <form data-form="deposit" data-source="${source}">
        ${moneyField('amount', amount)}
        <div class="chips" style="margin-top:12px">${[10000, 15000, 25000, 50000].map(v => `<button type="button" class="chip" data-action="preset" data-amount="${v}">${rp(v)}</button>`).join('')}</div>
        <div class="form-error"></div>
        <button class="btn btn-primary" type="submit">Setor sekarang</button>
      </form>`);
  }

  function claimOptions() {
    const last = S.state.lastCheckin?.result;
    const order = last ? last.risks.map(r => r.id) : S.catalog.conditions.map(c => c.id);
    const costFor = id => last?.risks.find(r => r.id === id)?.cost ?? conditionMeta(id)?.cost.Sedang ?? 20000;
    const options = order.map(id => {
      const c = conditionMeta(id);
      return c ? { id, label: `${c.icon} ${c.name}`, amount: costFor(id) } : null;
    }).filter(Boolean);
    for (const c of S.state.health.chronic) options.push({ id: `chronic:${c.id}`, label: `💊 Obat ${c.name}`, amount: c.monthlyCost });
    options.push({ id: 'klinik', label: '🏥 Konsultasi klinik', amount: 50000 });
    options.push({ id: 'lainnya', label: '➕ Lainnya', amount: 20000 });
    return options;
  }

  function sheetClaim() {
    const opts = claimOptions();
    const first = opts[0];
    openSheet(`
      <h2>Tarik Dana Darurat</h2>
      <p class="lead">Tersedia ${rp(S.state.wallet.balance)} · tanpa biaya admin</p>
      <form data-form="claim">
        <input type="hidden" name="category" value="${first.id}">
        <div class="group-label" style="margin-top:0">Untuk keperluan</div>
        <div class="chips">${opts.map((o, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-action="claim-cat" data-id="${o.id}" data-amount="${o.amount}" data-label="${esc(o.label)}">${esc(o.label)}</button>`).join('')}</div>
        <div style="margin-top:16px">${moneyField('amount', first.amount, 'Nominal')}</div>
        <div class="summary-box">
          <div><span>Keperluan</span><span id="claim-label">${esc(first.label)}</span></div>
          <div><span>Tujuan</span><span>Rekening utama</span></div>
          <div><span>Biaya admin</span><span class="plus">Rp0</span></div>
        </div>
        <div class="form-error"></div>
        <button class="btn btn-primary" type="submit">${icon('zap')} Cairkan sekarang</button>
      </form>`);
  }

  function sheetWallet() {
    const w = S.state.wallet;
    const ad = w.autodebit;
    openSheet(`
      <h2>Target & Autodebet</h2>
      <p class="lead">Atur tujuan tabungan dan setoran otomatis.</p>
      <form data-form="wallet">
        ${moneyField('target', w.target, 'Target dana aman')}
        <div class="row" style="padding:16px 0 4px">
          <div class="grow"><div class="title">Autodebet mingguan</div><div class="meta">Simulasi dari rekening utama</div></div>
          <label class="switch"><input type="checkbox" name="enabled" ${ad.enabled ? 'checked' : ''}><span></span></label>
        </div>
        <input type="hidden" name="day" value="${ad.day}">
        <div class="group-label" style="margin-top:10px">Hari</div>
        <div class="chips">${DAYS.map(([d, l]) => `<button type="button" class="chip ${ad.day === d ? 'on' : ''}" data-action="pick-day" data-day="${d}">${l}</button>`).join('')}</div>
        <div style="margin-top:14px">${moneyField('amount', ad.amount, 'Nominal per minggu')}</div>
        <div class="form-error"></div>
        <button class="btn btn-primary" type="submit">Simpan</button>
      </form>`);
  }

  function sheetProfile() {
    const u = S.state.user;
    openSheet(`
      <h2>Edit Profil</h2>
      <form data-form="profile" style="margin-top:12px">
        <label class="field"><span>Nama</span><input class="input" name="name" value="${esc(u.name)}" maxlength="60" required></label>
        <label class="field"><span>Kampus</span><input class="input" name="campus" value="${esc(u.campus)}" maxlength="80" placeholder="Opsional"></label>
        <div class="form-error"></div>
        <button class="btn btn-primary" type="submit">Simpan</button>
      </form>`);
  }

  function sheetTx(id) {
    const t = S.state.transactions.find(x => x.id === id);
    if (!t) return;
    openSheet(`
      <div style="text-align:center;padding:6px 0 4px">
        <div style="display:inline-block">${txIcon(t)}</div>
        <div style="font-family:var(--font-display);font-size:28px;font-weight:800;margin-top:10px" class="${t.amount > 0 ? 'plus' : ''}">${t.amount > 0 ? '+' : '−'}${rp(Math.abs(t.amount))}</div>
        <div class="muted">${esc(t.title)}</div>
      </div>
      <div class="summary-box">
        <div><span>Tanggal</span><span>${fmtDate(t.createdAt, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
        <div><span>Jenis</span><span>${t.amount > 0 ? 'Dana masuk' : 'Dana keluar'}</span></div>
        <div><span>Catatan</span><span style="text-align:right;max-width:60%">${esc(t.note || '-')}</span></div>
        <div><span>ID</span><span>${esc(t.id)}</span></div>
      </div>
      <button class="btn btn-soft" data-action="close-sheet">Tutup</button>`);
  }

  function sheetArticle(id) {
    const a = S.catalog.articles.find(x => x.id === id);
    if (!a) return;
    openSheet(`
      <div class="q-emoji" style="font-size:36px">${a.icon}</div>
      <h2 style="margin-top:10px">${esc(a.title)}</h2>
      <p class="lead">${esc(a.cat)} · ${a.minutes} menit baca</p>
      <ul class="article-body">${a.body.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      <button class="btn btn-soft" data-action="ask-fifin" data-q="Ceritakan lebih lanjut tentang: ${esc(a.title)}">${icon('sparkles')} Tanya Fifin lebih lanjut</button>
      <button class="btn btn-ghost" data-action="close-sheet">Tutup</button>`);
  }

  function sheetPrivacy() {
    openSheet(`
      <h2>Privasi & Disclaimer</h2>
      <div class="article-body" style="margin-top:10px">
        <p class="muted">Data check-in, riwayat kesehatan, dan percakapan dengan Fifin disimpan di akunmu untuk menghitung risiko dan dosis tabungan.</p>
        <p class="muted" style="margin-top:10px">Prediksi bersifat edukatif, bukan diagnosis. Saldo dan autodebet di prototipe ini masih simulasi.</p>
        ${S.state.fifin.mode === 'ai' ? '<p class="muted" style="margin-top:10px">Pesan ke Fifin beserta ringkasan data kesehatanmu dikirim ke layanan AI Google Gemini untuk menyusun jawaban.</p>' : ''}
      </div>
      <button class="btn btn-danger" data-action="revoke-consent">Cabut persetujuan</button>
      <button class="btn btn-ghost" data-action="close-sheet">Tutup</button>`);
  }

  function sheetConfirm({ title, text, confirm, action, danger = true }) {
    openSheet(`
      <h2>${title}</h2>
      <p class="lead">${text}</p>
      <div class="btn-row">
        <button class="btn btn-soft" data-action="close-sheet">Batal</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="${action}">${confirm}</button>
      </div>`);
  }

  // ---------------------------------------------------------------------------
  // Aksi (klik)
  // ---------------------------------------------------------------------------
  function healthTarget(el) { return el.dataset.target === 'draft' ? S.draft.health : S.healthDraft; }

  function expireSession(message) {
    API.auth.clear();
    S.authed = false;
    S.authTab = 'login';
    S.state = null;
    S.draft = null;
    S.healthDraft = null;
    S.results = {};
    S.checkins = null;
    S.chat = { messages: null, sending: false, mode: 'lokal', pending: null };
    closeSheet();
    if (location.hash !== '#/home') history.replaceState(null, '', '#/home');
    render();
    if (message) showToast(message, 'error');
  }

  const ACTIONS = {
    go: el => {
      if (el.dataset.tab) S.historyTab = el.dataset.tab;
      go(el.dataset.to);
    },
    'close-sheet': () => closeSheet(),
    'toggle-open': el => el.parentElement.classList.toggle('open'),

    // Auth
    'auth-tab': el => { S.authTab = el.dataset.tab; render(); },
    'toggle-password': el => {
      const input = el.parentElement.querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
    },
    'demo-login': async el => {
      try {
        const state = await withBusy(el, () => API.auth.demo());
        onSignedIn(state);
      } catch (err) { handleError(err); }
    },
    reload: () => location.reload(),
    consent: async el => {
      try {
        const res = await withBusy(el, () => API.updateProfile({ hasConsented: true }));
        setState(res.state);
        go('#/home');
      } catch (err) { handleError(err); }
    },
    'logout-now': async () => { await API.auth.signOut(); expireSession(); },
    'sheet-logout': () => sheetConfirm({ title: 'Keluar dari FinDose?', text: 'Kamu bisa masuk lagi kapan saja.', confirm: 'Keluar', action: 'logout-now' }),
    'revoke-consent': async el => {
      try {
        const res = await withBusy(el, () => API.updateProfile({ hasConsented: false }));
        setState(res.state);
        closeSheet();
        render();
      } catch (err) { handleError(err); }
    },

    // Wizard
    answer: el => {
      const steps = draftSteps();
      const step = S.draft.step;
      S.draft.answers[steps[step].id] = el.dataset.value;
      render();
      setTimeout(() => {
        if (S.draft && S.draft.step === step && step < steps.length - 1) { S.draft.step += 1; render(); }
      }, 220);
    },
    counter: el => {
      const q = draftSteps()[S.draft.step];
      const v = S.draft.answers[q.id] + Number(el.dataset.delta);
      S.draft.answers[q.id] = Math.max(q.min, Math.min(q.max, v));
      render();
    },
    multi: el => {
      const q = draftSteps()[S.draft.step];
      const list = S.draft.answers[q.id];
      const v = el.dataset.value;
      S.draft.answers[q.id] = list.includes(v) ? list.filter(x => x !== v) : [...list, v];
      render();
    },
    'multi-none': () => { S.draft.answers[draftSteps()[S.draft.step].id] = []; render(); },
    'wizard-prev': () => { S.draft.step = Math.max(0, S.draft.step - 1); render(); },
    'wizard-next': el => {
      const steps = draftSteps();
      if (S.draft.step < steps.length - 1) { S.draft.step += 1; render(); return; }
      submitDraft(el);
    },
    'wizard-exit': () => { S.draft = null; go('#/checkin'); },

    // Profil kesehatan
    'toggle-history': el => {
      const h = healthTarget(el);
      const id = el.dataset.id;
      h.history = h.history.includes(id) ? h.history.filter(x => x !== id) : [...h.history, id];
      el.classList.toggle('on');
    },
    'toggle-chronic': el => {
      const h = healthTarget(el);
      const id = el.dataset.id;
      if (h.chronic.some(c => c.id === id)) h.chronic = h.chronic.filter(c => c.id !== id);
      else {
        const opt = S.catalog.chronic.find(o => o.id === id);
        h.chronic = [...h.chronic, { id, name: opt.label, monthlyCost: opt.monthlyCost }];
      }
      const scroll = document.querySelector('.wizard, .content')?.scrollTop;
      render();
      const box = document.querySelector('.wizard, .content');
      if (box && scroll !== undefined) box.scrollTop = scroll;
    },
    'save-health': async el => {
      const d = S.healthDraft;
      try {
        const res = await withBusy(el, () => API.saveHealth(d));
        setState(res.state);
        S.healthDraft = null;
        showToast('Profil kesehatan tersimpan');
        go('#/profile');
      } catch (err) { handleError(err); }
    },

    // Hasil
    'show-low': el => { document.getElementById('low-risks').hidden = false; el.remove(); },
    'set-autodebit': async el => {
      try {
        const res = await withBusy(el, () => API.walletSettings({ autodebitEnabled: true, autodebitAmount: Number(el.dataset.amount) }));
        setState(res.state);
        const ad = res.state.wallet.autodebit;
        showToast(`Autodebet aktif: ${rp(ad.amount)} tiap ${ad.dayLabel}`);
        render();
      } catch (err) { handleError(err); }
    },
    'ask-fifin': el => {
      closeSheet();
      S.chat.pending = el.dataset.q;
      if (S.chat.messages !== null) { const q = S.chat.pending; S.chat.pending = null; go('#/fifin'); sendChat(q); return; }
      go('#/fifin');
    },

    // Fifin
    suggest: el => sendChat(el.dataset.q),
    'sheet-clear-chat': () => sheetConfirm({ title: 'Hapus percakapan?', text: 'Semua chat dengan Fifin akan dihapus.', confirm: 'Hapus', action: 'clear-chat' }),
    'clear-chat': async el => {
      try {
        await withBusy(el, () => API.clearChat());
        S.chat.messages = [];
        closeSheet();
        render();
      } catch (err) { handleError(err); }
    },

    // Riwayat
    'history-tab': el => { S.historyTab = el.dataset.tab; render(); if (S.historyTab === 'checkin' && S.checkins === null) loadCheckins(); },
    'tx-filter': el => { S.txFilter = el.dataset.filter; render(); },
    'edu-cat': el => { S.eduCat = el.dataset.cat; render(); },

    // Sheets
    'sheet-deposit': el => sheetDeposit(Number(el.dataset.amount) || 15000, el.dataset.source || 'manual'),
    'sheet-claim': () => {
      if (S.state.wallet.balance <= 0) { showToast('Saldo masih kosong. Setor dulu ya.', 'error'); return; }
      sheetClaim();
    },
    'sheet-wallet': () => sheetWallet(),
    'sheet-profile': () => sheetProfile(),
    'sheet-tx': el => sheetTx(el.dataset.id),
    'sheet-article': el => sheetArticle(el.dataset.id),
    'sheet-privacy': () => sheetPrivacy(),
    preset: el => {
      const input = el.closest('form').querySelector('input[name="amount"]');
      input.value = num(el.dataset.amount);
    },
    'claim-cat': el => {
      const form = el.closest('form');
      form.querySelectorAll('[data-action="claim-cat"]').forEach(c => c.classList.toggle('on', c === el));
      form.elements.category.value = el.dataset.id;
      form.elements.amount.value = num(el.dataset.amount);
      document.getElementById('claim-label').textContent = el.dataset.label;
    },
    'pick-day': el => {
      const form = el.closest('form');
      form.querySelectorAll('[data-action="pick-day"]').forEach(c => c.classList.toggle('on', c === el));
      form.elements.day.value = el.dataset.day;
    }
  };

  // ---------------------------------------------------------------------------
  // Form submit
  // ---------------------------------------------------------------------------
  function onSignedIn(state) {
    S.authed = true;
    setState(state);
    S.chat = { messages: null, sending: false, mode: state.fifin.mode, pending: null };
    if (location.hash !== '#/home') location.hash = '#/home'; else render();
    if (state.user.hasConsented) showToast(`Selamat datang, ${state.user.name.split(' ')[0]}!`);
  }

  async function submitSheet(form, call, message) {
    const btn = form.querySelector('[type="submit"]');
    form.querySelector('.form-error').textContent = '';
    try {
      const res = await withBusy(btn, call);
      setState(res.state);
      closeSheet();
      render();
      if (message) showToast(typeof message === 'function' ? message(res) : message);
    } catch (err) { handleError(err, form); }
  }

  const FORMS = {
    auth: async form => {
      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('[type="submit"]');
      const box = form.querySelector('.form-error');
      box.textContent = '';
      if (S.authTab === 'register' && String(data.name || '').trim().length < 2) { box.textContent = 'Isi nama minimal 2 karakter'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.email || '').trim())) { box.textContent = 'Format email tidak valid'; return; }
      if (String(data.password || '').length < 8) { box.textContent = 'Password minimal 8 karakter'; return; }
      try {
        const state = await withBusy(btn, () => (S.authTab === 'login'
          ? API.auth.signIn({ email: data.email.trim(), password: data.password })
          : API.auth.signUp({ name: data.name.trim(), email: data.email.trim(), password: data.password })));
        onSignedIn(state);
      } catch (err) { box.textContent = err.message; }
    },
    deposit: form => {
      const amount = parseMoney(form.elements.amount.value);
      const nudge = form.dataset.source === 'nudge';
      return submitSheet(form, () => API.deposit({
        amount,
        category: nudge ? 'nudge' : 'manual',
        title: nudge ? 'Dosis tabungan mingguan' : 'Setoran manual',
        note: nudge ? 'Rekomendasi hasil check-in' : 'Top-up Kantong Sehat'
      }), `${rp(amount)} masuk ke Kantong Sehat`);
    },
    claim: form => {
      const amount = parseMoney(form.elements.amount.value);
      if (amount > S.state.wallet.balance) { form.querySelector('.form-error').textContent = 'Saldo tidak mencukupi'; return; }
      return submitSheet(form, () => API.claim({ category: form.elements.category.value, amount }), `${rp(amount)} dikirim ke rekening utama`);
    },
    wallet: form => submitSheet(form, () => API.walletSettings({
      target: parseMoney(form.elements.target.value),
      autodebitEnabled: form.elements.enabled.checked,
      autodebitDay: Number(form.elements.day.value),
      autodebitAmount: parseMoney(form.elements.amount.value)
    }), 'Pengaturan kantong tersimpan'),
    profile: form => submitSheet(form, () => API.updateProfile({ name: form.elements.name.value, campus: form.elements.campus.value }), 'Profil tersimpan'),
    chat: form => {
      const input = form.querySelector('textarea');
      const text = input.value;
      input.value = '';
      input.style.height = '';
      sendChat(text);
    }
  };

  // ---------------------------------------------------------------------------
  // Binding input (tanpa re-render agar fokus tidak hilang)
  // ---------------------------------------------------------------------------
  const BINDS = {
    consent: el => { document.getElementById('consent-btn').disabled = !el.checked; },
    money: el => {
      const n = parseMoney(el.value);
      el.value = n ? num(n) : '';
    },
    autogrow: el => { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 110)}px`; },
    allergies: el => { healthTarget(el).allergies = el.value; },
    autodeduct: el => { S.healthDraft.chronicAutodeduct = el.checked; },
    'chronic-cost': el => {
      const h = healthTarget(el);
      const n = parseMoney(el.value);
      h.chronic[Number(el.dataset.idx)].monthlyCost = n;
      el.value = n ? num(n) : '';
      const summary = document.getElementById(`chronic-summary-${el.dataset.target}`);
      if (summary) summary.innerHTML = chronicSummaryText(h);
    },
    'chronic-name': el => { healthTarget(el).chronic[Number(el.dataset.idx)].name = el.value; }
  };

  // ---------------------------------------------------------------------------
  // Event delegation & boot
  // ---------------------------------------------------------------------------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('submit', e => {
    const fn = FORMS[e.target.dataset.form];
    if (!fn) return;
    e.preventDefault();
    fn(e.target);
  });
  const onBind = e => {
    const fn = BINDS[e.target.dataset?.bind];
    if (fn) fn(e.target);
  };
  document.addEventListener('input', onBind);
  document.addEventListener('change', onBind);
  document.addEventListener('keydown', e => {
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      e.target.form.requestSubmit();
    }
    if (e.key === 'Escape') closeSheet();
  });

  window.addEventListener('hashchange', () => {
    const r = route();
    if (r.name !== 'health') S.healthDraft = null;
    closeSheet();
    render();
  });

  // Segarkan state saat aplikasi kembali dibuka (autodebet & potongan bulanan diproses server)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !S.authed || S.draft || $sheet.classList.contains('show')) return;
    try { setState(await API.state()); if (['home', 'history', 'profile'].includes(route().name)) render(); } catch (err) { if (err.status === 401) expireSession(); }
  });

  function errorScreen(message) {
    $app.innerHTML = `
      <div class="auth" style="justify-content:center;text-align:center">
        <div class="logo-mark" style="margin:0 auto"></div>
        <h2 style="font-family:var(--font-display);margin-top:18px">Tidak bisa terhubung</h2>
        <p class="muted" style="margin:6px 0 20px">${esc(message)}</p>
        <button class="btn btn-primary" data-action="reload">Coba lagi</button>
      </div>`;
  }

  async function boot() {
    try {
      S.catalog = await API.catalog();
    } catch (err) {
      errorScreen(err.message);
      return;
    }
    if (await API.hasSession()) {
      try {
        const state = await API.state();
        S.authed = true;
        setState(state);
        S.chat.mode = state.fifin.mode;
      } catch (err) {
        if (err.status === 401) API.auth.clear();
        else { errorScreen(err.message); return; }
      }
    }
    if (!location.hash) history.replaceState(null, '', '#/home');
    render();
  }

  boot();
})();
