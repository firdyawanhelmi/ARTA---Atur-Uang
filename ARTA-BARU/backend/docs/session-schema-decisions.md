# Keputusan Final Skema Sesi (T2.2-K)

Acuan: `ARTA-MASTER-PRD.md` (§7–§9, skema `sessions` + `security_audit_logs`),
`backend/docs/auth-decisions.md`, `backend/docs/session-schema-design.md`
(dokumen usulan T2.2-J — tidak diubah oleh dokumen ini).

Legenda: **[DISETUJUI]** = sudah disetujui pengguna sebelumnya.
**[USULAN]** = rekomendasi agent, BUKAN final sampai disetujui.
**[TERBUKA]** = belum dapat diputuskan; dilarang mengarang isinya.

## 0. Nama tabel: `device_sessions` [DISETUJUI — T2.2-M opsi A]

Nama `sessions` pada skema PRD bertabrakan dengan tabel framework
`sessions` bawaan Laravel (driver `SESSION_DRIVER=database`), yang
dipertahankan tanpa perubahan. Tabel sesi perangkat ARTA memakai nama
`device_sessions`; seluruh rancangan di bawah merujuk ke nama tersebut.
PRD utama tidak diubah sepihak atas penyesuaian ini.

## 1. Relasi sesi–token

- `sanctum_token_id` UNIQUE + FK `ON DELETE SET NULL` → **[USULAN]** (dipertahankan
  dari rancangan T2.2-J). Alasan: 1:1 sesi↔token; arsip sesi selamat saat
  baris token dihapus; tidak ada ketentuan PRD yang bertentangan.
- `revoked_by_session_id` → **[USULAN: TIDAK DIPAKAI]**. PRD tidak
  mendefinisikannya; ketertelusuran "dicabut oleh sesi X" cukup lewat
  `metadata` peristiwa `logout-all` di audit log. Menghindari self-FK dan
  kompleksitas hapus-bertingkat tanpa kebutuhan yang didukung PRD.
- Token dihapus lebih dahulu daripada sesi: sesi menjadi arsip pasif
  (`sanctum_token_id` NULL + `revoked_at` terisi); aturan baca fail-closed
  menolaknya karena baris PAT tidak ada. Tidak ada orphan aktif yang mungkin.

## 2. Nama perangkat

- Nama tampilan DISIMPAN pada baris sesi (`device_name` nullable +
  `platform`/`app_version` nullable) → **[USULAN]**. Dasar: PRD §8
  mewajibkan fitur rename + daftar (nama/platform/versi/last-active),
  tetapi TIDAK menentukan tabelnya; kolom pada sesi memenuhi fitur tanpa
  menciptakan tabel registri baru yang tak didukung PRD.
- `device_id` UUID instalasi tetap satu-satunya identitas teknis;
  nama tampilan tidak pernah dipakai untuk otorisasi.
- Rename = perbarui semua baris aktif dengan `(user_id, device_id)` yang
  sama (divergensi antar-baris didokumentasikan sebagai batas yang diterima).
- IP/user-agent TIDAK disimpan permanen pada sesi (hanya di peristiwa
  audit sesuai skema PRD) → **[USULAN]** selaras batas privasi tugas.

## 3. Retensi audit → **[TERBUKA]**

PRD tidak menetapkan durasi retensi `security_audit_logs`; mekanisme
expiry/erasure (D2) terbuka sampai evaluasi hosting (B4). Dilarang mengarang
angka. Sementara: tidak ada penghapusan otomatis; penentuan retensi
diselaraskan dengan siklus akun + kapabilitas provider saat B4.

## 4. Penegakan status sesi → **[USULAN]**

Satu middleware khusus pada grup API terautentikasi, berjalan SETELAH
`auth:sanctum`: menolak request bila `sessions.revoked_at` terisi atau
baris PAT tidak ada. Satu titik cek ⇒ konsisten di semua endpoint +
dapat diuji. Pemeriksaan per-controller DITOLAK (tidak konsisten).
Middleware TIDAK dibuat pada tahap ini.

## 5. Database pengujian → **[USULAN: `arta_test` MySQL khusus]**

| Aspek | SQLite `:memory:` (phpunit.xml kini) | MySQL `arta_test` khusus |
|---|---|---|
| Isolasi | sempurna (in-memory) | transaksional per test + DB terpisah |
| Risiko destruktif | nol | rendah (DB khusus, tanpa DDL di test) |
| Konfigurasi | perlu driver `php-sqlite3` (sengaja TIDAK dipasang, T2.2-C#5) | perlu buat DB + alihkan config |
| CI | sederhana | butuh service MySQL |
| Kesetiaan engine | RENDAH (dialek ≠ produksi) | TINGGI (sama dengan produksi) |

Fakta: `phpunit.xml:26-27` memaksa sqlite tanpa driver (gagal untuk test
ber-DB); override env MySQL `arta_local` terbukti jalan. Rekomendasi:
`arta_test` karena kesetiaan engine lebih penting untuk pengujian finansial;
tanpa memasang driver, membuat DB, atau mengubah `phpunit.xml` sekarang —
itu tugas implementasi dengan persetujuan.
