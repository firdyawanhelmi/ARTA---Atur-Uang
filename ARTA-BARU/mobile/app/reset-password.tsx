import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { sessionErrorText } from '../src/auth/errorText';
import { AuthHeader } from '../src/ui/AuthHeader';
import { commonStyles } from '../src/ui/theme';

export default function ResetPasswordScreen() {
  const { state, submitPasswordReset } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (state.status === 'signed-in') {
    return <Redirect href="/home" />;
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    const trimmedToken = token.trim();
    if (!trimmedEmail || !trimmedToken || !password) {
      setLocalError('Isi email, token reset, dan kata sandi baru.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password.toLowerCase() === trimmedEmail.toLowerCase()) {
      setLocalError('Kata sandi baru harus berbeda dari alamat email.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Konfirmasi kata sandi baru tidak sama.');
      return;
    }
    setLocalError(null);
    setServerError(null);
    setBusy(true);
    try {
      const result = await submitPasswordReset({
        email: trimmedEmail,
        token: trimmedToken,
        password,
        passwordConfirmation: confirm,
      });
      if (result.ok) {
        setSuccessMessage(
          'Kata sandi berhasil diatur ulang. Semua sesi perangkat telah dicabut demi keamanan. Silakan masuk kembali.',
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
            'Gagal mengatur ulang kata sandi. Periksa token Anda.',
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

      <Text style={commonStyles.title}>Simpan kata sandi baru</Text>
      <Text style={commonStyles.subtitle}>
        Masukkan email, token reset yang diterima di email, dan kata sandi baru.
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
        editable={!busy && !successMessage}
      />

      <Text style={commonStyles.label}>Token reset</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Token reset"
        placeholder="Tempel token atau kode dari email"
        autoCapitalize="none"
        autoCorrect={false}
        value={token}
        onChangeText={setToken}
        editable={!busy && !successMessage}
      />

      <Text style={commonStyles.label}>Kata sandi baru</Text>
      <View style={commonStyles.passwordContainer}>
        <TextInput
          style={[commonStyles.input, commonStyles.passwordInput]}
          accessibilityLabel="Kata sandi baru"
          placeholder="Min. 8 karakter"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!busy && !successMessage}
        />
        <Pressable
          style={commonStyles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
          }
          onPress={() => setShowPassword((prev) => !prev)}
        >
          <Text style={commonStyles.passwordToggleText}>
            {showPassword ? 'Sembunyikan' : 'Lihat'}
          </Text>
        </Pressable>
      </View>

      <Text style={commonStyles.label}>Konfirmasi kata sandi baru</Text>
      <View style={commonStyles.passwordContainer}>
        <TextInput
          style={[commonStyles.input, commonStyles.passwordInput]}
          accessibilityLabel="Konfirmasi kata sandi baru"
          placeholder="Ulangi kata sandi baru"
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={setConfirm}
          editable={!busy && !successMessage}
        />
        <Pressable
          style={commonStyles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={
            showConfirm
              ? 'Sembunyikan konfirmasi kata sandi baru'
              : 'Tampilkan konfirmasi kata sandi baru'
          }
          onPress={() => setShowConfirm((prev) => !prev)}
        >
          <Text style={commonStyles.passwordToggleText}>
            {showConfirm ? 'Sembunyikan' : 'Lihat'}
          </Text>
        </Pressable>
      </View>

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
      {successMessage ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          {successMessage}
        </Text>
      ) : null}

      {!successMessage ? (
        <Pressable
          style={[
            commonStyles.button,
            busy ? commonStyles.buttonDisabled : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Simpan kata sandi baru"
          disabled={busy}
          onPress={handleSubmit}
        >
          {busy ? (
            <ActivityIndicator
              accessibilityLabel="Memproses perubahan kata sandi"
              color={commonStyles.buttonText.color}
            />
          ) : (
            <Text style={commonStyles.buttonText}>Simpan kata sandi baru</Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={commonStyles.button}
          accessibilityRole="button"
          accessibilityLabel="Lanjut ke Masuk"
          onPress={() => router.replace('/login')}
        >
          <Text style={commonStyles.buttonText}>Lanjut ke Masuk</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
