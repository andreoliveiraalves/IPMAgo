# IPMAgo — Architecture & Engineering Guide

Internal documentation for the IPMAgo codebase. It describes what the app does, how the
pieces fit together, why the non-obvious decisions were made, and what to watch out for when
changing it. It is written to be read by a developer (or an AI agent) who has never seen the
repository.

For the user-facing feature list and release notes, see [`README.md`](../README.md).

---

## 1. What this app is

IPMAgo is an Android-first weather app built with Expo + React Native. It displays the
forecasts published by [IPMA](https://api.ipma.pt/) (the Portuguese Institute for Sea and
Atmosphere) for **423 Portuguese locations**, with:

- a 10-day daily forecast per location;
- a day-detail sheet with an interactive hourly/3-hourly temperature chart, UV, humidity, feels-like
  temperature and maximum wind;
- **rural fire risk** for mainland municipalities (3 days);
- **sea state** for the nearest coastal zone, when the location is within 35 km of the
  coast (3 days);
- favorites, current-location matching via GPS, and a PT-PT/EN language switch;
- light/dark themes and offline-friendly caching.

The app is published as a sideloadable APK through GitHub Releases. iOS is not configured.
The web target is used for local development and is expected to render through Expo Router's
server output (`web.output: "server"`), which is why hydration and accessibility details in
section 13 matter.

There is no backend of our own. The app talks directly to `api.ipma.pt`.

---

## 2. Stack and versions

Versions are pinned in [`package.json`](../package.json). The important ones:

| Package | Version | Notes |
| --- | --- | --- |
| `expo` | `~58.0.17` | Expo SDK 58 |
| `react-native` | `0.88.0` | New Architecture |
| `react` / `react-dom` | `19.3.0` | React Compiler is enabled |
| `expo-router` | `~58.0.25` | File-based routing, typed routes |
| `react-native-web` | `~0.21.4` | Web target |
| `typescript` | `~6.0.3` | `strict: true` |
| `eslint` / `eslint-config-expo` | `^9.39.5` / `~58.0.4` | Flat config |
| `react-native-reanimated` | `4.7.1` | Splash animation only |
| `react-native-worklets` | `0.13.0` | Required by Reanimated 4 |
| `@react-native-async-storage/async-storage` | `2.2.0` | Persistent cache/settings |
| `expo-location` | `~58.0.18` | Current location |
| `expo-image` | `~58.0.16` | Splash/app icon images |
| `expo-splash-screen` | `~58.0.11` | Native splash hand-off |
| `@expo/vector-icons` | `^15.0.2` | MaterialCommunityIcons |

Notable details:

- There is **no `bun.lock`**; use `npm` / `npx`.
- `app.json` sets `experiments.reactCompiler: true` and `experiments.typedRoutes: true`.
- `app.json` sets `web.output: "server"` — the web build is server-rendered, not a static
  SPA. Any code that touches `window`/`document` at module scope or during the first render
  can break SSR or hydration.
- Android package: `com.ipmago.app`; scheme: `ipmago`.
- `src/` is aliased to `@/*`; `assets/` to `@/assets/*` (see `tsconfig.json`).

---

## 3. Commands

```bash
npm install             # install dependencies
npm run web             # Expo dev server for web (used for local verification)
npm run android         # Expo dev server targeting Android
npm start               # generic dev server
npm run typecheck       # tsc --noEmit
npm run lint            # expo lint
npx expo-doctor         # dependency/config diagnostics
```

There is no test runner in this project. Typecheck + lint are the required checks before
declaring work done. For web changes, also exercise the screen in a browser (or at minimum
inspect the SSR HTML with `curl http://localhost:8081`).

---

## 4. High-level architecture

```
src/app/                 Expo Router routes (screens + layouts)
  _layout.tsx            root providers, stack, splash, theme
  (tabs)/_layout.tsx     tab navigator (platform-specific component)
  (tabs)/index.tsx       favorites + current location
  (tabs)/explore.tsx     searchable location list
  location/[id]/...      forecast detail + day detail modal

src/api/ipma/            HTTP client, raw wire types, normalization, fallbacks
src/api/marine/          Open-Meteo Marine client (tides, swell, wind sea, current)
src/hooks/               data loading + cache orchestration
src/lib/                 pure domain logic (dates, geo, forecast, fire, sea, maps)
src/state/               React contexts (favorites, reference data)
src/storage/             AsyncStorage JSON helpers + all cache keys
src/i18n/                PT/EN dictionaries + provider
src/components/          reusable UI
src/constants/theme.ts   palette, spacing, fonts, fire-risk scale
```

Data flows in one direction:

```
screen
  -> hook (useForecastList / useHazards / useMarine / useLocations / useNearestLocation)
     -> storage cache (instant render, stale-while-revalidate)
     -> api/ipma + api/marine (fetch + normalize + fallback)
        -> lib/* (formatting, calculations)
```

Screens never call `fetch` and never read AsyncStorage directly. Hooks own loading, caching
and error state; `lib/` stays pure and synchronous.

---

## 5. Routing

Routes are files under `src/app/`. The root stack is defined in
[`src/app/_layout.tsx`](../src/app/_layout.tsx):

| Route | File | Presentation | Purpose |
| --- | --- | --- | --- |
| `/` | `(tabs)/index.tsx` | tab | Favorites and "my location" |
| `/explore` | `(tabs)/explore.tsx` | tab | Search all 423 locations |
| `/location/[id]` | `location/[id]/index.tsx` | stack push | 10-day forecast + star |
| `/location/[id]/day/[date]` | `location/[id]/day/[date].tsx` | modal | Hourly/fire/sea details |

