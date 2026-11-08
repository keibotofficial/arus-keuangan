# Arus — Keuangan pribadi

Web: https://keibotofficial.github.io/arus-keuangan/

Aplikasi mobile dan desktop untuk pemasukan, pengeluaran, transfer antar dompet, anggaran, tagihan, laporan, ekspor CSV/PDF, cadangan JSON, sampah dan pemulihan transaksi.

## Akun versi 2.0

- Pengguna pertama: pilih Daftar akun, atur username dan PIN 6 angka, lalu konfirmasi PIN.
- Pengguna lain: daftar username berbeda untuk catatan keuangan terpisah.
- Perangkat baru milik pengguna yang sama: pilih Masuk dan gunakan username serta PIN yang sama.
- Username 3–24 karakter: huruf, angka, titik, garis bawah, atau tanda hubung. Username tidak membedakan huruf besar/kecil.
- PIN disimpan sebagai HMAC dengan salt di Script Properties; PIN tidak disimpan di browser atau Google Sheet.
- Setelah 5 kali PIN salah, akun dikunci 15 menit. Sesi berlaku hingga 6 jam, dapat berakhir lebih cepat. Ubah PIN melalui Pengaturan; perubahan mengakhiri sesi perangkat lain.
- Pemilik data lama yang masih memiliki sesi aktif diminta membuat username/PIN untuk mengikat catatan lama. Pengguna baru tidak dapat mengklaim data lama.

## Database dan pengembangan

Google Sheets menyimpan data dengan Account ID. Backend Apps Script menentukan akun dari sesi, bukan dari Account ID kiriman klien. Journal snapshot ber-checksum menjadi sumber data utama; tab lain merupakan proyeksi yang dapat dibuat ulang. Spreadsheet harus tetap privat untuk pemilik; akun aplikasi tidak memberi akses langsung ke Sheet.

`backend/server.js` memuat API. `core.js` memuat perhitungan bersama. Jalankan `python build.py` setelah perubahan untuk menyematkan core ke `index.html` dan menghasilkan `backend/Code.gs`. Salin Code.gs ke proyek Apps Script yang sudah terhubung lalu perbarui deployment yang sama. GitHub Pages menyajikan index.html.

Pengujian: `node --test tests/*.test.js` (24 pengujian). Mencakup perhitungan, transfer, sampah, CSV, konflik, idempotensi, pemisahan akun, login lintas perangkat, PIN, migrasi pemilik, serta journal multiakun.

Jika sesi pemilik lama sudah berakhir sebelum username dibuat, administrator proyek dapat menjalankan `createOwnerActivation()` di Apps Script untuk tautan aktivasi pemilik sekali pakai yang berlaku 30 menit. Jangan bagikan atau publikasikan tautan tersebut. Pemilik mengisi sendiri username dan PIN. Tidak tersedia reset PIN otomatis; administrator perlu menangani pemulihan akun secara privat.

APK Android di proyek AI Studio membuka URL web yang sama; pembaruan web otomatis digunakan oleh aplikasi saat dimuat ulang. Proyek: https://aistudio.google.com/apps/1892f449-725a-4950-b9be-f86aa5081e21
