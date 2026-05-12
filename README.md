# ProtestBase

A React Native mobile application that helps users discover and organize protest events in Belgium and the Netherlands. Built with Expo for iOS and Android.

[![CI](https://github.com/maticlav/protest-base/actions/workflows/ci.yml/badge.svg)](https://github.com/maticlav/protest-base/actions/workflows/ci.yml)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2055-blue)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.83-61dafb)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)](https://www.typescriptlang.org)

## Features

| Feature             | Description                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Event Discovery** | Browse, search, and filter upcoming protests and events                                                  |
| **Save Events**     | Keep track of events you're interested in (encrypted at rest)                                            |
| **Event Creation**  | Organizers can create, edit, and manage events                                                           |
| **Event Templates** | Save and reuse event templates for recurring protests                                                    |
| **Map Integration** | View event locations on OpenFreeMap (no Google dependency)                                               |
| **Deep Linking**    | Share event links that open directly in the app                                                          |
| **Multi-language**  | Full support for English, French, and Dutch                                                              |
| **Dark/Light Mode** | Automatic theme switching based on system preference                                                     |
| **App Integrity**   | Hardware Key Attestation (Android) + App Attest (iOS) — GrapheneOS-friendly, no Play Services dependency |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS: Xcode 15+ and CocoaPods
- Android: Android Studio with SDK 36+ (target SDK 36 / min SDK 24; Hardware Key Attestation requires API 28+ at runtime)
- [EAS CLI](https://docs.expo.dev/eas/) for cloud builds

### Installation

```bash
# Clone the repository
git clone https://github.com/maticlav/protest-base.git
cd protest-base

# Install dependencies
npm install

# Pull EAS environment variables for local dev (preferred)
eas env:pull --environment development

# Or copy the template and fill manually
cp .env.example .env.local
```

### Environment Variables

The full list lives in [`.env.example`](./.env.example). Minimum for local development:

```bash
APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://api-dev.protestbase.be   # host only, no /api
EXPO_PUBLIC_DEV_INTEGRITY_BYPASS=<shared-secret>          # see App Integrity section
```

Per build profile:

| Variable                             | development | preview                                  | production                               |
| ------------------------------------ | ----------- | ---------------------------------------- | ---------------------------------------- |
| `APP_ENV`                            | required    | required                                 | required                                 |
| `EXPO_PUBLIC_API_BASE_URL`           | required    | required                                 | required                                 |
| `EXPO_PUBLIC_DEV_INTEGRITY_BYPASS`   | required    | **must not be set**                      | **must not be set**                      |
| `EXPO_PUBLIC_ENABLE_FIXTURE_CAPTURE` | (auto-on)   | optional, opt-in for one-off test builds | optional, opt-in for one-off test builds |

There is **no API-key env var** — authentication uses install tokens minted via on-device attestation (see App Integrity below).

### Development

```bash
# Start Metro
npx expo start

# Run on a platform
npm run ios       # iOS simulator
npm run android   # Android emulator / connected device

# Quality checks (must pass before commit/push)
npx tsc --noEmit         # type check
npx prettier --check .   # formatting (use --write to auto-fix)
npm test                 # full test suite (Jest)
npm run lint             # eslint
```

## App Integrity

ProtestBase uses on-device attestation to authenticate every API call after the initial bootstrap. The backend rejects unauthenticated requests and tokens minted from untrusted clients.

| Platform   | Mechanism                           | Module                                                                            |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| iOS        | Apple App Attest                    | [`@expo/app-integrity`](https://docs.expo.dev/versions/latest/sdk/app-integrity/) |
| Android    | Hardware Key Attestation (KeyStore) | [`modules/expo-hka`](./modules/expo-hka) (local Expo module)                      |
| Dev builds | Shared-secret bypass header         | `X-Dev-Integrity-Bypass` — backend honors only when `NODE_ENV !== production`     |

### How it works

1. **Cold start** → app calls `GET /app/config` anonymously to discover the dynamic API prefix + version requirements.
2. **First run** → app calls `POST /auth/integrity/nonce`, then `POST /auth/integrity/attest` with a fresh attestation payload (App Attest assertion on iOS; Hardware Key Attestation cert chain on Android). Backend verifies the payload and issues a 7-day install token.
3. **Every subsequent request** → carries the install token in the `X-Install-Token` header. App refreshes the token proactively 24h before expiry.
4. **Auto-recovery** → certain backend rejection reasons (`unknown-key`, `signature-invalid`, `counter-replay`, `nonce-mismatch`) trigger a single transparent re-enrollment + retry before surfacing as a user-facing error.

### Why Hardware Key Attestation (Android)

We **don't** use Play Integrity. Android attestation goes through the AndroidKeyStore directly, which:

- Works on **GrapheneOS** (no Play Services dependency).
- Works on **EAS internal-distribution builds** (no Play Console install requirement).
- Allows the backend to verify the cert chain end-to-end against Google's hardware roots + a GrapheneOS allowlist.

The native module lives in [`modules/expo-hka/`](./modules/expo-hka).

## Project Structure

```
protest-base/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (auth)/                   # Authentication flow
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── home.tsx              # Saved events calendar
│   │   ├── (explore)/            # Event discovery & search
│   │   └── (more)/               # My events, templates, account, settings
│   ├── event/[id].tsx            # Event detail (dynamic route)
│   ├── event-edit/[id].tsx       # Event editing
│   └── _layout.tsx               # Root layout with providers
│
├── components/                   # Reusable UI components (ThemedText, EventList, FormField, …)
│   ├── integrity/                # Install-token UI (failed screen, gate)
│   ├── version/                  # Version-check UI (maintenance, force-update)
│   └── ui/                       # UI primitives (CTAButton, LoadingState, …)
│
├── context/                      # React Context providers
│   ├── GlobalProvider.tsx        # Auth state + events cache
│   ├── IntegrityProvider.tsx     # Install-token lifecycle
│   ├── VersionCheckProvider.tsx  # Min-version / maintenance enforcement
│   ├── SavedEventsProvider.tsx   # User's saved events (encrypted, 20-day retention)
│   └── …                         # Liked events, followed orgs, postal codes, etc.
│
├── modules/                      # Local Expo native modules
│   └── expo-hka/                 # Android Hardware Key Attestation (Kotlin)
│
├── services/                     # API & data services
│   ├── api.ts                    # Axios instance with install-token interceptors
│   ├── auth.service.ts           # Authentication
│   ├── event.service.ts          # Event CRUD + image upload (multipart)
│   ├── integrity.service.ts      # Attest flow + auto-recovery
│   └── …
│
├── utils/                        # Helpers (event filters, formatters, i18n, logger, …)
├── constants/                    # Colors, design tokens, locale files (en/fr/nl)
└── types/                        # TypeScript type definitions
```

## Architecture

### State Management

The app uses React Context with a hierarchical provider structure. Outer providers are bootstrap gates (network, version, integrity) that must resolve before authenticated UI mounts:

```
SafeAreaProvider
└── VersionCheckProvider → VersionGate           # checks /app/config, blocks if maintenance / below minimum
    └── IntegrityProvider → IntegrityGate        # mints install token, blocks if attestation fails
        └── GlobalProvider                       # auth state + events cache
            └── ConnectionGate                   # backend reachability
                └── domain providers …           # user orgs, saved events, templates, theme, etc.
```

### Authentication

- JWT access + refresh tokens stored in `expo-secure-store`.
- Session validated on app start; expired access tokens auto-refresh via a 401 interceptor.
- All authenticated requests additionally carry an install token (see App Integrity).

### Navigation

File-based routing with Expo Router:

- **Stack navigation** for auth and detail screens.
- **Tab navigation** for main app sections.
- **Deep linking** support for `protestbase.be/event/*` with URL validation.

## Build System

### Multi-Environment Setup

| Environment | Bundle ID                    | App Name                | Description               |
| ----------- | ---------------------------- | ----------------------- | ------------------------- |
| Development | `be.protestbase.app.dev`     | ProtestBase Development | Local development         |
| Preview     | `be.protestbase.app.preview` | ProtestBase Preview     | EAS internal-distribution |
| Production  | `be.protestbase.app`         | ProtestBase             | App Store / Play Store    |

`app.config.ts` is the single source of truth for native config (icons, bundle IDs, plugins, entitlements). There is no `app.json`.

### Automatic Builds (EAS)

Branch-scoped EAS workflows:

- **`preview` branch** → preview builds via `.eas/workflows/publish-preview-update.yml`.
- **`main` branch** → production builds via `.eas/workflows/create-production-builds.yml`.

### Manual Builds

```bash
# Preview builds (EAS internal distribution → adb install or Orbit)
eas build -p ios --profile preview
eas build -p android --profile preview

# Production builds (TestFlight / Play Console Internal Testing)
eas build -p ios --profile production
eas build -p android --profile production

# View build status
eas build:list --limit 10

# View a specific build
eas build:view <build-id>
```

## Testing

```bash
# Full test suite
npm test

# Specific file
npm test -- --testPathPattern="integrity.service"

# With coverage
npm test -- --coverage

# CI-style run (used by .github/workflows/ci.yml)
npm run test:ci
```

Tests use Jest with `jest-expo` preset and React Testing Library. Native modules in `modules/expo-hka` are validated only at build/runtime — Jest mocks them.

## Troubleshooting

### Clean Rebuild

```bash
# Remove all build artifacts
rm -rf node_modules ios android/build android/app/build .expo

# Reinstall and rebuild
npm install
npx expo install --check
npx expo prebuild
npx expo run:ios     # or run:android
```

### Common Issues

| Issue                                       | Solution                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Metro bundler stuck                         | `npx expo start --clear`                                                                                                                 |
| iOS build fails                             | `cd ios && pod install --repo-update`                                                                                                    |
| Android build fails                         | `cd android && ./gradlew clean`                                                                                                          |
| Type errors                                 | `npx tsc --noEmit`                                                                                                                       |
| "Cannot find native module 'ExpoHka'" (iOS) | Expected — the module is Android-only; iOS calls short-circuit via `getHkaNativeModule()` returning `null`.                              |
| Preview build "verification issues" on LAN  | Android 16+ blocks LAN access without the local-network permission. Use a public-HTTPS staging URL for `EXPO_PUBLIC_API_BASE_URL`.       |
| GrapheneOS "verification issues" on preview | Enable Settings → Apps → ProtestBase → Permissions → **Local network** if backend is on LAN; for public staging URL no toggle is needed. |

## Version Management

`app.config.ts` reads `version` from `package.json`, so native `versionName` updates automatically:

```bash
npm version patch --no-git-tag-version   # 3.0.0 → 3.0.1
npm version minor --no-git-tag-version   # 3.0.0 → 3.1.0
npm version major --no-git-tag-version   # 3.0.0 → 4.0.0
```

Commit the resulting `package.json` + `package-lock.json` diff. `--no-git-tag-version` skips the auto-tag; tagging happens via the release workflow.

## Tech Stack

| Category    | Technology                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework   | [Expo SDK 55](https://expo.dev)                                                                                      |
| UI          | [React Native 0.83](https://reactnative.dev)                                                                         |
| Navigation  | [Expo Router 6](https://docs.expo.dev/router/introduction/)                                                          |
| Language    | [TypeScript 5.9](https://www.typescriptlang.org)                                                                     |
| State       | React Context API                                                                                                    |
| HTTP        | [Axios](https://axios-http.com) + custom install-token interceptors                                                  |
| Maps        | [MapLibre React Native](https://github.com/maplibre/maplibre-react-native) + [OpenFreeMap](https://openfreemap.org)  |
| Storage     | AsyncStorage + SecureStore (with chunked-encryption for list payloads)                                               |
| Attestation | [`@expo/app-integrity`](https://docs.expo.dev/versions/latest/sdk/app-integrity/) (iOS) + local `expo-hka` (Android) |
| Testing     | Jest + React Testing Library                                                                                         |
