/**
 * FinDose - Lapisan data & autentikasi klien.
 * Semua pemanggilan backend lewat objek `FinDoseAPI`. Auth dipisah menjadi adapter
 * (`LocalAuth` / `SupabaseAuth`) dengan antarmuka yang sama, supaya pindah ke Supabase
 * cukup mengubah config.js tanpa menyentuh app.js.
 */
(() => {
  const CONFIG = window.FINDOSE_CONFIG || {};
  const API_BASE = CONFIG.apiBase || '';
  const TOKEN_KEY = 'findose.token';

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* mode privat */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* mode privat */ } }
  };

  class ApiError extends Error {
    constructor(message, status = 0) { super(message); this.status = status; }
  }

  async function http(path, { method = 'GET', body, token } = {}) {
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new ApiError('Tidak bisa terhubung ke server FinDose. Pastikan backend menyala.', 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || `Terjadi kesalahan (${res.status})`, res.status);
    return data;
  }

  // ---------------------------------------------------------------------------
  // Adapter auth lokal (backend SQLite)
  // ---------------------------------------------------------------------------
  const LocalAuth = {
    async signUp({ name, email, password }) {
      const data = await http('/api/auth/register', { method: 'POST', body: { name, email, password } });
      store.set(TOKEN_KEY, data.token);
      return data.state;
    },
    async signIn({ email, password }) {
      const data = await http('/api/auth/login', { method: 'POST', body: { email, password } });
      store.set(TOKEN_KEY, data.token);
      return data.state;
    },
    async demo() {
      const data = await http('/api/auth/demo', { method: 'POST', body: {} });
      store.set(TOKEN_KEY, data.token);
      return data.state;
    },
    async signOut() {
      const token = store.get(TOKEN_KEY);
      store.remove(TOKEN_KEY);
      if (token) await http('/api/auth/logout', { method: 'POST', token }).catch(() => {});
    },
    async getToken() { return store.get(TOKEN_KEY); },
    clear() { store.remove(TOKEN_KEY); }
  };

  // ---------------------------------------------------------------------------
  // Adapter Supabase Auth (aktif bila CONFIG.authProvider === 'supabase')
  // Backend memverifikasi access token Supabase pada setiap request.
  // ---------------------------------------------------------------------------
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  let supabaseClient = null;

  async function supabase() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SUPABASE_JS;
        s.onload = resolve;
        s.onerror = () => reject(new ApiError('Gagal memuat Supabase SDK'));
        document.head.appendChild(s);
      });
    }
    supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    return supabaseClient;
  }

  const SupabaseAuth = {
    async signUp({ name, email, password }) {
      const sb = await supabase();
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw new ApiError(error.message, 400);
      if (!data.session) throw new ApiError('Cek email kamu untuk verifikasi akun, lalu masuk.', 400);
      return FinDoseAPI.state();
    },
    async signIn({ email, password }) {
      const sb = await supabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new ApiError('Email atau password salah', 401);
      return FinDoseAPI.state();
    },
    async signOut() {
      const sb = await supabase();
      await sb.auth.signOut();
    },
    async getToken() {
      const sb = await supabase();
      const { data } = await sb.auth.getSession();
      return data.session?.access_token || null;
    },
    clear() { supabaseClient?.auth.signOut(); }
  };

  const Auth = CONFIG.authProvider === 'supabase' ? SupabaseAuth : LocalAuth;

  async function authed(path, options = {}) {
    const token = await Auth.getToken();
    if (!token) throw new ApiError('Silakan masuk terlebih dahulu', 401);
    return http(path, { ...options, token });
  }

  const FinDoseAPI = {
    ApiError,
    auth: Auth,
    provider: CONFIG.authProvider === 'supabase' ? 'supabase' : 'local',
    hasSession: async () => Boolean(await Auth.getToken()),

    catalog: () => http('/api/catalog'),
    state: () => authed('/api/state'),
    updateProfile: body => authed('/api/profile', { method: 'PATCH', body }),
    saveHealth: body => authed('/api/health-profile', { method: 'PUT', body }),
    walletSettings: body => authed('/api/wallet/settings', { method: 'PUT', body }),
    deposit: body => authed('/api/wallet/deposit', { method: 'POST', body }),
    claim: body => authed('/api/wallet/claim', { method: 'POST', body }),
    submitCheckin: body => authed('/api/checkin', { method: 'POST', body }),
    checkins: () => authed('/api/checkins'),
    checkin: id => authed(`/api/checkins/${encodeURIComponent(id)}`),
    chat: message => authed('/api/fifin/chat', { method: 'POST', body: { message } }),
    chatHistory: () => authed('/api/fifin/history'),
    clearChat: () => authed('/api/fifin/history', { method: 'DELETE' })
  };

  window.FinDoseAPI = FinDoseAPI;
})();
