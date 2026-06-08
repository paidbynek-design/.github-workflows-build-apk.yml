# DUCKY — Build the APK (Shizuku lib injector)

This folder holds the **native Android** pieces that the web UI cannot provide on its own.
The web app (this v0 project) is the front-end; the Kotlin files here are the privileged
Shizuku layer that actually copies a `.so` into a game's `arm64-v8a` folder.

The web UI already calls `window.ShizukuBridge` (see `lib/libfile.ts`). These files implement it.

---

## EASIEST: Cloud build, NO PC needed (recommended)

A GitHub Actions workflow builds the APK for you in the cloud. You only need a phone with a browser.

> NOTE: v0 cannot push GitHub Actions files itself (that caused the
> "contains GitHub Actions workflow files that cannot be pushed" error). So the
> workflow lives here as `android-bridge/build-apk.workflow.yml` and you add it on
> GitHub in one quick step below.

1. In v0, connect this project to **GitHub** (top-right settings menu -> Git -> Create Repository).
   The push now works because there is no longer a `.github/workflows` file in the project.
2. After the repo is created, open it on **github.com**.
3. Tap **Add file -> Create new file**. Name it exactly:
   `.github/workflows/build-apk.yml`
4. Open `android-bridge/build-apk.workflow.yml` in your repo, copy everything **below the divider line**,
   paste it into the new file, and **Commit**.
5. Go to the **Actions** tab -> the **"Build DUCKY APK"** workflow runs automatically.
6. When it turns green, open the run, scroll to **Artifacts**, download **DUCKY-apk** (your `app-debug.apk`),
   and install it on your phone.

No Android Studio, no PC. The workflow handles static export, Capacitor, the Shizuku
dependency, manifest entries, and copying the Kotlin bridge in automatically.

---

## MANUAL: Build on a PC with Android Studio

Use this only if you prefer building locally.

## 1. Export the web app as static files

In `next.config.mjs` set static export:

```js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
}
export default nextConfig
```

Then build:

```bash
pnpm build      # produces the static site in ./out
```

> Note: a static export means no server features. This app is fully client-side
> (localStorage), so that's fine.

## 2. Add Capacitor (wraps the web app in an APK)

```bash
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
npx cap init DUCKY com.ducky.app --web-dir=out
npx cap add android
npx cap sync
```

## 3. Add the Shizuku dependency

In `android/app/build.gradle`:

```gradle
dependencies {
    implementation "dev.rikka.shizuku:api:13.1.5"
    implementation "dev.rikka.shizuku:provider:13.1.5"
}
```

## 4. Declare Shizuku in the manifest

In `android/app/src/main/AndroidManifest.xml`, inside `<application>`:

```xml
<provider
    android:name="rikka.shizuku.ShizukuProvider"
    android:authorities="${applicationId}.shizuku"
    android:multiprocess="false"
    android:enabled="true"
    android:exported="true"
    android:permission="android.permission.INTERACT_ACROSS_USERS_FULL" />
```

And request the Shizuku permission near the top of the manifest:

```xml
<uses-permission android:name="moe.shizuku.manager.permission.API_V23" />
```

## 5. Drop in the native bridge

Copy the two Kotlin files from this folder into the generated project:

```
android-bridge/ShizukuBridge.kt  ->  android/app/src/main/java/com/ducky/app/ShizukuBridge.kt
android-bridge/MainActivity.kt   ->  android/app/src/main/java/com/ducky/app/MainActivity.kt
```

(They use package `com.ducky.app` — keep that matching your applicationId.)

## 6. Build the APK

```bash
npx cap open android      # opens Android Studio
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
The signed/debug `app-debug.apk` is your downloadable APK.

---

## How it works end to end

1. User opens the app, goes to **Developer** (password `ducky0008`).
2. In the **Lib File** section they pick a `.so`, set the target game package, tap **UPDATE LIB**.
3. `lib/libfile.ts` reads `window.ShizukuBridge.applyLib(pkg, name, base64)`.
4. `ShizukuBridge.kt` decodes the file, then runs an elevated `cp` via Shizuku into:
   - the game's resolved `nativeLibraryDir`, and
   - `/data/data/<package>/lib/arm64-v8a/`
   fixing perms with `chmod`/`chown`/`restorecon`.
5. It returns `{ ok, message }` which the UI displays.

## Requirements on the device

- **Shizuku app installed and running** (started via ADB or wireless debugging, or rooted).
- On non-rooted devices, Shizuku grants ADB-level (shell) privileges. Writing into
  `/data/app/<game>/lib` typically needs **root**; shell-level may be blocked by SELinux.
  For full reliability across all games, a rooted device + Shizuku in root mode is recommended.
