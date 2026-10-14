# Kontrak API v1 & Tipe Data (T2.3)

Cakupan: pola respons/error, pagination, UUID, timezone, nominal, DTO, dan
matriks auth endpoint yang sudah ada. Acuan: PRD §43–44/§48/§62, keputusan
`auth-decisions.md`, kode aktual. **Dokumen ini mendokumentasikan kontrak
yang berjalan; tidak me-refactor respons** (minimal-diff T2.3).

## 1. Respons & error (tercatat apa adanya)

- Sukses: bentuk per endpoint (201 register generik, 201 login
  `{user,token,token_type,expires_at}`, 200 pesan aksi, 200 `{data}` daftar,
  202 diterima-async-semantik). Tidak ada envelope global — perubahan
  envelope butuh keputusan terpisah (akan merusak 80+ assertion).
- Error: 401/403/404 generik `{message}`; 422 `{message, errors{field[]}}`;
  429 throttle bawaan; 500 generik via renderer JSON `api/*`.
- Aturan endpoint baru: ikuti bentuk di atas; tanpa jejak SQL/trace/path;
  tanpa secret; pesan anti-enumerasi di permukaan auth.

## 2. Pagination (PRD §48)

Server-side; cursor/keyset bila tepat; filter server-side; tanpa riwayat
tak terbatas. Daftar kini (`GET devices`) full-list DIIZINKAN: himpunan
sesi per user kecil-terbatas. Daftar finansial masa depan WAJIB paginasi.

## 3. UUID (PRD §43: UUID v7 untuk entitas utama)

- Berlaku ke depan: users, devices, accounts, categories, transactions,
  budgets, targets, debts, receivables, notifications, push subscriptions,
  operations, conflicts — UUID v7, tanpa regenerasi saat restore.
- Deviasi tercatat: `device_id` = UUID v4 dari klien (keputusan T2.2-H).
- **GAP TERISI (T2.2-UUID)**: `users.id` kini UUID v7 (migrasi
  `convert_users_id_to_uuid_v7`; FK `device_sessions`, morph Sanctum, dan
  kolom audit ikut terkonversi; tabel `sessions` framework tak tersentuh).
  Route `{id}` verifikasi memakai `whereUuid`; bentuk JSON `id` berupa string.

## 4. Timezone & waktu

- Server: UTC (`config/app.php:68`); semua datetime API ISO-8601 UTC.
- Perangkat mengirim zona waktu terbaru saat reconnect (mobile, belum ada);
  invalid/hilang → UTC. Server absolut untuk jendela 24 jam.

## 5. Nominal uang (PRD: integer unit terkecil, tanpa float)

Belum ada tabel/endpoint finansial → aturan dicatat untuk implementasi:
kolom `unsignedBigInteger`, cast integer, tanpa operasi float di PHP maupun
mobile; format tampilan terpusat di klien.

## 6. DTO endpoint berjalan (ringkas)

- register: `{name,email,password}` → `201 {message}` (+`device_id?`).
- login: `{email,password,device_id,device_name?,platform?,app_version?}` →
  `201 {user{id,name,email},token,token_type,expires_at}`.
- verify/resend/forgot/reset/logout/devices/me: pesan generik / bentuk
  minimal yang sudah teruji; detail per endpoint di test masing-masing.
- Ownership: selalu dari konteks auth; tanpa id lintas-user di input.

## 7. Matriks auth (teraudit)

Semua endpoint terlindungi memakai `auth:sanctum` + `ValidateDeviceSession`;
publik memakai throttle bernama (login/register/resend/forgot/reset/verify);
validasi via Form Request; anti-enumerasi generik; transaksi pada
mutasi token+sesi. Rincian per endpoint: lihat test Feature terkait.

## 8. Terbuka

PK UUID users; envelope global; daftar nilai currency/notif; throttle `/me`
final; deep-link; Google (B3); produksi/B4; retensi audit.
