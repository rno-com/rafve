(async function () {
    try { await RAFVE.loadProductsFromSupabase(); }
    catch (error) { console.error('Gagal memuat katalog dari Supabase:', error); }
    const $ = selector => document.querySelector(selector);

    const fields = {
        search: $('#search'),
        category: $('#category'),
        size: $('#size'),
        color: $('#color'),
        sort: $('#sort')
    };

    const catalog = $('#catalog');
    const empty = $('#empty');
    const resultCount = $('#result-count');
    const resetButton = $('#reset');

    // Memastikan seluruh elemen HTML yang dibutuhkan tersedia.
    if (
        !catalog ||
        !empty ||
        !resultCount ||
        !resetButton ||
        Object.values(fields).some(el => !el)
    ) {
        console.error(
            'RAFVE: Elemen katalog tidak lengkap. Periksa products.html.'
        );
        return;
    }

    // Membaca data produk dari penyimpanan bersama.
    function getActiveProducts() {
        const products = RAFVE.getProducts();

        return products.filter(product =>
            product.active === true || product.active === 1
        );
    }

    // Membuat pilihan kategori, ukuran, dan warna secara dinamis.
    function options() {
        const products = getActiveProducts();

        const configurations = [
            {
                field: 'category',
                values: products.map(p => p.category).filter(Boolean),
                label: 'Semua kategori'
            },
            {
                field: 'size',
                values: products.flatMap(p => p.sizes || []),
                label: 'Semua ukuran'
            },
            {
                field: 'color',
                values: products.flatMap(p => p.colors || []),
                label: 'Semua warna'
            }
        ];

        configurations.forEach(({ field, values, label }) => {
            const element = fields[field];
            const currentValue = element.value;

            const uniqueValues = [...new Set(
                values.map(value => String(value).trim()).filter(Boolean)
            )].sort((a, b) => a.localeCompare(b));

            element.innerHTML =
                `<option value="">${label}</option>` +
                uniqueValues.map(value =>
                    `<option value="${RAFVE.escape(value)}">` +
                    `${RAFVE.escape(value)}</option>`
                ).join('');

            // Pertahankan pilihan filter jika masih tersedia.
            element.value = uniqueValues.includes(currentValue)
                ? currentValue
                : '';
        });
    }

    function render() {
        const term = fields.search.value.trim().toLowerCase();

        let products = getActiveProducts().filter(product => {
            const searchableText = [
                product.name,
                product.id,
                product.description || '',
                product.category || ''
            ].join(' ').toLowerCase();

            return searchableText.includes(term);
        });

        if (fields.category.value) {
            products = products.filter(
                p => p.category === fields.category.value
            );
        }

        if (fields.size.value) {
            products = products.filter(
                p => (p.sizes || []).includes(fields.size.value)
            );
        }

        if (fields.color.value) {
            products = products.filter(
                p => (p.colors || []).includes(fields.color.value)
            );
        }

        // Pengurutan tidak membatasi jumlah produk.
        switch (fields.sort.value) {
            case 'low':
                products.sort(
                    (a, b) =>
                        RAFVE.effectivePrice(a) -
                        RAFVE.effectivePrice(b)
                );
                break;

            case 'high':
                products.sort(
                    (a, b) =>
                        RAFVE.effectivePrice(b) -
                        RAFVE.effectivePrice(a)
                );
                break;

            case 'name':
                products.sort(
                    (a, b) => a.name.localeCompare(b.name)
                );
                break;

            case 'newest':
                products.sort(
                    (a, b) =>
                        (Number(b.createdAt) || 0) -
                        (Number(a.createdAt) || 0)
                );
                break;
        }

        // Tampilkan semua produk yang memenuhi filter.
catalog.innerHTML = products.map(product => {
    const detailUrl =
        `product-detail.html?id=${encodeURIComponent(product.id)}`;

    const price = RAFVE.effectivePrice(product);
    const hasDiscount =
        Number(product.salePrice) > 0 &&
        Number(product.salePrice) < Number(product.price);

    return `
        <article class="product-card">
            <a class="product-image" href="${detailUrl}">
                <img
                    src="${RAFVE.escape(RAFVE.image(product))}"
                    alt="${RAFVE.escape(product.name)}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='assets/images/placeholder.svg'"
                >

                ${product.isNew ? `
                    <span class="product-badge">NEW</span>
                ` : ''}

                ${hasDiscount ? `
                    <span class="product-badge sale">SALE</span>
                ` : ''}
            </a>

            <div class="product-info">
                <p class="product-category">
                    ${RAFVE.escape(product.category || '')}
                </p>

                <a class="product-name" href="${detailUrl}">
                    ${RAFVE.escape(product.name)}
                </a>

                <div class="product-price">
                    ${RAFVE.money(price)}
                    ${hasDiscount ? `
                        <del>${RAFVE.money(Number(product.price))}</del>
                    ` : ''}
                </div>

                <a class="text-link" href="${detailUrl}">
                    Lihat Detail →
                </a>
            </div>
        </article>
    `;
}).join('');

        empty.classList.toggle('hidden', products.length > 0);
        resultCount.textContent = `${products.length} produk`;
    }

    // Pencarian dan filter.
    Object.values(fields).forEach(element => {
        element.addEventListener('input', render);
        element.addEventListener('change', render);
    });

    // Reset seluruh filter.
    resetButton.addEventListener('click', () => {
        fields.search.value = '';
        fields.category.value = '';
        fields.size.value = '';
        fields.color.value = '';
        fields.sort.value = 'newest';

        render();
    });

    // Mendukung tautan kategori dari halaman utama.
    const params = new URLSearchParams(location.search);
    const requestedCategory = params.get('category');

    options();

    if (requestedCategory) {
        fields.category.value = requestedCategory;
    }

    render();

    // Perbarui katalog ketika admin mengubah data
    // dan mengirim event pada tab yang sama.
    window.addEventListener('rafve:datachange', () => {
        options();
        render();
    });

    // Sinkronisasi jika localStorage berubah dari tab lain.
    window.addEventListener('storage', event => {
        if (
            event.key === 'rafve_products' ||
            event.key === 'rafve-products'
        ) {
            options();
            render();
        }
    });
})();