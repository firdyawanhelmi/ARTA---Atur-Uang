# T2 — Status Keamanan Dependensi Mobile: DEFERRED — OPEN SECURITY FINDINGS

**Tanggal evaluasi**: 14–15 Oktober 2026  
**Status**: **`DEFERRED — OPEN SECURITY FINDINGS`** (Bukan *resolved*, bukan *acceptable*, dan bukan *safe*).  
**Persetujuan Pengguna**: **DISETUJUI FORMAL 15 OKTOBER 2026** — Pengguna secara formal menyetujui penundaan sementara atas 52 node temuan dependency security yang didokumentasikan di bawah ini untuk memungkinkan Gerbang Fase 2 dibuka bersyarat menuju Fase 3. Status audit tetap gagal/terbuka dan tidak dinyatakan bersih.  
**Target implementasi**: `ARTA-BARU/mobile` (Expo SDK 57 dipertahankan).  
**Tindak lanjut permanen**: Dijadwalkan pada **Task T12.3 (Fase 12 / Migrasi Expo SDK 58)**.

---

> [!WARNING]
> ### PERINGATAN PEMISAHAN STATUS & PRINSIP KEAMANAN
> **Keberhasilan build, pengujian unit test (Jest), typechecking (TypeScript), dan linting (ESLint) SAMA SEKALI BUKAN bukti bahwa dependensi telah aman.**
> Status integritas kode dan status keamanan dependensi dievaluasi secara independen:
> - **Status Build & Kualitas Kode**: **LULUS (GREEN)** — 79/79 test lulus, 0 error typecheck, 0 warning lint, format bersih, dan dependensi Expo up-to-date.
> - **Status Security Audit Dependensi**: **TERTUNDA / TEMUAN TERBUKA (DEFERRED — OPEN SECURITY FINDINGS)** — 52 node dependensi terdampak pada 3 akar advisory aktif. Audit gagal secara teknis (exit 1) dan dicatat sebagai utang teknis yang wajib diremediasi.
> 
> Tidak ada temuan yang dihapus, tidak ada status audit yang dimanipulasi menjadi *clean*, dan tidak ada *allowlist* yang digunakan untuk menyatakan kerentanan dapat diterima secara permanen. Seluruh temuan baru yang muncul di luar daftar ini wajib menggagalkan pipeline.

---

## 1. Ringkasan Kondisi Aktual

Hasil eksekusi `npm audit --audit-level=moderate` atas `mobile/package-lock.json` (lockfileVersion 3):
- **Total affected dependency nodes**: **52 nodes** (0 critical, 49 high, 3 moderate).
- **Akar advisory aktif (3 root)**:
  1. `braces:ghsa-vfj7-8cjw-p6xm` (High) — 47 nodes
  2. `decode-uri-component:ghsa-vcc3-ghjq-m6fr` (Moderate) — 3 nodes
  3. `node-forge:ghsa-86w9-cpqp-85rv` (High) — 2 nodes
- **Akar yang telah diremediasi secara nyata (2 root, berkurang 12 nodes dari baseline 64 nodes)**:
  1. `uuid:ghsa-w5hq-g745-h8pq` (Moderate) — **REMEDIATED** via override `xcode: { uuid: "^11.1.1" }` (-7 nodes).
  2. `sprintf-js:ghsa-hp3w-g68c-fv3c` (Moderate) — **REMEDIATED** via override `"js-yaml": "^4.1.0"` (-5 nodes).

---

## 2. Rincian Advisory Aktif yang Ditunda

### RR-1 — `braces:ghsa-vfj7-8cjw-p6xm` (CVE-2024-4068)

- **Identitas**: `GHSA-vfj7-8cjw-p6xm` / CVE-2024-4068.
- **Severity**: **High**.
- **Versi terdampak**: `<=3.0.3` (seluruh versi yang pernah dipublikasikan).
- **Versi terpasang**: `braces@3.0.3`.
- **Jalur dependensi**:
  ```text
  braces@3.0.3
  └── micromatch@4.0.8 (^3.0.3)
      ├── metro-file-map (bundler React Native Metro)
      │   └── @expo/metro -> expo@57.0.29
      └── @jest/core, @jest/transform, jest-config, jest-haste-map, jest-message-util (Jest 29)
  ```
  Total mencakup **47 node dependensi terdampak**.
