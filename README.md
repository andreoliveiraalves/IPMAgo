# IPMAgo

Android weather app built with Expo + React Native, using the free [IPMA](https://api.ipma.pt/) endpoints. Forecasts for 423 Portuguese locations, in Portuguese (pt-PT) with an English switch.

- Name: **IPMAgo**
- Scheme: `ipmago`
- Android package: `com.ipmago.app`
- Platform: Android (APK via GitHub Releases). iOS is not configured.

## Features

- **Daily forecast** (10 days) for any of the **423** IPMA forecast locations, grouped by district/island.
- **Day details**: tap any day to open a sheet with an interactive hourly temperature chart (with sunrise/sunset markers), UV index, humidity, feels-like temperature, max wind, **rural fire risk** and **sea state**.
- **Fire risk** for mainland municipalities (next 3 days, from IPMA's municipal risk maps).
- **Sea state** for the nearest coastal zone when the selected place is within ~35 km of the coast: wave height, total sea, Douglas state, direction, period and water temperature (next 3 days), plus a 24 h tide curve with high/low times, swell, wind sea and current.
- **Home-screen widget** (Android): today plus the next 5 days for the location at the top of your favorites, in a 4x2 strip or a 4x4 list. It refreshes every 30 minutes, when the app is opened, and whenever you move a favorite to the top; tapping opens the location (or that day's sheet).
- **Favorites**: add/remove locations from the search list, the star on the detail screen, or long-press a card on the home screen. Long-pressing also offers **Mover para o topo**, which picks the widget's location.
- **Current location**: optional GPS permission; the app matches your position to the nearest IPMA location and shows its forecast.
- **Offline-friendly**: forecasts, the location list, hazard maps, weather-type labels and settings are cached on disk. Cached data is rendered instantly, then refreshed in the background (stale-while-revalidate, 10 min TTL to avoid redundant requests). Old data is never deleted just because it is old.
- **Portuguese / English** switch, persisted between launches.
- Light/dark theme follows the system, using the default Apple-style palette.

Weather labels and wind-class descriptions come from IPMA's own reference files, so they are translated by the source, not hardcoded.

## Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start          # web + JS-only development
   npx expo run:android    # required for the widget: it ships a native module
   ```

   The home-screen widget needs a development build or an APK; Expo Go cannot load
   `react-native-android-widget`.

Useful checks:

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npx expo-doctor    # dependency/config diagnostics
```

For architecture, data flow, caching, theming and platform gotchas, see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

GPS works in Expo Go and in the released APK.

## Data source

All requests go to `https://api.ipma.pt`. The app primarily uses the feed that powers the IPMA website (`public-data`) and falls back to the documented `open-data` endpoints where possible:

| Endpoint | Purpose |
| --- | --- |
| `public-data/forecast/locations.json` | All 423 forecast locations |
| `public-data/forecast/aggregate/{globalIdLocal}.json` | Daily (10 days) + hourly/3-hourly forecast |
| `open-data/distrits-islands.json` | Fallback location list (35 district capitals/islands) |
| `open-data/forecast/meteorology/cities/daily/{id}.json` | Fallback daily forecast |
| `open-data/forecast/meteorology/rcm/rcm-d{0,1,2}.json` | Municipal fire risk (mainland, 3 days) |
| `open-data/sea-locations.json` | 12 coastal zones |
| `open-data/forecast/oceanography/daily/hp-daily-sea-forecast-day{0,1,2}.json` | Sea state (3 days) |
| `open-data/weather-type-classe.json` | Weather-type labels (PT/EN) |
| `open-data/wind-speed-daily-classe.json` | Wind-class labels (PT/EN) |

Two things IPMA does not publish are covered elsewhere:

- **Sunrise/sunset** are computed on-device from the NOAA solar algorithm (`src/lib/sun.ts`), so they work offline for all 423 locations.
- **Tides, swell, wind sea and current** come from the free [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) (Copernicus Marine model, no key). It is a global model: tide times can differ from the official Hydrographic Institute tables by about an hour, so the app labels them as a model and not for navigation. If the service fails, the sea card simply keeps the IPMA data.

The APIs are public, need no key, and allow cross-origin requests. Note that IPMA serializes nearly every number as a string; normalization happens in `src/api/ipma`.

`public-data` is not officially documented — it is the same feed used by [ipma.pt](https://www.ipma.pt/). If it changes or is unavailable, the app falls back to the 35 locations covered by `open-data`.

Fire risk and sea state are only published for the next 3 days, and fire risk is not available for Madeira/Azores. Later days show an explicit "unavailable" state instead of guessing.

## Android APK releases

APKs are built in the cloud by GitHub Actions (`.github/workflows/android-apk.yml`) — no local Android SDK and no Expo account required.

**Publish a new APK**

```bash
git tag v1.0.1
git push origin v1.0.1
```

The workflow runs `expo prebuild` + `./gradlew assembleRelease`, then attaches `IPMAgo-v1.0.1.apk` to a GitHub Release on the tag. Users install it from **Releases** → *Assets*.

You can also run it on demand from **Actions → Android APK → Run workflow**; in that case the APK is only available as a workflow artifact (Actions run page → *Artifacts*).

Notes:

- `android.versionCode` is set to the workflow run number at build time, so every APK installs over the previous one. `version` in `app.json` is what you bump for user-facing version numbers.
- The APK is signed with the Expo template's debug keystore (standard for sideloaded builds). That's fine for direct download, but **not** for Google Play — Play requires your own upload key.
- iOS is not configured; `ios/` stays out of the repo (CNG).

## Project structure

```
src/
  app/                          # Expo Router routes
    (tabs)/index.tsx            # favorites + current location
    (tabs)/explore.tsx          # searchable 423-location list
    location/[id]/index.tsx     # 10-day detail
    location/[id]/day/[date].tsx # day detail sheet (hourly, fire, sea)
  api/ipma/                     # HTTP client, raw types, normalization
  api/marine/                   # Open-Meteo Marine (tides, swell, current)
  components/                   # UI building blocks
  widgets/                      # Android home-screen widget (snapshot, tree, task handler)
  hooks/                        # locations, forecast cache, hazards, GPS
  i18n/                         # pt-PT / en dictionaries + provider
  lib/                          # dates, geo, forecast, districts, fire/sea helpers
  state/                        # favorites + IPMA reference data providers
  storage/                      # AsyncStorage JSON helpers and keys
index.js                        # app entry: widget task handler + expo-router
```
