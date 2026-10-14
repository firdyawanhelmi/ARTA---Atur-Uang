# ARTA — TASK ROADMAP
**Versi:** 1.0-draft  
**Status:** Untuk review sebelum eksekusi  
**Tujuan:** Mengubah ARTA dari nol menjadi aplikasi native Android/iOS yang aman, offline-first, teruji, dan siap diajukan ke Google Play Store serta Apple App Store.

> Dokumen ini adalah backlog eksekusi. `ARTA-MASTER-PRD.md` tetap menjadi sumber kebenaran untuk aturan produk dan teknis. Jangan mulai fase implementasi sebelum gerbang fase sebelumnya lulus.

---

## Aturan kerja wajib

1. **Folder baru saja yang boleh diubah:** seluruh kode baru berada di `ARTA-BARU/`.
2. **Referensi lama read-only:** `ARTA-REFERENCE/` aktual (dokumen lama menyebut `ARTA-LAMA-REFERENCE/`) hanya boleh dibaca untuk memahami fitur dan perilaku. Dilarang mengedit, memindah, menghapus, mengganti nama, memformat, memulihkan, atau mengubah dependency/config di dalamnya. Jangan rename folder otomatis; perlu konfirmasi pengguna.
3. **Tidak ada Firebase:** termasuk Firebase Auth, Firestore, Realtime Database, FCM, Cloud Functions, Analytics, Crashlytics, App Check, atau SDK/layanan Firebase lainnya.
4. **Platform:** React Native + TypeScript + Expo/EAS Build; aplikasi mobile native, bukan web/PWA.
5. **Penyimpanan lokal:** SQLite melalui Expo SQLite. Perubahan data lokal dan pembuatan antrean operasi harus atomik.
6. **Server:** Laravel API + MySQL sebagai otoritas data keuangan; queue/scheduler/realtime ditambahkan sesuai kebutuhan PRD.
7. **Tidak ada AI slop:** jangan menambah splash palsu, dekorasi generik, gradient/blur berlebihan, animasi tanpa tujuan, placeholder permanen, atau angka/fitur palsu.
8. **Minimal-diff dan satu fokus:** setiap task punya cakupan jelas; jangan melakukan refactor atau perubahan UI yang tidak diminta.
9. **Jangan mengklaim lulus tanpa bukti:** sertakan perintah yang dijalankan, hasil tes, keterbatasan, dan file yang berubah.
10. **Jangan lanjut jika gerbang gagal:** perbaiki penyebabnya, jalankan ulang tes, baru lanjut.
11. **Rahasia tidak boleh masuk repository:** `.env`, token, private key, credential store, dan file signing harus dikecualikan serta dikelola dengan aman.
12. **Push Android tanpa FCM tidak dijanjikan universal (B1 DECIDED):** baseline yang dijamin = notifikasi lokal dan in-app; UnifiedPush di luar scope awal (keputusan terpisah). iOS APNs langsung tetap harus diuji. WebSocket bukan pengganti push OS.
13. **Logout/pending B5 DECIDED:** beri peringatan + tawarkan sinkronisasi bila ada antrean pending; jangan buang diam-diam; partisi lokal terkunci per akun; akun baru terisolasi; tanpa tombol buang antrean tanpa persetujuan; SQLite tidak otomatis terenkripsi (evaluasi sebelum produksi).

---

## Alur kerja untuk setiap task

Untuk setiap ID task:

1. Baca bagian PRD yang relevan dan `AGENTS.md`.
2. Periksa kondisi repository serta file yang akan disentuh.
3. Nyatakan rencana singkat, risiko, dan file yang diperkirakan berubah.
4. Implementasikan hanya cakupan task tersebut.
5. Jalankan lint, typecheck, unit/integration test, atau build yang relevan.
6. Periksa diff untuk memastikan tidak ada perubahan sampingan, rahasia, Firebase, atau kode dari folder referensi.
7. Laporkan: **Status**, **file berubah**, **tes dan hasil nyata**, **risiko/masalah tersisa**, dan **gerbang berikutnya**.
8. Jika tes gagal, status task tetap **BLOCKED/FAILED**, bukan selesai.

Status yang digunakan: `TODO`, `IN PROGRESS`, `BLOCKED`, `FAILED`, `DONE`, `ACCEPTED`.

---

# Fase 0 — Pengamanan workspace dan audit referensi

### T0.1 — Verifikasi workspace
- [ ] Pastikan `AGENTS.md`, `ARTA-MASTER-PRD.md`, `ARTA-REFERENCE/` aktual (dokumen lama menyebut `ARTA-LAMA-REFERENCE/`), dan `ARTA-BARU/` berada di lokasi yang disepakati.
- [ ] Pastikan `ARTA-BARU/` menjadi satu-satunya target tulis.
- [ ] Catat kondisi awal Git (root belum tentu repo; referensi punya repo sendiri) dan file yang sudah ada.
- [ ] Jangan memindahkan, me-rename, memulihkan, atau mengubah file lama untuk menyesuaikan struktur.

