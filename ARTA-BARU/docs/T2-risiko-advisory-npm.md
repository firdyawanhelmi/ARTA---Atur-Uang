# T2 — Penerimaan risiko advisory npm (14 Okt 2026, keputusan D-1 DISETUJUI)

Sumber: `npm audit --audit-level=moderate` atas `mobile/package-lock.json`
(lockfileVersion 3) — exit 1, **64 nodes: 0 critical, 49 high, 15 moderate**;
laporan triase 14 Okt 2026; roadmap T2.4; roadmap Fase 12 T12.3.
Disetujui oleh: **pemilik proyek** (keputusan D-1). Pemilik tindak lanjut:
**pelaksana T12.3** (remediasi advisory terjadwal di sana).

> Status penerimaan ini **SEMENTARA**. Dokumen ini bukan penghapusan temuan,
> bukan pernyataan bahwa paket aman, dan bukan bukti CI hijau. Langkah audit
> CI (`npm audit --audit-level=moderate`) tetap gagal sesuai desain sampai
> remediasi mendarat; **T2.4 dan Gerbang Fase 2 tetap BLOCKED**.

## Cara membaca entri

Setiap entri RR-1–RR-5 mencatat: identitas advisory terverifikasi, severity,
jalur dependensi aktual dari lockfile, konteks pemakaian di ARTA,
keterbatasan bukti (fakta vs dugaan dipisahkan), alasan penerimaan sementara,
mitigasi yang berlaku selama penerimaan, pemicu peninjauan ulang, dan kondisi
berakhirnya penerimaan. Klaim eksploitasi terhadap ARTA **tidak dibuat** di
dokumen ini — keberadaan advisory saja bukan bukti keterpaparan.

## RR-1 — `braces` (GHSA-vfj7-8cjw-p6xm, high)

- Jalur: `braces` → `micromatch` → {jest-haste-map, babel-jest, metro,
  metro-config, metro-file-map, `@expo/*`, `@react-native/metro-config`}
  → subtree jest 29 / expo 57 / RN 0.86.
- Konteks: dev/build-time (file-watching jest, pencocokan transform,
  bundling Metro di mesin dev/CI). Tidak masuk biner native/perangkat.
  Kode first-party tidak mengimpor paket ini (terverifikasi grep).
- Keterbatasan bukti: kelas dampak = DoS (stack exhaustion via pola
  nested); pemicu butuh input glob tak-tepercaya di mesin dev — tidak
  didemonstrasikan di ARTA (dugaan keterpaparan: rendah).
- Alasan terima-sementara: trust-boundary lokal, tanpa jalur data produksi;
  perbaikan rilis menuntut migrasi generasi SDK (lihat SDK-58).
- Mitigasi: build/test hanya di mesin dev dan CI tepercaya; hygiene nama
  file standar.
- Pemicu review: eskalasi severity/advisory baru dengan dampak RCE/data.
- Berakhir saat: migrasi SDK 58 mendarat (re-audit penuh) atau pemicu di atas.

## RR-2 — `decode-uri-component` (GHSA-vcc3-ghjq-m6fr / CVE-2026-45822, moderate, CVSS 6.6)

- Jalur: `decode-uri-component@0.2.2` → `query-string@7.1.3`
  (`decode-uri-component: ^0.2.2`) → `expo-router@57.0.26`
  (`query-string: ^7.1.3`, direct runtime dep). Terinstal satu kopi.
- Fakta versi: affected `<=0.4.2`, patched **`0.5.0`** (sumber: halaman
  GHSA resmi). Caret `^0.2.2` **tidak mencakup 0.5.0** → tidak ada versi
  transitive yang kompatibel SDK 57 (terverifikasi lockfile). Satu-satunya
  perbaikan rilis = `expo-router@58.0.18` (garis SDK 58).
- Konteks + tinjauan runtime khusus: `expo-router/.../getStateFromPath.js:499`
  memanggil `queryString.parse(query)` atas URL navigasi masuk (terverifikasi
  di build terinstal). Yang meniadakan permukaan hari ini (terverifikasi):
  tanpa `scheme` di `app.json`, tanpa handler deep-link, tanpa parsing URL di
  layar login/register/home, tanpa impor langsung di kode first-party.
- Keterbatasan bukti (eksplisit): keterjangkauan URL crafted di build
  produksi tidak terbukti-tertutup; eksploitabilitas tidak diklaim. Paket
  ini **tidak dinyatakan aman**.
- Dampak advisory: availability saja (CPU exhaustion); tanpa
  confidentiality/integrity/RCE (sumber: GHSA). EPSS 0,507% (estimasi umum,
  bukan spesifik-ARTA).
