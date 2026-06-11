# ProtestBase — Mobile Security Audit (June 2026)

**Scope:** the full Expo / React Native client (branch `v3.1.0`).
**Attacker model:** the realistic mobile threat model — the attacker fully
controls the device (rooted/jailbroken, debugger attached), can intercept and
modify traffic on a hostile Wi‑Fi (MITM), and can unzip and read the shipped
binary. Corollary: **there is no client‑side secret**; anything that must stay
private lives server‑side behind authenticated requests.

**Method:** a 12‑surface parallel audit (secrets/bundle, on‑device storage,
auth/session, integrity attestation, untrusted entry points, WebView/browser,
transport, OTA updates, permissions/privacy, logging/source‑maps, dependencies,
client‑side authorization), then adversarial verification of every finding
(each was re‑checked against the real code and refuted where the evidence or
attack did not hold), then a completeness‑critic pass. 46 raw findings → 45
after dedup → **43 confirmed, 2 refuted**, plus 1 additional finding surfaced by
the critic and verified by hand (historical Google Maps key). 144 surfaces were
checked and found clean.

## Headline

**No Critical and no High findings.** This is a mature, security‑conscious
codebase: tokens are in the Keychain/Keystore, the politically sensitive
"interest" lists (saved/liked events, followed orgs) are already encrypted at
rest, production logging is compiled out, deep‑link validation is thorough, iOS
ATS is locked down, there is no WebView, no push SDK, and no analytics/crash
SDK. The realistic residual issues are **MITM‑gated** (require breaking TLS) or
**device‑local** (require a rooted or stolen‑unlocked device). The single most
impactful exploitable issue — a forced‑update screen that opened a
server‑supplied URL with no validation (MITM phishing redirect) — is fixed.

Severity is calibrated to the attacker model: a remotely exploitable account
takeover would outrank a plaintext‑storage issue needing a rooted device — but
no such remote ATO exists here.

| Severity         | Count             | Status                                          |
| ---------------- | ----------------- | ----------------------------------------------- |
| Critical         | 0                 | —                                               |
| High             | 0                 | —                                               |
| Medium           | 6 (≈4 distinct)   | 1 fixed, 1 mitigated, 4 documented (config/ops) |
| Low              | ~17 (≈9 distinct) | 4 fixed, rest documented                        |
| Info / hardening | ~20               | selected fixes + documented                     |

---

## Findings (deduplicated by root cause)

Attacker models: **MITM** (hostile network, requires breaking TLS),
**device‑local** (rooted / stolen‑unlocked device / malicious co‑resident app),
**remote** (any user via the API), **repo‑access**, **supply‑chain**.

### Medium

**M1 — No TLS certificate/public‑key pinning.** _(MITM. Documented — see
Recommendations.)_
`services/api.ts:92‑98` (shared axios), `:296‑300` (raw refresh),
`services/integrity.service.ts` (raw nonce/attest). All HTTP clients rely solely
on platform trust‑store validation. An attacker who installs a trusted CA (a
realistic posture for a protest app facing corporate/nation‑state networks, and
trivially possible on iOS once a user is socially‑engineered into trusting a
profile) can transparently MITM auth, refresh, and attestation traffic. Pinning
is **not** implemented here because it requires real pin material and a rotation
strategy; blind pinning risks bricking the app on cert rotation. See
Recommendations → "TLS pinning".

**M2 — `android:allowBackup` defaulted to true.** _(device‑local. **Fixed** —
rebuild required.)_
`app.config.ts` previously declared no `android:allowBackup`, so Expo's default
(`true`) shipped. Plaintext AsyncStorage (event drafts, cached lists,
`selectedOrganizationId`, event counts) could be exfiltrated via Google cloud
Auto Backup or `adb backup`. **Fixed** by a config plugin that sets
`android:allowBackup="false"` in the manifest.