**Lulus jika:** struktur dan batas tulis tercatat; folder referensi lama tidak berubah.

### T0.2 — Audit fitur ARTA lama
- [ ] Inventarisasi semua layar, alur, fitur, validasi, model data, dan perilaku penting dari proyek lama.
- [ ] Petakan setiap fitur ke bagian PRD dan rencana implementasi.
- [ ] Catat bug/utang teknis lama secara terpisah; jangan menyalin bug sebagai requirement.
- [ ] Catat aset yang boleh dijadikan referensi visual, tanpa menyalin dependensi atau arsitektur web.

**Lulus jika:** semua fitur yang wajib dipertahankan punya entri di matriks paritas fitur.

### T0.3 — Audit risiko dan keputusan terbuka
- [ ] B1 (Android push) dan B5 (logout/pending) sudah DECIDED sebagai kebijakan; validasi teknis tetap di fase terkait.
- [ ] B2 (Apple/APNs/perangkat), B3 (Google Sign-In native) sebagai pekerjaan fase teknis; B4 hosting DITUNDA; B6 gerbang rilis.
- [ ] Tandai keputusan yang dapat memblokir desain database/API.
- [ ] Jangan menebak keputusan produk yang belum disetujui.

**Lulus jika:** tidak ada keputusan pemblokir yang disembunyikan sebagai asumsi.

### T0.4 — Baseline dan dokumentasi
- [ ] Buat baseline kondisi workspace, aturan branch/commit, serta cara menjalankan tes.
- [ ] Pastikan `.gitignore` mengecualikan secret, output build, signing files, dan database lokal pengguna.
- [ ] Dokumentasikan larangan Firebase dan aturan read-only secara eksplisit.

**Gerbang Fase 0: PASS (13 Okt 2026)** — struktur aman, matriks fitur lengkap dan LOCKED (25 baris: status, sumber PRD, pekerjaan implementasi, rencana uji; fitur PRD tanpa padanan legacy tetap di scope), konsistensi PRD/AGENTS/roadmap terverifikasi, risiko kritis tercatat (terbuka D2/D3/B4/B2/B3 eksplisit), referensi lama tidak berubah, dan PRD revisi disetujui pengguna (APPROVED 13 Okt 2026). Fase 1 memenuhi prasyarat untuk dimulai.

---

# Fase 1 — Validasi kompatibilitas teknologi (spike)

Fase ini membuktikan pilihan teknologi sebelum aplikasi besar dibangun.

### T1.1 — Validasi toolchain
- [ ] Periksa versi Node.js, package manager, Expo SDK, React Native, TypeScript, Android SDK/JDK, dan EAS.
- [ ] Pilih versi yang kompatibel dan saling didukung; jangan memakai versi terbaru secara membabi buta.
- [ ] Catat versi yang dipilih dan alasan kompatibilitasnya.

### T1.2 — Proof of concept SQLite
- [ ] Buat percobaan terisolasi di `ARTA-BARU/` untuk membuka database SQLite.
- [ ] Buktikan schema migration, transaksi, rollback, constraint, dan query.
- [ ] Simulasikan aplikasi dihentikan saat perubahan sedang diproses.
- [ ] Verifikasi perubahan entitas dan operation queue dapat ditulis atomik dalam transaksi yang sama.

### T1.3 — Validasi keamanan perangkat
- [ ] Buktikan penyimpanan token melalui penyimpanan aman yang kompatibel dengan Expo/native.
- [ ] Pastikan token tidak disimpan di SQLite, AsyncStorage, log, atau file biasa.
- [ ] Periksa perilaku pada Android dan rencana pengujian iOS.

### T1.4 — Validasi native build
- [ ] Buat development build Android.
- [ ] Buktikan aplikasi dapat dipasang dan dijalankan di perangkat/emulator yang didukung.
- [ ] Validasi jalur build iOS/EAS dan kebutuhan Apple account; catat bagian yang membutuhkan perangkat atau akun Apple.
- [ ] Jangan menganggap Expo Go sebagai pengganti final untuk menguji native modules.

### T1.5 — Validasi notifikasi tanpa Firebase
- [ ] Pastikan tidak ada dependency Firebase/FCM dalam jalur build.
- [ ] Buktikan local notification pada Android.
- [ ] Validasi desain APNs langsung untuk iOS dan daftar credential yang dibutuhkan.
- [ ] Catat secara tegas bahwa push server Android tanpa FCM tidak universal; tentukan fitur yang dijamin dan yang opsional.

**Gerbang Fase 1:** spike dapat direproduksi, build dasar berhasil, SQLite dan secure storage terbukti, tidak ada Firebase, serta batasan push diterima secara eksplisit.

---

# Fase 2 — Fondasi proyek dan kualitas kode

### T2.1 — Scaffold aplikasi mobile
- [ ] Inisialisasi React Native + TypeScript + Expo di `ARTA-BARU/`.
- [ ] Konfigurasi navigation, environment config, lint, formatter, typecheck, dan test runner.
- [ ] Pisahkan konfigurasi development, staging, dan production.
- [ ] Jangan membuat produk web/PWA, Vite frontend, Service Worker, IndexedDB, atau Web Push/VAPID.

