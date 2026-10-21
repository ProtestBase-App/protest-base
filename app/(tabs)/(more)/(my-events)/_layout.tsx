import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { t } from '@/utils/i18n';

export const unstable_settings = {
  anchor: 'my-events',
};

export default function MyEventsLayout() {
  // Opaque headers: SDK 58's iOS 26+ default would put content under them.
  return (
    <Stack screenOptions={{ headerTransparent: false }}>
      <Stack.Screen
        name="my-events"
        options={{
          headerShown: true,
          headerTitle: t('more.myEvents'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      {/* The upcoming timeline renders its own brand header (June 2026 redesign). */}
      <Stack.Screen name="upcoming" options={{ headerShown: false }} />
      <Stack.Screen
        name="past"
        options={{
          headerShown: true,
          headerTitle: t('myEvents.listHeaderPast'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
    </Stack>
  );
}
