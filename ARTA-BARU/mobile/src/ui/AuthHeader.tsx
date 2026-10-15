import { Text, View } from 'react-native';

import { commonStyles } from './theme';

export function AuthHeader() {
  return (
    <View style={commonStyles.header} accessibilityRole="header">
      <View style={commonStyles.logoBadge}>
        <Text style={commonStyles.logoBadgeText}>A</Text>
      </View>
      <Text style={commonStyles.logoTitle}>ARTA</Text>
      <Text style={commonStyles.logoTag}>ATUR UANG · RAIH TUJUAN</Text>
    </View>
  );
}