### T2.2 — Fondasi backend
- [ ] Siapkan Laravel API terpisah sesuai struktur PRD.
- [ ] Konfigurasi MySQL, migration, validation, error handling, API versioning, dan health check.
- [ ] Siapkan queue, scheduler, dan realtime hanya setelah dependensi dan kebutuhan tiap layanan jelas.
- [ ] Semua secret berasal dari environment/secret manager, bukan source code.

### T2.3 — Kontrak API dan tipe data
- [ ] Tetapkan format response/error, pagination, UUID, timezone, dan format nominal.
- [ ] Gunakan integer untuk nominal uang; hindari floating-point.
- [ ] Definisikan DTO/type bersama melalui kontrak terdokumentasi, bukan menyalin kode backend secara sembarang ke frontend.
- [ ] Pastikan endpoint memeriksa autentikasi, otorisasi pemilik data, validasi, dan rate limit.

### T2.4 — CI dan kualitas dasar
- [ ] Tambahkan pipeline untuk lint, typecheck, test, dan pemeriksaan dependency.
- [ ] Tambahkan pemeriksaan rahasia dan pemindaian dependency yang relevan.
- [ ] Buat template issue/bug dan format laporan agent.
- [ ] Pastikan build gagal jika pemeriksaan wajib gagal.

**Gerbang Fase 2:** aplikasi mobile dan API punya fondasi yang bisa dibangun, diuji, dan dikonfigurasi tanpa secret tertanam.

---

# Fase 3 — Autentikasi, sesi, dan perangkat

### T3.1 — Model akun dan autentikasi server
- [ ] Buat skema user, session/token, perangkat, verifikasi email, reset password, dan security audit.
- [ ] Implementasikan email/password dan rate limiting.
- [ ] Implementasikan verifikasi email dan reset password dengan token sekali pakai yang kedaluwarsa.
- [ ] Pastikan reset password mencabut sesi sesuai aturan PRD.

### T3.2 — Autentikasi aplikasi native
- [ ] Buat layar login, daftar bila masuk scope, verifikasi email, lupa password, dan reset password.
- [ ] Simpan token hanya pada secure storage.
- [ ] Tangani token kedaluwarsa, offline, server error, dan retry tanpa membocorkan kredensial.
- [ ] Integrasikan Google Sign-In native hanya setelah validasi konfigurasi provider dan kebijakan linking.

### T3.3 — Perangkat dan sesi
- [ ] Daftarkan perangkat secara aman dan idempoten.
- [ ] Buat daftar perangkat, rename, logout perangkat saat ini, dan logout semua perangkat.
- [ ] Pastikan pencabutan token di server benar-benar menghentikan akses.
- [ ] Tentukan serta implementasikan kebijakan data SQLite saat logout/pergantian akun; data satu pengguna tidak boleh terlihat oleh pengguna lain.

### T3.4 — Uji keamanan autentikasi
- [ ] Uji login gagal, rate limit, token invalid/expired/revoked, dan reset password.
- [ ] Uji logout offline lalu sinkronisasi status logout saat koneksi kembali.
- [ ] Uji isolasi dua akun pada satu perangkat.

**Gerbang Fase 3:** autentikasi dan manajemen sesi lulus tes positif, negatif, revocation, dan isolasi akun.

---

# Fase 4 — Database server dan domain keuangan

### T4.1 — Skema dan migrasi database
- [ ] Buat migration untuk users, devices, sessions, accounts, categories, transactions, budgets, targets, debts, receivables, operations, conflicts, change feed, notifications, imports, dan tabel terkait PRD.
- [ ] Tambahkan foreign key, unique constraints, index, soft delete/tombstone yang tepat, serta timestamp/revision yang konsisten.
- [ ] Review skema sebelum membuat endpoint massal.
- [ ] Uji migration dari database kosong dan jalur upgrade.

### T4.2 — Aturan akun dan transaksi
- [ ] Implementasikan akun tunai, bank, e-wallet, tabungan, atau tipe lain yang tercantum di PRD.
- [ ] Implementasikan pemasukan, pengeluaran, dan transfer dengan validasi sisi server.
- [ ] Transfer harus atomik: debit dan kredit tidak boleh terpisah.
- [ ] Terapkan aturan saldo negatif untuk akun normal dan pengecualian hanya jika dinyatakan eksplisit oleh PRD.
- [ ] Transfer tidak dihitung sebagai pemasukan/pengeluaran cashflow.

### T4.3 — Domain kategori, anggaran, dan target
- [ ] Implementasikan kategori beserta aturan bawaan/kustom.
- [ ] Implementasikan periode anggaran dan perhitungan pemakaian.
- [ ] Implementasikan target dan sumber akun, termasuk validasi transfer ke target dan peringatan saldo.
- [ ] Pastikan perhitungan memakai integer dan aturan pembulatan eksplisit.