- **Dampak yang diketahui**:
  *Stack-exhaustion Denial of Service* saat memproses ekspresi kurung kurawal yang bersarang secara mendalam (*deeply nested glob patterns*). Kerentanan berjalan di lingkungan dev/build-time pada toolchain Metro bundler dan runner Jest; tidak masuk ke dalam biner produksi native di perangkat.
- **Kendala perbaikan**:
  **BLOCKED UPSTREAM**. Tidak ada rilis patch `3.0.4` atau `4.x` di registry npm. Rilis terbaru `micromatch@4.0.8` tetap meminta `braces: ^3.0.3`. Mengganti paket ini secara paksa akan merusak file-watching pada Metro dan Jest.
- **Kondisi penyelesaian**:
  Advisory dianggap selesai jika maintainer upstream merilis `braces >=3.0.4` yang diadopsi oleh `micromatch`, atau saat migrasi toolchain bundler/test-runner generasi baru mendarat di Fase 12.

---

### RR-2 — `decode-uri-component:ghsa-vcc3-ghjq-m6fr` (CVE-2026-45822)

- **Identitas**: `GHSA-vcc3-ghjq-m6fr` / CVE-2026-45822.
- **Severity**: **Moderate** (CVSS 6.6).
- **Versi terdampak**: `<=0.4.2`.
- **Versi perbaikan**: `0.5.0`.
- **Versi terpasang**: `decode-uri-component@0.2.2`.
- **Jalur dependensi**:
  ```text
  decode-uri-component@0.2.2
  └── query-string@7.1.3 (^0.2.2)
      └── expo-router@57.0.27 (^7.1.3, direct runtime dependency)
  ```
  Total mencakup **3 node dependensi terdampak**.
- **Dampak yang diketahui**:
  *Denial of Service* akibat konsumsi CPU eksponensial saat mem-parsing string URI yang persentase-enkodingnya malformed (*malformed percent-encoded input*). Fungsi dipanggil saat navigasi internal membaca query string URL. Navigasi ARTA saat ini tidak mengekspos custom URL scheme atau deep-link external di `app.json`.
- **Kendala perbaikan**:
  **BLOCKED DI EXPO SDK 57 OLEH PERBEDAAN ARSITEKTUR COMMONJS VS ESM**.
  1. Rilis patch `decode-uri-component@0.5.0` adalah *pure ES Module* (`"type": "module"`). `query-string@7.1.3` adalah modul CommonJS (`require('decode-uri-component')`). Override langsung memicu `SyntaxError: Unexpected token 'export'` dan `TypeError: decodeComponent is not a function`.
  2. Override `query-string` ke versi `^9.5.1` (yang memakai `0.5.0`) juga merupakan *pure ESM*. `expo-router@57` dikompilasi sebagai CommonJS (`require("query-string")`). Pemanggilan `queryString.parse` dan `queryString.stringify` gagal fatal saat runtime dengan `TypeError: queryString.parse is not a function` karena ekspor fungsi berada di namespace `.default`.
- **Kondisi penyelesaian**:
  Upstream Expo telah menyelesaikan masalah ini pada `expo-router@58.0.19` (Expo SDK 58) dengan **menghapus dependensi `query-string` dan `decode-uri-component` sepenuhnya**. Kondisi penyelesaian adalah eksekusi migrasi ke Expo SDK 58 pada Task T12.3.
- **Mitigasi mengikat selama penundaan**:
  **Dilarang menambahkan custom URL scheme atau deep-link external pada aplikasi ARTA sebelum migrasi ke Expo SDK 58 selesai.**

---

### RR-3 — `node-forge:ghsa-86w9-cpqp-85rv`

