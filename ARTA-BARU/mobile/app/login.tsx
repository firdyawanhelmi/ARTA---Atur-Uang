import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, Redirect, router } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { sessionErrorText } from '../src/auth/errorText';
import { AuthHeader } from '../src/ui/AuthHeader';
import { AuthTabs } from '../src/ui/AuthTabs';
import { commonStyles } from '../src/ui/theme';

export default function LoginScreen() {
  const { state, signIn, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (state.status === 'signed-in') {
    return <Redirect href="/home" />;
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setLocalError('Isi email dan kata sandi.');
      return;
    }
    setLocalError(null);
    setResendNotice(null);
    setBusy(true);
    try {
      const next = await signIn({ email: email.trim(), password });
      if (next.status === 'signed-in') {
        router.replace('/home');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResendVerification() {
    const trimmed = email.trim();
    if (!trimmed) {
      setLocalError(
        'Masukkan email terlebih dahulu untuk mengirim ulang verifikasi.',
      );
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

  const serverError = sessionErrorText(state.error);
  const fieldError =
    state.error?.kind === 'validation' && state.error.fields
      ? Object.entries(state.error.fields)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n')
      : null;

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AuthHeader />

      <AuthTabs
        activeTab="login"
        onSelectTab={(tab) => {
          if (tab === 'register') {
            router.push('/register');
          }
        }}
      />

      <Text style={commonStyles.title}>Selamat datang kembali</Text>
      <Text style={commonStyles.subtitle}>
        Masuk untuk lanjut mengelola keuanganmu.
      </Text>

      <Text style={commonStyles.label}>Email</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Email"
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

      <View style={commonStyles.rowBetween}>
        <View />
        <Link href="/forgot-password" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lupa kata sandi?"
          >
            <Text style={commonStyles.linkText}>Lupa kata sandi?</Text>
          </Pressable>
        </Link>
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
      {fieldError ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {fieldError}
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
        accessibilityLabel="Masuk"
        disabled={busy || resending}
        onPress={handleSubmit}
      >
        {busy ? (
          <ActivityIndicator
            accessibilityLabel="Memproses masuk"
            color={commonStyles.buttonText.color}
          />
        ) : (
          <Text style={commonStyles.buttonText}>Masuk</Text>
        )}
      </Pressable>

      {state.error?.kind === 'invalid_credentials' ? (
        <Pressable
          style={commonStyles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel="Kirim ulang email verifikasi"
          disabled={busy || resending}
          onPress={handleResendVerification}
        >
          {resending ? (
            <ActivityIndicator accessibilityLabel="Mengirim ulang verifikasi" />
          ) : (
            <Text style={commonStyles.secondaryButtonText}>
              Belum terima verifikasi? Kirim ulang email verifikasi
            </Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
