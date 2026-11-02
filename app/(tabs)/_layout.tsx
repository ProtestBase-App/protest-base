import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';

const TABS: { name: string; titleKey: string; icon: IconSymbolName; testID: string }[] = [
  { name: '(explore)', titleKey: 'tabs.explore', icon: 'magnifyingglass', testID: 'tab-explore' },
  { name: '(maps)', titleKey: 'tabs.map', icon: 'mappin.and.ellipse', testID: 'tab-maps' },
  { name: 'home', titleKey: 'tabs.home', icon: 'calendar', testID: 'tab-home' },
  { name: '(more)', titleKey: 'tabs.more', icon: 'ellipsis.circle.fill', testID: 'tab-more' },
];

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      {TABS.map(({ name, titleKey, icon, testID }, index) => {
        const title = t(titleKey);
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color }) => <IconSymbol size={28} name={icon} color={color} />,
              // Without a label Android reads the icon's glyph. iOS has no tab role, so the label
              // carries it, as React Navigation's English default does.
              tabBarAccessibilityLabel:
                Platform.OS === 'ios'
                  ? t('a11y.tabPosition', { title, position: index + 1, count: TABS.length })
                  : title,
              tabBarButtonTestID: testID,
            }}
          />
        );
      })}
    </Tabs>
  );
}
