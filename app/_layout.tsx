import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { logger } from '@/utils/logger';
import GlobalProvider, { useGlobalContext } from '@/context/GlobalProvider';
import { SavedEventsProvider } from '@/context/SavedEventsProvider';
import { LikedEventsProvider } from '@/context/LikedEventsProvider';
import { FollowedOrgsProvider } from '@/context/FollowedOrgsProvider';
import { PostalCodeProvider } from '@/context/PostalCodeProvider';
import { PastEventsProvider } from '@/context/PastEventsProvider';
import { TemplatesProvider } from '@/context/TemplatesProvider';
import { OrganizationsProvider } from '@/context/OrganizationsProvider';
import { UserOrganizationsProvider } from '@/context/UserOrganizationsProvider';
import { ExploreTabProvider } from '@/context/ExploreTabProvider';
import { VersionCheckProvider } from '@/context/VersionCheckProvider';
import { VersionGate } from '@/components/version';
import { IntegrityProvider } from '@/context/IntegrityProvider';
import { IntegrityGate } from '@/components/integrity';
import { ConnectionGate } from '@/components/connection';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, error] = useFonts({
    'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins-ExtraLight.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins-Thin.ttf'),
  });

  useEffect(() => {
    if (error) {
      logger.error('[RootLayout] Font loading failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const buttonStyle = colorScheme === 'dark' ? 'light' : 'dark';
      NavigationBar.setButtonStyleAsync(buttonStyle).catch(() => {});
    }
  }, [colorScheme]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* VersionCheckProvider MUST be outermost - before GlobalProvider */}
      {/* This ensures version check happens BEFORE authentication */}
      <VersionCheckProvider>
        <VersionGate>
          {/* IntegrityGate runs after the version check (which uses /app/config */}
          {/* on the bootstrap path) but before GlobalProvider so the install token */}
          {/* exists for every authenticated request. */}
          <IntegrityProvider>
            <IntegrityGate>
              <GlobalProvider>
                <ConnectionGate>
                  <UserOrganizationsProvider>
                    <SavedEventsProvider>
                      <LikedEventsProvider>
                        <FollowedOrgsProvider>
                          <PastEventsProvider>
                            <TemplatesProvider>
                              <OrganizationsProvider>
                                <PostalCodeProvider>
                                  <ThemeProvider
                                    value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
                                  >
                                    <ExploreTabProvider>
                                      <RootNavigator />
                                      <StatusBar
                                        style={colorScheme === 'dark' ? 'light' : 'dark'}
                                      />
                                    </ExploreTabProvider>
                                  </ThemeProvider>
                                </PostalCodeProvider>
                              </OrganizationsProvider>
                            </TemplatesProvider>
                          </PastEventsProvider>
                        </FollowedOrgsProvider>
                      </LikedEventsProvider>
                    </SavedEventsProvider>
                  </UserOrganizationsProvider>
                </ConnectionGate>
              </GlobalProvider>
            </IntegrityGate>
          </IntegrityProvider>
        </VersionGate>
      </VersionCheckProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isLogged } = useGlobalContext();

  return (
    <Stack>
      {/* Auth screens: only accessible when NOT logged in */}
      <Stack.Protected guard={!isLogged}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Edit screen: only accessible when logged in */}
      <Stack.Protected guard={isLogged}>
        <Stack.Screen name="event-edit/[id]" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Public routes: always accessible */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="organizer/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="report-event"
        options={{
          headerShown: true,
          headerTitle: 'Report Event',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
