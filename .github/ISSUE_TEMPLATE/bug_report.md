---
name: Laporan bug
about: Laporkan bug ARTA (mobile atau backend) dengan bukti yang dapat direproduksi
title: "[BUG] "
labels: bug
assignees: ""
---

## Ringkasan

<!-- Satu-dua kalimat: apa yang rusak dan di mana (mobile/backend). -->

## Langkah reproduksi

1.
2.
3.

## Hasil yang diharapkan

<!-- Perilaku yang benar menurut PRD. -->

## Hasil aktual

<!-- Apa yang terjadi, termasuk pesan error dan HTTP status bila API. -->

## Lingkungan

- Mobile: versi aplikasi / Expo Go / emulator / perangkat fisik + OS:
- Backend: branch/commit + `php artisan --version` bila relevan:
- Database: `arta_test` / `arta_local` (JANGAN pakai data produksi):

## Bukti

<!-- Perintah yang dijalankan + exit code + potongan log yang relevan. -->

> PENTING: hapus secret sebelum menempel log (APP_KEY, token, password,
> URL bertanda tangan, isi `.env`). Jangan lampirkan file `.env`.
