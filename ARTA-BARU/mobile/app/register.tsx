import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { sessionErrorText } from '../src/auth/errorText';
import { AuthHeader } from '../src/ui/AuthHeader';
import { AuthTabs } from '../src/ui/AuthTabs';
import { commonStyles } from '../src/ui/theme';

export default function RegisterScreen() {
  const { state, signUp, resendVerification } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [acceptedMessage, setAcceptedMessage] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  if (state.status === 'signed-in') {
    return <Redirect href="/home" />;
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Isi nama, email, dan kata sandi.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password.toLowerCase() === email.trim().toLowerCase()) {
      setLocalError('Kata sandi harus berbeda dari alamat email.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setLocalError(null);
    setServerError(null);
    setResendNotice(null);
    setBusy(true);
    try {
      const result = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.ok) {
        // Registration issues no token: account verification is required before login.
        setAcceptedMessage(`${result.message} Verifikasi email sebelum masuk.`);
      } else {
        const fieldError =
          result.error.kind === 'validation' && result.error.fields
            ? Object.entries(result.error.fields)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('\n')
            : null;
        setServerError(
          fieldError ?? sessionErrorText(result.error) ?? 'Pendaftaran gagal.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResendVerification() {
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError('Masukkan email untuk mengirim ulang tautan verifikasi.');
      return;
    }
    setResending(true);
    setResendNotice(null);
    setLocalError(null);
    try {
      const result = await resendVerification(trimmed);
      if (result.ok) {
        setResendNotice(result.message);
      } else {
        setLocalError(
          sessionErrorText(result.error) ?? 'Gagal mengirim ulang verifikasi.',
        );
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AuthHeader />

      <AuthTabs
        activeTab="register"
        onSelectTab={(tab) => {
          if (tab === 'login') {
            router.push('/login');
          }
        }}
      />

      <Text style={commonStyles.title}>Buat akun baru</Text>
      <Text style={commonStyles.subtitle}>
        Pendaftaran hanya membuat akun; verifikasi email wajib sebelum masuk.
      </Text>

      <Text style={commonStyles.label}>Nama lengkap</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Nama lengkap"
        placeholder="cth: Rizky Pratama"
        value={name}
        onChangeText={setName}
        editable={!busy && !resending}
      />

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
        editable={!busy && !resending}
      />

      <Text style={commonStyles.label}>Kata sandi</Text>
      <View style={commonStyles.passwordContainer}>
        <TextInput
          style={[commonStyles.input, commonStyles.passwordInput]}
          accessibilityLabel="Kata sandi"
          placeholder="Min. 8 karakter"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!busy && !resending}
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

      <Text style={commonStyles.label}>Konfirmasi kata sandi</Text>
      <View style={commonStyles.passwordContainer}>
        <TextInput
          style={[commonStyles.input, commonStyles.passwordInput]}
          accessibilityLabel="Konfirmasi kata sandi"
          placeholder="Ulangi kata sandi"
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={setConfirm}
          editable={!busy && !resending}
        />
        <Pressable
          style={commonStyles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={
            showConfirm
              ? 'Sembunyikan konfirmasi kata sandi'
              : 'Tampilkan konfirmasi kata sandi'
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
      {acceptedMessage ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          {acceptedMessage}
        </Text>
      ) : null}
      {resendNotice ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          {resendNotice}
        </Text>
      ) : null}

      <Pressable
        style={[
          commonStyles.button,
          busy || resending ? commonStyles.buttonDisabled : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Daftar"
        disabled={busy || resending}
        onPress={handleSubmit}
      >
        {busy ? (
          <ActivityIndicator
            accessibilityLabel="Memproses pendaftaran"
            color={commonStyles.buttonText.color}
          />
        ) : (
          <Text style={commonStyles.buttonText}>Daftar</Text>
        )}
      </Pressable>

      {acceptedMessage ? (
        <View>
          <Pressable
            style={commonStyles.button}
            accessibilityRole="button"
            accessibilityLabel="Lanjut ke Masuk"
            onPress={() => router.push('/login')}
          >
            <Text style={commonStyles.buttonText}>Lanjut ke Masuk</Text>
          </Pressable>
          <Pressable
            style={commonStyles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Kirim ulang email verifikasi"
            disabled={resending}
            onPress={handleResendVerification}
          >
            {resending ? (
              <ActivityIndicator accessibilityLabel="Mengirim ulang verifikasi" />
            ) : (
              <Text style={commonStyles.secondaryButtonText}>
                Kirim ulang email verifikasi
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
