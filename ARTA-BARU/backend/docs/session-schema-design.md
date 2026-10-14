# Rancangan Skema Sesi Perangkat & Audit Keamanan (DESAIN — BELUM DIIMPLEMENTASIKAN)

Status dokumen: USULAN per task T2.2-J. Keputusan yang sudah disetujui
pengguna ditandai [DISETUJUI]; selain itu ditandai [USULAN] dan BUKAN
keputusan final. Acuan: `ARTA-MASTER-PRD.md` §7–§9, skema `sessions` +
`security_audit_logs` PRD, `backend/docs/auth-decisions.md`, audit T2.2-I.

## 1. Diagram relasi

```text
users  1 ─── N  sessions  N ─── 1  personal_access_tokens (Sanctum)
                  │                        (baris token DIHAPUS saat revoke;
                  │                         sessions bertahan sebagai arsip)
                  N ─── 1  users (revoked_by, nullable; NULL = mandiri/kedaluwarsa)

security_audit_logs ──► users (nullable; NULL = upaya anonim/gagal)
security_audit_logs ──► sessions (nullable; NULL = peristiwa pra-sesi)
```

`sessions.device_id` adalah kolom UUID biasa (terindeks), mengikuti pola PRD
(`device_notification_tokens.device_id`, `imports.device_id`): PRD tidak
mendefinisikan tabel registri `devices` terpusat — diverifikasi lewat skema
PRD, bukan asumsi.

## 2. Rancangan kolom

### `sessions` [USULAN kecuali kolom yang sama dengan skema PRD]

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| `id` | bigint PK | NO | — |
| `user_id` | bigint FK → `users.id` ON DELETE CASCADE | NO | kepemilikan; hapus user hapus sesi |
| `device_id` | char(36), indeks | NO | UUID v4 dari klien; validasi format saat login |
| `sanctum_token_id` | bigint NULL, UNIQUE, FK → `personal_access_tokens.id` ON DELETE **SET NULL** | YES | 1:1 ke token; SET NULL agar arsip sesi selamat saat baris token dihapus |
| `last_used_at` | timestamp | YES | telemetri; disalin dari update Guard Sanctum, BUKAN dasar expiry |
| `expires_at` | timestamp, indeks | NO | fixed 30 hari sejak penerbitan [DISETUJUI] |
| `revoked_at` | timestamp, indeks | YES | NULL = aktif; penanda pencabutan eksplisit |
| `revoked_by_session_id` | bigint NULL → `sessions.id` | YES | sesi yang mencabut (logout-all); NULL = mandiri/kedaluwarsa [USULAN] |
| `created_at`/`updated_at` | timestamps | NO | — |

Tanpa kolom IP/UA di baris sesi: data itu sudah hidup di peristiwa audit
per kejadian (lihat §4) — menghindari duplikasi tanpa kebutuhan yang
didukung PRD. Nama tampilan perangkat (rename, PRD §8): lokasi penyimpanan
TIDAK ditentukan PRD → [TERBUKA], diusulkan ditunda sampai task daftar
perangkat (opsi: kolom label di `sessions` vs tabel `devices` masa depan).

### `security_audit_logs` — pakai skema PRD apa adanya (bukan usulan)

`id, user_id(nullable untuk upaya anonim), device_id(nullable),
event_type, metadata(JSON), ip_address, user_agent, created_at`
(tanpa `updated_at`). Larangan isi: password, plaintext token, APP_KEY,
secret apa pun; rujuk token cukup dengan id token.

## 3. Aturan lifecycle sesi dan token

1. Penerbitan (login/register): `createToken(label, ['*'], now()+30 hari)` +
   baris `sessions` (`revoked_at` NULL) dalam SATU transaksi DB.
2. Setiap request: berlaku iff `revoked_at IS NULL` AND baris PAT masih ada
   AND `expires_at` masa depan. Guard Sanctum sudah menegakkan dua syarat
   terakhir per request (terverifikasi di kode vendor, audit T2.2-I);
   syarat pertama ditegakkan di lapisan aplikasi (middleware/cek pasca-auth)
   [USULAN implementasi].
3. Logout satu perangkat: dalam SATU transaksi → `sessions.revoked_at=now()`
   + DELETE baris PAT; sesi perangkat lain tak tersentuh (uniqueness per
   token, bukan per device — banyak sesi per device diizinkan).
4. Logout semua perangkat: untuk tiap sesi aktif milik user → aturan (3) +
   `revoked_by_session_id` menunjuk sesi pemicu + cabut kredensial
   notifikasi perangkat (PRD §8).
5. Kedaluwarsa: tanpa aksi hapus proaktif; baris kedaluwarsa ditolak saat
   baca (fail-closed). Pembersihan fisik MENUNGGU mekanisme expiry D2/B4 —
   jangan hapus otomatis sebelum kapabilitas provider dievaluasi.
6. `sanctum.expiration` global TETAP `null`; satu-satunya sumber expiry
   adalah `expires_at` per token (menghindari override ganda bawaan Sanctum).

## 4. Peristiwa audit keamanan [kebutuhan PRD; ambang retensi TERBUKA]

Wajib catat (dipetakan dari PRD §7–§9 + pencabutan): register, login
(sukses+gagal), logout, logout-all, token revoked (per perangkat),
password reset + pencabutan sesi lain, verifikasi email, konfirmasi
penghapusan akun. Data minimum per peristiwa: `user_id?`, `device_id?`,
`sessions.id?`, id token (bukan secret), IP/UA, hasil. Retensi log audit
BELUM ditentukan PRD (mekanisme erasure D2 terbuka sampai B4) → [TERBUKA]:
jangan klaim penghapusan otomatis; selaraskan dengan siklus akun nanti.

## 5. Keputusan yang masih perlu persetujuan

1. Skema `sessions` di atas (termasuk `revoked_by_session_id` dan FK SET NULL).
2. Penyimpanan nama tampilan perangkat (tunda vs kolom label kini).
3. Retensi `security_audit_logs` (menunggu D2/B4).
4. Lapisan penegakan `revoked_at` per request (middleware vs cek di controller
   auth) — perilaku sama, penempatan perlu diputuskan.
5. Strategi DB pengujian (`arta_test` khusus vs override MySQL `arta_local`;
   `phpunit.xml` kini memaksa sqlite tanpa driver — fakta, bukan usulan).

## 6. Urutan implementasi dan pengujian berikutnya (belum dijalankan)

1. Migrasi `sessions` + `security_audit_logs` persis §2 → `migrate:status`.
2. Register/login menulis keduanya + `expires_at = +30 hari` (tanpa abilities
   kustom) → test: token punya expiry; respons tak bocorkan akun.
3. Logout satu/all + uji: token tercabut → 401; sesi lain tetap 200;
   `revoked_at` terisi; baris PAT hilang; audit tercatat.
4. Throttle login 5/mnt per email+IP + uji batas.
5. Uji kedaluwarsa (token lewat masa → 401) SEBELUM endpoint bisnis apa pun.