### T4.4 — Utang dan piutang
- [ ] Implementasikan pencatatan utang/piutang.
- [ ] Implementasikan pembayaran/penerimaan sebagian dan riwayatnya.
- [ ] Implementasikan tanggal jatuh tempo, status terlambat, lunas, dan perubahan status.
- [ ] Pastikan pembayaran tercermin dengan benar pada saldo dan cashflow sesuai aturan PRD.

### T4.5 — Atomicity dan keamanan finansial
- [ ] Gunakan database transaction dan locking yang sesuai untuk operasi yang memengaruhi saldo.
- [ ] Cegah duplicate submit dan replay operasi.
- [ ] Validasi kepemilikan setiap resource.
- [ ] Uji dua permintaan bersamaan, retry setelah timeout, dan rollback saat salah satu langkah gagal.

**Gerbang Fase 4:** aturan domain lulus unit/integration tests; tidak ada transfer parsial, saldo korup, atau akses lintas pengguna.

---

# Fase 5 — Fondasi UI native dan sistem visual

### T5.1 — Design system ARTA
- [ ] Terapkan gaya MONOCHROME / Pro Max: permukaan hitam/abu/putih solid.
- [ ] Terapkan aksen semantik: pemasukan hijau, pengeluaran/utang merah, piutang biru, lunas hijau, chart grayscale.
- [ ] Tetapkan typography, spacing, radius, elevation, ikon, komponen form, dan state.
- [ ] Hindari gradient, blur berat, sparkle/Gemini branding, ikon emoji struktural, splash palsu, dan dekorasi generik.

### T5.2 — Navigation dan layout
- [ ] Implementasikan navigasi utama native dan layar sesuai PRD.
- [ ] Terapkan safe area, status bar, keyboard avoidance, modal, bottom sheet, dan back navigation.
- [ ] Cegah background scroll saat form/modal terbuka.
- [ ] Uji layout pada ukuran layar kecil, besar, orientasi yang didukung, dan skala teks.

### T5.3 — Komponen dasar
- [ ] Buat input nominal, date picker native yang konsisten, selector akun/kategori, period picker, confirmation dialog, loading/empty/error state.
- [ ] Jangan memakai native select HTML atau komponen web.
- [ ] Pastikan validasi form bisa dibaca screen reader dan tidak mengandalkan warna saja.

**Gerbang Fase 5:** sistem visual dan komponen dasar disetujui melalui review UI; tidak ada perilaku navigasi/layout yang menghalangi fitur inti.

---

# Fase 6 — SQLite dan offline-first

### T6.1 — Skema lokal dan migrasi
- [ ] Buat schema SQLite lokal dengan versioning/migration.
- [ ] Pisahkan data akun pengguna, metadata sync, cache, antrean operasi, dan tombstone.
- [ ] Tambahkan indeks dan constraint yang diperlukan.
- [ ] Uji database baru dan upgrade dari setiap schema version yang didukung.

### T6.2 — Repository lokal
- [ ] Implementasikan repository lokal untuk akun, kategori, transaksi, anggaran, target, utang, dan piutang.
- [ ] Semua pembacaan UI berasal dari sumber lokal yang konsisten agar layar tidak kosong saat offline.
- [ ] Perubahan entitas dan pembuatan operation queue dilakukan dalam satu transaksi SQLite.
- [ ] Terapkan UUID stabil dan urutan operasi/dependency yang eksplisit.

### T6.3 — Offline CRUD
- [ ] Buat dan edit data yang diizinkan saat offline.
- [ ] Hapus secara aman melalui tombstone, bukan menghapus metadata sync yang diperlukan.
- [ ] Tampilkan status lokal/pending/synced/conflict/failed.
- [ ] Pastikan restart aplikasi tidak kehilangan data atau antrean.

### T6.4 — Proteksi dan pemulihan lokal
- [ ] Tangani database locked, disk penuh, migration gagal, dan operasi terputus.
- [ ] Buat prosedur pemulihan yang tidak menghapus data secara diam-diam.
- [ ] Uji force-close pada saat penulisan dan saat antrean dibuat.
- [ ] Pastikan cache dan database terisolasi per akun.

**Gerbang Fase 6:** operasi keuangan lokal bertahan setelah restart/force-close dan antrean tidak pernah terpisah dari perubahan data terkait.

---

# Fase 7 — Sinkronisasi server dan resolusi konflik

### T7.1 — Kontrak operasi sinkronisasi
- [ ] Tetapkan operation ID yang stabil, idempotency key, base version, entity version, dependency, dan payload.
- [ ] Server menyimpan hasil operasi agar retry mengembalikan hasil yang sama.
- [ ] Server memvalidasi ulang dampak keuangan; jangan mempercayai saldo hasil hitung client.
- [ ] Jangan menggunakan last-write-wins atau timestamp perangkat sebagai otoritas.

