(function () {
    const SUPABASE_URL = 'https://yzogzwjzpykaivyoedbb.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7LbnE6R0oHZaa9X8S-5sNw_T_mEbmbY';

    if (!window.supabase || !window.supabase.createClient) {
        console.error('Library Supabase tidak berhasil dimuat.');
        return;
    }

    try {
        window.rafveSupabase = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );

        console.log('Koneksi klien Supabase berhasil dibuat.');
    } catch (error) {
        console.error('Gagal membuat klien Supabase:', error);
    }
})();