`id` is IPMA's `globalIdLocal` (number encoded as a string). `date` is `YYYY-MM-DD`.
Both are read with `useLocalSearchParams` and validated with `Number.isFinite` before use.
The location detail route also accepts an optional `name` param, passed by the list screens,
so the header can show the city name before the location list finishes loading.

Navigation uses typed routes:

```ts
router.push({ pathname: '/location/[id]', params: { id: String(globalIdLocal) } });
```

`Stack.Screen` options inside a screen (for the title, header star, close button) are set
declaratively in the screen's JSX. The day sheet sets `presentation: 'modal'` both in the
root layout and in the screen options, and falls back to `router.replace('/')` when there is
no history to go back to.

The tab layout is a thin wrapper:

```tsx
// (tabs)/_layout.tsx
import AppTabs from '@/components/app-tabs';
export default function TabsLayout() {
  return <AppTabs />;
}
```

`app-tabs.tsx` renders **native** tabs (`expo-router/native-tabs`, using `NativeTabs`), while
`app-tabs.web.tsx` renders a custom web tab bar (`expo-router/ui` `Tabs`/`TabList`/
`TabTrigger`/`TabSlot`) with the app name and language toggle. On web, tab names are `home`
and `explore`; on native, the `NativeTabs.Trigger` names are `index` and `explore`. Keep
those two trigger sets in sync with the route files.

---

## 6. Boot sequence and providers

Module scope of `_layout.tsx` calls `SplashScreen.preventAutoHideAsync()` once.

The provider tree is:

```
ThemeProvider (navigation theme: DefaultTheme / DarkTheme)
  I18nProvider
    FavoritesProvider
      ReferenceDataProvider
        AnimatedSplashOverlay
        StatusBar
        Stack
```

Order matters:

- `I18nProvider` must wrap `ReferenceDataProvider` because reference labels are resolved in
  the active language.
- `FavoritesProvider` is above the screens; it loads the persisted favorites once and gates
  writes on `ready` so an empty initial array never overwrites stored data.
- `ReferenceDataProvider` loads the cached weather-type/wind labels immediately, then
  refreshes them in the background. On failure it keeps the cache; missing labels render
  `—`.
- `useBlurOnRouteChange()` is called in the root layout (web-only behavior, see section 13).

### Splash animation

- Native: [`src/components/animated-icon.tsx`](../src/components/animated-icon.tsx) keeps an
  overlay visible until the first `onLayout`, then calls `SplashScreen.hideAsync()` and runs a
  Reanimated `Keyframe` fade/scale, removing itself via `scheduleOnRN` when finished.
- Web: [`src/components/animated-icon.web.tsx`](../src/components/animated-icon.web.tsx)
  exports `AnimatedSplashOverlay` as `() => null`; only `AnimatedIcon` is exported for
  potential use. Do not reintroduce a splash overlay on web — it caused hydration noise and
  is unnecessary because the page paints from SSR.

The splash overlay colors are still the Expo template blue (`#208AEF` and the
`#3C9FFE → #0274DF` gradient), while `theme.ts` uses the template Apple palette. This is
intentional after the palette restoration; do not "fix" one without the other.

---

## 7. Data layer (`src/api/ipma`)

### 7.1 Two APIs

| Base | Constant | Coverage | Docs |
| --- | --- | --- | --- |
| `https://api.ipma.pt/public-data` | `PUBLIC_DATA_BASE` | 423 locations, hourly + 3-hourly, 10 daily days | Undocumented; same feed as ipma.pt |
| `https://api.ipma.pt/open-data` | `OPEN_DATA_BASE` | 35 district capitals/islands, daily only; hazards, sea, reference labels | Documented |

`public-data` is the primary source. Every function that can use it falls back to
`open-data` when the primary request fails:

| Function | Primary | Fallback | Fallback limitations |
| --- | --- | --- | --- |
| `fetchLocations` | `/forecast/locations.json` | `/distrits-islands.json` | 35 locations |
| `fetchForecast` | `/forecast/aggregate/{id}.json` | `/forecast/meteorology/cities/daily/{id}.json` | no hourly data, `uvIndex: null` |
| `fetchReferenceData` | — | `weather-type-classe.json` + `wind-speed-daily-classe.json` | — |
| `fetchFireRisk` | — | `rcm-d0/1/2.json` | mainland only, 3 days |
| `fetchSeaForecast` | — | `sea-locations.json` + `hp-daily-sea-forecast-day0/1/2.json` | 12 zones, 3 days |

When both primary and fallback fail, the **primary** error is rethrown, so the UI reports the
more relevant failure.

### 7.2 HTTP client ([`client.ts`](../src/api/ipma/client.ts))

`requestJson<T>(baseUrl, path, { timeoutMs, signal })`:

- 8-second default timeout implemented with `AbortController` + `setTimeout`;
- forwards an optional external `AbortSignal`;
- sends `Accept: application/json`;
- non-2xx responses throw `IpmaError(message, 'http', status)`;
- network/timeout failures throw `IpmaError(..., 'network')`;
- a caller-initiated abort is reported as `Request cancelled` (kind `network`);
- listeners and timers are always cleaned up in `finally`.

`IpmaError.kind` is `'network' | 'http' | 'payload'`. `asIpmaError` in
[`lib/weather.ts`](../src/lib/weather.ts) wraps unknown errors so the UI always has a message.

