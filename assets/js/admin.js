(function () {
    const $ = s => document.querySelector(s);
    const dialog = $('#product-dialog');
    const form = $('#product-form');
    const imageSelect = $('#product-image');
    const imagePreview = $('#image-preview');
    const refreshImagesButton = $('#refresh-images');

    let toastTimer;

    // GANTI dengan username GitHub kamu.
    const GITHUB_OWNER = 'rno-com';
    const GITHUB_REPO = 'rafve';
    const GITHUB_BRANCH = 'main';

    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(
            () => t.classList.remove('show'),
            2600
        );
    }

    // ==========================================
    // DAFTAR FOTO DARI GITHUB
    // ==========================================

    async function loadGitHubImages() {
        if (!imageSelect) return false;

        imageSelect.disabled = true;
        imageSelect.innerHTML =
            '<option value="">Memuat foto dari GitHub...</option>';

        try {
            const apiUrl =
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
                `/contents/assets/images?ref=${GITHUB_BRANCH}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(
                    `GitHub API error: ${response.status}`
                );
            }

            const files = await response.json();

            if (!Array.isArray(files)) {
                throw new Error('Format daftar file GitHub tidak valid.');
            }

            const images = files
                .filter(file =>
                    file.type === 'file' &&
                    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name)
                )
                .sort((a, b) => a.name.localeCompare(b.name));

            imageSelect.innerHTML =
                '<option value="">Pilih foto produk</option>';

            images.forEach(file => {
                const option = document.createElement('option');

                // URL langsung gambar dari GitHub.
                option.value = file.download_url;
                option.textContent = file.name;

                imageSelect.appendChild(option);
            });

            if (images.length === 0) {
                imageSelect.innerHTML =
                    '<option value="">Belum ada foto di folder</option>';
            }

            imageSelect.disabled = images.length === 0;
            return images.length > 0;

        } catch (error) {
            console.error('Gagal memuat foto GitHub:', error);

            imageSelect.innerHTML =
                '<option value="">Gagal memuat foto</option>';

            imageSelect.disabled = false;
            toast('Gagal memuat foto. Periksa repository GitHub.');
            return false;
        }
    }

    // Memastikan foto lama tetap dapat dipilih saat edit.
    function ensureImageOption(src) {
        if (!src || !imageSelect) return;

        const exists = Array.from(imageSelect.options)
            .some(option => option.value === src);

        if (!exists) {
            const option = document.createElement('option');
            option.value = src;
            option.textContent = 'Foto yang sudah digunakan';
            imageSelect.appendChild(option);
        }

        imageSelect.value = src;
    }

    function preview() {
        if (!imagePreview) return;

        const src = imageSelect ? imageSelect.value : '';

        imagePreview.replaceChildren();

        if (!src) {
            imagePreview.textContent =
                'Preview foto akan tampil di sini';
            return;
        }

        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Preview foto produk';

        img.onerror = () => {
            imagePreview.textContent =
                'Foto tidak dapat dimuat. Periksa URL gambar.';
        };

        imagePreview.appendChild(img);
    }

    if (imageSelect) {
        imageSelect.addEventListener('change', preview);
    }

    if (refreshImagesButton) {
        refreshImagesButton.addEventListener('click', async () => {
            const previousValue = imageSelect.value;
            const success = await loadGitHubImages();

            if (success && previousValue) {
                ensureImageOption(previousValue);
                preview();
            }

            if (success) toast('Daftar foto berhasil diperbarui.');
        });
    }

    // ==========================================
    // DASHBOARD DAN TABEL PRODUK
    // ==========================================

    function render() {
        const ps = RAFVE.getProducts();
        const settings = RAFVE.getSettings();

        const active = ps.filter(p => p.active).length;

        const low = ps.filter(
            p => p.active &&
                p.stock <= Number(settings.lowStock)
        ).length;

        $('#stats').innerHTML = [
            ['Total produk', ps.length],
            ['Produk aktif', active],
            ['Produk nonaktif', ps.length - active],
            ['Stok rendah', low]
        ].map(x =>
            `<div class="stat-card">
                <span>${x[0]}</span>
                <strong>${x[1]}</strong>
            </div>`
        ).join('');

        const cat = $('#admin-category');
        const old = cat.value;

        cat.innerHTML =
            '<option value="">Semua kategori</option>' +
            [...new Set(ps.map(p => p.category))]
                .map(c =>
                    `<option value="${RAFVE.escape(c)}">
                        ${RAFVE.escape(c)}
                    </option>`
                ).join('');

        cat.value = old;

        const q = $('#admin-search').value.toLowerCase();

        $('#admin-table').innerHTML = ps
            .filter(p =>
                `${p.id} ${p.name}`.toLowerCase().includes(q) &&
                (!cat.value || p.category === cat.value)
            )
            .map(p => `
                <tr>
                    <td>
                        <div class="table-product">
                            <img
                                src="${RAFVE.escape(RAFVE.image(p))}"
                                alt=""
                                onerror="this.src='assets/images/placeholder.svg'"
                            >
                            <span>${RAFVE.escape(p.name)}</span>
                        </div>
                    </td>
                    <td>${RAFVE.escape(p.id)}</td>
                    <td>${RAFVE.escape(p.category)}</td>
                    <td>
                        ${RAFVE.money(RAFVE.effectivePrice(p))}
                        ${p.salePrice > 0 && p.salePrice < p.price
                            ? `<small><del>${RAFVE.money(p.price)}</del></small>`
                            : ''}
                    </td>
                    <td>
                        <span class="stock ${
                            p.stock === 0 ? 'out' :
                            p.stock <= Number(settings.lowStock) ? 'low' : ''
                        }">${p.stock}</span>
                    </td>
                    <td>
                        <span class="status ${p.active ? 'on' : 'off'}">
                            ${p.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button data-edit="${RAFVE.escape(p.id)}">Edit</button>
                            <button data-toggle="${RAFVE.escape(p.id)}">
                                ${p.active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                                data-delete="${RAFVE.escape(p.id)}"
                                class="danger"
                            >Hapus</button>
                        </div>
                    </td>
                </tr>
            `).join('') ||
            '<tr><td colspan="7">Produk tidak ditemukan.</td></tr>';

        $('#admin-table')
            .querySelectorAll('[data-edit]')
            .forEach(b => {
                b.onclick = () => edit(b.dataset.edit);
            });

        $('#admin-table')
            .querySelectorAll('[data-toggle]')
            .forEach(b => {
                b.onclick = () => {
                    const products = RAFVE.getProducts();
                    const p = products.find(
                        x => x.id === b.dataset.toggle
                    );

                    if (!p) return;

                    p.active = !p.active;
                    RAFVE.saveProducts(products);
                    render();
                    toast('Status produk diperbarui.');
                };
            });

        $('#admin-table')
            .querySelectorAll('[data-delete]')
            .forEach(b => {
                b.onclick = () => {
                    if (confirm(
                        'Hapus produk ini? Item di keranjang pelanggan ' +
                        'akan ditandai tidak tersedia.'
                    )) {
                        RAFVE.saveProducts(
                            RAFVE.getProducts().filter(
                                p => p.id !== b.dataset.delete
                            )
                        );

                        render();
                        toast('Produk dihapus.');
                    }
                };
            });
    }

    // ==========================================
    // EDIT PRODUK
    // ==========================================

    async function edit(id) {
        const p = RAFVE.getProducts().find(x => x.id === id);
        if (!p) return;

        form.reset();

        await loadGitHubImages();

        const values = {
            originalId: p.id,
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            price: p.price,
            salePrice: p.salePrice || '',
            gallery: (p.gallery || []).join(', '),
            sizes: (p.sizes || []).join(', '),
            colors: (p.colors || []).join(', '),
            stock: p.stock
        };

        Object.entries(values).forEach(([key, value]) => {
            form.elements[key].value = value ?? '';
        });

        ensureImageOption(p.image);
        preview();

        form.elements.active.checked = !!p.active;
        form.elements.isNew.checked = !!p.isNew;

        $('#form-title').textContent = 'Edit Produk';
        form.elements.id.readOnly = true;

        dialog.showModal();
    }

    // ==========================================
    // TAMBAH PRODUK BARU
    // ==========================================

    async function newProduct() {
        form.reset();

        form.elements.originalId.value = '';
        form.elements.id.readOnly = false;
        form.elements.active.checked = true;

        $('#form-title').textContent = 'Tambah Produk';

        imagePreview.textContent =
            'Preview foto akan tampil di sini';

        dialog.showModal();

        await loadGitHubImages();
    }

    $('#add-new').onclick = newProduct;
    $('#close-dialog').onclick = () => dialog.close();

    $('#admin-search').addEventListener('input', render);
    $('#admin-category').addEventListener('change', render);

    // ==========================================
    // SIMPAN PRODUK
    // ==========================================

    form.addEventListener('submit', e => {
        e.preventDefault();

        const fd = new FormData(form);

        const id = String(fd.get('id') || '').trim();
        const original = String(
            fd.get('originalId') || ''
        );

        const price = Number(fd.get('price'));
        const sale = Number(fd.get('salePrice') || 0);
        const stock = Number(fd.get('stock'));
        const image = String(fd.get('image') || '').trim();

        if (
            !id ||
            !String(fd.get('name') || '').trim() ||
            !String(fd.get('category') || '').trim()
        ) {
            toast('Lengkapi ID, nama, dan kategori.');
            return;
        }

        if (
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isFinite(sale) ||
            sale < 0 ||
            (sale > 0 && sale > price)
        ) {
            toast('Harga tidak valid. Diskon tidak boleh melebihi harga normal.');
            return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            toast('Stok harus bilangan bulat nonnegatif.');
            return;
        }

        if (!image) {
            toast('Pilih foto utama produk terlebih dahulu.');
            return;
        }

        let ps = RAFVE.getProducts();

        if (ps.some(p => p.id === id && p.id !== original)) {
            toast('ID produk sudah digunakan.');
            return;
        }

        const p = {
            id,
            name: String(fd.get('name')).trim(),
            category: String(fd.get('category')).trim(),
            description: String(fd.get('description') || ''),
            price,
            salePrice: sale,
            image,
            gallery: String(fd.get('gallery') || '')
                .split(',').map(x => x.trim()).filter(Boolean),
            sizes: String(fd.get('sizes') || '')
                .split(',').map(x => x.trim()).filter(Boolean),
            colors: String(fd.get('colors') || '')
                .split(',').map(x => x.trim()).filter(Boolean),
            stock,
            active: form.elements.active.checked,
            isNew: form.elements.isNew.checked,
            createdAt: original
                ? (ps.find(x => x.id === original)?.createdAt || Date.now())
                : Date.now()
        };

        if (!p.sizes.length || !p.colors.length) {
            toast('Isi minimal satu ukuran dan satu warna.');
            return;
        }

        if (original) {
            ps = ps.map(x => x.id === original ? p : x);
        } else {
            ps.unshift(p);
        }

        if (RAFVE.saveProducts(ps)) {
            dialog.close();
            render();

            toast(
                original
                    ? 'Perubahan produk disimpan.'
                    : 'Produk baru berhasil disimpan.'
            );
        }
    });

    // ==========================================
    // PENGATURAN TOKO
    // ==========================================

$('#settings-form').addEventListener('submit', async e => {
    e.preventDefault();

    const f = e.currentTarget;
    const button = f.querySelector('button[type="submit"]');
    const oldText = button?.textContent;

    if (button) {
        button.disabled = true;
        button.textContent = 'Menyimpan...';
    }

    try {
        const low = Number(f.elements.lowStock.value);
        const whatsapp = f.elements.whatsapp.value.trim();

        if (!Number.isInteger(low) || low < 0) {
            toast('Batas stok harus bilangan bulat nonnegatif.');
            return;
        }

        if (
            f.elements.whatsappEnabled.checked &&
            !RAFVE.validWhatsApp(whatsapp)
        ) {
            toast('Nomor WhatsApp tidak valid. Gunakan format 62, tanpa tanda + atau spasi.');
            return;
        }

        const settings = {
            storeName: f.elements.storeName.value.trim() || 'RAFVE',
            tagline: f.elements.tagline.value.trim(),
            announcement: f.elements.announcement.value.trim(),
            instagram: f.elements.instagram.value.trim()
                || 'https://www.instagram.com/rafve.id/',
            whatsapp: whatsapp,
            greeting: f.elements.greeting.value.trim(),
            lowStock: low,
            whatsappEnabled: f.elements.whatsappEnabled.checked
        };

        const client = window.rafveSupabase;

        if (!client) {
            throw new Error('Klien Supabase belum tersedia.');
        }

        const { error } = await client
            .from('store_settings')
            .upsert({
                id: 1,
                data: settings,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (error) throw error;

        RAFVE.saveSettings(settings);

        toast('Pengaturan toko berhasil disimpan ke Supabase.');
        render();

    } catch (error) {
        console.error('Gagal menyimpan pengaturan:', error);
        toast('Gagal menyimpan pengaturan. Periksa Console.');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = oldText || 'Simpan Pengaturan';
        }
    }
});

    async function loadSettings() {
    const f = $('#settings-form');
    const client = window.rafveSupabase;

    if (!f || !client) return;

    const { data, error } = await client
        .from('store_settings')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

    if (error) {
        console.error('Gagal memuat pengaturan:', error);
        return;
    }

    const s = {
        ...RAFVE.getSettings(),
        ...(data?.data || {})
    };

    RAFVE.saveSettings(s);

    Object.entries(s).forEach(([key, value]) => {
        const input = f.elements[key];

        if (!input) return;

        if (input.type === 'checkbox') {
            input.checked = Boolean(value);
        } else {
            input.value = value ?? '';
        }
    });
}

    // ==========================================
    // TAB DAN INISIALISASI
    // ==========================================

    document.querySelectorAll('[data-tab]').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('[data-tab]').forEach(x => {
                x.classList.toggle('active', x === b);
            });

            $('#admin-products').classList.toggle(
                'hidden',
                b.dataset.tab !== 'products'
            );

            $('#admin-settings').classList.toggle(
                'hidden',
                b.dataset.tab !== 'settings'
            );
        };
    });

    loadSettings();
    render();
    loadGitHubImages();

    window.addEventListener('rafve:datachange', render);
})();