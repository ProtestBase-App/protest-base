# ProtestBase

[![CI](https://github.com/ProtestBase-App/protest-base/actions/workflows/ci.yml/badge.svg)](https://github.com/ProtestBase-App/protest-base/actions/workflows/ci.yml)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2055-blue)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.83-61dafb)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)](https://www.typescriptlang.org)

A mobile app that helps people discover and organize protest events in Belgium and the Netherlands. Available on iOS and Android.

Website: **[protestbase.be](https://protestbase.be)**

## What it does

ProtestBase is a calendar of protests and demonstrations. Anyone can browse upcoming events, save the ones they're interested in, and get directions to the location. Verified organizers can publish their own events and reach a broader audience without depending on social-media gatekeepers.

The app is built around a simple idea: surfacing collective action shouldn't require giving up your privacy. Every feature is designed with that constraint in mind.

## Features

| Feature             | Description                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Event Discovery** | Browse, search, and filter upcoming protests and events                                                  |
| **Save Events**     | Keep track of events you're interested in — encrypted on-device, never synced to our servers             |
| **Event Creation**  | Verified organizers can create, edit, and manage events                                                  |
| **Event Templates** | Save and reuse event templates for recurring protests                                                    |
| **Map Integration** | View event locations on OpenFreeMap (no Google dependency)                                               |
| **Deep Linking**    | Share event links that open directly in the app                                                          |
| **Multi-language**  | Full support for English, French, and Dutch                                                              |
| **Dark/Light Mode** | Automatic theme switching based on system preference                                                     |
| **App Integrity**   | Hardware Key Attestation (Android) + App Attest (iOS) — GrapheneOS-friendly, no Play Services dependency |

## Privacy

Privacy is the foundation the app is built on, not an afterthought. Here's what that actually means.

### Your data stays on your device

When you save an event, set your preferences, or browse the calendar, that information stays on your phone. We never see it, store it on our servers, or sync it across devices. Your saved events list lives in your device's encrypted secure storage.

### No tracking, no profiling

If you use ProtestBase without an account — which is the default — we collect no personal data about you. There are no third-party analytics SDKs, no advertising trackers, and no behavioral fingerprinting. The app does not require an account to function.

### Anonymous metrics only

The view counter you see on events records that _someone_ opened the event. It does not record _who_. We don't tie views to devices, accounts, or sessions.

### GDPR-compliant European hosting

Our servers run in the European Union under GDPR. We don't sell your data, we don't share it with third parties, and we never will.

### Minimal app permissions

The app requests as little as possible from your device. Location, camera, and microphone access are deliberately **not** requested — the app does not need them. Photo access is only used when you choose to attach an image to an event you're creating. Calendar access is optional and only used to add events you've explicitly saved.

### Organizer accounts

Verified organizers do log in to manage events. For those accounts we store login credentials (standard security) and the event data they publish. Everything in the sections above still applies to users who don't log in.

### Verifiable

Our source code is publicly available so anyone can audit how we handle data. Trust, but verify.

## Security & App Integrity

Authentication runs on on-device attestation, not floating API keys. At enrollment the app proves possession of a hardware-backed key by signing a server challenge (App Attest on iOS, AndroidKeyStore attestation on Android); the backend verifies it and issues a short-lived per-install token. Each subsequent API call carries that install token, so backend access stays bound to an attested install rather than a shared, copyable API key.

| Platform | Mechanism                           |
| -------- | ----------------------------------- |
| iOS      | Apple App Attest                    |
| Android  | Hardware Key Attestation (KeyStore) |

On Android we deliberately **do not** use Google Play Integrity. Attestation goes through the AndroidKeyStore directly, which means:

- It works on **GrapheneOS** and other privacy-focused Android distributions — no Google Play Services dependency.
- It works on devices that sideload the app — no Play Store install requirement.
- The backend can verify the certificate chain end-to-end against Google's hardware roots plus a GrapheneOS allowlist.

This is an unusual choice for an app distributed through the Play Store. We made it deliberately: supporting users who opt out of the Google ecosystem mattered more than relying on a service that locks them out.

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
| Storage     | AsyncStorage + SecureStore (with chunked encryption for list payloads)                                               |
| Attestation | [`@expo/app-integrity`](https://docs.expo.dev/versions/latest/sdk/app-integrity/) (iOS) + local `expo-hka` (Android) |
| Testing     | Jest + React Testing Library                                                                                         |