**M3 — Plaintext AsyncStorage for drafts and caches.** _(device‑local.
Mitigated; full migration documented.)_
`services/localStorageService.ts:240‑254` (event draft),
`context/PastEventsProvider.tsx`, `context/TemplatesProvider.tsx`,
`STORAGE_KEYS.SELECTED_ORGANIZATION_ID`. These are not credentials, but for a
protest app a draft's location/title is sensitive. The most sensitive lists are
_already_ encrypted (`services/secureListStorage.ts`). The backup vector is now
closed by M2; the residual (a rooted device reading files directly — where even
SecureStore is bypassable) is documented as a migration recommendation.

**M4 — OTA updates are not code‑signed.** _(supply‑chain. Documented.)_
`app.config.ts` `updates` block sets only `url`; no
`codeSigningCertificate`/`codeSigningMetadata`. Update integrity rests entirely
on TLS to `u.expo.dev` plus EAS account security — an EAS account compromise
could push arbitrary JS to all installs. Enabling expo‑updates code signing
requires generating and operating a signing key; documented in Recommendations.

**M5 — Client‑side edit/delete authorization is UX‑only.** _(remote. Server
enforcement required; not client‑fixable.)_
`utils/eventPermissions.ts` (`canUserEditEvent`/`canUserDeleteEvent`),
`app/event-edit/[id].tsx`. The client correctly treats these as UX gating
(hiding buttons). Real protection **must** be server‑side on
`PATCH`/`DELETE /events/:id`; this cannot be verified from the client. Flagged
so the backend owner confirms enforcement. The mutation calls carry the user's
bearer token, which is the right shape for server‑side checks.

### Low (selected)

**L1 — Server/organizer‑controlled URLs opened via `Linking.openURL` with no
scheme allowlist.** _(MITM + remote. **Fixed.**)_
`services/version.service.ts:153` (`openUpdateUrl` — `updateUrl` comes from the
anonymous, integrity‑exempt `/app/config`, and is wired to a **blocking**
forced‑update screen) and `app/organizer/[id].tsx:450` (organizer‑supplied
`website_url`). `Linking.openURL` dispatches any scheme the device handles, so a
tampered `/app/config` (MITM) could pair `forceUpdate: true` with a phishing
URL, or a malicious organizer could set a non‑web scheme. **Fixed** via
`utils/urlSafety.ts`: the update URL now goes through `openStoreUrlSafely`
(https on App Store / Play Store hosts, or store‑app schemes only) and the
organizer site through `openExternalUrlSafely` (http/https only) — matching the
guard `components/EventDetailed.tsx` and `components/SettingsButton.tsx` already
applied.

**L2 — Historical leaked secrets in git (not on the public remote).**
_(repo‑access. **Rotation required** — see Recommendations; not git‑fixable from
here.)_
Two secrets survive in local‑only history:

- iOS distribution‑certificate PKCS#12 password (`a155f62:credentials.json` —
  value `ExokmqdvkXpa+aVywIjMrA==`; the `.p12` itself was never committed).
- Google Maps API key `AIzaSyB…g0Bbc` at `16708bc` (`app.json`) and `d6ac450`
  (`AndroidManifest.xml`, `AppDelegate.mm`) — no longer used (the app moved to
  keyless MapLibre/OpenFreeMap).

**Verified:** neither secret is in the current working tree, and **neither
commit is reachable from `origin/main` or `origin/v3.1.0`** — the remote
publishes only those two branches and **zero tags**. Both secrets live only on
local tags (`v1.x`–`v2.0.3`, `pre-purge-backup-20260420-000056`) and
`refs/stash`. They are therefore not currently public, but a single
`git push --tags` would publish both. Rotate the credentials and quarantine the
pre‑purge refs (Recommendations). Severity is **Low** because the secrets are
not on the public remote and the dist‑cert password is inert without the
(never‑committed) `.p12`; rotation is still warranted because both were exposed
historically and any prior clone retains them.

**L3 — Dev integrity‑bypass secret inlined into the bundle unconditionally.**
_(device‑local. **Fixed** — rebuild required.)_
`app.config.ts` copied `EXPO_PUBLIC_DEV_INTEGRITY_BYPASS` into `extra` for every
environment. Runtime consumers only _send_ it in bypass (development) mode and
the backend honors it only when its own `NODE_ENV !== 'production'`, so blast
radius was already bounded to non‑prod backends — but the embed itself had no
`appEnv` guard, so a mis‑scoped EAS variable could have baked the secret into a
preview/production bundle. **Fixed:** the value is now embedded only when
`appEnv === 'development'`.

