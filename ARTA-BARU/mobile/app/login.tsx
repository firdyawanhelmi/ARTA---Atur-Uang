import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { sessionErrorText } from '../src/auth/errorText';
import { commonStyles } from '../src/ui/theme';

export default function LoginScreen() {
  const { state, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setLocalError('Isi email dan kata sandi.');
      return;
    }
    setLocalError(null);
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

  const serverError = sessionErrorText(state.error);
  // Surface field-level validation messages under the form when present.
  const fieldError =
    state.error?.kind === 'validation' && state.error.fields
      ? Object.entries(state.error.fields)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n')
      : null;

  return (
    <View style={commonStyles.screen}>
      <Text style={commonStyles.title}>Masuk</Text>
      <Text style={commonStyles.subtitle}>
        Masuk dengan akun ARTA yang sudah terverifikasi.
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
        editable={!busy}
      />

      <Text style={commonStyles.label}>Kata sandi</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Kata sandi"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
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
      {fieldError ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {fieldError}
        </Text>
      ) : null}

      <Pressable
        style={[commonStyles.button, busy ? commonStyles.buttonDisabled : null]}
        accessibilityRole="button"
        accessibilityLabel="Masuk"
        disabled={busy}
        onPress={handleSubmit}
      >
        {busy ? (
          <ActivityIndicator accessibilityLabel="Memproses masuk" />
        ) : (
          <Text style={commonStyles.buttonText}>Masuk</Text>
        )}
      </Pressable>

      <View style={commonStyles.link}>
        <Link href="/register">
          <Text style={commonStyles.linkText}>Belum punya akun? Daftar</Text>
        </Link>
      </View>
    </View>
  );
}
