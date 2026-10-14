# T0.3 — Audit risiko & keputusan terbuka (13 Okt 2026)

Sumber: PRD v2.0-draft §§4,23,88 + roadmap “Daftar blocker lintas fase” B1–B6.
Status PRD: DRAFT untuk review — implementasi Fase 1+ DILARANG mulai sebelum
pengguna menyetujui arsitektur (PRD §88, §100, header review note).

## B1 — Android remote push tanpa FCM (keputusan DECIDED; validasi teknis tersisa)

- Aturan absolut: tanpa Firebase/FCM, tanpa Expo Push yang lewat FCM (§4.2, §23).
- Baseline PRD §23: Android = local notifications (dari data yang sudah sync)
  + in-app history. Push server saat app suspended/terminated TIDAK dijanjikan
  universal. WebSocket persisten / polling / foreground service dilarang sebagai
  pengganti push tersembunyi.
- UnifiedPush hanya opsi masa depan, butuh keputusan produk terpisah +
  distributor kompatibel + disclosure + test. Bukan asumsi default rilis.
- Keputusan produk: baseline local + in-app untuk rilis awal (DECIDED,
  roadmap B1). Risiko tersisa: cantumkan eksplisit di listing store agar
  tidak overclaim; validasi teknis di fase notifikasi.

## B2 — iOS validation (BLOCKER rilis)

- Butuh: Apple Developer account, signing, kredensial APNs langsung dari backend
  (tanpa Firebase), perangkat nyata/TestFlight, penguji.
- Private key APNs TIDAK boleh di repo/app bundle — hanya secret management.
- Belum ada kredensial/perangkat tercatat. Jangan klaim dukungan iOS tervalidasi
  sebelum uji TestFlight + perangkat nyata (roadmap T9.4, T13.4).

## B3 — Google Sign-In native (BLOCKER desain auth)

- PRD §7: email/password + Google login + verifikasi + reset + logout per/all device.
- Aturan linking: jika email sudah ada, JANGAN auto-merge; wajib auth password
  dulu lalu linking eksplisit.
- Belum ada konfigurasi OAuth Android/iOS, client ID, atau kebijakan linking
  tercatat. Jangan desain skema users/sessions sebelum ini diputus.

## B4 — Backend hosting (BLOCKER infra)

- Butuh: Laravel + MySQL 8+, queue worker durable, scheduler tiap 5 menit,
  Reverb/WebSocket bila dipakai, HTTPS, secret management, monitoring, backup
  terenkripsi + uji restore.
- VPS tidak wajib; provider-neutral boleh asal memenuhi daftar di atas
  (PRD §§75–76). Belum ada hosting dipilih. Mempengaruhi T2.2, T14.1.

## B5 — Data lokal saat logout (keputusan DECIDED; implementasi tersisa)

- Token HANYA di SecureStore (Keychain/Keystore), bukan SQLite/AsyncStorage/log.
- Kebijakan diputus (AGENTS §13 / PRD §37 B5): isolate per akun,
  jangan bocor antar pengguna, jangan hapus operasi pending diam-diam,
  jangan hapus data server saat logout. Pekerjaan tersisa:
  implementasi + pengujian T3.3, T6.4, T12.2.

## B6 — Store compliance (BLOCKER rilis)

- Periksa kebijakan Play Store / App Store TERBARU saat pengajuan (kategori usia,
  privacy policy, deklarasi data, alur hapus akun `HAPUS AKUN`, retensi backup).
- Jangan anggap lolos dari build lokal. Arsipkan bukti review/penolakan.

## Risiko tambahan dari verifikasi T0.1

1. **AGENTS.md kadaluarsa vs PRD.** AGENTS.md §9 masih stack web
   (React/Vite/IndexedDB/PWA/Service Worker/Web Push/VAPID); PRD v2.0 + roadmap
   sudah native (RN/Expo/SQLite/APNs, tanpa PWA). Hierarki: PRD menang.
   AGENTS.md wajib direvisi sebelum Fase 1, atau agen akan mengikuti instruksi
   yang salah.
2. **Penamaan folder.** Dokumen menuntut `ARTA-LAMA-REFERENCE/` + `ARTA-BARU/`;
   aktual `ARTA-REFERENCE/` saja. PRD §3 membolehkan nama berbeda asal separasi
   eksplisit — pemetaan dicatat di T0.1, tidak rename referensi.