### 7.3 In-flight deduplication

`api/ipma/index.ts` keeps a module-level `Map<string, Promise<unknown>>`. `once(key, load)`
returns the existing promise for a key while a request is in flight and deletes the entry
when it settles. This prevents duplicate aggregate requests when the home screen and detail
screen mount at the same time. Keys: `locations`, `forecast:{id}`, `reference`, `fire-risk`,
`sea`.

Because the dedupe window is only "while in flight", it does **not** act as a TTL cache —
that is the hooks' job.

### 7.4 Wire normalization rules

IPMA sends almost every number as a string. The API layer converts at the boundary, so the
rest of the app only sees normalized types from [`types.ts`](../src/api/ipma/types.ts).

- `toNumber` uses `Number.parseFloat`; non-finite results become `NaN` and the record is
  usually skipped.
- `optionalNumber` maps `null`, `undefined`, `''`, `NaN` and **`-99`** to `null`. `-99` is
  IPMA's "no data" sentinel.
- `parseUtcTimestamp` appends `Z` when `dataPrev`/`dataUpdate` lack a timezone marker, then
  `Date.parse`s it. This matters because the raw values are UTC but serialize without `Z`.
- `dayKey(dataPrev)` takes the first 10 characters as the date.
- Missing `idFfxVento` / `idTipoTempo` is normalized to `-99`, not null, so lookups stay
  numeric. The reference-data provider renders `—` for unknown ids.
- Wind class is exposed both as an id (`windClass`) and a direction string
  (`windDirection`, e.g. `NW`); labels come from IPMA's reference files.

### 7.5 Aggregate forecast parsing

`public-data/forecast/aggregate/{id}.json` is a flat array of entries distinguished by
`idPeriodo`:

| `idPeriodo` | Meaning | Normalized into |
| --- | --- | --- |
| `24` | Daily | `ForecastBundle.days` |
| `1` | Hourly | `ForecastBundle.hourly` (`stepHours: 1`) |
| `3` | 3-hourly | `ForecastBundle.hourly` (`stepHours: 3`) |

Daily parsing:

- keeps only `idPeriodo === 24` with a `dataPrev`;
- deduplicates by date (first occurrence wins);
- requires finite `tMin`/`tMax`, otherwise drops the day;
- sorts by date and slices to **10 days**, matching the 10 daily entries the feed publishes;
- `updatedAt` is the newest `dataUpdate` across all entries (model update time), falling
  back to `Date.now()` when absent;
- `fetchedAt` is always request time.

The open-data fallback produces the same `ForecastBundle` shape with `hourly: []` and
`uvIndex: null`.

### 7.6 Fire risk

`fetchFireRisk` requests `rcm-d0`, `rcm-d1`, `rcm-d2` in parallel with `Promise.allSettled`.
It keeps every file that has `dataPrev` and `local`, builds
`{ [dico]: level }` for levels 1–5, sorts days, and throws only when **no** day is usable.
Partial success is acceptable (e.g. day 2 missing).

DICO (the municipality code used by the maps) is derived from the location:
`String(idDistrito).padStart(2, '0') + String(idConcelho).padStart(2, '0')` — see
[`lib/fire-risk.ts`](../src/lib/fire-risk.ts). Fire risk is mainland-only in the source; the
day sheet renders the level as the last row of the hero stat panel, and shows `—` when it is
unavailable (islands, days 4–10), with the reason kept in the row's accessibility label.

### 7.7 Sea state

`fetchSeaForecast` fetches the 12 sea zones and the three daily forecast files in parallel.
It normalizes zones to `{ globalIdLocal, name, latitude, longitude }` and builds
`daysByZone[zoneId] = SeaForecastDay[]`, sorted by date. A forecast entry is dropped when
wave heights are not finite or the envelope has no `forecastDate`. Missing
`totalSeaMin/Max` fall back to the wave height; missing periods/temperatures stay `null`.
Partial day failures are tolerated.

The day sheet turns `totalSeaMax` into a Douglas sea-state band
(`seaStateFor()` in [`lib/sea.ts`](../src/lib/sea.ts)) and shows the following three days
from `seaDaysFrom()`. IPMA only publishes three sea days, so later day sheets have no IPMA
sea block.

