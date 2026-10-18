# RAFVE — Moslem Fashion Online Store (Prototype)

Prototype katalog fashion dengan HTML5, CSS3, Vanilla JavaScript, localStorage, dan checkout melalui WhatsApp. **Produk/foto yang ditampilkan adalah data demo, bukan katalog resmi RAFVE.** Nomor WhatsApp tidak diisi secara default.

## Menjalankan

1. Ekstrak folder `rafve-store`.
2. Buka folder di VS Code.
3. Jalankan `index.html` dengan ekstensi Live Server atau server lokal lain. Karena tidak menggunakan build step, tidak diperlukan `npm install`.
4. Buka `admin.html` untuk mengelola data demo.

Disarankan menggunakan server lokal, bukan membuka file langsung, agar perilaku browser konsisten.

## Mengelola produk

- Buka `admin.html` → **Tambah produk** untuk membuat produk baru.
- Klik **Edit** pada produk untuk mengganti nama, kategori, harga, harga diskon, URL foto, galeri, ukuran, warna, stok, dan status.
- **Nonaktifkan** untuk menyembunyikan produk dari katalog pelanggan tanpa menghapus data. **Hapus** menghapus produk dari daftar dan item keranjang yang terkait akan ditandai tidak tersedia.
- URL foto harus mengarah ke gambar yang dapat diakses browser. Untuk aset lokal, simpan file dalam `assets/images/` dan isi URL relatif, misalnya `assets/images/nama-foto.jpg`.
- Data awal 20 produk dimuat hanya jika belum ada data produk di localStorage. Perubahan tersimpan pada browser yang sama dan tidak menimpa data setiap reload.

## Mengatur WhatsApp

1. Buka `admin.html` → **Pengaturan Toko**.
2. Masukkan nomor resmi dalam format internasional, misalnya `6281234567890` (contoh format saja, bukan nomor RAFVE).
3. Centang **Aktifkan pemesanan WhatsApp**, lalu simpan.
4. Checkout memvalidasi produk, varian, dan stok terkini; lalu membuka `https://wa.me/` dengan pesan yang di-encode. Pelanggan tetap harus menekan tombol kirim di WhatsApp. Keranjang tidak dikosongkan otomatis.

Nomor kosong atau tidak valid mencegah checkout. Jangan menggunakan contoh nomor sebagai nomor resmi toko.

## File penting

- `assets/js/products.js`: data produk demo awal.
- `assets/js/storage.js`: key localStorage, helper data, format Rupiah, validasi nomor.
- `assets/js/app.js`: header/footer dan kartu produk.
- `assets/js/catalog.js`: pencarian, filter, sorting katalog.
- `assets/js/product-detail.js`: varian, validasi, tambah keranjang.
- `assets/js/cart.js`: keranjang dan checkout WhatsApp.
- `assets/js/admin.js`: dashboard, CRUD produk, stok, pengaturan toko.
- `assets/css/`: gaya utama, responsif, dan admin.

## Fitur yang tersedia

- Homepage, katalog 20 produk contoh, pencarian/filter/sorting, detail produk, pilihan ukuran/warna, keranjang persisten, perhitungan subtotal, checkout WhatsApp, admin CRUD, toggle aktif/nonaktif, pengaturan toko, validasi harga/stok, serta sinkronisasi antartab melalui `storage` event.

## Batasan penting

- Ini prototipe frontend-only. `localStorage` hanya berlaku di browser/perangkat yang sama; perubahan admin tidak disinkronkan ke perangkat pelanggan lain.
- Dashboard tidak memiliki autentikasi. Jangan menganggap URL admin tersembunyi sebagai keamanan.
- Stok demo disimpan sebagai total per produk, bukan stok independen per kombinasi ukuran/warna. Untuk operasional nyata, buat inventori per SKU/varian.
- Data browser tidak tepercaya untuk transaksi produksi. Sistem produksi memerlukan backend/database, autentikasi admin, validasi server-side, dan penyimpanan gambar terkelola.
- Foto dari URL Unsplash digunakan sebagai placeholder editorial. Pastikan izin dan kecocokan foto diperiksa sebelum publikasi; ganti dengan foto resmi RAFVE yang memiliki izin.
- Tidak ada payment gateway, pelacakan order, atau konfirmasi pembayaran otomatis. Admin mengonfirmasi ketersediaan, ongkir, pembayaran, dan pesanan secara manual melalui WhatsApp.
