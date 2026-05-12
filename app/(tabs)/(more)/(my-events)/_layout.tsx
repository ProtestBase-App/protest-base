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
      <Stack.Screen
        name="upcoming"
        options={{
          headerShown: true,
          headerTitle: t('myEvents.listHeaderUpcoming'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
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
