/**
 * Konfigurasi frontend FinDose.
 * Untuk pindah ke Supabase: ubah authProvider ke 'supabase', isi supabaseUrl & supabaseAnonKey
 * (anon key memang publik), lalu set AUTH_PROVIDER=supabase di backend/.env.
 */
window.FINDOSE_CONFIG = {
  apiBase: '',              // kosong = backend yang sama dengan halaman ini
  authProvider: 'local',    // 'local' | 'supabase'
  supabaseUrl: '',
  supabaseAnonKey: ''
};
