# ARTA-BARU

Target implementasi baru ARTA. Sumber kebenaran: `../ARTA-MASTER-PRD.md` (v2.0-draft,
status: revisi arsitektur untuk review — BELUM disetujui final) dan
`../ARTA-TASK-ROADMAP.md` (v1.0-draft).

## Batas wajib

- `../ARTA-REFERENCE/` = READ-ONLY. Jangan edit, pindah, hapus, rename, format,
  atau install dependency di dalamnya.
- Satu-satunya target tulis adalah folder ini (`ARTA-BARU/`).
- Dilarang Firebase dalam bentuk apapun (Auth, Firestore, Functions, FCM,
  Analytics, Crashlytics, App Check, SDK). Tidak ada workaround FCM diam-diam.
- Arsitektur target (PRD v2.0-draft): React Native + TypeScript + Expo/EAS,
  SQLite lokal (Expo SQLite), Laravel API + MySQL 8+, Queue/Scheduler,
  Reverb/WebSockets (transport saja), APNs langsung untuk iOS, notifikasi
  lokal + in-app untuk Android baseline.

## Status Fase 0 (Task 0)

- T0.1 verifikasi workspace: lihat `docs/T0-verifikasi-workspace.md`.
- T0.2 audit fitur lama: `docs/matriks-paritas-fitur.md` (IN PROGRESS —
  menunggu hasil audit agen latar).
- T0.3 risiko/keputusan: lihat `docs/T0-risiko-keputusan.md`.
- T0.4 baseline: lihat `docs/T0-baseline.md`.

## Menjalankan tes (belum ada kode aplikasi)

Belum ada mobile/backend untuk di-build. Setelah scaffold Fase 2, instruksi
akan ditambah di sini. Prinsip: setiap task wajib mencantumkan perintah +
hasil nyata, bukan klaim.
