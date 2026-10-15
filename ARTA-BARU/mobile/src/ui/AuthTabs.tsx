import { Pressable, Text, View } from 'react-native';

import { commonStyles } from './theme';

interface AuthTabsProps {
  activeTab: 'login' | 'register';
  onSelectTab: (tab: 'login' | 'register') => void;
}

export function AuthTabs({ activeTab, onSelectTab }: AuthTabsProps) {
  return (
    <View style={commonStyles.tabs} accessibilityRole="tablist">
      <Pressable
        style={[
          commonStyles.tab,
          activeTab === 'login' ? commonStyles.tabActive : null,
        ]}
        accessibilityRole="tab"
        accessibilityLabel="Tab Masuk"
        accessibilityState={{ selected: activeTab === 'login' }}
        onPress={() => onSelectTab('login')}
      >
        <Text
          style={[
            commonStyles.tabText,
            activeTab === 'login' ? commonStyles.tabTextActive : null,
          ]}
        >
          Masuk
        </Text>
      </Pressable>
      <Pressable
        style={[
          commonStyles.tab,
          activeTab === 'register' ? commonStyles.tabActive : null,
        ]}
        accessibilityRole="tab"
        accessibilityLabel="Tab Daftar"
        accessibilityState={{ selected: activeTab === 'register' }}
        onPress={() => onSelectTab('register')}
      >
        <Text
          style={[
            commonStyles.tabText,
            activeTab === 'register' ? commonStyles.tabTextActive : null,
          ]}
        >
          Daftar
        </Text>
      </Pressable>
    </View>
  );
}
