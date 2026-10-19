
(function () {
    const KEYS = {
        products: 'rafve_products_v1',
        cart: 'rafve_cart_v1',
        settings: 'rafve_settings_v1'
    };

    const defaultSettings = {
        storeName: 'RAFVE',
        tagline: 'Modest Style, Everyday Elegance',
        announcement: '',
        instagram: 'https://www.instagram.com/rafve.id/',
        whatsapp: '',
        greeting: 'Halo RAFVE, saya ingin bertanya mengenai produk.',
        whatsappEnabled: false,
        lowStock: 5
    };

    function safeParse(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function read(key, fallback) {
        try {
            return safeParse(localStorage.getItem(key), fallback);
        } catch (error) {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));

            window.dispatchEvent(
                new CustomEvent('rafve:datachange', {
                    detail: { key }
                })
            );

            return true;
        } catch (error) {
            console.error('Gagal menyimpan data lokal:', error);
            return false;
        }
    }

    function init() {
        if (read(KEYS.products, null) === null) {
            write(KEYS.products, window.RAFVE_SEED_PRODUCTS || []);
        }

        if (read(KEYS.settings, null) === null) {
            write(KEYS.settings, defaultSettings);
        }

        if (read(KEYS.cart, null) === null) {
            write(KEYS.cart, []);
        }
    }

    init();

    async function loadSettingsFromSupabase() {
        const client = window.rafveSupabase;

        if (!client) {
            console.error('Klien Supabase tidak tersedia.');
            return null;
        }

        try {
            const { data, error } = await client
                .from('store_settings')
                .select('data')
                .eq('id', 1)
                .maybeSingle();

            if (error) {
                console.error('Gagal memuat pengaturan Supabase:', error);
                return null;
            }

            if (!data || !data.data) {
                console.warn('Pengaturan toko belum tersedia di Supabase.');
                return null;
            }

            const settings = {
                ...defaultSettings,
                ...data.data
            };

            write(KEYS.settings, settings);

            return settings;
        } catch (error) {
            console.error('Kesalahan saat memuat pengaturan:', error);
            return null;
        }
    }

    window.RAFVE = {
        keys: KEYS,

        getProducts: () => read(KEYS.products, []),
        saveProducts: value => write(KEYS.products, value),

        getCart: () => read(KEYS.cart, []),
        saveCart: value => write(KEYS.cart, value),

        getSettings: () => ({
            ...defaultSettings,
            ...read(KEYS.settings, {})
        }),

        saveSettings: value => write(KEYS.settings, {
            ...defaultSettings,
            ...value
        }),

        loadSettingsFromSupabase,

        money: number =>
            new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0
            }).format(Number(number) || 0),

        escape: value =>
            String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char]),

        effectivePrice: product =>
            Number(product.salePrice) > 0 &&
            Number(product.salePrice) < Number(product.price)
                ? Number(product.salePrice)
                : Number(product.price),

        image: product =>
            product.image || 'assets/images/placeholder.svg',

        validWhatsApp: number =>
            /^62\d{8,13}$/.test(String(number || '')),

        productUrl: id =>
            'product-detail.html?id=' + encodeURIComponent(id),

        cartKey: (id, size, color) =>
            [id, size, color].join('::')
    };

    window.addEventListener('storage', event => {
        if (Object.values(KEYS).includes(event.key)) {
            window.dispatchEvent(
                new CustomEvent('rafve:datachange', {
                    detail: { key: event.key }
                })
            );
        }
    });
})();
