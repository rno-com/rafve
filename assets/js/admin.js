(function () {
    const $ = s => document.querySelector(s);
    const dialog = $('#product-dialog'), form = $('#product-form');
    const imageInput = $('#product-image-file'), imageHidden = $('#product-image');
    const imagePreview = $('#image-preview');
    let toastTimer;
    function toast(msg) {
        const t = $('#toast'); if (!t) return;
        t.textContent = msg; t.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
    }

function preview(sources) {
    if (!imagePreview) return;

    imagePreview.replaceChildren();

    if (!sources || sources.length === 0) {
        imagePreview.textContent = 'Preview foto akan tampil di sini';
        return;
    }

    sources.forEach((src, index) => {
        if (!src) return;

        const item = document.createElement('div');
        item.className = 'image-preview-item';

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Foto produk ${index + 1}`;

        item.appendChild(img);

        if (index === 0) {
            const label = document.createElement('div');
            label.className = 'main-photo-label';
            label.textContent = 'Foto utama';
            item.appendChild(label);
        }

        imagePreview.appendChild(item);
    });
}

imageInput?.addEventListener('change', () => {
    const files = Array.from(imageInput.files || []);

    if (files.length > 10) {
        imageInput.value = '';
        preview([]);
        toast('Maksimal 10 foto untuk satu produk.');
        return;
    }

    const invalidFile = files.find(file =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
    );

    if (invalidFile) {
        imageInput.value = '';
        preview([]);
        toast('Gunakan JPG, PNG, atau WebP maksimal 5 MB per foto.');
        return;
    }

    imageHidden.value = '';
    preview(files.map(file => URL.createObjectURL(file)));
});

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
                b.onclick = async () => {
                    const products = RAFVE.getProducts();
                    const p = products.find(
                        x => x.id === b.dataset.toggle
                    );

                    if (!p) return;

                    p.active = !p.active;
                    try {
                        await RAFVE.upsertProductToSupabase(p);
                        render(); toast('Status produk diperbarui.');
                    } catch (error) { console.error(error); toast('Gagal menyimpan status ke Supabase.'); }
                };
            });

        $('#admin-table')
            .querySelectorAll('[data-delete]')
            .forEach(b => {
                b.onclick = async () => {
                    if (confirm(
                        'Hapus produk ini? Item di keranjang pelanggan ' +
                        'akan ditandai tidak tersedia.'
                    )) {
                        try {
                            await RAFVE.deleteProductFromSupabase(b.dataset.delete);
                            render(); toast('Produk dihapus dari Supabase.');
                        } catch (error) { console.error(error); toast('Gagal menghapus produk dari Supabase.'); }
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

        const values = {
            originalId: p.id,
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            price: p.price,
            salePrice: p.salePrice || '',
            sizes: (p.sizes || []).join(', '),
            colors: (p.colors || []).join(', '),
            stock: p.stock
        };

        Object.entries(values).forEach(([key, value]) => {
            form.elements[key].value = value ?? '';
        });

        imageHidden.value = p.image || '';
        if (imageInput) imageInput.value = '';
        preview([
            p.image,
            ...(p.gallery || [])
        ].filter(Boolean));

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

        imageHidden.value = '';
        if (imageInput) imageInput.value = '';
        preview([]);

        dialog.showModal();
    }

    $('#add-new').onclick = newProduct;
    $('#close-dialog').onclick = () => dialog.close();

    $('#admin-search').addEventListener('input', render);
    $('#admin-category').addEventListener('change', render);

    // ==========================================
    // SIMPAN PRODUK
    // ==========================================

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const oldText = button?.textContent;
        if (button) { button.disabled = true; button.textContent = 'Menyimpan...'; }
        try {
            const fd = new FormData(form), id = String(fd.get('id') || '').trim();
            const original = String(fd.get('originalId') || '');
            const price = Number(fd.get('price')), sale = Number(fd.get('salePrice') || 0);
            const stock = Number(fd.get('stock'));
            const imageFiles = Array.from(imageInput?.files || []);
            const oldProduct = RAFVE.getProducts().find(p => p.id === original);
            let image = oldProduct?.image || imageHidden.value.trim() || '';
            let gallery = oldProduct?.gallery || [];
            if (!id || !String(fd.get('name') || '').trim() || !String(fd.get('category') || '').trim()) {
                toast('Lengkapi ID, nama, dan kategori.'); return;
            }
            if (!Number.isFinite(price) || price < 0 || !Number.isFinite(sale) || sale < 0 || (sale > 0 && sale > price)) {
                toast('Harga tidak valid.'); return;
            }
            if (!Number.isInteger(stock) || stock < 0) { toast('Stok harus bilangan bulat nonnegatif.'); return; }
            if (imageFiles.length === 0 && !image) {
                toast('Pilih minimal satu foto produk.');
                return;
            }
            const current = RAFVE.getProducts();
            if (current.some(p => p.id === id && p.id !== original)) { toast('ID produk sudah digunakan.'); return; }
            if (imageFiles.length > 0) {
                const uploadedImages = await Promise.all(
                    imageFiles.map((file, index) =>
                        RAFVE.uploadProductImage(file, `${id}-${Date.now()}-${index}`)
                    )
                );

                image = uploadedImages[0];
                gallery = uploadedImages.slice(1);
            }
            const product = {
                id, name: String(fd.get('name')).trim(), category: String(fd.get('category')).trim(),
                description: String(fd.get('description') || ''), price, salePrice: sale, image,
                gallery,
                sizes: String(fd.get('sizes') || '').split(',').map(x=>x.trim()).filter(Boolean),
                colors: String(fd.get('colors') || '').split(',').map(x=>x.trim()).filter(Boolean),
                stock, active: form.elements.active.checked, isNew: form.elements.isNew.checked,
                createdAt: oldProduct?.createdAt || Date.now()
            };
            if (!product.sizes.length || !product.colors.length) { toast('Isi minimal satu ukuran dan satu warna.'); return; }
            await RAFVE.upsertProductToSupabase(product);
            dialog.close(); render(); toast('Produk berhasil disimpan ke Supabase.');
        } catch (error) {
            console.error('Gagal menyimpan produk:', error);
            toast(`Gagal menyimpan: ${error.message || 'periksa izin Supabase'}`);
        } finally {
            if (button) { button.disabled = false; button.textContent = oldText || 'Simpan Produk'; }
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

    (async () => {
        try {
            await RAFVE.loadProductsFromSupabase();
        } catch (error) {
            console.error('Gagal memuat produk dari Supabase:', error);
            toast('Produk gagal dimuat dari Supabase. Periksa izin tabel.');
        }
        await loadSettings();
        render();
    })();

    window.addEventListener('rafve:datachange', render);
})();