### T7.2 — Push antrean lokal
- [ ] Kirim antrean sesuai dependency dan urutan yang diperlukan.
- [ ] Tangani timeout, retry dengan backoff, offline kembali, token expired, dan respons duplikat.
- [ ] Tandai operasi selesai hanya setelah konfirmasi server yang sah.
- [ ] Operasi yang ditolak harus mempertahankan detail dan menawarkan penyelesaian yang aman.

### T7.3 — Pull change feed
- [ ] Implementasikan cursor/revision yang stabil.
- [ ] Terapkan snapshot/change feed tanpa menimpa perubahan lokal yang belum tersinkron.
- [ ] Terapkan tombstone dan retensi agar data terhapus tidak muncul kembali.
- [ ] Tangani cursor kedaluwarsa melalui prosedur resync yang aman.

### T7.4 — Konflik dan rekonsiliasi
- [ ] Deteksi base version mismatch dan konflik domain.
- [ ] Tampilkan informasi cukup agar pengguna memahami perubahan yang bertabrakan.
- [ ] Sediakan pilihan resolusi sesuai jenis data; jangan menggabungkan nominal keuangan secara otomatis jika berisiko.
- [ ] Audit saldo, transfer berpasangan, dan relasi setelah konflik diselesaikan.

### T7.5 — Uji kondisi gagal
- [ ] Tes retry operasi yang sama berkali-kali.
- [ ] Tes perangkat A/B mengedit entitas yang sama.
- [ ] Tes hapus di satu perangkat dan edit di perangkat lain.
- [ ] Tes jam perangkat meleset, force-close, koneksi putus di tengah request, dan respons server terlambat.
- [ ] Tes perubahan akun A tidak pernah muncul pada akun B.

**Gerbang Fase 7:** data akhirnya konsisten lintas perangkat; retry tidak membuat duplikat; konflik dan tombstone tidak menyebabkan data hilang atau hidup kembali.

---

# Fase 8 — Realtime saat aplikasi aktif

### T8.1 — Transport realtime
- [ ] Implementasikan koneksi realtime sesuai PRD (misalnya Laravel Reverb) hanya jika dibutuhkan dan sudah tervalidasi.
- [ ] Otorisasi channel berdasarkan user dan perangkat.
- [ ] Pesan realtime hanya memicu refresh/sync; bukan sumber kebenaran finansial.
- [ ] Terapkan reconnect, backoff, dan pemulihan setelah jaringan berubah.

### T8.2 — Sinkronisasi aktif
- [ ] Saat menerima event, tarik data otoritatif melalui API/change feed.
- [ ] Rekonsiliasi juga ketika aplikasi kembali foreground atau jaringan pulih.
- [ ] Pastikan event duplikat/out-of-order tidak merusak state lokal.
- [ ] Jangan mengandalkan koneksi persisten ketika OS menangguhkan aplikasi.

**Gerbang Fase 8:** realtime mempercepat pembaruan saat aplikasi aktif, sementara polling/pull recovery tetap menjamin pemulihan data.

---

# Fase 9 — Notifikasi

### T9.1 — Mesin aturan notifikasi
- [ ] Implementasikan aturan pengingat utang, piutang/target, anggaran, dan daily reminder sesuai PRD.
- [ ] Gunakan timezone perangkat dan fallback UTC sesuai aturan.
- [ ] Terapkan deduplikasi, batas retry, idempotensi, serta pencegahan spam overdue.
- [ ] Pastikan aktivitas di satu perangkat dapat menekan reminder lintas perangkat sesuai kebijakan PRD.

### T9.2 — Riwayat dan preferensi
- [ ] Implementasikan in-app notification history, read/unread, urutan terbaru, retensi 30 hari, dan penghapusan sesuai PRD.
- [ ] Implementasikan preferensi global dan per perangkat.
- [ ] Sinkronkan preferensi dan status riwayat dengan aman.

### T9.3 — Notifikasi lokal
- [ ] Jadwalkan reminder lokal hanya berdasarkan data yang sudah tersedia dan disinkronkan.
- [ ] Perbarui/cancel jadwal ketika data berubah.
- [ ] Tangani izin ditolak, timezone berubah, reboot, dan jadwal yang terlewat.
- [ ] Jangan mengklaim notifikasi lokal bisa mengetahui peristiwa server baru saat aplikasi ditutup.

### T9.4 — APNs untuk iOS
- [ ] Konfigurasikan token/perangkat dan credential APNs langsung dari backend tanpa Firebase.
- [ ] Jangan menaruh private key APNs di aplikasi.
- [ ] Tangani token invalid, retry, dan status delivery.
- [ ] Uji build distribusi dan perangkat iOS nyata/TestFlight.

### T9.5 — Android tanpa FCM
- [ ] Implementasikan notifikasi lokal dan in-app sebagai kemampuan dasar.
- [ ] Dokumentasikan bahwa push server Android saat aplikasi ditutup tidak dijamin universal.
- [ ] Jangan menambahkan FCM/Expo Push secara tidak sengaja.
- [ ] Jika UnifiedPush dipertimbangkan, buat task keputusan terpisah dengan batasan distributor dan opt-in yang jelas.

