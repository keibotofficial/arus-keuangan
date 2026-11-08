# Arus — Keuangan dalam kendali

Aplikasi pencatatan uang masuk dan keluar berbahasa Indonesia. Frontend statis, tanpa dependensi eksternal, untuk GitHub Pages. Database pribadi di Google Sheets melalui Google Apps Script.

## Fitur
- Ringkasan saldo hari ini, pemasukan, pengeluaran, selisih, grafik arus kas.
- Tambah/ubah transaksi, tautan bukti, catatan, filter tanggal/jenis/kategori/dompet, pencarian dan paginasi.
- Beberapa dompet/rekening, saldo awal dan transfer yang tidak menggandakan pendapatan.
- Anggaran per kategori per bulan, persentase terpakai dan peringatan batas.
- Pengingat tagihan bulanan, catat dibayar secara manual, pencegahan pencatatan ganda.
- Laporan bulanan, rekonsiliasi saldo, CSV, cetak/PDF dan cadangan JSON.
- Sampah dan pulihkan transaksi, kategori khusus, riwayat perubahan.
- Login kunci akses, sesi maksimum 6 jam, pemeriksaan revisi dan penguncian server.
- Mode contoh terpisah dari data asli, tampilan responsif untuk HP.

## Aktivasi Google Sheets
1. Buka database pribadi, lalu **Ekstensi → Apps Script**.
2. Tempel seluruh `backend/Code.gs` ke editor dan simpan.
3. Jalankan fungsi `setup`, lalu izinkan akses ke spreadsheet milik Anda. Jika project berdiri sendiri, setup membuat database baru; jika terikat ke Sheet, setup memakai Sheet itu.
4. Buka log eksekusi. Simpan **kunci akses pribadi** dan URL database. Jangan unggah kunci ke repository atau kirim ke pihak lain. Setup tidak merotasi kunci yang sudah ada.
5. Pilih **Deploy → New deployment → Web app**. Execute as: **Me**; Who has access: **Anyone**. Kode memeriksa kunci/sesi pada setiap permintaan data; membuka endpoint tidak memberikan akses tanpa kunci.
6. Salin URL deployment berakhiran `/exec`. Masukkan URL dan kunci pada web Arus.

Database tetap pribadi; tidak perlu Publish to web atau Share with anyone. Frontend tidak berisi password, token, ID database, atau catatan keuangan pribadi. URL koneksi disimpan di browser; kunci tidak disimpan; token hanya di sessionStorage. Data asli tidak dicache ke localStorage. Mode contoh memakai localStorage tersendiri.

## Struktur database
`_Journal` adalah sumber data kanonis dengan snapshot per revisi, potongan teks, penanda commit, hash SHA-256, dan ID permintaan. `Transaksi`, `Dompet`, `Kategori`, `Anggaran`, `Tagihan`, `Riwayat` adalah tampilan baca yang disegarkan server. **Jangan mengedit tab jurnal atau tab tampilan untuk mengubah data aplikasi.** Gunakan web. Bila tampilan belum diperbarui, jalankan `refreshViews`.

Saldo hari ini memakai transaksi sampai tanggal saat ini (Asia/Jakarta). Ringkasan bulanan dan saldo akhir laporan mencakup seluruh bulan pilihan, termasuk transaksi bertanggal mendatang. Semua nominal adalah Rupiah bulat. Saldo awal berlaku sebelum transaksi pertama. Saldo negatif diperbolehkan dan ditandai.

Pengingat tagihan tampil ketika aplikasi dibuka; aplikasi tidak mengirim notifikasi dan tidak melakukan pembayaran. Cadangan JSON dapat dipulihkan oleh administrator; impor massal tidak tersedia. Sesi Google dapat kedaluwarsa lebih cepat bila cache dibersihkan. Aplikasi ini untuk catatan kas pribadi dan bukan pembukuan akuntansi berpasangan atau sistem dengan pemisahan akses banyak pengguna.

Jangan membagikan kunci. Siapa pun dengan kunci dapat membaca/mengubah seluruh buku kas. Untuk membatalkan semua sesi, ubah Script Property `SESSION_EPOCH` menjadi string acak baru. Untuk mengganti kunci, pemilik mengatur `ACCESS_HASH` ke SHA-256 kunci acak baru melalui pengelolaan rahasia pribadi. Jangan simpan kunci mentah dalam source code.

Google Apps Script memiliki kuota dan batas runtime. Batas aplikasi: snapshot 3 juta karakter. Jurnal bertambah per simpan; untuk pemakaian panjang, pemilik perlu mengarsipkan database secara berkala dan menguji cadangan. Ekspor rutin dianjurkan.

## GitHub Pages
Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save. Entry point adalah `index.html`. Backend `.gs` bukan dijalankan oleh GitHub Pages; backend harus dideploy di Google.

## Pengembangan
```
python3 build.py
node --test tests/*.test.js
```
`core.js` digunakan bersama frontend dan backend. `build.py` menyisipkannya ke `index.html` dan menghasilkan `backend/Code.gs` dari `backend/server.js`. Setelah perubahan backend, deploy versi baru Google Apps Script.

## Jika koneksi gagal
- Pastikan URL berakhiran `/exec`, deployment terbaru, akses Anyone, dan fungsi setup sudah dijalankan.
- Gunakan kunci yang dihasilkan setup. Sesi habis: masuk ulang.
- Jika penyimpanan timeout, klik Sinkronkan sebelum mencoba lagi. Server memeriksa revisi sehingga data lama tidak menimpa data baru.
- Bila akun Workspace melarang Web App publik, pengaturan administrator perlu disesuaikan atau gunakan akun pribadi. Jangan jadikan Sheet publik sebagai jalan pintas.

Dokumentasi platform: https://developers.google.com/apps-script/guides/web dan https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
