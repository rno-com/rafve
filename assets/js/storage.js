
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


    function dbToProduct(r) {
        return {
            id: r.id, name: r.name, category: r.category || '',
            description: r.description || '', price: Number(r.price) || 0,
            salePrice: Number(r.sale_price) || 0, image: r.image || '',
            gallery: Array.isArray(r.gallery) ? r.gallery : [],
            sizes: Array.isArray(r.sizes) ? r.sizes : [],
            colors: Array.isArray(r.colors) ? r.colors : [],
            stock: Number(r.stock) || 0, active: r.active === true,
            isNew: r.is_new === true, createdAt: Number(r.created_at) || Date.now()
        };
    }
    function productToDb(p) {
        return {
            id: String(p.id), name: String(p.name || ''),
            category: String(p.category || ''), description: String(p.description || ''),
            price: Number(p.price) || 0, sale_price: Number(p.salePrice) || 0,
            image: String(p.image || ''), gallery: p.gallery || [],
            sizes: p.sizes || [], colors: p.colors || [], stock: Number(p.stock) || 0,
            active: !!p.active, is_new: !!p.isNew,
            created_at: Number(p.createdAt) || Date.now(), updated_at: new Date().toISOString()
        };
    }
    async function loadProductsFromSupabase() {
        const client = window.rafveSupabase;
        if (!client) throw new Error('Klien Supabase tidak tersedia.');
        const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const products = (data || []).map(dbToProduct);
        write(KEYS.products, products);
        return products;
    }
    async function upsertProductToSupabase(product) {
        const client = window.rafveSupabase;
        if (!client) throw new Error('Klien Supabase tidak tersedia.');
        const { error } = await client.from('products').upsert(productToDb(product), { onConflict: 'id' });
        if (error) throw error;
        const current = read(KEYS.products, []);
        write(KEYS.products, [product, ...current.filter(p => p.id !== product.id)]);
        return true;
    }
    async function deleteProductFromSupabase(id) {
        const client = window.rafveSupabase;
        if (!client) throw new Error('Klien Supabase tidak tersedia.');
        const { error } = await client.from('products').delete().eq('id', id);
        if (error) throw error;
        write(KEYS.products, read(KEYS.products, []).filter(p => p.id !== id));
        return true;
    }
    async function uploadProductImage(file, productId) {
        const client = window.rafveSupabase;
        if (!client) throw new Error('Klien Supabase tidak tersedia.');
        if (!file) throw new Error('Pilih file foto.');
        const types = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' };
        if (!types[file.type]) throw new Error('Format foto harus JPG, PNG, atau WebP.');
        if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB.');
        const safeId = String(productId).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
        const path = `${safeId}/${Date.now()}.${types[file.type]}`;
        const { error } = await client.storage.from('product-images').upload(path, file, {
            cacheControl: '3600', upsert: false, contentType: file.type
        });
        if (error) throw error;
        const { data } = client.storage.from('product-images').getPublicUrl(path);
        if (!data?.publicUrl) throw new Error('URL foto tidak tersedia.');
        return data.publicUrl;
    }
    async function migrateLocalProductsToSupabase() {
        const client = window.rafveSupabase;
        if (!client) throw new Error('Klien Supabase tidak tersedia.');
        const local = read(KEYS.products, []);
        const { data: remote, error: readError } = await client.from('products').select('id');
        if (readError) throw readError;
        if ((remote || []).length) return { migrated: false, reason: 'database_not_empty' };
        if (!local.length) return { migrated: false, reason: 'no_local_products' };
        const rows = local.map(productToDb);
        const { error } = await client.from('products').upsert(rows, { onConflict: 'id' });
        if (error) throw error;
        return { migrated: true, count: rows.length };
    }
    window.RAFVE = {
        keys: KEYS,

        getProducts: () => read(KEYS.products, []),
        saveProducts: value => write(KEYS.products, value),
        loadProductsFromSupabase,
        upsertProductToSupabase,
        deleteProductFromSupabase,
        uploadProductImage,
        migrateLocalProductsToSupabase,

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