**Gerbang Fase 9:** semua aturan notifikasi diuji; APNs iOS terverifikasi bila credential/perangkat tersedia; batasan Android ditampilkan jujur; Firebase tidak ada.

---

# Fase 10 — Impor, ekspor, dan data portabel

### T10.1 — Ekspor
- [ ] Ekspor data milik pengguna saja ke format CSV, JSON, dan XLSX sesuai PRD.
- [ ] Sertakan data/relasi yang dibutuhkan agar ekspor dapat dipahami dan diaudit.
- [ ] Hindari kebocoran token, secret, data pengguna lain, atau metadata internal sensitif.

### T10.2 — Impor dan preview
- [ ] Validasi format, ukuran file, kolom, tipe, tanggal, nominal, dan referensi akun/kategori.
- [ ] Tampilkan preview dan kesalahan sebelum komit.
- [ ] Terapkan duplicate detection dan `import_id` idempoten.
- [ ] Default all-or-nothing; jangan mengimpor sebagian tanpa persetujuan eksplisit yang ditentukan PRD.

### T10.3 — Impor saat offline
- [ ] Tentukan dengan jelas data yang dapat diimpor offline dan cara antreannya disinkronkan.
- [ ] Hindari membuat operasi ganda saat retry.
- [ ] Uji file invalid, file besar, duplicate, kegagalan tengah proses, dan rollback.

**Gerbang Fase 10:** ekspor hanya memuat data pengguna yang benar; impor validasi dan rollback bekerja; retry tidak menggandakan data.

---

# Fase 11 — Paritas fitur dan penyempurnaan native

### T11.1 — Dashboard dan navigasi fitur
- [ ] Implementasikan dashboard dan ringkasan saldo/cashflow dari data lokal yang konsisten.
- [ ] Implementasikan analitik, filter periode, dan kalender.
- [ ] Pastikan transfer tidak dihitung sebagai cashflow.
- [ ] Pastikan ringkasan tetap berguna saat offline dan menandai data pending bila perlu.

### T11.2 — Fitur finansial lengkap
- [ ] Hubungkan UI ke domain/repository untuk seluruh fitur akun, transaksi, kategori, anggaran, target, utang, dan piutang.
- [ ] Implementasikan edit, hapus, Trash, restore, serta aturan retensi.
- [ ] Implementasikan tutorial dan pengaturan sesuai PRD.
- [ ] Pastikan tidak ada tombol palsu, menu tanpa aksi, placeholder, atau data demo di production.

### T11.3 — Polish native
- [ ] Periksa keyboard, safe area, gesture/back, modal, bottom sheet, status bar, loading, empty/error, dan rotasi bila didukung.
- [ ] Pastikan tidak ada scroll jump atau background scroll ketika form terbuka.
- [ ] Uji font scaling, TalkBack, VoiceOver, dan kontras.
- [ ] Periksa icon, splash, nama aplikasi, app identifier, permission, dan metadata store.

### T11.4 — Paritas dan regresi
- [ ] Bandingkan matriks fitur hasil Fase 0 dengan implementasi baru.
- [ ] Tandai setiap fitur sebagai `PASS`, `FAIL`, `BLOCKED`, atau `OUT OF SCOPE` dengan alasan.
- [ ] Perbaiki perbedaan fungsional yang tidak disetujui.
- [ ] Jangan mengejar paritas dengan menyalin arsitektur web lama.

**Gerbang Fase 11:** seluruh fitur wajib mempunyai bukti tes dan hasil paritas; semua perbedaan yang tersisa disetujui secara eksplisit.

---

# Fase 12 — Hardening keamanan

### T12.1 — API dan otorisasi
- [ ] Uji IDOR/akses lintas user pada semua endpoint.
- [ ] Uji validasi input, mass assignment, rate limit, replay, dan session revocation.
- [ ] Pastikan seluruh operasi finansial server-side divalidasi dan atomik.
- [ ] Tinjau CORS/HTTP security sesuai kebutuhan API native, TLS, logging, dan error response.

### T12.2 — Aplikasi dan data lokal
- [ ] Pastikan token/kunci tidak ada dalam log, crash report, screenshot sensitif bila proteksi sesuai platform tersedia, atau file biasa.
- [ ] Uji isolasi database antar akun dan perilaku logout.
- [ ] Tinjau clipboard, share/export, deep link, permission, dan data sensitif di notifikasi.
- [ ] Pastikan tidak ada secret di repository atau build artifact publik.

### T12.3 — Dependency dan supply chain
- [ ] Audit dependency langsung/transitif, lisensi, advisories, dan package yang tidak terpakai.
- [ ] Pastikan tidak ada SDK Firebase/FCM dan tidak ada request jaringan ke layanan Firebase.
- [ ] Hapus dependency hanya jika aman dan dalam cakupan task.
- [ ] Simpan hasil pemeriksaan sebagai bukti rilis.

