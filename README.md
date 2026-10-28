# ProtestBase

[![CI](https://github.com/ProtestBase-App/protest-base/actions/workflows/ci.yml/badge.svg)](https://github.com/ProtestBase-App/protest-base/actions/workflows/ci.yml)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2058-blue)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61dafb)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)](https://www.typescriptlang.org)

A mobile app that helps people discover and organize protest events in Belgium, the Netherlands and Luxembourg. France is on the way: the app shows it as soon as our server supports it. Available on iOS and Android.

Website: **[protestbase.be](https://protestbase.be)**

## What it does

ProtestBase is a calendar of protests and demonstrations. Anyone can browse upcoming events, save the ones they're interested in, and get directions to the location. Verified organizers can publish their own events and reach a broader audience without depending on social-media gatekeepers.

The app is built around a simple idea: surfacing collective action shouldn't require giving up your privacy. Every feature is designed with that constraint in mind.

## Features

| Feature             | Description                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Event Discovery** | Browse, search, and filter upcoming protests in a list, a month calendar, or on a map        |
| **Save Events**     | Keep track of events you're interested in — encrypted on-device, never synced to our servers |
| **Reminders**       | Optional reminders for saved events, on the day or an hour before, scheduled on your phone   |
| **Follow & Like**   | Follow organizations and like events; both lists stay on your device                         |
| **Home Area**       | Pick a city, province or region to see nearby events first, without sharing your location    |
| **Event Creation**  | Verified organizers can create, edit, and manage events                                      |
| **Event Templates** | Save and reuse event templates for recurring protests                                        |
| **Map Integration** | View event locations on OpenFreeMap (no Google dependency)                                   |
| **Deep Linking**    | Share event links that open directly in the app                                              |
| **Multi-language**  | Full support for English, French, and Dutch                                                  |
| **Dark/Light Mode** | Automatic theme switching based on system preference                                         |

## Privacy

Privacy is the foundation the app is built on, not an afterthought. Here's what that actually means.

### Your data stays on your device

The events you save or like, the organizations you follow, your home area and your preferences stay on your phone. We never receive these lists, store them on our servers, or sync them across devices. Saved events, liked events and followed organizations live in your device's encrypted secure storage. When you filter events by your home area, that area is sent with the search, like any other filter.

### No tracking, no profiling

If you use ProtestBase without an account — which is the default — we collect no personal data about you. There are no third-party analytics SDKs, no advertising trackers, and no behavioral fingerprinting. The app does not require an account to function.

Like any server, ours sees your IP address. It is used briefly for rate limiting and abuse blocking, and our logs never keep it in full.

### Anonymous metrics only

The counters you see on events and organizations (views, saves, likes and followers) are totals, nothing more. Opening an event adds one view and is sent without your account, even if you are signed in. Saving, liking or following adds one to the total. We never store who saved, liked or followed what. For signed-in accounts the server keeps a temporary marker for 24 hours, only to stop the same account counting twice.

### Services outside our servers

A few features connect to other services. Each one sees your IP address:

- **Map tiles** load from [OpenFreeMap](https://openfreemap.org), which also sees which part of the map you are viewing.
- **App updates:** on launch the app checks Expo's update service for fixes we publish between store releases. That check includes a random ID that Expo's update library creates on your device the first time the app runs.
- **Feedback:** the feedback form opens [Tally](https://tally.so) in your browser.

Weather forecasts from [Open-Meteo](https://open-meteo.com) and address suggestions go through our server, so those services never see your device.

### GDPR-compliant European hosting

Our servers run in the European Union under GDPR. We don't sell your data, we don't share it with third parties, and we never will.

### Minimal app permissions

The app requests as little as possible from your device. Location, camera, and microphone access are deliberately **not** requested — the app does not need them. Everything else is optional and asked for only when you use the feature:

- **Notifications:** asked the first time you save an event, for reminders. Reminders are scheduled on your phone; we don't run a push server.
- **Calendar:** used only when you tap "Add to Calendar" on an event.
- **Photos:** used only when you attach an image to an event you're creating. On Android the system photo picker is used, so no photo permission is needed.

### Organizer accounts

Verified organizers do log in to manage events. For those accounts we store login credentials (standard security) and the event data they publish. Everything in the sections above still applies to users who don't log in.

### Verifiable

Our source code is publicly available so anyone can audit how we handle data. Trust, but verify.

## Security

- **Organizer accounts:** creating, editing and publishing events requires a signed-in session with short-lived access tokens and rotating refresh tokens, kept in the device's encrypted secure storage.
- **API access:** the app identifies itself to the API with a static app key. It only filters out anonymous scanner traffic and is not treated as a security boundary: the backend relies on user sessions, rate limiting and automatic abuse blocking instead.
- **No device identifiers on our servers:** requests to our API never carry a device or install ID, only the app key and app version, plus your session when you are signed in. The one install ID the app holds belongs to Expo's update library and goes only to Expo's update service (see [Services outside our servers](#services-outside-our-servers)).

## Tech Stack

| Category      | Technology                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Framework     | [Expo SDK 58](https://expo.dev)                                                                                     |
| UI            | [React Native 0.88](https://reactnative.dev)                                                                        |
| Navigation    | [Expo Router 58](https://docs.expo.dev/router/introduction/) (SDK-aligned versioning)                               |
| Language      | [TypeScript 6.0](https://www.typescriptlang.org)                                                                    |
| State         | React Context API                                                                                                   |
| HTTP          | [Axios](https://axios-http.com) + JWT refresh interceptors                                                          |
| Maps          | [MapLibre React Native](https://github.com/maplibre/maplibre-react-native) + [OpenFreeMap](https://openfreemap.org) |
| Storage       | AsyncStorage + SecureStore (with chunked encryption for list payloads)                                              |
| Notifications | [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) (local reminders only)               |
| Testing       | Jest 30 + React Native Testing Library, [Maestro](https://maestro.dev) for end-to-end tests                         |
