import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { Redirect, router } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { sessionErrorText } from '../src/auth/errorText';
import { AuthHeader } from '../src/ui/AuthHeader';
import { commonStyles } from '../src/ui/theme';

export default function ForgotPasswordScreen() {
  const { state, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  if (state.status === 'signed-in') {
    return <Redirect href="/home" />;
  }

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError('Masukkan alamat email.');
      return;
    }
    setLocalError(null);
    setServerError(null);
    setBusy(true);
    try {
      const result = await requestPasswordReset(trimmed);
      if (result.ok) {
        setSentMessage(
          'Jika akun terdaftar, tautan dan kode atur ulang kata sandi telah dikirim ke email kamu. Periksa kotak masuk atau spam.',
        );
      } else {
        const fieldError =
          result.error.kind === 'validation' && result.error.fields
            ? Object.entries(result.error.fields)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('\n')
            : null;
        setServerError(
          fieldError ??
            sessionErrorText(result.error) ??
            'Permintaan atur ulang kata sandi gagal.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AuthHeader />

      <Pressable
        style={commonStyles.backLink}
        accessibilityRole="button"
        accessibilityLabel="Kembali ke Masuk"
        onPress={() => router.replace('/login')}
      >
        <Text style={commonStyles.backLinkText}>← Kembali ke Masuk</Text>
      </Pressable>

      <Text style={commonStyles.title}>Atur ulang kata sandi</Text>
      <Text style={commonStyles.subtitle}>
        Tautan dan kode atur ulang kata sandi akan dikirim ke email kamu jika
        terdaftar.
      </Text>

      <Text style={commonStyles.label}>Alamat email</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Alamat email"
        placeholder="nama@domain.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />

      {localError ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {localError}
        </Text>
      ) : null}
      {serverError ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {serverError}
        </Text>
      ) : null}
      {sentMessage ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          {sentMessage}
        </Text>
      ) : null}

      <Pressable
        style={[commonStyles.button, busy ? commonStyles.buttonDisabled : null]}
        accessibilityRole="button"
        accessibilityLabel="Kirim email atur ulang"
        disabled={busy}
        onPress={handleSubmit}
      >
        {busy ? (
          <ActivityIndicator
            accessibilityLabel="Memproses permintaan"
            color={commonStyles.buttonText.color}
          />
        ) : (
          <Text style={commonStyles.buttonText}>Kirim email atur ulang</Text>
        )}
      </Pressable>

      <Pressable
        style={commonStyles.secondaryButton}
        accessibilityRole="button"
        accessibilityLabel="Sudah memiliki token reset? Masukkan token"
        onPress={() =>
          router.push({
            pathname: '/reset-password',
            params: { email: email.trim() },
          })
        }
      >
        <Text style={commonStyles.secondaryButtonText}>
          Sudah memiliki token reset? Masukkan token
        </Text>
      </Pressable>
    </ScrollView>
  );
}
