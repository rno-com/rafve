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

    // ==========================================
    // PENGATURAN TOKO DARI SUPABASE
    // ==========================================

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
                console.error(
                    'Gagal memuat pengaturan Supabase:',
                    error
                );
                return null;
            }

            if (!data || !data.data) {
                console.warn(
                    'Pengaturan toko belum tersedia di Supabase.'
                );
                return null;
            }

            const settings = {
                ...defaultSettings,
                ...data.data
            };

            write(KEYS.settings, settings);

            return settings;
        } catch (error) {
            console.error(
                'Kesalahan saat memuat pengaturan:',
                error
            );
            return null;
        }
    }

    // ==========================================
    // KONVERSI PRODUK
    // Struktur tabel menggunakan kolom terpisah
    // ==========================================

    function dbToProduct(row) {
        return {
            id: String(row.id),
            name: row.name || '',
            category: row.category || '',
            description: row.description || '',
            price: Number(row.price) || 0,
            salePrice: Number(row.sale_price) || 0,
            image: row.image || '',
            gallery: Array.isArray(row.gallery)
                ? row.gallery
                : [],
            sizes: Array.isArray(row.sizes)
                ? row.sizes
                : [],
            colors: Array.isArray(row.colors)
                ? row.colors
                : [],
            stock: Number(row.stock) || 0,
            active: row.active === true,
            isNew: row.is_new === true,
            createdAt: row.created_at
                ? new Date(row.created_at).getTime()
                : Date.now(),
            updatedAt: row.updated_at
                ? new Date(row.updated_at).getTime()
                : Date.now()
        };
    }

    function productToDb(product) {
        const now = new Date().toISOString();

        return {
            id: String(product.id),
            name: String(product.name || ''),
            category: String(product.category || ''),
            description: String(product.description || ''),
            price: Number(product.price) || 0,
            sale_price: Number(product.salePrice) || 0,
            image: String(product.image || ''),
            gallery: Array.isArray(product.gallery)
                ? product.gallery
                : [],
            sizes: Array.isArray(product.sizes)
                ? product.sizes
                : [],
            colors: Array.isArray(product.colors)
                ? product.colors
                : [],
            stock: Number(product.stock) || 0,
            active: product.active !== false,
            is_new: Boolean(product.isNew),
            created_at: product.createdAt
                ? new Date(
                    Number(product.createdAt)
                ).toISOString()
                : now,
            updated_at: now
        };
    }

    // ==========================================
    // MEMUAT PRODUK DARI SUPABASE
    // ==========================================

    async function loadProductsFromSupabase() {
        const client = window.rafveSupabase;

        if (!client) {
            throw new Error(
                'Klien Supabase tidak tersedia.'
            );
        }

        const { data, error } = await client
            .from('products')
            .select(
                'id, name, category, description, price, sale_price, image, gallery, sizes, colors, stock, active, is_new, created_at, updated_at'
            )
            .order('updated_at', {
                ascending: false
            });

        if (error) {
            throw error;
        }

        const products = (data || []).map(dbToProduct);

        // Jika database kosong, pertahankan data lokal
        // agar tidak langsung hilang dari browser.
        if (products.length === 0) {
            const localProducts = read(
                KEYS.products,
                []
            );

            if (localProducts.length > 0) {
                console.warn(
                    'Tabel Supabase products kosong. ' +
                    'Data lokal dipertahankan.'
                );

                return localProducts;
            }
        }

        write(KEYS.products, products);

        return products;
    }

    // ==========================================
    // MENYIMPAN ATAU MEMPERBARUI PRODUK
    // ==========================================

    async function upsertProductToSupabase(product) {
        const client = window.rafveSupabase;

        if (!client) {
            throw new Error(
                'Klien Supabase tidak tersedia.'
            );
        }

        const row = productToDb(product);

        const { error } = await client
            .from('products')
            .upsert(row, {
                onConflict: 'id'
            });

        if (error) {
            throw error;
        }

        const current = read(KEYS.products, []);

        const updatedProduct = {
            ...product,
            updatedAt: Date.now()
        };

        write(KEYS.products, [
            updatedProduct,
            ...current.filter(
                item =>
                    String(item.id) !== String(product.id)
            )
        ]);

        return true;
    }

    // ==========================================
    // MENGHAPUS PRODUK
    // ==========================================

    async function deleteProductFromSupabase(id) {
        const client = window.rafveSupabase;

        if (!client) {
            throw new Error(
                'Klien Supabase tidak tersedia.'
            );
        }

        const { error } = await client
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        write(
            KEYS.products,
            read(KEYS.products, []).filter(
                item => String(item.id) !== String(id)
            )
        );

        return true;
    }

    // ==========================================
    // UPLOAD FOTO KE SUPABASE STORAGE
    // ==========================================

    async function uploadProductImage(file, productId) {
        const client = window.rafveSupabase;

        if (!client) {
            throw new Error(
                'Klien Supabase tidak tersedia.'
            );
        }

        if (!file) {
            throw new Error('Pilih file foto.');
        }

        const types = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
        };

        if (!types[file.type]) {
            throw new Error(
                'Format foto harus JPG, PNG, atau WebP.'
            );
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new Error(
                'Ukuran foto maksimal 5 MB.'
            );
        }

        const safeId = String(productId)
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-');

        const path =
            `${safeId}/${Date.now()}.${types[file.type]}`;

        const { error } = await client.storage
            .from('product-images')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            });

        if (error) {
            throw error;
        }

        const { data } = client.storage
            .from('product-images')
            .getPublicUrl(path);

        if (!data || !data.publicUrl) {
            throw new Error(
                'URL foto tidak tersedia.'
            );
        }

        return data.publicUrl;
    }

    // ==========================================
    // MIGRASI PRODUK LOKAL KE SUPABASE
    // Jalankan secara manual setelah memeriksa
    // bahwa tabel Supabase benar-benar kosong.
    // ==========================================

    async function migrateLocalProductsToSupabase() {
        const client = window.rafveSupabase;

        if (!client) {
            throw new Error(
                'Klien Supabase tidak tersedia.'
            );
        }

        const local = read(KEYS.products, []);

        const {
            data: remote,
            error: readError
        } = await client
            .from('products')
            .select('id')
            .limit(1);

        if (readError) {
            throw readError;
        }

        if ((remote || []).length > 0) {
            return {
                migrated: false,
                reason: 'database_not_empty'
            };
        }

        if (local.length === 0) {
            return {
                migrated: false,
                reason: 'no_local_products'
            };
        }

        const rows = local.map(productToDb);

        const { error } = await client
            .from('products')
            .upsert(rows, {
                onConflict: 'id'
            });

        if (error) {
            throw error;
        }

        return {
            migrated: true,
            count: rows.length
        };
    }

    // ==========================================
    // API RAFVE
    // ==========================================

    window.RAFVE = {
        keys: KEYS,

        getProducts: () =>
            read(KEYS.products, []),

        saveProducts: value =>
            write(KEYS.products, value),

        loadProductsFromSupabase,
        upsertProductToSupabase,
        deleteProductFromSupabase,
        uploadProductImage,
        migrateLocalProductsToSupabase,

        getCart: () =>
            read(KEYS.cart, []),

        saveCart: value =>
            write(KEYS.cart, value),

        getSettings: () => ({
            ...defaultSettings,
            ...read(KEYS.settings, {})
        }),

        saveSettings: value =>
            write(KEYS.settings, {
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
            String(value ?? '').replace(
                /[&<>"']/g,
                char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                })[char]
            ),

        effectivePrice: product =>
            Number(product.salePrice) > 0 &&
            Number(product.salePrice) <
                Number(product.price)
                ? Number(product.salePrice)
                : Number(product.price),

        image: product =>
            product.image ||
            'assets/images/placeholder.svg',

        validWhatsApp: number =>
            /^62\d{8,13}$/.test(
                String(number || '')
            ),

        productUrl: id =>
            'product-detail.html?id=' +
            encodeURIComponent(id),

        cartKey: (id, size, color) =>
            [id, size, color].join('::')
    };

    // ==========================================
    // SINKRONISASI ANTAR TAB BROWSER
    // ==========================================

    window.addEventListener('storage', event => {
        if (Object.values(KEYS).includes(event.key)) {
            window.dispatchEvent(
                new CustomEvent('rafve:datachange', {
                    detail: {
                        key: event.key
                    }
                })
            );
        }
    });
})();