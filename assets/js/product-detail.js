
(async function () {
    const root = document.querySelector('#product-detail');

    if (!root) {
        console.error('Elemen #product-detail tidak ditemukan.');
        return;
    }

    const id = new URLSearchParams(location.search).get('id');

    let product;

    // Memuat produk dari Supabase terlebih dahulu.
    try {
        if (typeof RAFVE.loadProductsFromSupabase === 'function') {
            await RAFVE.loadProductsFromSupabase();
        }
    } catch (error) {
        console.error(
            'Gagal memuat detail produk dari Supabase:',
            error
        );
    }

    // Mencari produk berdasarkan ID.
    product = RAFVE.getProducts().find(
        p => p.id === id && p.active
    );

    if (!product) {
        root.innerHTML = `
            <div class="empty">
                <h2>Produk tidak ditemukan</h2>
                <a class="btn" href="products.html">
                    Kembali ke koleksi
                </a>
            </div>
        `;
        return;
    }

    // Menyiapkan daftar foto produk.
    const photos = [
        product.image,
        ...(product.gallery || [])
    ].filter(Boolean);

    const mainPhoto = photos[0] || '';

    // Menampilkan detail produk.
    root.innerHTML = `
        <div class="detail-layout">
            <div class="detail-photo">
                <img
                    id="main-photo"
                    src="${RAFVE.escape(mainPhoto)}"
                    alt="${RAFVE.escape(product.name)}"
                    onerror="this.src='assets/images/placeholder.svg'"
                >

                <div class="thumbs">
                    ${photos.map((src, i) => `
                        <button
                            type="button"
                            data-src="${RAFVE.escape(src)}"
                            aria-label="Foto ${i + 1}"
                            ${i === 0 ? 'class="active"' : ''}
                        >
                            <img
                                src="${RAFVE.escape(src)}"
                                alt=""
                                loading="lazy"
                                onerror="this.src='assets/images/placeholder.svg'"
                            >
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="detail-copy">
                <p class="eyebrow">
                    ${RAFVE.escape(product.category)}
                    ·
                    ${RAFVE.escape(product.id)}
                </p>

                <h1>${RAFVE.escape(product.name)}</h1>

                <div class="product-price large">
                    ${RAFVE.money(RAFVE.effectivePrice(product))}
                    ${
                        RAFVE.effectivePrice(product) < product.price
                            ? `<del>${RAFVE.money(product.price)}</del>`
                            : ''
                    }
                </div>

                <p>${RAFVE.escape(product.description || '')}</p>

                <p class="muted">
                    Stok tersedia:
                    <strong id="stock-label">${product.stock}</strong>
                </p>

                <label for="detail-size">Ukuran</label>
                <select id="detail-size">
                    <option value="">Pilih ukuran</option>
                    ${(product.sizes || []).map(size => `
                        <option value="${RAFVE.escape(size)}">
                            ${RAFVE.escape(size)}
                        </option>
                    `).join('')}
                </select>

                <label for="detail-color">Warna</label>
                <select id="detail-color">
                    <option value="">Pilih warna</option>
                    ${(product.colors || []).map(color => `
                        <option value="${RAFVE.escape(color)}">
                            ${RAFVE.escape(color)}
                        </option>
                    `).join('')}
                </select>

                <label for="detail-qty">Jumlah</label>
                <input
                    id="detail-qty"
                    type="number"
                    min="1"
                    max="${Math.max(1, Number(product.stock) || 1)}"
                    value="1"
                >

                <p
                    id="detail-error"
                    class="error"
                    role="alert"
                    aria-live="polite"
                ></p>

                <div class="detail-actions">
                    <button
                        type="button"
                        id="add-cart"
                        class="btn btn-light"
                    >
                        Tambah ke Keranjang
                    </button>

                    <button
                        type="button"
                        id="buy-now"
                        class="btn"
                    >
                        Pesan Sekarang
                    </button>
                </div>

                <p class="muted">
                    Harga dan stok akan divalidasi kembali sebelum
                    checkout WhatsApp. Konfirmasi akhir dilakukan admin.
                </p>
            </div>
        </div>

        <section class="section">
            <h2>Koleksi lainnya</h2>
            <div id="related" class="product-grid"></div>
        </section>
    `;

    // Mengganti foto utama saat thumbnail diklik.
    const mainPhotoElement = document.querySelector('#main-photo');

    document.querySelectorAll('.thumbs button').forEach(button => {
        button.addEventListener('click', () => {
            mainPhotoElement.src = button.dataset.src;

            document.querySelectorAll('.thumbs button')
                .forEach(item => item.classList.remove('active'));

            button.classList.add('active');
        });
    });

    // Menampilkan produk terkait tanpa menggagalkan tombol keranjang.
    const related = document.querySelector('#related');

    function renderRelated() {
        if (!related) return false;

        const productCard = window.RAFVEUI?.productCard;

        if (typeof productCard !== 'function') {
            return false;
        }

        related.innerHTML = RAFVE.getProducts()
            .filter(p => p.active && p.id !== product.id)
            .slice(0, 4)
            .map(p => productCard(p))
            .join('');

        return true;
    }

    if (!renderRelated()) {
        window.addEventListener('rafve:ui-ready', renderRelated, {
            once: true
        });
    }

    // Menampilkan pesan kesalahan atau keberhasilan.
    const errorElement = document.querySelector('#detail-error');

    function showMessage(message, success = false) {
        errorElement.className = success ? 'success' : 'error';
        errorElement.textContent = message;
    }

    // Menambahkan produk ke keranjang.
    function addToCart(goToCart = false) {
        const size = document.querySelector('#detail-size').value;
        const color = document.querySelector('#detail-color').value;
        const qty = Number(document.querySelector('#detail-qty').value);

        // Memuat ulang produk dari data aplikasi untuk memeriksa statusnya.
        const currentProduct = RAFVE.getProducts().find(
            p => p.id === id && p.active
        );

        if (!currentProduct) {
            showMessage('Produk sudah tidak tersedia.');
            return;
        }

        const stock = Number(currentProduct.stock) || 0;

        if (!size || !color) {
            showMessage('Silakan pilih ukuran dan warna.');
            return;
        }

        if (!Number.isInteger(qty) || qty < 1) {
            showMessage('Jumlah produk harus minimal 1.');
            return;
        }

        if (qty > stock) {
            showMessage('Jumlah melebihi stok yang tersedia.');
            return;
        }

        // Mengambil keranjang saat ini.
        const cart = RAFVE.getCart();

        const key = RAFVE.cartKey(
            currentProduct.id,
            size,
            color
        );

        const existingItem = cart.find(item => item.key === key);

        const existingQty = existingItem
            ? Number(existingItem.qty) || 0
            : 0;

        if (existingQty + qty > stock) {
            showMessage(
                'Jumlah di keranjang melebihi stok yang tersedia.'
            );
            return;
        }

        // Memperbarui atau menambahkan item keranjang.
        if (existingItem) {
            existingItem.qty = existingQty + qty;
        } else {
            cart.push({
                key,
                id: currentProduct.id,
                size,
                color,
                qty
            });
        }

        try {
            RAFVE.saveCart(cart);
        } catch (error) {
            console.error('Gagal menyimpan keranjang:', error);
            showMessage('Keranjang gagal disimpan. Silakan coba lagi.');
            return;
        }

        if (goToCart) {
            location.href = 'cart.html';
            return;
        }

        showMessage('Produk berhasil ditambahkan ke keranjang.', true);
    }

    // Memasang event tombol.
    document.querySelector('#add-cart').addEventListener('click', () => {
        addToCart(false);
    });

    document.querySelector('#buy-now').addEventListener('click', () => {
        addToCart(true);
    });

})().catch(error => {
    console.error('Terjadi kesalahan pada halaman detail produk:', error);
});
