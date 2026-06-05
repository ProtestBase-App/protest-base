import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { t } from '@/utils/i18n';

export default function MoreLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Stack>
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
        <Stack.Screen
          name="event-templates"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.eventTemplates'),
            contentStyle: {
              backgroundColor: colorScheme === 'dark' ? Colors.dark.background : '#FFFFFF',
            },
          }}
        />
        <Stack.Screen
          name="draft-events"
          options={{
            headerShown: true,
            headerBackVisible: true,
            headerTitle: t('more.draftEvents'),
          }}
        />
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