- **Identitas**: `GHSA-86w9-cpqp-85rv`.
- **Severity**: **High**.
- **Versi terdampak**: `<=1.4.0` (seluruh versi yang pernah dipublikasikan).
- **Versi terpasang**: `node-forge@1.4.0`.
- **Jalur dependensi**:
  ```text
  node-forge@1.4.0
  └── @expo/code-signing-certificates@0.0.6 (^1.3.3)
      └── @expo/cli@57.0.30 (^0.0.6)
          └── expo@57.0.29
  ```
  Total mencakup **2 node dependensi terdampak**.
- **Dampak yang diketahui**:
  Verifikasi tanda tangan RSA PKCS#1 v1.5 menerima elemen `DigestAlgorithm` bersarang tambahan (*extra nested elements*). Digunakan saat proses build/signing sertifikat manifest Expo CLI/EAS Update di mesin developer/CI, bukan saat runtime aplikasi di perangkat pengguna.
- **Kendala perbaikan**:
  **BLOCKED UPSTREAM**. Versi rilis terbaru di npm adalah `1.4.0` (24 Maret 2026). Belum ada versi `1.4.1` atau rilis patch di npm registry. Versi terbaru `@expo/code-signing-certificates@0.0.7` dan `@expo/cli@58.1.8` pun masih bergantung pada `node-forge: ^1.4.0`. Saran otomatis npm (`expo@44.0.6`) adalah *major downgrade* 13 generasi yang destruktif.
- **Kondisi penyelesaian**:
  Advisory dianggap selesai jika rilis patch `node-forge` diterbitkan oleh maintainer upstream, atau jika Expo CLI mengganti implementasi kriptografi dengan modul standar `node:crypto`.

---

## 3. Matriks Pengelolaan Risiko Berbasis OWASP (A06:2021 – Vulnerable and Outdated Components)

Pencatatan risiko mengacu pada standar OWASP Risk Management Framework: mencatat identitas temuan, severity, bukti empiris, mitigasi pengendali, status risiko, dan rencana tindak lanjut.

| ID Temuan & Komponen | Kategori OWASP & Advisory | Severity | Bukti Empiris & Jalur Dependensi | Mitigasi Pengendali Sementara | Status Risiko | Tindak Lanjut Definitif & Kriteria Tutup |
|---|---|:---:|---|---|:---:|---|
| **RR-1**<br>`braces@3.0.3` | A06:2021<br>GHSA-vfj7-8cjw-p6xm<br>(CVE-2024-4068) | **High**<br>(CVSS 7.5) | 47 nodes terdampak di `package-lock.json`. Terpasang via `micromatch@4.0.8` pada Metro bundler (`metro-file-map`) dan runner test (`@jest/*`). | Input glob dibatasi pada file internal repository; tidak mengekspos ekspresi regex/glob ke input pengguna runtime eksternal. Berjalan hanya di dev/CI. | **DEFERRED — OPEN SECURITY FINDINGS** | Menunggu rilis patch upstream `braces >=3.0.4` yang diadopsi oleh `micromatch`, atau pembaruan bundler/runner generasi baru di Fase 12 (Task T12.3). |
| **RR-2**<br>`decode-uri-component@0.2.2` | A06:2021<br>GHSA-vcc3-ghjq-m6fr<br>(CVE-2026-45822) | **Moderate**<br>(CVSS 6.6) | 3 nodes terdampak di `package-lock.json`. Terpasang via `query-string@7.1.3` pada `expo-router@57.0.27`. | **Mitigasi Operasional Mengikat**: Dilarang mengonfigurasi custom URL scheme atau deep-link external pada aplikasi ARTA sebelum migrasi ke Expo SDK 58. Navigasi in-app dibatasi pada URL internal. | **DEFERRED — OPEN SECURITY FINDINGS** | Diselesaikan secara definitif di **Expo SDK 58 (Task T12.3)**, di mana `expo-router@58` menghapus dependensi `query-string` dan `decode-uri-component` sepenuhnya. |
| **RR-3**<br>`node-forge@1.4.0` | A06:2021<br>GHSA-86w9-cpqp-85rv | **High** | 2 nodes terdampak di `package-lock.json`. Terpasang via `@expo/code-signing-certificates@0.0.6` pada `@expo/cli@57.0.30` $\rightarrow$ `expo@57.0.29`. | Digunakan hanya saat penandatanganan sertifikat manifest EAS/CLI di lingkungan build developer/CI; tidak dieksekusi di runtime native biner pada perangkat pengguna. | **DEFERRED — OPEN SECURITY FINDINGS** | Menunggu rilis patch upstream `node-forge >1.4.0` di npm, atau transisi implementasi Expo CLI ke modul bawaan `node:crypto` pada Task T12.3. |
| **RR-4**<br>`sprintf-js@1.0.3` | A06:2021<br>GHSA-hp3w-g68c-fv3c | **Moderate** | 0 node (sebelumnya 5 nodes via `@istanbuljs/load-nyc-config` $\rightarrow$ `js-yaml@3`). | Remedi permanen diterapkan via package override `"js-yaml": "^4.1.0"` yang menggunakan parser bebas dependensi (`argparse@2`). | **REMEDIATED** | Selesai. Dipantau agar tidak terjadi regresi atau reintroduced dependensi. |
| **RR-5**<br>`uuid@3.4.0` | A06:2021<br>GHSA-w5hq-g745-h8pq | **Moderate** | 0 node (sebelumnya 7 nodes via `xcode@3.0.1`). | Remedi permanen diterapkan via package override `xcode: { "uuid": "^11.1.1" }` yang terbukti kompatibel dengan API xcode. | **REMEDIATED** | Selesai. Dipantau agar tidak terjadi regresi atau reintroduced dependensi. |