- Alasan terima-sementara: moderate + availability-only + tanpa permukaan URL
  kustom + tanpa fix kompatibel (§fakta versi).
- Mitigasi mengikat: **DILARANG menambah URL scheme atau deep-link handler
  tanpa meninjau ulang RR-2.** Saat fitur deep-link di-scope: re-assess +
  sanitasi/validasi parameter.
- Pemicu review: implementasi deep-link (wajib review, bukan auto-accept),
  perubahan severity advisory, pola eksploitasi baru yang relevan.
- Berakhir saat: migrasi SDK 58 mendarat (re-audit penuh).

## RR-3 — `node-forge` (GHSA-86w9-cpqp-85rv, high)

- Jalur: `node-forge` → `@expo/code-signing-certificates` → toolchain expo.
- Konteks: build/signing-time (verifikasi sertifikat code-signing saat
  export/EAS Update, atas manifest Expo) — bukan data pengguna ARTA, bukan
  runtime, bukan perangkat. Kode first-party tidak mengimpor paket ini.
- Keterbatasan bukti: tidak ada demonstrasi keterpaparan di pipeline ARTA.
- Alasan terima-sementara: tanpa jalur data-pengguna; saran otomatis npm
  (`expo@44.0.6`, downgrade 13 major) tercatat anomali dan tidak diikuti —
  `fixAvailable` npm tidak tepercaya untuk tree ber-prerelease.
- Mitigasi: build hanya di mesin tepercaya; tidak ada perubahan penanganan
  secret.
- Pemicu review / berakhir: migrasi SDK 58 (re-audit) atau eskalasi advisory.

## RR-4 — `sprintf-js` (GHSA-hp3w-g68c-fv3c, moderate)

- Jalur: `sprintf-js` → `argparse` → `js-yaml` →
  `@istanbuljs/load-nyc-config` → `babel-plugin-istanbul` → `babel-jest` →
  jest 29.
- Konteks: instrumentasi coverage **saat test saja**; string format dari
  config coverage lokal. Kode first-party tidak mengimpor paket ini.
- Alasan terima-sementara: test-only, trust-boundary lokal; remediasi ikut
  migrasi jest 30 yang terkopling SDK 58.
- Mitigasi: tidak ada sisi kode; jangan bump parsial rantai jest.
- Berakhir saat: migrasi jest major (lihat SDK-58).

## RR-5 — `uuid` (GHSA-w5hq-g745-h8pq, moderate)

- Jalur: `uuid` (<11.1.1) → `xcode` → `@expo/config-plugins`.
- Konteks: prebuild-time (manipulasi proyek iOS `.pbxproj`). Kode aplikasi
  tidak mengimpor paket `uuid` npm (terverifikasi grep; generator UUID v4
  perangkat adalah implementasi sendiri di `mobile/src/auth/device.ts`).
- Keterbatasan bukti: pemicu butuh pemanggil yang mengoper `buf`;
  pemakaian oleh config-plugins tidak ditelusuri (dugaan, bukan fakta).
- Alasan terima-sementara: tanpa impor first-party + konteks prebuild-time.
- Mitigasi: prebuild hanya di mesin tepercaya.
- Berakhir saat: migrasi SDK 58 (re-audit).

## Kandidat task terpisah (dicatat, TIDAK dimulai)

**Migrasi Expo SDK 57 → SDK 58**: bump terkoordinasi (expo, expo-router,
jest-expo, RN 0.87, jest 30, `@types/jest` 30 via `npx expo install`),
rebuild EAS, regresi penuh termasuk perangkat (pola T13.4). Risiko tinggi,
upaya setara proyek migrasi — butuh perencanaan dan persetujuan tersendiri.
Bukan perbaikan otomatis dan bukan bagian dari task ini.

## Keputusan D-1 (final-sementara, disetujui pemilik proyek 14 Okt 2026)

R-A diterima: lima entri di atas + mitigasi mengikat RR-2 + SDK 58 sebagai
kandidat task. Yang TIDAK berubah oleh keputusan ini: dependency, lockfile,
threshold audit, workflow CI, konfigurasi aplikasi (tidak ada yang disentuh);
langkah CI audit tetap merah sesuai desain; klaim hijau dilarang.

## Status terkait (tidak diubah menjadi PASS)

- T2.4: **BLOCKED** — kriteria lengkap di kode pipeline; bukti kurang:
  64 advisory terbuka (dokumen ini) + run CI end-to-end (tanpa repo/remote).
- Gerbang Fase 2: **BLOCKED** — kaki backend (suite 108 hijau, Composer
  audit bersih, Pint bersih) dan kaki mobile (70 jest + lint + typecheck +
  format hijau) terbukti; sisa = remediasi advisory + bukti run CI.
