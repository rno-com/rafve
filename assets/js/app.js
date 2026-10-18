(function () {
    const $ = s => document.querySelector(s);

    // Pengaturan toko
    // Nomor WhatsApp ditetapkan langsung agar konsisten
    // di semua browser dan perangkat pelanggan.
    const settings = {
        ...RAFVE.getSettings(),
        whatsapp: '6285736607893',
        whatsappEnabled: true
    };

    const header = $('#site-header');

    if (header) {
        header.innerHTML = `
            <div class="announcement">
                ${RAFVE.escape(settings.announcement || '')}
            </div>

            <header class="site-header">
                <a class="wordmark" href="index.html">
                    RAFVE<span>.</span>
                </a>

                <nav class="main-nav">
                    <a href="index.html">Home</a>
                    <a href="products.html">New Arrivals</a>
                    <a href="products.html">Koleksi</a>
                </nav>

                <div class="header-actions">
                    <a
                        class="icon-link"
                        href="products.html"
                        aria-label="Cari produk"
                    >⌕</a>

                    <a
                        class="icon-link cart-link"
                        href="cart.html"
                        aria-label="Keranjang"
                    >
                        Bag <span id="cart-count">0</span>
                    </a>

                    <button
                        id="menu-toggle"
                        class="icon-btn"
                        aria-label="Buka menu"
                    >☰</button>
                </div>
            </header>
        `;
    }

    // Footer website
    const footer = $('#site-footer');

    if (footer) {
        footer.innerHTML = `
            <footer class="site-footer">
                <div>
                    <a class="wordmark" href="index.html">
                        RAFVE<span>.</span>
                    </a>
                    <p>Modest fashion for everyday moments.</p>
                </div>

                <div>
                    <strong>Jelajahi</strong>
                    <a href="products.html">Semua koleksi</a>
                    <a href="admin.html">Admin demo</a>
                </div>

                <div>
                    <strong>Terhubung</strong>

                    <a
                        href="${RAFVE.escape(
                            settings.instagram ||
                            'https://www.instagram.com/rafve.id/'
                        )}"
                        target="_blank"
                        rel="noopener"
                    >
                        Instagram RAFVE ↗
                    </a>

                    ${
                        settings.whatsappEnabled &&
                        RAFVE.validWhatsApp(settings.whatsapp)
                            ? `
                                <a
                                    href="https://wa.me/6285736607893"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    WhatsApp toko ↗
                                </a>
                            `
                            : `
                                <span class="muted">
                                    WhatsApp belum dikonfigurasi
                                </span>
                            `
                    }
                </div>

                <div class="footer-bottom">
                    © ${new Date().getFullYear()} RAFVE.
                    Prototype katalog; data demo disimpan di browser.
                </div>
            </footer>
        `;
    }

    // Memperbarui jumlah produk di keranjang
    function updateCount() {
        const el = $('#cart-count');

        if (el) {
            el.textContent = RAFVE.getCart().reduce(
                (n, x) => n + (Number(x.qty) || 0),
                0
            );
        }
    }

    updateCount();

    // Menu navigasi untuk perangkat seluler
    document.addEventListener('click', e => {
        if (e.target.closest('#menu-toggle')) {
            $('.main-nav')?.classList.toggle('nav-open');
        }
    });

    // Memperbarui keranjang ketika data berubah
    window.addEventListener('rafve:datachange', updateCount);
    window.addEventListener('storage', updateCount);

    // Fungsi untuk kartu produk
    window.RAFVEUI = {
        productCard: p => `
            <article class="product-card">
                <a
                    href="${RAFVE.productUrl(p.id)}"
                    class="product-image"
                >
                    <img
                        src="${RAFVE.escape(RAFVE.image(p))}"
                        alt="${RAFVE.escape(p.name)}"
                        loading="lazy"
                        onerror="this.src='assets/images/placeholder.svg'"
                    >

                    ${
                        p.isNew
                            ? '<span class="product-badge">NEW</span>'
                            : ''
                    }

                    ${
                        p.salePrice > 0 && p.salePrice < p.price
                            ? '<span class="product-badge sale">SALE</span>'
                            : ''
                    }
                </a>

                <div class="product-info">
                    <p class="product-category">
                        ${RAFVE.escape(p.category)}
                    </p>

                    <a
                        href="${RAFVE.productUrl(p.id)}"
                        class="product-name"
                    >
                        ${RAFVE.escape(p.name)}
                    </a>

                    <div class="product-price">
                        ${RAFVE.money(RAFVE.effectivePrice(p))}
                        ${
                            RAFVE.effectivePrice(p) < p.price
                                ? ` <del>${RAFVE.money(p.price)}</del>`
                                : ''
                        }
                    </div>

                    <a
                        class="text-link"
                        href="${RAFVE.productUrl(p.id)}"
                    >
                        Lihat detail ↗
                    </a>
                </div>
            </article>
        `
    };

    // Produk aktif
    const products = RAFVE.getProducts().filter(p => p.active);

    const hp = $('#home-products');

    if (hp) {
        hp.innerHTML = products
            .slice()
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 4)
            .map(RAFVEUI.productCard)
            .join('');
    }

    // Kategori di halaman utama
    const cats = $('#home-categories');

    if (cats) {
        const list = [
            ...new Set(products.map(p => p.category))
        ].slice(0, 4);

        cats.innerHTML = list
            .map((c, i) => `
                <a
                    class="category-tile tile-${i % 4}"
                    href="products.html?category=${encodeURIComponent(c)}"
                >
                    <span>${RAFVE.escape(c)}</span>
                    <span>Jelajahi ↗</span>
                </a>
            `)
            .join('');
    }

    // Cerita brand
    const story = $('#brand-story');

    if (story && settings.tagline) {
        story.textContent =
            settings.tagline +
            ' — cerita brand dan detail koleksi dapat diperbarui melalui dashboard admin.';
    }
})();
