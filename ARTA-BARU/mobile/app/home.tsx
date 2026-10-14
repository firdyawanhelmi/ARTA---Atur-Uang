import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { getOrCreateDeviceId } from '../src/auth/device';
import { sessionErrorText } from '../src/auth/errorText';
import type { DeviceSessionRow } from '../src/auth/authApi';
import { colors, commonStyles } from '../src/ui/theme';

function statusText(status: DeviceSessionRow['status']): string {
  if (status === 'active') {
    return 'Aktif';
  }
  if (status === 'expired') {
    return 'Kedaluwarsa';
  }
  return 'Dicabut';
}

export default function HomeScreen() {
  const {
    state,
    restore,
    signOut,
    signOutEverywhere,
    refreshProfile,
    loadDevices,
    renameDevice,
    revokeDevice,
  } = useAuth();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (state.status === 'signed-in') {
      loadDevices().catch(() => undefined);
      getOrCreateDeviceId()
        .then((id) => {
          if (!cancelled) {
            setDeviceId(id);
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
    // Load once per sign-in; actions below refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const goToLogin = useCallback(() => {
    router.replace('/login');
  }, []);

  if (state.status !== 'signed-in') {
    return <Redirect href="/login" />;
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      const next = await signOut();
      if (next.status === 'signed-out') {
        goToLogin();
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSignOutEverywhere() {
    Alert.alert(
      'Keluar dari semua perangkat',
      'Semua sesi perangkat akun ini akan dicabut di server.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar semua',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            signOutEverywhere()
              .then((next) => {
                if (next.status === 'signed-out') {
                  goToLogin();
                }
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  function handleRevoke(session: DeviceSessionRow) {
    const isCurrent = deviceId !== null && session.device_id === deviceId;
    Alert.alert(
      'Cabut sesi perangkat',
      isCurrent
        ? 'Ini sesi perangkat saat ini. Perangkat ini akan keluar.'
        : `Cabut sesi "${session.device_name ?? session.device_id}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Cabut',
          style: 'destructive',
          onPress: () => {
            revokeDevice(session.id).then((result) => {
              if (result.state.status === 'signed-out') {
                goToLogin();
              }
            });
          },
        },
      ],
    );
  }

  async function handleRename(session: DeviceSessionRow) {
    const result = await renameDevice(session.id, draftName);
    if (result.ok) {
      setEditingId(null);
      setDraftName('');
    }
  }

  const error = sessionErrorText(state.error);
  const devicesError = sessionErrorText(state.devicesError);

  return (
    <ScrollView style={commonStyles.screen}>
      <Text style={commonStyles.title}>Profil</Text>

      {!state.sessionVerified ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          Sesi belum terverifikasi (misalnya tidak ada koneksi). Data profil
          belum dimuat ulang.
        </Text>
      ) : null}

      {state.pendingLogout ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          Penyelesaian logout di server tertunda (dulu offline). Akan
          diselesaikan otomatis saat aplikasi dibuka dengan koneksi.
        </Text>
      ) : null}

      <View style={commonStyles.card}>
        <Text style={commonStyles.label}>Nama</Text>
        <Text accessibilityLabel="Nama pengguna">
          {state.user?.name ?? '-'}
        </Text>
        <Text style={commonStyles.label}>Email</Text>
        <Text accessibilityLabel="Email pengguna">
          {state.user?.email ?? '-'}
        </Text>
        <Text style={commonStyles.label}>Status verifikasi</Text>
        <Text>
          {state.user?.email_verified_at
            ? 'Terverifikasi'
            : 'Belum diverifikasi'}
        </Text>
        <Text style={commonStyles.label}>ID pengguna (UUID v7)</Text>
        <Text accessibilityLabel="ID pengguna">{state.user?.id ?? '-'}</Text>
      </View>

      {error ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Pressable
        style={commonStyles.button}
        accessibilityRole="button"
        accessibilityLabel="Perbarui profil"
        onPress={() => {
          refreshProfile();
        }}
      >
        <Text style={commonStyles.buttonText}>Perbarui profil</Text>
      </Pressable>

      <Text style={[commonStyles.title, { marginTop: 32 }]}>
        Perangkat &amp; sesi
      </Text>
      <Text style={commonStyles.subtitle}>
        Setiap sesi dapat dicabut terpisah. Mencabut sesi saat ini akan
        mengeluarkan perangkat ini.
      </Text>

      {devicesError ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {devicesError}
        </Text>
      ) : null}

      {state.devices.map((session) => {
        const isCurrent = deviceId !== null && session.device_id === deviceId;
        return (
          <View key={session.id} style={commonStyles.card}>
            <Text accessibilityLabel={`Nama perangkat ${session.id}`}>
              {session.device_name ?? session.device_id}
              {isCurrent ? ' (perangkat ini)' : ''}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {session.platform ?? '-'}
              {session.app_version ? ` · ${session.app_version}` : ''} ·{' '}
              {statusText(session.status)}
            </Text>
            {editingId === session.id ? (
              <View>
                <TextInput
                  style={[commonStyles.input, { marginTop: 8 }]}
                  accessibilityLabel="Nama perangkat baru"
                  value={draftName}
                  onChangeText={setDraftName}
                  maxLength={255}
                />
                <Pressable
                  style={commonStyles.button}
                  accessibilityRole="button"
                  accessibilityLabel="Simpan nama perangkat"
                  onPress={() => {
                    handleRename(session);
                  }}
                >
                  <Text style={commonStyles.buttonText}>Simpan nama</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ubah nama perangkat ${session.id}`}
                  onPress={() => {
                    setEditingId(session.id);
                    setDraftName(session.device_name ?? '');
                  }}
                >
                  <Text style={commonStyles.linkText}>Ubah nama</Text>
                </Pressable>
                <Text>{'   '} </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cabut sesi perangkat ${session.id}`}
                  onPress={() => handleRevoke(session)}
                >
                  <Text
                    style={[commonStyles.linkText, { color: colors.danger }]}
                  >
                    Cabut sesi
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      <Pressable
        style={[commonStyles.button, busy ? commonStyles.buttonDisabled : null]}
        accessibilityRole="button"
        accessibilityLabel="Keluar"
        disabled={busy}
        onPress={handleSignOut}
      >
        {busy ? (
          <ActivityIndicator accessibilityLabel="Memproses keluar" />
        ) : (
          <Text style={commonStyles.buttonText}>Keluar</Text>
        )}
      </Pressable>

      <Pressable
        style={[commonStyles.button, busy ? commonStyles.buttonDisabled : null]}
        accessibilityRole="button"
        accessibilityLabel="Keluar dari semua perangkat"
        disabled={busy}
        onPress={handleSignOutEverywhere}
      >
        <Text style={commonStyles.buttonText}>Keluar dari semua perangkat</Text>
      </Pressable>

      {state.pendingLogout ? (
        <Pressable
          style={commonStyles.button}
          accessibilityRole="button"
          accessibilityLabel="Coba selesaikan logout"
          onPress={() => {
            restore();
          }}
        >
          <Text style={commonStyles.buttonText}>Coba selesaikan logout</Text>
        </Pressable>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