**Tides and marine extras (Open-Meteo).** IPMA has no tide endpoint (the Hydrographic
Institute's API needs a key), so `src/api/marine/` requests
`https://marine-api.open-meteo.com/v1/marine` with `timezone=UTC` for
`sea_level_height_msl`, `swell_wave_*`, `wind_wave_*` and `ocean_current_*`.
`useMarine(zoneId, latitude, longitude, date)` caches each zone/day for 3 h under
`ipmago:marine:v1:{zoneId}:{date}` and fetches one day on each side of the selection so the
curve and its extremes are never cut short. It **fails silently**: the card falls back to
IPMA-only data instead of surfacing an error.

`src/lib/tide.ts` detects high/low tides from the hourly samples and refines each turning
point with a parabolic fit through its neighbours, which recovers sub-hour times.
`TideChart` draws the 24 h curve with the extremes labelled by time only — the model heights
use a mean-sea-level datum and are not comparable to the official tables. The card credits
"Copernicus Marine / Open-Meteo" and marks the tide as a model, not navigation data.

### 7.8 Reference data

`fetchReferenceData` merges the two documented reference files into lookup maps keyed by
numeric id, with `.trim()`ed PT/EN labels. These are the **only** source of weather-type and
wind-class text; they are not hardcoded. The provider caches them and falls back to `—`.

---

## 8. Caching and persistence

All keys are centralized in [`src/storage/storage.ts`](../src/storage/storage.ts) and namespaced
with `ipmago:`.

| Key | Value | Written by | TTL / invalidation |
| --- | --- | --- | --- |
| `ipmago:favorites:v1` | `number[]` | `FavoritesProvider` | never expires |
| `ipmago:language:v1` | `'pt' \| 'en'` | `I18nProvider` | never expires |
| `ipmago:locations:v2` | `{ locations, fetchedAt }` | `useLocations` | none (always refetched) |
| `ipmago:reference:v1` | `ReferenceData` | `ReferenceDataProvider` | none (always refetched) |
| `ipmago:forecast:v3:{id}` | `ForecastBundle` | `useForecastList` | 10 min stale window |
| `ipmago:fire-risk:v1:{date}` | `FireRiskBundle` | `useHazards` | 1 h, keyed per local date |
| `ipmago:sea:v1:{date}` | `SeaBundle` | `useHazards` | 1 h, keyed per local date |
| `ipmago:marine:v1:{zoneId}:{date}` | `MarineBundle` | `useMarine` | 3 h, keyed per zone and day |

Rules:

- `readJson` / `writeJson` swallow all storage errors. A storage failure degrades to "no
  cache"; it must never break the UI.
- Cached forecasts are rendered **immediately**, even if old. Freshness only decides whether
  to refetch; old data is never deleted just because it is old
  (stale-while-revalidate).
- `FORECAST_STALE_MS = 10 * 60 * 1000`; `HAZARDS_STALE_MS = 60 * 60 * 1000`.
- Hazard cache is keyed by local calendar day (`toIsoDate(new Date())`), so the previous day's
  maps are naturally ignored.
- The `vN` suffixes are schema versions. **Bump them when the cached shape changes**;
  otherwise old JSON will be parsed as the new type.

---

## 9. Hooks

| Hook | File | Responsibility |
| --- | --- | --- |
| `useLocations` | `use-locations.ts` | Load cached location list, always refetch, expose `refresh`/`error` |
| `useForecastList(ids)` | `use-forecast-list.ts` | Per-id forecast cache + fetch, shared by home/detail |
| `useForecast(id)` | `use-forecast.ts` | Thin single-id wrapper returning `EMPTY_ENTRY` when null |
| `useHazards` | `use-hazards.ts` | Bulk fire risk + sea state, shared by day sheets |
| `useMarine(zone, date)` | `use-marine.ts` | Open-Meteo tide/swell/current model per zone and day, silent on failure |
| `useNearestLocation` | `use-nearest-location.ts` | GPS permission + nearest IPMA location match |
| `useBlurOnRouteChange` | `use-blur-on-route-change.ts` | Web-only focus cleanup (see section 13) |
| `useColorScheme` | `use-color-scheme.ts` / `.web.ts` | Hydration-safe color scheme on web |
| `useTheme` | `use-theme.ts` | `Colors[light|dark]` |

### `useForecastList`

- State is `Record<id, { bundle, isLoading, error }>` plus a global `isRefreshing`.
- On mount/ids change it loads each id independently with `Promise.allSettled`, so one
  failure does not block the rest.
- Stale path: read cache → render it → skip network if `Date.now() - fetchedAt < 10 min`.
- Fresh path: set `isLoading`, fetch, write cache, clear error. On failure it keeps the
  cached bundle and sets `error`, which screens use to show an "offline/cached" note.
- `refresh()` forces the network for every id and drives `RefreshControl`.
- `alive` ref guards state updates after unmount.
- **Initial-load convention:** requested ids with no entry yet are exposed as
  `isLoading: true`. This covers the gap between the first render and the asynchronous cache
  read/network result, keeps SSR and the first client render identical, and prevents the
  "no data" empty state from flashing. Screens must only render `EmptyState` when
  `!entry.isLoading`, and use `LoadingOverlay` while the payload is missing.

### `useHazards`

- Reads both per-day caches in parallel, renders them, then decides whether to refetch.
- Treats the pair as fresh only when **both** caches exist and the older `fetchedAt` is under
  one hour.
- Fetches fire and sea concurrently with `allSettled`; each success is written and applied
  independently. `error` records the first failure even when the other succeeds.
- The initial load is deferred with `Promise.resolve().then(...)` so cached data can render
  before the loading state flips.

### `useNearestLocation`

- Prompts for foreground permission only on an explicit user action (`requestPermission`);
  on launch it checks `getForegroundPermissionsAsync()` and silently locates if already
  granted.
- Status machine: `idle | locating | ready | denied | unavailable | error`.
- Uses `Accuracy.Balanced` and matches the position to the closest of the 423 locations with
  a haversine calculation (`lib/geo.ts`).
- The home screen includes the matched id in its forecast list even if it is not a favorite.

---

## 10. Domain logic (`src/lib`)

### `dates.ts`

- `parseIsoDate('YYYY-MM-DD')` constructs a **local** date. Never use `new Date(iso)` for
  these strings — it is parsed as UTC and can shift the day in western timezones.
- `toIsoDate(date)` formats a local date.
- `relativeDayKey` → `today | tomorrow | other`.
- `formatWeekday` uses hardcoded PT/EN weekday names (capitalized).
- `formatShortDate` → `DD/MM`.
- `describeAge(fetchedAt)` → `{ unit: 'now' }` or minutes/hours, used for "updated X ago".
  Screens pass `bundle.updatedAt` (model time), not `fetchedAt`.

### `forecast.ts`

- `pickCurrentDay(days)` returns the first day `>= today`, falling back to the last day
  (IPMA occasionally publishes today late).
- `formatTemp`, `formatRain` (`—` for null).
- `parseNaiveUtc` appends `Z` when needed; `localDateKey` groups hourly points by the
  **device's** local calendar day.
- `hourlyForDate`, `formatHour` (local time), `representativeHour` (closest to 13:00),
  `maxWindSpeed`, `hasThreeHourly`.

### `geo.ts`

- `distanceKm` is haversine with Earth radius 6371 km.
- `nearestLocation` linearly scans all locations, skipping non-finite coordinates; returns
  `{ location, distanceKm }` or `null`.

### `fire-risk.ts`

- `municipalityCode(location)` builds the DICO string.
- `fireRiskLevel` narrows to `1 | 2 | 3 | 4 | 5`.
- `fireRiskLabelKey` maps to i18n keys `fireRisk1`…`fireRisk5`.
- `fireRiskColor` uses `FireRiskColors`.
- `fireRiskFor(bundle, location, date)` returns the level or `null`.

### `sea.ts`

- `SEA_MAX_DISTANCE_KM = 35`; `nearestSeaZone` returns `null` beyond that distance.
- `seaDayFor(bundle, zoneId, date)`.
- `formatRange(min, max, unit, digits)` → `1.2–2.4 m`, `—` when both are null.

### `weather.ts`

- `WEATHER_GLYPHS` maps IPMA weather type ids 0–30 (and `-99`) to MaterialCommunityIcons
  names and a `WeatherTone`.
- `TONE_COLORS` maps tones to semantic theme tokens (`sun → accent`, `rain → primary`, …).
- `AppIcons` is the icon vocabulary for non-forecast UI.
- `asIpmaError` normalizes unknown errors.

### `districts.ts`

Maps IPMA `idDistrito` to PT/EN names: 1–18 mainland, 31 Madeira, 32 Porto Santo, 41–49
Azores. Used to group and search the location list.

---

## 11. State providers

### Favorites ([`src/state/favorites.tsx`](../src/state/favorites.tsx))

- Context value: `ids`, `ready`, `isFavorite`, `add`, `remove`, `toggle`.
- Loads once on mount; filters non-finite ids.
- Persists on every change **after** `ready` is true, preventing the initial `[]` from
  clobbering stored favorites.
- Favorite ids are `globalIdLocal` values in insertion order.

### Reference data ([`src/state/reference-data.tsx`](../src/state/reference-data.tsx))

- Context value: `weatherLabel(id)`, `windLabel(class)`, `hasData`.
- Cached data is applied first, then refreshed once per app session.
- Labels are chosen by the current language; missing/`---` values become `—`.
- Also exports convenience hooks `useWeatherLabel` and `useWindLabel`.

---

## 12. Internationalization

[`src/i18n/index.tsx`](../src/i18n/index.tsx):

- `Language = 'pt' | 'en'`; default is `'pt'` on a cold start.
- `I18nProvider` reads the persisted language, exposes `language`, `setLanguage`, `t`.
- `t(key, params)` looks up the active dictionary and interpolates `{name}` placeholders.
- Unknown keys are not possible at compile time because `TranslationKey` is derived from the
  PT dictionary; both dictionaries must have identical keys (the EN object is typed
  `Record<TranslationKey, string>`).
- Weather and wind labels are **not** in this dictionary — they come from IPMA reference
  data (section 7.8).

When adding a string: add it to both `pt` and `en` in
[`src/i18n/translations.ts`](../src/i18n/translations.ts). TypeScript will complain if the EN
dictionary is missing a key.

---

## 13. Theming, layout and UI conventions

### Theme tokens ([`src/constants/theme.ts`](../src/constants/theme.ts))

`Colors.light` / `Colors.dark` expose semantic tokens:

```
text, textSecondary, background, backgroundElement, backgroundSelected,
border, primary, primarySoft, accent, danger, warning, success, onPrimary
```

The palette is the **default Expo template / Apple system palette** (blue `#007AFF` in
light, `#0A84FF` in dark, orange accent, system red/green, neutral greys). The previous
Azulejo branding palette (cobalt/sand/terracotta) was reverted on request; do not reintroduce
it. The APK icon/splash assets and `app.json` background colors still use the Azulejo navy
(`#0F2A43`); those assets were not part of the revert.

`FireRiskColors` is separate from the semantic palette because it is a fixed 1–5 scale:
green `#2E7D5B`, yellow `#C9A227`, orange `#D97706`, red `#C0392B`, dark red `#7B1E1E`.
Risk badge text is black for level 2 (yellow) and white otherwise.

Other exports:

- `Spacing`: `half 2`, `one 4`, `two 8`, `three 16`, `four 24`, `five 32`, `six 64`.
- `Fonts`: platform-aware font families; web uses CSS variables defined in
  [`src/global.css`](../src/global.css).
- `BottomTabInset`: iOS 50, Android 80, web 0. Screens add it as bottom padding so content
  clears the native tab bar.
- `MaxContentWidth = 800`; screens center their content and cap the width (important on web
  and tablets).

### UI primitives

| Component | Purpose |
| --- | --- |
| `ThemedText` | Text with `themeColor` + typographic variants (`title`, `subtitle`, `small`, `smallBold`, `link`, `linkPrimary`, `code`) |
| `ThemedView` | View with a themed background (`type` token) |
| `AppIcon` | MaterialCommunityIcons with theme color and a11y handling |
| `WeatherIcon` | Weather-type icon + tone color |
| `LocationCard` | Home-screen card: name, optional distance, current-day weather/temps/rain/wind |
| `ForecastDayRow` | Detail-screen row for one day: date, weather/wind, temps and a labelled rain-probability metric |
| `HourlyChart` | Full-width SVG temperature curve with rain-probability bars, a daylight strip with sunrise/sunset markers, a draggable cursor and an hour/weather/rain readout |
| `TideChart` | 24 h sea-level curve with the high/low tide times from the Open-Meteo model |
| `EmptyState` | Icon + title + description + optional action |
| `LoadingOverlay` | Opaque full-screen spinner used while a screen has no cached payload |
| `LanguageToggle` | PT/EN radio group |
| `AppTabs` | Platform-specific tab bar |

Accessibility conventions:

- Every interactive `Pressable` gets `accessibilityRole="button"` and a label.
- Icons rendered purely decoratively get `accessibilityElementsHidden` /
  `importantForAccessibility="no-hide-descendants"` via `AppIcon` when no label is given.
- **Never nest `Pressable`/`button` elements.** On web this produces `<button>` inside
  `<button>`, which is invalid and breaks keyboard/screen-reader behavior. The location row
  is the canonical pattern: an outer `View` row with two sibling `Pressable`s (label and
  star), each with its own hit area.

---

## 14. Platform-specific files

Metro resolves `.web.tsx`/`.web.ts` before the generic file on web:

| Generic | Web | Behavior |
| --- | --- | --- |
| `components/app-tabs.tsx` | `app-tabs.web.tsx` | NativeTabs vs. custom `expo-router/ui` tabs |
| `components/animated-icon.tsx` | `animated-icon.web.tsx` | Native splash animation vs. `null` overlay |
| `hooks/use-color-scheme.ts` | `use-color-scheme.web.ts` | RN scheme vs. hydration-safe scheme |

Rules:

- Any file using `window`, `document`, `localStorage` or browser-only APIs must either be
  `.web.*` or guard with `typeof window !== 'undefined'` / `Platform.OS === 'web'`.
- Do not add a `.web.tsx` that duplicates a native file unless behavior genuinely differs;
  the split is a maintenance cost.

---

## 15. Web SSR, hydration and accessibility (critical invariants)

The web target runs through Expo Router's server output. Four issues were fixed here; all
are easy to regress.

### 15.1 Hydration mismatch from the color scheme

**Symptom:** React hydration error; server HTML used the light theme while the first client
render used dark (or vice versa).

**Cause:** `useColorScheme` from `react-native` can return the real scheme during the first
client render, while the server always renders without a scheme.

**Fix:** the root layout imports `useColorScheme` from `@/hooks/use-color-scheme`. The web
implementation uses `useSyncExternalStore` with a server snapshot of `false`
(`hasHydrated`), returns `'light'` until hydrated, then returns the real scheme. This avoids
a `setState`-in-effect cascading render and keeps server/client output identical for the
first paint.

**Invariant:** root layout and any SSR-rendered component must use `@/hooks/use-color-scheme`,
not `useColorScheme` from `react-native`. `app-tabs.tsx` uses the RN hook because it is
native-only.

The navigation theme is the stock `DefaultTheme` / `DarkTheme` from `expo-router`. Custom
navigation themes built from the app palette were removed during the palette restore; if you
reintroduce one, make sure it is also hydration-safe.

### 15.2 Nested `<button>`

**Symptom:** React DOM warning about `<button>` inside `<button>`; invalid HTML.

**Cause:** the location row wrapped the star `Pressable` inside the row `Pressable`.

**Fix:** outer `View` + two sibling `Pressable`s. The label press area is `flex: 1`; the star
has its own `hitSlop`.

**Invariant:** compose pressables as siblings, never as descendants. Use an outer `View` for
layout. This applies to cards, list rows and any "tap row + tap action" pattern.

### 15.3 `aria-hidden` on a focused element

**Symptom (Chrome):**

```
Blocked aria-hidden on an element because its descendant retained focus.
```

**Cause:** React Navigation hides the previous screen with `aria-hidden` + `display: none` on
web. The button that triggered navigation still owns focus, so the browser refuses to hide a
focused descendant from assistive technology.

**Fix:** [`src/hooks/use-blur-on-route-change.ts`](../src/hooks/use-blur-on-route-change.ts)
runs an **isomorphic layout effect** on `usePathname()` changes and calls
`document.activeElement.blur()` (except `body`). It is wired once in the root layout.

**Why `useLayoutEffect`:** it runs in the same task as the DOM mutation that hides the screen,
before the browser's accessibility check. A passive `useEffect` lands a frame too late and
the warning still appears. The hook falls back to `useEffect` during SSR
(`typeof window === 'undefined'`).

**Invariant:** do not move this to `useEffect`, do not remove the `Platform.OS === 'web'`
guard, and do not blur unconditionally on native.

### 15.4 Stale splash overlay

Web exports `AnimatedSplashOverlay` as `null`. Reintroducing the native overlay on web causes
an extra full-screen layer, focus problems and unnecessary animation work.

### 15.5 Hourly chart interaction

The day sheet renders `HourlyChart` (a `react-native-svg` curve) instead of a horizontally
scrolling row of hour cards. This removes the nested horizontal scroller and keeps the whole
day readable at once.

- **Which hours are plotted.** `hourlyChartWindow()` in
  [`lib/forecast.ts`](../src/lib/forecast.ts) keeps today's chart forward-looking: the last
  4 hours plus the next 20, crossing midnight, the way mainstream weather apps present the
  hourly strip. Future days keep their whole local day.
- **Selection:** drag horizontally to move the cursor; the readout above the chart shows the
  selected hour's time, weather icon, temperature and rain probability. A tap or click also
  selects that hour via `onPointerDown`. Hours that fall on the next day are prefixed with
  "Amanhã/Tomorrow". The weather description is deliberately not printed — the icon carries
  it — but stays in the accessibility text.
- **Rain is a secondary variable.** Light-blue rounded bars grow from the baseline behind the
  temperature curve, scaled to 0–100% probability and capped at 55% of the plot height so
  they never overpower the curve. IPMA publishes the probability every 3 hours, so missing
  hours reuse the nearest published value (and `-99` stays `null`).
- **Sun markers.** IPMA has no ephemeris endpoint, so `sunTimes()` in
  [`lib/sun.ts`](../src/lib/sun.ts) computes sunrise/sunset locally from the NOAA algorithm
  (no dependency, offline, works for all 423 places; polar day/night returns `null`). The
  screen passes one `SunDay` per calendar day covered by the window (today's chart can cross
  midnight). The chart paints a thin daylight strip above the plot and a dashed vertical line
  with its time at each event; positions are interpolated *inside* the hour segment, so the
  marker lands on 06:58 rather than snapping to 07:00. A caption under the chart repeats
  `Nascer … · Pôr …` and the times also enter the chart's accessibility text.
- **Vertical scrolling must keep working.** The chart only claims the responder once the
  gesture is clearly horizontal (`|dx| > 6 && |dx| > |dy| * 1.5`), so a vertical drag that
  starts on the chart still scrolls the page.
- **Hydration:** the initial selection is deterministic (closest to 13:00). An effect moves it
  to the current hour only when the sheet's date is today, so the server and first client
  render match.
- **Geometry** is derived from `onLayout` width; the component renders no SVG until the width
  is known, which also keeps SSR output stable.
- `react-native-svg` is an Expo-supported module included in Expo Go. A custom Android dev
  build created before this dependency was added must be rebuilt.

---

## 16. Android release workflow

The workflow is [`.github/workflows/android-apk.yml`](../.github/workflows/android-apk.yml).

Triggers:

- push of a tag matching `v*`;
- manual `workflow_dispatch`.

Steps:

1. checkout, Node 22 (npm cache), JDK 17, Gradle;
2. `npm ci`;
3. bump `expo.android.versionCode` to `GITHUB_RUN_NUMBER` (so every build installs over the
   previous one) by editing `app.json` in the runner;
4. `npx expo prebuild --platform android --clean --no-install` (generates `android/` from
   config — never commit it);
5. `./gradlew assembleRelease`;
6. copy the APK to `IPMAgo-<ref>.apk`;
7. upload it as an artifact;
8. if the ref is a tag, attach it to a GitHub Release with generated notes.

Publishing:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Notes:

- The APK is signed with the Expo template debug keystore. It is for sideloading, **not** for
  Google Play.
- `version` in `app.json` is the user-facing version; `versionCode` is managed by CI.
- iOS is not configured; `ios/` and `android/` are generated (CNG) and ignored by git.
- `expo prebuild` regenerates native projects from `app.json` + config plugins. Never edit
  `android/` or `ios/` by hand.

---

## 17. Conventions and extension guides

### Adding a screen

1. Add the file under `src/app/` (it becomes a route).
2. Register it in the root `Stack` if it needs custom presentation/header.
3. Use `router.push({ pathname: '...', params: { ... } })`; typed routes will check it.
4. Keep data fetching in a hook; keep the screen focused on layout.
5. Wrap content in `ThemedView`, use `SafeAreaView` from `react-native-safe-area-context`,
   `MaxContentWidth`, and `BottomTabInset` where relevant.
6. Add strings to both dictionaries.

### Adding a cached resource

1. Define normalized types in `src/api/ipma/types.ts`.
2. Add a fetcher in `src/api/ipma/index.ts` using `requestJson` + `once`; normalize numbers
   and `-99` at the boundary.
3. Add a versioned key in `storageKeys` (bump `vN` if the shape changes).
4. Add a hook that reads cache first, renders, then revalidates; guard state with an `alive`
   ref.
5. Surface `isLoading`, `error`, `refresh` consistently with existing hooks.

### Adding a translation

Add the key to both `pt` and `en` in `src/i18n/translations.ts`. `TranslationKey` is derived
from `pt`, and the `en` object is typed against it, so a missing key fails typecheck.

### Changing colors

Use semantic tokens from `useTheme()` rather than hardcoded hex values. The only intentional
exception is `FireRiskColors`, which is a fixed scale. `app.json` icon/splash colors are
native asset configuration, not runtime theme tokens.

### Touching Expo APIs

Expo SDK 58 has breaking changes relative to older SDKs. Before using an Expo/EAS/RN API,
read the versioned docs (`https://docs.expo.dev/versions/v58.0.0/`) rather than relying on
memory. Prefer Expo modules over third-party libraries. Adding a library with native code
requires a development build (`eas build --profile development` or `npx expo run:android`);
Expo Go only includes its bundled modules.

---

## 18. Known limitations and gotchas

- **`public-data` is undocumented.** It can change without notice. The fallback keeps the app
  usable for 35 locations but loses hourly data/UV.
- **Fire risk is mainland-only** and only covers 3 days. Days 4–10 and islands show an
  explicit unavailable message.
- **Sea state is only shown within 35 km** of a coastal zone; further inland the card is
  hidden entirely.
- **Aggregate data is sliced to 10 days** (`FORECAST_DAYS` in `parseAggregate`). The
  open-data fallback may return fewer days; the UI renders whatever the bundle contains and
  the section header uses the actual count.
- **Hourly data is grouped by the device's local day**, not Portugal time. A device in a
  different timezone may see slightly different day groupings and hour labels. This is
  intentional (labels match the device clock), but worth remembering.
- **`updatedAt` vs `fetchedAt`:** `updatedAt` is the IPMA model run time and is what the UI
  labels "updated X ago"; `fetchedAt` only drives the 10-minute revalidation.
- **Locations are always refetched** on mount (cache is shown first). There is no location
  TTL; the list is small and rarely changes.
- **Language defaults to PT** before the persisted value loads. There is no loading gate, so
  a brief PT flash is possible on an EN device.
- **The web dev server is not a substitute for Android testing.** GPS, native tabs, the
  native splash and the modal presentation differ on web.
- **No automated tests.** Regression protection is typecheck + lint + manual verification.

---

## 19. File map (quick reference)

```
AGENTS.md                          agent instructions + project context
README.md                          user-facing overview, endpoints, releases
docs/ARCHITECTURE.md               this document
app.json                           Expo config (name, scheme, icons, web output, plugins)
package.json                       dependencies and scripts
.github/workflows/android-apk.yml  CI APK build/release

src/app/_layout.tsx                root providers, stack, splash, blur-on-route-change
src/app/(tabs)/_layout.tsx         tab layout wrapper
src/app/(tabs)/index.tsx           favorites + current location
src/app/(tabs)/explore.tsx         423-location search, grouped by district
src/app/location/[id]/index.tsx    10-day detail, hero, star
src/app/location/[id]/day/[date]   day modal: hours, metrics, fire, sea

src/api/ipma/client.ts             requestJson, IpmaError, timeout
src/api/ipma/types.ts              raw wire types + normalized models
src/api/ipma/index.ts              fetch/parse/fallback for all resources
src/api/marine/index.ts            Open-Meteo Marine fetch/normalize (UTC hours)

src/hooks/use-locations.ts         cached location list
src/hooks/use-forecast-list.ts     multi-id forecast cache
src/hooks/use-forecast.ts          single-id wrapper
src/hooks/use-hazards.ts           fire + sea cache
src/hooks/use-marine.ts            tide/marine model cache (3 h, silent failure)
src/hooks/use-nearest-location.ts  GPS + nearest match
src/hooks/use-blur-on-route-change.ts  web a11y focus cleanup
src/hooks/use-color-scheme*.ts     hydration-safe scheme (web)
src/hooks/use-theme.ts             semantic palette accessor

src/lib/dates.ts                   local-date parsing/formatting, age
src/lib/forecast.ts                day selection, hourly grouping, formatting
src/lib/geo.ts                     haversine + nearest location
src/lib/fire-risk.ts               DICO mapping, labels, colors
src/lib/sea.ts                     nearest zone, day lookup, ranges, Douglas state
src/lib/sun.ts                     sunrise/sunset (NOAA algorithm, offline)
src/lib/tide.ts                    tide extremes (parabolic fit) and day series
src/lib/weather.ts                 weather glyphs/tones, app icons, error helper
src/lib/districts.ts               district names PT/EN

src/state/favorites.tsx            persisted favorites context
src/state/reference-data.tsx       weather/wind label context
src/storage/storage.ts             AsyncStorage JSON helpers, versioned keys
src/i18n/index.tsx                 language provider + interpolation
src/i18n/translations.ts           PT/EN dictionaries, TranslationKey

src/constants/theme.ts             palette, fire-risk scale, spacing, fonts, widths
src/components/*                   themed primitives, cards, icons, tabs, splash
```

---

## 20. Recent fixes (context for future changes)

These changes are in the working tree on top of `988afa6` (Azulejo branding):

1. **Hydration** — root layout now uses `@/hooks/use-color-scheme`; server renders the light
   theme, client switches after hydration.
2. **Nested buttons** — `explore.tsx` location rows use sibling pressables.
3. **`aria-hidden` focus warning** — new `useBlurOnRouteChange` layout-effect hook.
4. **Palette restored** — `theme.ts` is back to the template Apple palette; `Brand` was
   removed; the risk badge text color is black for level 2; splash gradient/overlay colors
   reverted to the template blue.
5. `app.json` icons/splash assets still carry the Azulejo navy; only runtime tokens were
   reverted.
6. **Detail loading state** — list screens pass the city `name` as a route param; the root
   stack gives detail routes an empty default title (no `location/[id]/index` flash), and
   `LoadingOverlay` covers the forecast/day screens while there is no cached payload. Empty
   states only render after loading has settled.
7. **10-day forecast** — `FORECAST_DAYS = 10` replaces the old 5-day slice; the forecast cache
   key was bumped to `v3` so previously cached 5-day bundles are not reused. The section
   header is dynamic (`Próximos {count} dias` / `Next {count} days`).

If you are asked to "restore the old colors" again, confirm which commit is meant:
`2e2e456` is the template palette, `988afa6` is Azulejo. They are not interchangeable.