3. **Root bukan git repo; referensi dirty.** 5 file deleted di working tree
   referensi (`AGENTS.md`, `AUDIT_UIUX_REPORT.md`,
   `FIRESTORE_EFFICIENCY_AUDIT.md`, `PERBAIKAN_UIUX_REPORT.md`, `opencode.json`).
   Tidak dipulihkan (read-only). Risiko: baseline tidak reproduksibel penuh.
4. **Legacy Firebase total.** Backend referensi = Auth + Firestore + Functions v2
   + FCM WebPush + Hosting + Emulators. Semua dilarang di baru. Jangan port
   `scheduler-service`/`fcm.js`/`notif-log.js` mentah-mentah; aturan bisnis
   (H-3/H-1/H-0/overdue, H-7/H-3/H-1, 80%/100%, daily 09:00 + 24h inactivity)
   boleh jadi referensi perilaku, implementasi harus Laravel/Scheduler/APNs.

## Keputusan yang dibutuhkan pengguna (jangan ditebak)

- [ ] Setujui / revisi PRD v2.0-draft sebagai source of truth (syarat mulai Fase 1).
- [ ] Revisi AGENTS.md selaras PRD native (atau nyatakan AGENTS.md lama void).
- [ ] Putuskan B1 (baseline Android cukup?) dan B5 (kebijakan data saat logout).
- [ ] Sediakan info B2 (Apple account/perangkat) dan B3 (OAuth Google) atau
      nyatakan ditunda dengan scope eksplisit.
- [ ] Pilih hosting B4 sebelum T2.2.

Status T0.3 (penutupan Fase 0, 13 Okt 2026): **PASS** — risiko/blocker
tercatat; keputusan B1/B5/F12/F13/T1/D1/D4 diputus, D2/D3/B4/B2/B3
terbuka/tertunda eksplisit dengan pemilik dan gerbang; tidak ada
keputusan pemblokir yang disembunyikan sebagai asumsi.

## Kebijakan backup — opsi dalam evaluasi, D1 diputus 30 hari (13 Okt 2026)

Retensi akun (30 hari, diputus) dan retensi backup (terbuka) adalah dua
kebijakan berbeda (PRD §74). Angka di bawah kandidat diskusi, bukan
keputusan; tanpa skor dan tanpa klaim biaya/fitur tersedia.

### Opsi A — retensi maksimum 7 hari
- DR: pemulihan bencana hingga 7 hari ke belakang.
- Data terhapus: bertahan di backup ≤7 hari pasca-purge.
- Rekonsiliasi pasca-restore tetap wajib (berlaku untuk semua opsi).
- Operasional: storage terkecil; perlu verifikasi provider (retensi
  pendek, hapus kedaluwarsa, restore terisolasi).
- Risiko restore-basi: jendela tersempit; DR terlemah.

### Opsi B — retensi maksimum 30 hari
- DR: hingga 30 hari (kesamaan angka dengan retensi akun kebetulan,
  bukan keharusan).
- Data terhapus: bertahan ≤30 hari; rekonsiliasi tetap wajib.
- Operasional: storage sedang; verifikasi provider sama.
- Risiko: jendela restore-basi dan DR sedang.

### Opsi C — retensi maksimum 90 hari
- DR: hingga 90 hari.
- Data terhapus: bertahan ≤90 hari (jendela eksposur terpanjang).
- Rekonsiliasi tetap wajib.
- Operasional: storage terbesar; biaya + kemampuan perlu diverifikasi.
- Risiko: jendela restore-basi terpanjang; DR terkuat.

### Empat keputusan terpisah (status 13 Okt 2026)
- D1 periode: DIPUTUSKAN 30 hari; verifikasi kemampuan hosting prasyarat produksi.
- D2 mekanisme (kedaluwarsa otomatis vs prosedur): TERBUKA, kondisi:
  setelah B4 (butuh kemampuan provider nyata + bukti penghapusan +
  prosedur gagal).
- D3 pengecualian hukum/audit/operasional: TERBUKA, kebutuhan perlu
  diperiksa (pemilik: pengguna; tanpa mengarang kewajiban hukum).
- D4 syarat buka-serve pasca-restore: DITETAPKAN (PRD §74:
  rekonsiliasi, gate akses, anti-reaktivasi).

### Minimum evaluasi hosting (pasca-B4, tanpa klaim tersedia)
Jadwal + retensi terkonfigurasi; restore ke lingkungan terisolasi;
akses/kontrol backup; hapus kedaluwarsa; dokumentasi + log operasional
restore; kemampuan gate + rekonsiliasi sebelum serve.
