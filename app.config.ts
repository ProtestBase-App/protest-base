import { ExpoConfig } from 'expo/config';
import { withAndroidManifest, AndroidConfig, type ConfigPlugin } from 'expo/config-plugins';
import { version } from './package.json';

// Disable Android backup so the app's local data (plaintext AsyncStorage:
// event drafts, cached lists, selected-org id) cannot be exfiltrated via
// Google cloud Auto Backup or `adb backup`. With allowBackup=false the older
// fullBackupContent and the Android 12+ dataExtractionRules are both moot, so
// removing the data is enough. Requires a fresh native build to take effect.
const withDisabledAndroidBackup: ConfigPlugin = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:allowBackup'] = 'false';
    return cfg;
  });

// EAS project identifiers — set via environment variables or replace the defaults below.
// You can find them at https://expo.dev/accounts/[account]/projects/[project].
const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '69a8218a-b465-44e8-bcc5-b7f7d61d427d';
const PROJECT_SLUG = process.env.EXPO_PUBLIC_PROJECT_SLUG || 'protest-base';
const OWNER = process.env.EXPO_PUBLIC_EAS_OWNER || 'protestbase';

// App production config
const APP_NAME = 'ProtestBase';
const BUNDLE_IDENTIFIER = 'be.protestbase.app';
const PACKAGE_NAME = 'be.protestbase.app';
const ICON = './assets/images/icons/iOS.png';
const ADAPTIVE_ICON = './assets/images/icons/Android.png';
const SCHEME = 'protest-base';

export default (): ExpoConfig => {
  console.log('⚙️ Building app for environment:', process.env.APP_ENV);
  const appEnv = (process.env.APP_ENV as 'development' | 'preview' | 'production') || 'development';
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(appEnv);

  const config: ExpoConfig = {
    name: name,
    version: version,
    slug: PROJECT_SLUG,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: icon,
    scheme: scheme,
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleIdentifier,
      associatedDomains: ['applinks:protestbase.be'],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      entitlements: {
        // App Attest environment. Production builds talk to Apple's production
        // attestation service; everything else uses the development service so
        // physical-device test installs (TestFlight, dev clients) keep working.
        // Non-prod builds skip attestation entirely via the bypass flow, but the
        // entitlement still has to be declared for the app to link.
        'com.apple.developer.devicecheck.appattest-environment':
          appEnv === 'production' ? 'production' : 'development',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: '#ffffff',
      },
      package: packageName,
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'protestbase.be',
              pathPrefix: '/event',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: EAS_PROJECT_ID,
      },
      // Surfaced to runtime via Constants.expoConfig?.extra so services can
      // branch on environment and read integrity-related build params.
      appEnv,
      // Only embed the dev-bypass secret in development bundles. The runtime
      // consumers (services/api.ts, services/integrity.service.ts) already send
      // it only in bypass mode, and the backend honors it only when its own
      // NODE_ENV !== 'production'. Gating the embed here adds defense in depth:
      // the secret can never be serialized into a preview/production JS bundle —
      // and read out of it by anyone who unzips the binary — even if the EAS
      // environment variable is accidentally scoped to those profiles.
      devIntegrityBypass:
        appEnv === 'development' ? process.env.EXPO_PUBLIC_DEV_INTEGRITY_BYPASS : undefined,
    },
    plugins: [
      'expo-router',
      [
        'expo-secure-store',
        {
          faceIDPermission: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-font',
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to add a picture when creating an event.',
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        'expo-calendar',
        {
          calendarPermission: 'The app needs to access your calendar.',
          remindersPermission: 'The app needs to access your reminders to add events.',
        },
      ],
      'expo-localization',
      'expo-web-browser',
      '@react-native-community/datetimepicker',
      'expo-image',
      '@maplibre/maplibre-react-native',
      [
        'expo-notifications',
        {
          icon: './assets/images/icons/notification-icon.png',
          color: '#E8445A',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            ...(appEnv !== 'production' && { usesCleartextTraffic: true }),
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    owner: OWNER,
  };

  // Apply the manifest mod here rather than via the typed `plugins` array
  // (ExpoConfig['plugins'] does not accept inline function plugins). Expo runs
  // the attached mod during prebuild.
  return withDisabledAndroidBackup(config) as ExpoConfig;
};

// Dynamically configure the app based on the environment.
// Update these placeholders with your actual values.
export const getDynamicAppConfig = (environment: 'development' | 'preview' | 'production') => {
  if (environment === 'production') {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME,
    };
  }

  if (environment === 'preview') {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: './assets/images/icons/iOS-Prev.png',
      adaptiveIcon: './assets/images/icons/Android-Prev.png',
      scheme: `${SCHEME}-prev`,
    };
  }

  return {
    name: `${APP_NAME} Development`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: './assets/images/icons/iOS-Prev.png',
    adaptiveIcon: './assets/images/icons/Android-Prev.png',
    scheme: `${SCHEME}-dev`,
  };
};
