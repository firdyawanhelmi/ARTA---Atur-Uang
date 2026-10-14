/**
 * User-facing (Indonesian) text for session errors.
 *
 * Messages stay generic on purpose: the backend deliberately returns
 * identical responses for unknown email / wrong password / unverified email
 * (anti-enumeration), so the UI must not add account-specific hints.
 */

import type { SessionError } from './session';

export function sessionErrorText(error: SessionError | null): string | null {
  if (!error) {
    return null;
  }
  switch (error.kind) {
    case 'invalid_credentials':
      return 'Email atau kata sandi salah, atau email belum diverifikasi.';
    case 'session_expired':
      return 'Sesi berakhir. Masuk kembali.';
    case 'validation':
      return error.message || 'Periksa kembali isian formulir.';
    case 'network':
      return 'Tidak ada koneksi. Periksa jaringan lalu coba lagi.';
    case 'timeout':
      return 'Permintaan kedaluwarsa. Coba lagi.';
    case 'rate_limited':
      return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
    case 'server':
      return 'Server bermasalah. Coba lagi nanti.';
    case 'invalid_response':
      return 'Respons server tidak valid. Coba lagi.';
    case 'missing_api_url':
      return 'API URL belum dikonfigurasi (EXPO_PUBLIC_API_URL).';
    default:
      return error.message || 'Terjadi kesalahan. Coba lagi.';
  }
}
