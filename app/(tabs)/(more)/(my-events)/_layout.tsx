import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { t } from '@/utils/i18n';

export default function MyEventsLayout() {
  return (
    <Stack initialRouteName="my-events">
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