**Ringkasan Status Audit Dependensi (15 Okt 2026)**:
- Total Akar Aktif yang Ditunda: **3 akar advisory** (`braces`, `decode-uri-component`, `node-forge`).
- Total Affected Dependency Nodes: **52 nodes** (49 High, 3 Moderate, 0 Critical).
- Status Audit: **DEFERRED — OPEN SECURITY FINDINGS** (Gagal teknis exit 1; open technical debt; TIDAK DIANGGAP BERSIH).
- Persetujuan Penundaan: Disahkan oleh Pengguna pada 15 Oktober 2026. Temuan baru yang muncul di luar 3 akar ini atau eskalasi severity tetap bersifat *fail-closed*.

---

## 4. Kebijakan CI & Alur Eksekusi Sementara

Dalam alur integrasi berkelanjutan (`.github/workflows/ci.yml`), pemisahan diterapkan sebagai berikut:

1. **Job `mobile-quality` (Mandatori & Strict)**:
   - Menjalankan seluruh pengujian kualitas kode: `npm run lint`, `npm run format`, `npm run typecheck`, `npm test -- --runInBand`, dan `npx expo install --check`.
   - **Wajib lulus 100% tanpa toleransi error**. Kegagalan pada lint, format, typecheck, unit test, atau ketidakcocokan dependensi Expo akan seketika menggagalkan pipeline.
2. **Job `mobile-audit` (Eksplisit & Transparan)**:
   - Menjalankan verifikasi audit dependensi: `node scripts/validate-audit.js`.
   - Menghasilkan laporan lengkap seluruh 52 temuan vulnerabilitas tanpa disembunyikan.
   - Melaporkan status eksplisit: `STATUS: DEFERRED — OPEN SECURITY FINDINGS`.
   - Menghasilkan status *exit code 1* (failing) untuk mencatat bahwa audit tidak bersih.
   - Dikonfigurasikan dengan `continue-on-error: true` agar kegagalan audit tercatat secara visual di log CI tanpa memblokir pemeriksaan build dan kualitas kode di job `mobile-quality`.
   - Jika terdeteksi kerentanan baru (*critical* atau di luar 3 akar yang ditunda), script akan memicu `::error::` dan gagal fatal.
