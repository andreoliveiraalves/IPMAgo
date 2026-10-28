This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project context

**IPMAgo** is an Android-first IPMA weather app (Expo SDK 58, React Native 0.88, Expo Router). It shows a 10-day forecast for 423 Portuguese locations, plus hourly details, fire risk, sea state, favorites, GPS matching and PT/EN. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before changing data flow, caching, theming, routing or web behavior — it documents the full system and the reasons behind it.

Key invariants:

- **Web is SSR** (`app.json` → `web.output: "server"`). Never touch `window`/`document` during render or at module scope; guard with `Platform.OS === 'web'` or use a `.web.ts` file. The root layout must import `useColorScheme` from `@/hooks/use-color-scheme` (not from `react-native`) so server and first client render match.
- **Never nest `Pressable`/`Link`.** Compose tap targets as siblings inside a `View`. The location row in `src/app/(tabs)/explore.tsx` is the reference pattern.
- **The day sheet uses `HourlyChart`, not a horizontal scroller.** Drag/tap the SVG curve to select an hour; keep the responder horizontal-only so vertical page scrolling still works when a gesture starts on the chart. Today's chart window is 4 h back + 20 h forward (crossing midnight); future days show their whole day. Rain probability is drawn as bars behind the curve, and fire risk is the last row of the hero stat panel — do not give it its own card again.
- **Keep `useBlurOnRouteChange()` wired in `src/app/_layout.tsx`.** It fixes Chrome's "Blocked aria-hidden … retained focus" warning and must stay a layout effect on web.
- **Data access goes through hooks** (`useLocations`, `useForecastList`, `useHazards`, `useMarine`, `useNearestLocation`). Screens do not fetch or read AsyncStorage directly. Cache keys/TTLs live in `src/storage/storage.ts`; bump `vN` when a cached shape changes.
- **Sun times are computed, tides are a model.** IPMA publishes neither. `src/lib/sun.ts` (NOAA algorithm) supplies sunrise/sunset offline; `useMarine` adds tides, swell, wind sea and current from Open-Meteo Marine (labels must credit Copernicus Marine / Open-Meteo, and the sea card must degrade silently to IPMA-only data when it fails).
- **Do not render empty/error states before loading settles.** `useForecastList` reports requested ids as loading until their first cache/network result; use `LoadingOverlay` when the payload is missing, and render `EmptyState` only when `!isLoading`.
- **The Android widget is a separate runtime.** `src/widgets/snapshot.ts` must stay free of React/hooks (it runs in a headless 30 s task): read caches first, revalidate at most hourly, and degrade to cached data instead of an error card. The widget follows `favorites[0]`; `moveToTop` is how users choose it. Import the widget only from `index.js`/`register.ts` and the native-only `useWidgetSync` — `register.web.ts` keeps it out of the SSR bundle. It needs a dev build/APK (Expo Go cannot load it), and `clickAction` deep links use `ipmago://location/<id>`.
- **IPMA data is stringly typed.** `public-data` is primary and undocumented; `open-data` is the fallback. Normalize numbers and the `-99` sentinel in `src/api/ipma/`. `dataPrev`/`dataUpdate` are naive UTC — append `Z` before parsing.
- **Palette is the template/Apple set** (`#007AFF` etc.), restored from commit `2e2e456`. Do not reintroduce the Azulejo runtime tokens from `988afa6`; native icon/splash assets still use navy.
- No `bun.lock` — use `npm` / `npx`. Validate with `npm run typecheck && npm run lint`; use `npm run web` for browser checks.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo run:android        # dev build (required for the widget's native module)
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
