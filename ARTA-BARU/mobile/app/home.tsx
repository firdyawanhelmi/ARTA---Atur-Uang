import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
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

function formatSessionDate(dateString: string | null): string {
  if (!dateString) {
    return '-';
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
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
  const [refreshing, setRefreshing] = useState(false);
  const [actionSessionId, setActionSessionId] = useState<number | null>(null);

  const goToLogin = useCallback(() => {
    router.replace('/login');
  }, []);

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
    // Load once per sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  if (state.status !== 'signed-in') {
    return <Redirect href="/login" />;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const profileResult = await refreshProfile();
      if (profileResult.status === 'signed-out') {
        goToLogin();
        return;
      }
      const devicesResult = await loadDevices();
      if (devicesResult.status === 'signed-out') {
        goToLogin();
      }
    } finally {
      setRefreshing(false);
    }
  };

  function handleSignOut() {
    Alert.alert(
      'Keluar dari perangkat ini?',
      'Sesi di perangkat ini akan diakhiri. Data finansial kamu tetap aman di server.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Keluar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const next = await signOut();
              if (next.status === 'signed-out') {
                goToLogin();
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  function handleSignOutEverywhere() {
    Alert.alert(
      'Keluar dari semua perangkat?',
      'Semua sesi perangkat akun ini akan dicabut di server. Anda harus masuk kembali di setiap perangkat.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Keluar Semua',
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
        ? 'Ini adalah sesi perangkat saat ini. Perangkat ini akan segera keluar.'
        : `Cabut sesi "${session.device_name ?? session.device_id}"? Perangkat tersebut tidak akan dapat mengakses akun lagi.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: isCurrent ? 'Cabut & Keluar' : 'Cabut Sesi',
          style: 'destructive',
          onPress: async () => {
            setActionSessionId(session.id);
            try {
              const result = await revokeDevice(session.id);
              if (result.state.status === 'signed-out') {
                goToLogin();
              } else if (!result.ok) {
                Alert.alert(
                  'Gagal mencabut sesi',
                  sessionErrorText(result.state.devicesError) ??
                    'Terjadi kesalahan saat mencabut sesi.',
                );
              }
            } finally {
              setActionSessionId(null);
            }
          },
        },
      ],
    );
  }

  async function handleRename(session: DeviceSessionRow) {
    const trimmed = draftName.trim();
    if (!trimmed) {
      Alert.alert('Perhatian', 'Nama perangkat tidak boleh kosong.');
      return;
    }
    setActionSessionId(session.id);
    try {
      const result = await renameDevice(session.id, trimmed);
      if (result.ok) {
        setEditingId(null);
        setDraftName('');
      } else {
        Alert.alert(
          'Gagal mengubah nama',
          sessionErrorText(result.state.devicesError) ??
            'Nama perangkat tidak valid.',
        );
      }
    } finally {
      setActionSessionId(null);
    }
  }

  const error = sessionErrorText(state.error);
  const devicesError = sessionErrorText(state.devicesError);

  return (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.text}
        />
      }
    >
      <Text style={commonStyles.title}>Pengaturan Akun &amp; Sesi</Text>

      {!state.sessionVerified ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          Sesi belum terverifikasi (misalnya sedang offline). Data profil belum
          diperbarui dari server.
        </Text>
      ) : null}

      {state.pendingLogout ? (
        <Text style={commonStyles.notice} accessibilityLiveRegion="polite">
          Penyelesaian logout di server tertunda karena offline sebelumnya. Akan
          diselesaikan otomatis saat aplikasi terhubung.
        </Text>
      ) : null}

      <Text style={commonStyles.sectionTitle}>Profil Pengguna</Text>
      <View style={commonStyles.card}>
        <Text style={commonStyles.label}>Nama lengkap</Text>
        <Text accessibilityLabel="Nama pengguna">
          {state.user?.name ?? '-'}
        </Text>
        <Text style={commonStyles.label}>Alamat email</Text>
        <Text accessibilityLabel="Email pengguna">
          {state.user?.email ?? '-'}
        </Text>
        <Text style={commonStyles.label}>Status verifikasi email</Text>
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
        style={commonStyles.secondaryButton}
        accessibilityRole="button"
        accessibilityLabel="Perbarui profil dan sesi"
        disabled={refreshing}
        onPress={handleRefresh}
      >
        <Text style={commonStyles.secondaryButtonText}>
          {refreshing ? 'Memperbarui...' : 'Perbarui data sesi'}
        </Text>
      </Pressable>

      <Text style={commonStyles.sectionTitle}>Perangkat &amp; Sesi Aktif</Text>
      <Text style={commonStyles.subtitle}>
        Kelola perangkat yang terhubung ke akun Anda. Setiap sesi dapat dicabut
        secara independen.
      </Text>

      {devicesError ? (
        <Text style={commonStyles.error} accessibilityLiveRegion="polite">
          {devicesError}
        </Text>
      ) : null}

      {state.devices.length === 0 ? (
        <View style={commonStyles.card}>
          <Text style={{ color: colors.muted }}>
            Belum ada daftar sesi yang dimuat. Tarik layar ke bawah untuk
            memuat.
          </Text>
        </View>
      ) : null}

      {state.devices.map((session) => {
        const isCurrent = deviceId !== null && session.device_id === deviceId;
        const isActionBusy = actionSessionId === session.id;

        return (
          <View key={session.id} style={commonStyles.card}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
                accessibilityLabel={`Nama perangkat ${session.id}`}
              >
                {session.device_name ?? session.device_id}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {session.status === 'active' ? (
                  <View style={[commonStyles.badge, commonStyles.badgeActive]}>
                    <Text
                      style={[
                        commonStyles.badgeText,
                        commonStyles.badgeActiveText,
                      ]}
                    >
                      Aktif
                    </Text>
                  </View>
                ) : session.status === 'expired' ? (
                  <View style={[commonStyles.badge, commonStyles.badgeExpired]}>
                    <Text
                      style={[
                        commonStyles.badgeText,
                        commonStyles.badgeExpiredText,
                      ]}
                    >
                      Kedaluwarsa
                    </Text>
                  </View>
                ) : (
                  <View style={[commonStyles.badge, commonStyles.badgeRevoked]}>
                    <Text
                      style={[
                        commonStyles.badgeText,
                        commonStyles.badgeRevokedText,
                      ]}
                    >
                      Dicabut
                    </Text>
                  </View>
                )}
                {isCurrent ? (
                  <View
                    style={[
                      commonStyles.badge,
                      commonStyles.badgeCurrent,
                      { marginLeft: 6 },
                    ]}
                  >
                    <Text
                      style={[
                        commonStyles.badgeText,
                        commonStyles.badgeCurrentText,
                      ]}
                    >
                      Perangkat ini
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
              {session.platform ?? 'Platform tidak diketahui'}
              {session.app_version ? ` · v${session.app_version}` : ''}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
              Dibuat: {formatSessionDate(session.created_at)}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
              Terakhir aktif: {formatSessionDate(session.last_used_at)}
            </Text>

            {editingId === session.id ? (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  style={commonStyles.input}
                  accessibilityLabel="Nama perangkat baru"
                  placeholder="Masukkan nama perangkat (cth: Ponsel Kerja)"
                  value={draftName}
                  onChangeText={setDraftName}
                  maxLength={255}
                  editable={!isActionBusy}
                />
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Pressable
                    style={[
                      commonStyles.button,
                      { flex: 1, marginTop: 0, marginRight: 8 },
                      isActionBusy ? commonStyles.buttonDisabled : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Simpan nama perangkat"
                    disabled={isActionBusy}
                    onPress={() => handleRename(session)}
                  >
                    {isActionBusy ? (
                      <ActivityIndicator
                        color={commonStyles.buttonText.color}
                      />
                    ) : (
                      <Text style={commonStyles.buttonText}>Simpan</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[
                      commonStyles.secondaryButton,
                      { flex: 1, marginTop: 0 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Batal ubah nama"
                    disabled={isActionBusy}
                    onPress={() => {
                      setEditingId(null);
                      setDraftName('');
                    }}
                  >
                    <Text style={commonStyles.secondaryButtonText}>Batal</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ubah nama perangkat ${session.id}`}
                  disabled={isActionBusy}
                  onPress={() => {
                    setEditingId(session.id);
                    setDraftName(session.device_name ?? '');
                  }}
                >
                  <Text style={commonStyles.linkText}>Ubah nama</Text>
                </Pressable>
                <Text style={{ marginHorizontal: 8 }}>·</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cabut sesi perangkat ${session.id}`}
                  disabled={isActionBusy || session.status === 'revoked'}
                  onPress={() => handleRevoke(session)}
                >
                  {isActionBusy ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text
                      style={[
                        commonStyles.linkText,
                        {
                          color:
                            session.status === 'revoked'
                              ? colors.muted
                              : colors.danger,
                        },
                      ]}
                    >
                      {session.status === 'revoked'
                        ? 'Sesi dicabut'
                        : 'Cabut sesi'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      <Text style={commonStyles.sectionTitle}>Tindakan Keluar</Text>

      <Pressable
        style={[
          commonStyles.secondaryButton,
          busy ? commonStyles.buttonDisabled : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Keluar dari perangkat ini"
        disabled={busy}
        onPress={handleSignOut}
      >
        {busy ? (
          <ActivityIndicator accessibilityLabel="Memproses keluar" />
        ) : (
          <Text style={commonStyles.secondaryButtonText}>
            Keluar dari perangkat ini
          </Text>
        )}
      </Pressable>

      <Pressable
        style={[
          commonStyles.button,
          commonStyles.buttonDanger,
          busy ? commonStyles.buttonDisabled : null,
        ]}
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
    </ScrollView>
  );
}
