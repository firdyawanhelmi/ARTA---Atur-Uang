import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { sessionErrorText } from '../src/auth/errorText';
import { commonStyles } from '../src/ui/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [acceptedMessage, setAcceptedMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Isi nama, email, dan kata sandi.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setLocalError(null);
    setServerError(null);
    setBusy(true);
    try {
      const result = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.ok) {
        // Registration issues no token: the account must be verified, then
        // the user signs in separately on the login screen.
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

  return (
    <View style={commonStyles.screen}>
      <Text style={commonStyles.title}>Daftar</Text>
      <Text style={commonStyles.subtitle}>
        Pendaftaran hanya membuat akun; verifikasi email wajib sebelum masuk.
      </Text>

      <Text style={commonStyles.label}>Nama</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Nama"
        value={name}
        onChangeText={setName}
        editable={!busy}
      />

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

      <Text style={commonStyles.label}>Konfirmasi kata sandi</Text>
      <TextInput
        style={commonStyles.input}
        accessibilityLabel="Konfirmasi kata sandi"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
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
      {acceptedMessage ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          {acceptedMessage}
        </Text>
      ) : null}

      <Pressable
        style={[commonStyles.button, busy ? commonStyles.buttonDisabled : null]}
        accessibilityRole="button"
        accessibilityLabel="Daftar"
        disabled={busy}
        onPress={handleSubmit}
      >
        {busy ? (
          <ActivityIndicator accessibilityLabel="Memproses pendaftaran" />
        ) : (
          <Text style={commonStyles.buttonText}>Daftar</Text>
        )}
      </Pressable>

      <View style={commonStyles.link}>
        <Link href="/login">
          <Text style={commonStyles.linkText}>Sudah punya akun? Masuk</Text>
        </Link>
      </View>
    </View>
  );
}
