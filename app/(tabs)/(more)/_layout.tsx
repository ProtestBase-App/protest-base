import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';

// Without an anchor, a rebuilt tab state (e.g. after login) opens the (my-events)
// group instead of the More hub: expo-router sorts route groups first.
export const unstable_settings = {
  anchor: 'more',
};

export default function MoreLayout() {
  const colorScheme = useColorScheme();

  // Opaque headers: SDK 58's iOS 26+ default would put content under them.
  return (
    <>
      <Stack screenOptions={{ headerTransparent: false }}>
        <Stack.Screen name="more" options={{ headerShown: false }} />
        <Stack.Screen
          name="create-event-options"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.createEvent'),
          }}
        />
        <Stack.Screen
          name="create-event"
          options={{
            presentation: 'modal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.about'),
          }}
        />
        <Stack.Screen
          name="terms-and-conditions"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.termsAndConditions'),
          }}
        />
        <Stack.Screen
          name="privacy-center"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.privacyCenter'),
          }}
        />
        <Stack.Screen
          name="home-area"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('homeArea.title'),
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.account'),
          }}
        />
        <Stack.Screen
          name="account-info"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.accountInfo'),
          }}
        />
        <Stack.Screen
          name="delete-account"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="become-organizer"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.becomeOrganizer'),
          }}
        />
        {/* The templates launchpad renders its own brand header (June 2026 redesign). */}
        <Stack.Screen name="event-templates" options={{ headerShown: false }} />
        {/* The drafts list renders its own brand header (June 2026 redesign). */}
        <Stack.Screen name="draft-events" options={{ headerShown: false }} />
        <Stack.Screen
          name="create-template"
          options={{
            presentation: 'modal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="edit-template/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(my-events)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
