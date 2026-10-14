# Kontrak API Profil `/me` (DOKUMEN PERENCANAAN — BELUM DIIMPLEMENTASIKAN)

Acuan: PRD §9 + endpoint list PRD, `auth-decisions.md`, kode `AuthController`
(transaksi/audit/guard pola berjalan), skema `users` PRD (kolom `currency`,
`notifications_enabled` — nilai/default di bawah OPEN).
Legenda: **[DISETUJUI]** / **[USULAN]** / **[TERBUKA]**.

## Aturan umum (semua endpoint) [DISETUJUI polanya; angka rinci USULAN]

- Middleware `auth:sanctum` + `ValidateDeviceSession`; kepemilikan = pengguna
  terautentikasi (tanpa id dari path → tanpa permukaan enumerasi/IDOR).
- Respons tak pernah memuat password/hash. Audit tanpa secret.
- Throttle mengikuti tier auth **[USULAN]** (angka pasti menunggu; tiru pola
  resend: akun + IP terpisah).

## `GET /api/v1/me` — baca profil sendiri [USULAN]

- 200 `{id, name, email, email_verified_at, currency?, notification_preference?}`.
- Field bertanda `?` hanya setelah migrasi kolom disetujui (nama kolom ikut
  PRD: `currency`, `notifications_enabled`; nilai/default **[TERBUKA]** —
  PRD hanya menetapkan integer unit terkecil untuk uang dan formatting
  terpusat, tanpa daftar mata uang/bentuk preferensi).
- `GET /api/user` bawaan scaffold BUKAN kontrak ini.

## `PATCH /api/v1/me` — ubah nama ( + currency/notif bila kolom ada) [USULAN]

- Request: `name` (wajib bila dikirim; string max 255). Validasi 422 generik.
- 200 profil terbaru; audit `profile.updated` [USULAN — nama event belum
  disetujui]. Sesi/token tak tersentuh.

## `PATCH /api/v1/me/email` — ganti email

- [DISETUJUI] Wajib password saat ini; alamat baru WAJIB terverifikasi dulu;
  email aktif + `verified_at` tak berubah sebelum itu.
- [DISETUJUI] Setelah perubahan selesai: sesi lain dicabut dan login ulang
  diwajibkan — sesi saat ini ikut berakhir (seragam dengan ganti password),
  mengikuti keputusan yang ditetapkan.
- Desain token-ke-alamat-baru **[USULAN]**: kolom `pending_email` (+ migrasi
  bersama currency/notif); tautan signed mengikat `(id, sha1(pending_email))`
  60 mnt; saat klik: cocokkan ulang → `email=pending`, `verified_at=now`,
  kosongkan pending, revoke sesi, audit `email.change_verified` [USULAN].
  Tanpa kolom pending, pengikatan aman tak dimungkinkan — migrasi prasyarat.

## `PATCH /api/v1/me/password` — ganti password [DISETUJUI]

- Wajib password lama; aturan sama register (min 8, ≠ email, konfirmasi).
- Sukses: revoke SEMUA sesi+token (termasuk saat ini, pola reset-password),
  login ulang dengan password baru; audit tanpa secret.

## Belum diputuskan ([TERBUKA])

Nilai/default currency + bentuk preferensi notifikasi; throttle `/me`;
foto profil (DITUNDA, tanpa kolom/endpoint); `DELETE /me` (tugas terpisah,
retensi 30 hari).