### T12.4 — Akun dan penghapusan data
- [ ] Uji alur hapus akun dengan autentikasi ulang dan ketik `HAPUS AKUN` sesuai PRD.
- [ ] Verifikasi retensi 30 hari dari timestamp konfirmasi: login diblokir, data disembunyi, reminder berhenti selama retensi.
- [ ] Uji purge idempoten (retry/eksekusi berulang, kegagalan sementara, keterlambatan scheduler) tanpa reaktivasi; transaksi terkait ikut purge.
- [ ] Verifikasi data server dihapus sesuai kebijakan dan tindakan dicatat; backup diperlakukan eksplisit (periode/mekanisme lanjutan belum diputus).
- [ ] Verifikasi cache lokal dan kredensial tidak tertinggal setelah penghapusan/logout sesuai aturan.
- [ ] Uji backup/restore dan prosedur insiden.

**Gerbang Fase 12:** tidak ada temuan kritis/tinggi yang belum ditangani; batasan yang tersisa terdokumentasi dan disetujui.

---

# Fase 13 — Pengujian menyeluruh dan regresi

### T13.1 — Unit dan integration tests
- [ ] Jalankan seluruh unit test domain, repository, sync, notifikasi, dan validasi.
- [ ] Uji endpoint, database transaction, queue, scheduler, dan otorisasi.
- [ ] Uji migration dari database kosong dan upgrade.
- [ ] Pastikan hasil tes dapat direproduksi dari instruksi repository.

### T13.2 — Skenario offline/sync
- [ ] Offline penuh saat membuka aplikasi dan melakukan perubahan.
- [ ] Aplikasi force-close/reboot sebelum dan sesudah enqueue.
- [ ] Jaringan berpindah Wi-Fi/data, lambat, putus-sambung, dan timeout.
- [ ] Dua perangkat mengedit, menghapus, atau mentransfer pada waktu bersamaan.
- [ ] Ulangi request yang sama untuk memastikan idempotensi.
- [ ] Verifikasi saldo dan cashflow sebelum/sesudah rekonsiliasi.

### T13.3 — End-to-end test
- [ ] Jalankan alur onboarding/login → buat akun → transaksi → anggaran/target → utang/piutang → ekspor.
- [ ] Jalankan alur logout, login kembali, reset password, dan logout semua perangkat.
- [ ] Jalankan alur notifikasi, pengaturan izin, dan status offline.
- [ ] Jalankan alur hapus akun dan verifikasi hasilnya.

### T13.4 — Perangkat nyata
- [ ] Uji beberapa ukuran/versi Android yang ditargetkan.
- [ ] Uji iOS pada perangkat nyata atau TestFlight sebelum mengklaim dukungan iOS tervalidasi.
- [ ] Uji izin ditolak, keyboard terbuka, font besar, background/foreground, dan aplikasi dihentikan OS.
- [ ] Catat versi OS, model/perangkat uji, build, langkah reproduksi, dan hasil.

### T13.5 — Performance dan accessibility
- [ ] Ukur startup, navigasi, daftar transaksi besar, penggunaan memori, dan query SQLite.
- [ ] Periksa rendering ulang dan pekerjaan sinkronisasi yang memblokir UI.
- [ ] Audit screen reader, label, fokus, kontras, dan ukuran target sentuh.
- [ ] Perbaiki crash, ANR, deadlock, query lambat, dan bug regresi yang teridentifikasi.

**Gerbang Fase 13:** suite wajib lulus; tidak ada bug blocker/kritis/tinggi terbuka; hasil Android dan iOS dibedakan dengan jujur berdasarkan bukti pengujian.

---

# Fase 14 — Produksi dan publikasi store

### T14.1 — Infrastruktur produksi
- [ ] Siapkan domain/API HTTPS, MySQL produksi, queue worker, scheduler, realtime jika digunakan, log, monitoring, dan backup.
- [ ] Uji restore backup, bukan hanya keberhasilan membuat backup; uji rekonsiliasi status penghapusan pasca-restore (tanpa reaktivasi) serta inventarisasi snapshot/replika/ekspor dalam cakupan kebijakan.
- [ ] Verifikasi kemampuan retensi backup 30 hari (D1) pada penyedia terpilih sebelum produksi; D2/D3 tetap OPEN sampai terbukti.
- [ ] Siapkan rate limit, alert, rotasi secret, prosedur rollback, dan rencana insiden.
- [ ] Pisahkan environment staging dan production.

### T14.2 — Build dan signing
- [ ] Tetapkan package/bundle identifier final, versi, build number, ikon, splash, permission, dan metadata.
- [ ] Simpan signing credential secara aman dan batasi akses.
- [ ] Buat Android release build dan iOS archive melalui pipeline yang tervalidasi.
- [ ] Uji instalasi/upgrade dari build sebelumnya dan migrasi SQLite.

### T14.3 — Beta dan release candidate
- [ ] Distribusikan Android melalui internal/closed testing.
- [ ] Distribusikan iOS melalui TestFlight.
- [ ] Kumpulkan crash/bug feedback tanpa mengirim data finansial sensitif.
- [ ] Uji ulang alur login, offline, sync, konflik, notifikasi, ekspor, dan penghapusan akun pada release candidate.

