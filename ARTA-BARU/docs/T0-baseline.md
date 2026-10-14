# T0.4 — Baseline & dokumentasi (13 Okt 2026)

## Baseline workspace

- Root `D:\HELMI\ARTA` bukan git repo. Tidak ada branch/commit root untuk dicatat.
- `ARTA-REFERENCE/` git repo `main`, remote origin GitHub (lihat T0.1), working
  tree dirty 5 file deleted — dibiarkan apa adanya (read-only).
- `ARTA-BARU/` dibuat oleh Task 0 ini, isi: `.gitignore`, `README.md`, `docs/`.
- Aturan branch/commit untuk `ARTA-BARU/` kelak (belum ada repo): fokus kecil,
  satu task satu commit, tanpa campur UI/logika/dependency; pesan
  `<task-id>: <ringkasan>`; jangan commit secret/build artifact (lihat `.gitignore`).
- Cara menjalankan tes: belum ada suite di `ARTA-BARU/`. Referensi lama pakai
  `node --test` (backend functions) dan `node test/*.js` (frontend) — itu milik
  referensi, tidak dijalankan/diubah oleh Task 0 agar tidak menyentuh legacy.

## Larangan Firebase & aturan read-only (eksplisit)

1. `ARTA-REFERENCE/` hanya dibaca: inspeksi HTML/CSS/JS, aset, struktur halaman,
   navigasi, form, bottom sheet, tutorial, perilaku responsif, copy. Dilarang
   edit/hapus/rename/pindah/format/install dependency/ubah config di dalamnya.
2. `ARTA-BARU/` tidak boleh import/alias/symlink/dependensi runtime ke
   `ARTA-REFERENCE/`. Harus build/test/run jika `ARTA-REFERENCE/` dihapus total.
3. Firebase dilarang total di baru: Auth, Firestore, Realtime DB, Functions, FCM,
   Analytics, Crashlytics, App Check, SDK. Backend referensi (`firebase-admin`,
   `firebase-functions`, `fcm_tokens`, `sendEachForMulticast`, hosting `dist`,
   emulator, scheduler GHA) adalah pola terlarang — hanya aturan bisnisnya yang
   boleh jadi referensi perilaku (lihat matriks paritas).
4. Stack baru yang sah = PRD v2.0-draft (native), bukan AGENTS.md lama:
   RN + TS + Expo/EAS, Expo SQLite, SecureStore, Laravel + MySQL, Reverb
   (transport saja), APNs langsung iOS, lokal + in-app Android baseline.
   AGENTS.md wajib direvisi sebelum Fase 1.

## `.gitignore` (dibuat Task 0)

Mengecualikan `.env`, key/p8/p12/keystore/jks/mobileprovision/pem,
`node_modules`, build (`dist/build/.expo/apk/aab/ipa`), `backend/vendor`,
`*.sqlite/*.db`, log/tmp, coverage, `docs/audit-tmp/`. Verifikasi isi dengan
membaca `../.gitignore` langsung.

## Status T0.4

DONE untuk lingkup Task 0 (baseline tercatat, `.gitignore` ada, aturan
eksplisit). Gate Fase 0 keseluruhan tetap menunggu T0.2 lengkap + keputusan T0.3.
