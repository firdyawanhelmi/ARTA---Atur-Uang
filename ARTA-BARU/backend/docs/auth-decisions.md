# Keputusan Autentikasi API ARTA

Status: DISETUJUI pengguna (13 Okt 2026, task T2.2-H).
Sumber primer: `ARTA-MASTER-PRD.md` §7–§9 + kriteria T2.3; file ini TIDAK menggantikan PRD.

> **Pencatatan ini bukan bukti implementasi.** Setiap poin di bawah adalah
> keputusan desain; status implementasi dicatat eksplisit per poin dan
> diverifikasi lewat pengujian pada task implementasi masing-masing.

> **Peta status** (berlaku untuk seluruh dokumen):
> - **Backend TERIMPLEMENTASI** — ada di kode + tercakup pengujian backend.
> - **Mobile BELUM** — belum ada integrasi di aplikasi (tersisa: deep link;
>   UUID perangkat, penyimpanan token, dan layar auth sudah terintegrasi
>   14 Okt 2026, lihat poin 3/5).
> - **Keputusan produk TERBUKA** — belum diputuskan pengguna (retensi audit,
>   `/me`, deep link, B3/B4).
> - **Belum diverifikasi** — perilaku produksi/EAS/pengiriman mail nyata;
>   tidak diklaim dari pengujian lokal.

## 1. Token API: fixed expiry 30 hari

- Token Sanctum berlaku 30 hari sejak diterbitkan (`expires_at`), tidak
  diperpanjang otomatis oleh aktivitas (`last_used_at` hanya telemetri).
- Token kedaluwarsa ditolak di semua endpoint; klien login ulang per perangkat.
- Status implementasi: TERIMPLEMENTASI (login mengisi `expires_at` PAT +
  sesi se-instant; Guard Sanctum + `ValidateDeviceSession` menegakkan per
  request; tanpa perpanjangan; terakhir terlapor 80 passed / 380 assertions
  pada T2.2-AE, bukan pengujian baru task ini).

## 2. Rate limit login: 5 percobaan/menit per email+IP

- Login dibatasi 5 percobaan per menit per kombinasi email dan IP;
  endpoint autentikasi lain lebih ketat dari endpoint umum.
- Respons kegagalan tidak membocorkan keberadaan akun (anti user-enumeration).
- Status implementasi: TERIMPLEMENTASI. Limiter aktif: login 5/mnt per
  email(ternormalisasi)+IP; register 5/mnt per IP; resend/forgot/reset
  3 per 15 mnt per akun + 10/mnt per IP; verify-email 10/mnt per IP.

## 3. Identitas perangkat: UUID v4 persisten per instalasi

- `device_id` digenerasi klien (UUID v4) saat instalasi pertama, disimpan di
  SecureStore, dikirim saat register/login; format dan makna sesuai PRD §8
  (persistent, immutable, unique; identitas sesi terpisah dari perangkat).
- Server menolak `device_id` kosong/berformat salah; satu perangkat boleh
  memiliki banyak sesi.
- Status implementasi: backend TERIMPLEMENTASI (validasi UUID, tabel
  `device_sessions`, daftar/rename/revoke teruji); sisi mobile TERIMPLEMENTASI
  (14 Okt 2026: UUID v4 persisten per instalasi di SecureStore + metadata
  perangkat di `mobile/src/auth/device.ts`, dikirim saat register/login;
  bukti `mobile/__tests__/device.test.ts`, `mobile/__tests__/session.test.ts`).

## 4. Tanpa abilities granular (fase awal)

- Satu token penuh per sesi perangkat; TIDAK ada scopes/abilities.
- Pengganti: Policy + pemeriksaan kepemilikan data di SEMUA endpoint
  (pemilik berasal dari konteks auth; tanpa `$request->all()`; tanpa ekspos
  error internal) sesuai AGENTS.md §16 dan kriteria T2.3.
- Status implementasi: BELUM (menunggu endpoint + Policy pertama).

## 5. Sanctum untuk sesi/token mobile

- Laravel Sanctum disetujui sebagai mekanisme sesi/token; tiap
  device/sesi revocable independen (logout satu + semua perangkat,
  model `sessions` PRD §7.7).
- Token disimpan mobile hanya di SecureStore; PIN/biometrik dilarang.
- Status implementasi: backend TERIMPLEMENTASI (instalasi Sanctum, guard 401 +
  token valid, middleware sesi, endpoint register/login/verify/resend/
  forgot/reset/logout/logout-all/devices; terakhir terlapor 80 passed /
  380 assertions pada T2.2-AE, bukan pengujian baru task ini). Sisi mobile
  TERIMPLEMENTASI (14 Okt 2026: token hanya di SecureStore via
  `mobile/src/auth/tokenStorage.ts` — tanpa AsyncStorage/SQLite/log;
  layar login/register/profil/perangkat di `mobile/app/`; bukti
  `mobile/__tests__/tokenStorage.test.ts`,
  `mobile/__tests__/session.test.ts`). Runtime SecureStore di device
  native tetap butuh pembuktian perangkat (lihat `docs/T1.3-secure-storage.md`).

## 6. Google Login: DITUNDA sampai B3

- Tidak ada endpoint `/auth/google`, tidak ada verifikasi token Google,
  tidak ada linking akun pada fase ini.
- Prasyarat B3: OAuth Client ID/consent + verifikasi ID token sisi server
  (aud/iss/exp) sebelum sesi ARTA diterbitkan.

## Hal yang masih ditunda (eksplisit)

- Device UUID di mobile: TERIMPLEMENTASI (14 Okt 2026,
  `mobile/src/auth/device.ts` + `mobile/__tests__/device.test.ts`).
- Endpoint profil `/me` (GET/PATCH/DELETE): belum tersedia. `GET /api/user`
  bawaan scaffold BUKAN setara kontrak `/me` tanpa perbandingan
  request/response.
- Deep link verifikasi mobile: terbuka (backend mengembalikan JSON, tanpa
  skema hasil karangan).
- Verifikasi email memakai GET signed URL (link-tap membutuhkan GET),
  berbeda dari daftar verb POST pada PRD.
- Kredensial produksi/URL API (B4): belum ada; seluruh pengujian memakai
  database lokal dan token uji sekali pakai.

## 7. Opsi B anti-enumerasi register: DISETUJUI (T2.2-AC)

- Email baru maupun duplikat menerima respons publik byte-identik
  (`201` + satu pesan generik, tanpa objek user): tidak ada data akun
  tersimpan yang di-echo, tidak ada id fabrikasi.
- Duplikat tidak membuat/mengubah akun, token, sesi, atau mail ulang;
  upaya duplikat diaudit sebagai `register.duplicate` tanpa secret.
- Balap unik ditangani hanya untuk pelanggaran `users_email_unique`;
  exception integritas lain tetap dilempar.
