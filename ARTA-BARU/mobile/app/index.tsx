import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/ui/theme';

export default function Gate() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" accessibilityLabel="Memuat sesi" />
      </View>
    );
  }

  if (state.status === 'signed-in') {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login" />;
}