### T14.4 — Kesiapan store
- [ ] Siapkan listing, screenshot asli, deskripsi, kategori usia, privacy policy, support contact, dan deklarasi data.
- [ ] Tinjau kebijakan Play Store/App Store yang berlaku saat pengajuan.
- [ ] Pastikan proses penghapusan akun dan permintaan penghapusan data sesuai persyaratan store.
- [ ] Jangan membuat klaim privasi atau fitur yang belum dibuktikan.

### T14.5 — Rilis bertahap dan pascarilis
- [ ] Ajukan build ke review store; catat status dan alasan penolakan bila ada.
- [ ] Lakukan rollout bertahap bila tersedia.
- [ ] Pantau crash, error API, antrean gagal, sync lag, dan notifikasi gagal.
- [ ] Siapkan prosedur hotfix, rollback backend yang kompatibel, dan rencana update.
- [ ] Arsipkan build, commit/tag, changelog, bukti tes, serta konfigurasi rilis tanpa secret.

**Gerbang Fase 14:** aplikasi diterima dan tersedia di store yang ditargetkan, atau status review/publikasi dinyatakan secara akurat; monitoring, backup, support, dan prosedur hotfix siap.

---

# Daftar blocker lintas fase

Keputusan vs pekerjaan tersisa (13 Okt 2026):

- [x] **B1 — Android push tanpa FCM: DECIDED (kebijakan).** Baseline dijamin = local + in-app; tanpa janji server push saat ditutup; UnifiedPush out of scope awal. Implementasi/validasi tetap di fase notifikasi.
- [ ] **B2 — iOS validation (pekerjaan fase teknis/rilis):** siapkan Apple Developer account, signing, APNs credentials, perangkat/TestFlight, dan penguji. Tanpa bukti = belum selesai; tanpa kredensial dilarang membuat config palsu.
- [ ] **B3 — Google Sign-In native (pekerjaan fase autentikasi):** validasi konfigurasi OAuth Android/iOS dan aturan linking akun.
- [ ] **B4 — Backend hosting: DITUNDA.** Provider belum dipilih; VPS tidak wajib; domain saja tidak cukup. Harus penuhi HTTPS, Laravel, MySQL, queue, scheduler, secrets, backup, monitoring, realtime bila dipakai. Jangan pilih atas nama pengguna; validasi di fase deployment.
- [x] **B5 — Data lokal saat logout: DECIDED (kebijakan).** Logout cabut sesi + hapus kredensial, tanpa hapus data server; peringatkan + tawarkan sync bila pending; jangan buang diam-diam; partisi terkunci per akun; isolasi antar-akun; query/sync scoped akun; tanpa tombol buang antrean tanpa persetujuan; hapus akun alur terpisah; evaluasi enkripsi SQLite sebelum produksi. Implementasi/pengujian tetap di fase terkait.
- [ ] **B6 — Store compliance (gerbang rilis):** periksa kebijakan terbaru saat mendekati publikasi; jangan menganggap lolos hanya dari build lokal.

---

# Definition of Done untuk setiap task

Sebuah task hanya boleh berstatus `DONE` jika:
- [ ] Hasil sesuai PRD dan batas cakupan task.
- [ ] Tidak ada perubahan ke `ARTA-REFERENCE/` (aktual; dokumen lama menyebut `ARTA-LAMA-REFERENCE/`).
- [ ] Tidak ada Firebase/FCM atau dependensi terlarang yang ditambahkan.
- [ ] Lint, typecheck, test, atau build yang relevan lulus.
- [ ] Diff diperiksa; tidak ada perubahan tak terkait atau secret.
- [ ] Perilaku error, loading, offline, dan retry yang relevan ditangani.
- [ ] Laporan mencantumkan bukti tes dan risiko tersisa.
- [ ] Gerbang fase yang relevan lulus sebelum fase berikutnya dimulai.

# Format laporan agent

Untuk setiap task, laporkan dengan format:

- **Task ID / Status:**
- **Ringkasan perubahan:**
- **File yang berubah:**
- **Tes yang dijalankan:**
- **Hasil aktual:** (sertakan output penting; jangan mengarang)
- **Pemeriksaan Firebase/legacy/secret:**
- **Risiko atau blocker tersisa:**
- **Keputusan yang dibutuhkan:**
- **Gerbang berikutnya:** `PASS` atau `BLOCKED`

# Aturan keputusan akhir

Roadmap ini bukan izin untuk menjalankan semua task sekaligus. Kerjakan **satu task atau satu kelompok task kecil yang saling terkait**, review hasilnya, lalu lanjutkan. Fase 1 dan seterusnya TETAP TERKUNCI sampai PRD revisi disetujui pengguna dan seluruh syarat gate Fase 0 terpenuhi. Jika keputusan arsitektur berubah, hentikan task yang terdampak dan perbarui PRD/backlog terlebih dahulu.
