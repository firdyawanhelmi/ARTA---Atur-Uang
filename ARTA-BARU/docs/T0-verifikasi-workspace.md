# T0.1 — Verifikasi workspace (hasil nyata, 13 Okt 2026)

## File acuan ditemukan di root `D:\HELMI\ARTA`

| File | Ada | Ukuran (bytes) | Keterangan |
|---|---|---|---|
| `AGENTS.md` | ya | 11867 | Instruksi agen, tapi MASIH stack lama (React/Vite/PWA) — konflik dengan PRD |
| `ARTA-MASTER-PRD.md` | ya | 74407 | v2.0-draft, native Android/iOS, BELUM disetujui final |
| `ARTA-TASK-ROADMAP.md` | ya | 30699 | v1.0-draft, backlog eksekusi |
| `skills-lock.json` | ya | 9466 | Kunci skill opencode |
| `.agents/skills/` | ya | — | — |
| `.opencode/` | ya | — | package.json + node_modules |

## Ketidaksesuaian penamaan folder (dicatat, tidak diperbaiki dengan memindah referensi)

Ekspektasi dokumen (`AGENTS.md` §1, PRD §3, roadmap aturan 1–2):

```text
./ARTA-LAMA-REFERENCE/   (read-only)
./ARTA-BARU/             (target tulis)
```

Kondisi aktual (`Test-Path`, `Get-ChildItem`):

```text
ARTA-LAMA-REFERENCE  -> TIDAK ADA (False)
ARTA-BARU            -> TIDAK ADA sebelum Task 0 (False), dibuat oleh Task 0 ini
ARTA-REFERENCE       -> ADA (True), isi: .git, .github, backend, frontend, package-lock.json
```

Keputusan: TIDAK memindahkan/rename `ARTA-REFERENCE/` (dilarang mengubah
referensi). `ARTA-REFERENCE/` diperlakukan sebagai `ARTA-LAMA-REFERENCE`
untuk seluruh aturan read-only. `ARTA-BARU/` adalah satu-satunya target tulis.
Pemetaan ini dicatat di sini agar gate Fase 0 tidak menganggap struktur "lulus"
secara buta.

## Status Git (bukti perintah)

- Root `D:\HELMI\ARTA`: BUKAN git repo (`fatal: not a git repository`).
- `ARTA-REFERENCE/`: git repo, branch `main`, remote
  `https://github.com/firdyawanhelmi-collab/https---github.com-firdyawanhelmi-collab-ARTA.git`.
- Log 5 teratas: `ec49da8 Paasang Analytics`, `2db38ad sw.js`,
  `2938541 Save Area`, `82e08cc Navbar dan Save Area`, `4add433 Responsive Form`.
- `git status --porcelain=v1` (working tree kotor, TIDAK disentuh):

```text
 D AGENTS.md
 D AUDIT_UIUX_REPORT.md
 D FIRESTORE_EFFICIENCY_AUDIT.md
 D PERBAIKAN_UIUX_REPORT.md
 D opencode.json
```

Lima file terhapus dari working tree terhadap HEAD, tapi TIDAK dipulihkan
oleh Task 0 karena aturan read-only melarang modifikasi referensi dalam bentuk
apapun (termasuk `git restore`/`checkout`). Dicatat sebagai observasi baseline.

## Struktur referensi (level atas saja, tanpa isi file)

- `ARTA-REFERENCE/frontend/`: css, dist, js, node_modules, public, src,
  templates, test, .gitignore, dev-server.log, index.html, package-lock.json,
  package.json, vite.config.mjs.
- `ARTA-REFERENCE/backend/`: functions, .firebaserc, firebase.json,
  firestore.indexes.json, firestore.rules.
- Detail fitur/backend menunggu audit agen latar (T0.2).

## Batas tulis

Target tulis tunggal: `ARTA-BARU/`. Task 0 ini hanya membuat di `ARTA-BARU/`:

- `.gitignore`, `README.md`, `docs/T0-verifikasi-workspace.md` (file ini),
  `docs/T0-risiko-keputusan.md`, `docs/T0-baseline.md`,
  `docs/matriks-paritas-fitur.md` (skeleton IN PROGRESS).

Tidak ada file di `ARTA-REFERENCE/` yang diubah. Verifikasi: tidak ada perintah
tulis ke `ARTA-REFERENCE/` dijalankan; hanya `Get-ChildItem` dan `git status/log`
(read-only).

## Hasil T0.1 (dimutakhirkan saat penutupan Fase 0, 13 Okt 2026)

Status: **PASS**. Struktur dan batas tulis tercatat; pemetaan folder
aktual (`ARTA-REFERENCE/`) vs kanonis didokumentasikan di AGENTS.md;
working tree referensi (5 file deleted pra-eksisten, terdokumentasi,
tak tersentuh); stack AGENTS.md selaras PRD native; matriks T0.2
LOCKED (25 baris).
