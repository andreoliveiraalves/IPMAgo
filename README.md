# IPMAgo

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

- Name: **IPMAgo**
- Scheme: `ipmago`
- Android package: `com.ipmago.app`

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- ESLint is configured (`eslint.config.js`). Run `npm run lint` to lint and `npm run typecheck` to typecheck.
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

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

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
