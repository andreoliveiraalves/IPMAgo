# IPMAgo

Android weather app built with Expo + React Native, using the free [IPMA open-data](https://api.ipma.pt/) endpoints. Daily forecasts for Portuguese locations, in Portuguese (pt-PT) with an English switch.

- Name: **IPMAgo**
- Scheme: `ipmago`
- Android package: `com.ipmago.app`
- Platform: Android (APK via GitHub Releases). iOS is not configured.

## Features

- **Daily forecast** (5 days) for any of the ~30 IPMA forecast locations.
- **Favorites**: add/remove locations from the search list, the star on the detail screen, or long-press a card on the home screen.
- **Current location**: optional GPS permission; the app matches your position to the nearest IPMA location and shows its forecast.
- **Offline-friendly**: forecasts, the location list, weather-type labels and settings are cached on disk. Cached data is rendered instantly, then refreshed in the background (stale-while-revalidate, 10 min TTL to avoid redundant requests). Old data is never deleted just because it is old.
- **Portuguese / English** switch, persisted between launches.
- Light/dark theme follows the system.

Weather labels and wind-class descriptions come from IPMA's own reference files, so they are translated by the source, not hardcoded.

## Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

Useful checks:

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npx expo-doctor    # dependency/config diagnostics
```

GPS requires a development build or the released APK — Expo Go bundles `expo-location`, so it works there too.

## Data source

All requests go to `https://api.ipma.pt/open-data`:

| Endpoint | Purpose |
| --- | --- |
| `/distrits-islands.json` | Location list (`globalIdLocal`, name, coordinates) |
| `/forecast/meteorology/cities/daily/{globalIdLocal}.json` | 5-day daily forecast |
| `/weather-type-classe.json` | Weather-type labels (PT/EN) |
| `/wind-speed-daily-classe.json` | Wind-class labels (PT/EN) |

The API is public, needs no key, and allows cross-origin requests. Note that IPMA serializes nearly every number as a string; normalization happens in `src/api/ipma`.

## Android APK releases

APKs are built in the cloud by GitHub Actions (`.github/workflows/android-apk.yml`) — no local Android SDK and no Expo account required.

**Publish a new APK**

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs `expo prebuild` + `./gradlew assembleRelease`, then attaches `IPMAgo-v1.0.0.apk` to a GitHub Release on the tag. Users install it from **Releases** → *Assets*.

You can also run it on demand from **Actions → Android APK → Run workflow**; in that case the APK is only available as a workflow artifact (Actions run page → *Artifacts*).

Notes:

- `android.versionCode` is set to the workflow run number at build time, so every APK installs over the previous one. `version` in `app.json` is what you bump for user-facing version numbers.
- The APK is signed with the Expo template's debug keystore (standard for sideloaded builds). That's fine for direct download, but **not** for Google Play — Play requires your own upload key.
- iOS is not configured; `ios/` stays out of the repo (CNG).

## Project structure

```
src/
  app/                 # Expo Router routes
    (tabs)/index.tsx   # favorites + current location
    (tabs)/explore.tsx # searchable location list
    location/[id].tsx  # 5-day detail
  api/ipma/            # HTTP client, raw types, normalization
  components/          # UI building blocks
  hooks/               # locations, forecast cache, GPS
  i18n/                # pt-PT / en dictionaries + provider
  lib/                 # dates, geo (haversine), forecast helpers
  state/               # favorites + IPMA reference data providers
  storage/             # AsyncStorage JSON helpers and keys
```