**L4 — SecureStore writes used default keychain accessibility.** _(device‑local.
**Fixed.**)_
Auth tokens, install token, integrity keyId, and the encrypted interest lists
were written without `keychainAccessible`, so entries defaulted to a
device‑migratable class. **Fixed:** all writes now use
`WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`utils/secureStoreOptions.ts`) — same
unlock semantics, but the items are excluded from encrypted device‑transfer
backups, so a forensic migration cannot lift tokens or interest lists onto
another device.

**L5 — EXIF/GPS not stripped from already‑small uploaded images.** _(remote.
**Fixed.**)_
`utils/imageOptimization.ts` returned the original asset for images already
under the size/dimension limits, preserving camera EXIF/GPS. For a protest app
this leaks the uploader's location. **Fixed:** images are now re‑encoded in
every case (empty action list when no resize is needed), which strips metadata,
while keeping the resize fast‑path benefit (no resize when unnecessary).

**L6 — Logout swallows a server‑side session‑revocation failure.** _(device‑local.
Documented.)_ `services/auth.service.ts:77‑100`: if `POST /auth/logout` fails,
local tokens are still cleared (good) but the failure is swallowed and logout
reports success. Local clearing is the safer default; a stale server session is
low‑risk because the refresh token is gone from the device. Consider surfacing a
soft warning. No behavior change made.

**L7 — Deep‑link validation only on cold‑start initial URL.** _(remote.
Documented.)_ `app/index.tsx` validates the initial URL via
`parseEventDeepLink`, but warm‑start in‑app links and the raw route param reach
`getEventByIdBackend(eventId)` unsanitized. The server validates IDs, and the
event‑id format is constrained, so impact is low; adding an `isValidEventId`
guard at the fetch site is a cheap defense‑in‑depth follow‑up.

**L8 — No FLAG_SECURE / screenshot & app‑switcher protection.** _(device‑local.
Documented.)_ Sensitive screens (saved‑protests list, sign‑in) are capturable in
the app‑switcher snapshot and screenshots. `expo-screen-capture` +
`FLAG_SECURE` would harden this, at the cost of blocking legitimate screenshots
— a UX decision left to the team.

**L9 — Dev/CI supply‑chain notes.** _(supply‑chain. Documented.)_
`shell-quote@1.8.3` (GHSA‑w7jw‑789q‑3m8p) is present **dev‑only** via
`react-native → react-devtools-core` (not in the production bundle) and may trip
the CI critical‑audit gate; `uuid@7.0.3` (GHSA‑w5hq‑g745‑h8pq) is build‑time
only via `xcode → @expo/config-plugins`. CI runs third‑party actions from
mutable refs (`trufflehog@main`, `npx expo-doctor@latest`) — pin to digests.

### Info / hardening (selected)

- **README overstated the integrity mechanism** — claimed "every API call …
  signed by a hardware‑backed key"; the code uses a static `X-Install-Token`
  bearer (the hardware key signs only the enrollment challenge). **Fixed:**
  README now describes the actual challenge‑response‑then‑install‑token design.
- **Sign‑in email used lowercase `autocomplete="email"`** (silently dropped by
  RN due to the `FormFieldProps` index signature). **Fixed** → `autoComplete`.
- Android `usesCleartextTraffic` is enabled for **all non‑production** builds
  (incl. tester‑distributed preview that carries real bearers) — consider
  limiting to `development` only.
- API base‑URL scheme is not asserted `https` in code (relies on ATS/cleartext
  defaults); request interceptor attaches the bearer/install‑token without a
  host guard (safe today because all calls are same‑host relative paths — keep
  it that way).
- Version/maintenance gate **fails open** (a network attacker can suppress a
  forced‑update or maintenance block by dropping `/app/config`). This is a
  deliberate availability tradeoff; documented.
- `react-native-webview` is a declared dependency but **never imported** —
  remove to shrink the bundle and attack surface.
- Unused iOS Reminders usage strings shipped (`expo-calendar` `remindersPermission`)
  though no Reminders API is called — drop if unused.
- Feedback/onboarding forms route to third parties (`tally.so`, `cryptpad.fr`)
  and map tiles to `tiles.openfreemap.org` (IP↔viewed‑protest correlation).
  Hardcoded constants, user‑initiated; noted for the privacy posture.

### Refuted (2)

- "Client sends an attacker‑controlled `environment` field in the attestation
  payload" — the field exists but the backend is the trust authority; a
  client‑asserted environment is not a vulnerability.
- "Draft event visibility relies entirely on server‑side status filtering" —
  the client does no draft filtering, but draft authorization is a server
  responsibility (correctly out of client scope); no client‑side defect.

---

## Fixes implemented (this change set)

All fixes are minimal and behavior‑preserving. CI after the change:
`tsc --noEmit` clean, `prettier --check .` clean, **3097/3097 Jest tests pass**,
`eslint` 0 errors.

| #   | Fix                                                                                                            | Files                                                                                                            | Attacker model closed      | Rebuild?                   |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------- |
| 1   | **URL scheme/host allowlist** for untrusted `Linking.openURL` sinks (forced‑update + organizer site)           | `utils/urlSafety.ts` (new, +tests), `services/version.service.ts`, `app/organizer/[id].tsx`                      | MITM / remote              | No                         |
| 2   | **Gate dev‑bypass secret on `appEnv === 'development'`** so it can never enter a preview/prod bundle           | `app.config.ts`                                                                                                  | device‑local / repo‑access | **Yes** (config)           |
| 3   | **`WHEN_UNLOCKED_THIS_DEVICE_ONLY`** on every SecureStore write (tokens, install token, keyId, interest lists) | `utils/secureStoreOptions.ts` (new), `auth.service.ts`, `api.ts`, `integrity.service.ts`, `secureListStorage.ts` | device‑local               | No (applies on next write) |
| 4   | **`android:allowBackup="false"`** via config plugin                                                            | `app.config.ts`                                                                                                  | device‑local               | **Yes** (native)           |
| 5   | **Strip EXIF/GPS** from uploaded images on the fast‑path                                                       | `utils/imageOptimization.ts` (+test)                                                                             | remote                     | No                         |
| 6   | **Correct README** integrity claim to match the implementation                                                 | `README.md`                                                                                                      | (honesty)                  | No                         |
| 7   | **Fix dropped `autoComplete`** on the sign‑in email field                                                      | `app/(auth)/sign-in.tsx`                                                                                         | (input hygiene)            | No                         |

> **Rebuild note:** fixes #2 and #4 are app‑config / native‑manifest changes. A
> managed Expo build only applies them through a fresh native build
> (`expo prebuild` + a new EAS build); they cannot be verified on an existing
> binary or OTA update. Verify on the next preview/production build:
> `android:allowBackup="false"` in the merged `AndroidManifest.xml`, and that
> `Constants.expoConfig.extra.devIntegrityBypass` is `undefined` in a
> preview/production bundle.

---

## Recommendations not implemented (need keys, ops decisions, or git‑history surgery)

1. **Rotate the two historical secrets and quarantine pre‑purge refs.**
   Revoke the leaked iOS distribution certificate (Apple Developer portal) and
   check/restrict/rotate the Google Maps key `AIzaSyB…g0Bbc` in Google Cloud
   Console (it may still be billable). Delete the local tags
   `pre-purge-backup-20260420-000056` and `v1.x`–`v2.x`, and drop the WIP stash,
   from any machine that could `git push --tags`. _(Git‑history writes are
   intentionally not performed by this audit per repo policy.)_
2. **TLS certificate pinning** for the API host(s). Pin a leaf or, preferably,
   an intermediate/backup public‑key set, with a documented rotation runbook.
   Implementable via `expo-build-properties` (Android `networkSecurityConfig`)
   - iOS pinning, or a native module. Ship the backup pin first to avoid
     bricking on rotation.
3. **expo‑updates code signing** (`codeSigningCertificate` + metadata) so a
   compromised EAS account cannot push unsigned JS to installs.
4. **Confirm server‑side authorization** on event edit/delete and draft
   visibility (M5) — the only real protection; client checks are UX.
5. **Audit the preview OTA publish workflow** — `CLAUDE.md` references a
   `.eas/workflows/publish-preview-update.yml` on a `preview` branch that does
   not exist on the remote. Confirm any `eas update` job's channel scoping
   (preview must not publish to production) or correct the stale doc.
6. Optional hardening: migrate drafts/caches to SecureStore (M3); add
   `FLAG_SECURE` on sensitive screens (L8); limit Android cleartext to
   `development`; remove the unused `react-native-webview` dependency; pin CI
   actions to commit digests.

---

## Coverage — checked and found clean (representative; 144 total)

- **No client‑side secret grants backend access.** The legacy static
  `x-api-key` was retired for a per‑install attested token; no `apiKey` /
  `x-api-key` / private key / embedded JWT exists in tracked source. `extra`
  holds only non‑secrets (router origin, public EAS project id, `appEnv`, and —
  now dev‑only — the bypass flag).
- **Production logging leaks nothing** — `utils/logger.ts` is `__DEV__`‑gated;
  production builds log nothing. No `console.*` in runtime paths ships enabled.
- **iOS ATS is locked** — `NSAllowsArbitraryLoads=false`, only the standard
  Expo dev‑client `NSAllowsLocalNetworking` exception (dev build). Android
  cleartext is gated to non‑production only; **production has cleartext
  disabled**.
- **Tokens are in the Keychain/Keystore** (expo‑secure‑store), not AsyncStorage;
  logout and account‑deletion clear access/refresh/session tokens **and** all
  user AsyncStorage + the encrypted lists (`clearAllUserData`).
- **Interest signals are encrypted at rest** — saved/liked events and followed
  orgs migrated from plaintext AsyncStorage to chunked SecureStore
  (`services/secureListStorage.ts`).
- **No WebView** — `react-native-webview` is never imported; the entire
  message‑bridge / injection / origin‑whitelist surface is absent. External
  links use `expo-web-browser`/`Linking` and (after this change set) every
  untrusted URL is scheme‑validated.
- **Deep‑link validation is strict** — `utils/deepLinkValidation.ts` rejects
  `javascript:`/`data:`/`file:`/`vbscript:`, off‑allowlist hosts, ports, query
  strings, fragments, and non‑`event/{id}` paths.
- **No push notifications, no analytics/crash SDK** (no Sentry/Crashlytics/
  Amplitude/Mixpanel/PostHog/Firebase), **no Clipboard** usage — no PII
  exfiltration channel.
- **No JWT sent to off‑host/absolute URLs** — the interceptor only decorates
  same‑host relative requests; the only absolute‑URL axios calls (refresh,
  nonce, attest) target the configured API host.
- **Integrity flow** — challenge/nonce per attestation; keyId persisted only
  after backend ACK; dev bypass honored server‑side only on non‑prod
  `NODE_ENV`; iOS App Attest + Android AndroidKeyStore attestation. Client‑side
  integrity is inherently bypassable on a controlled device — no design claim
  exceeds that baseline after the README correction.
- **v3.1.0 surfaces** (address autocomplete, explore location filter) —
  autocomplete debounces (300ms / 3‑char floor), logs no query text, supports
  cancellation, contacts no third‑party geocoder directly, and persists nothing
  to AsyncStorage. (Residual to confirm server‑side: auth‑gated autocomplete
  ties draft‑location keystrokes to the organizer's bearer — the "not logged"
  promise is server‑side and unverifiable from the client.)

---

_Generated from a multi‑agent audit (12 surface auditors → adversarial
verification → completeness critic), with all confirmed findings re‑checked
against the source and the historical‑secret and reachability claims verified by
hand._
