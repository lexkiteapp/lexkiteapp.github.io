# Android M1 – workflow changes for the coordinator (.github/workflows/native-android.yml)

1. **paths** – the build now reads `mobile/android/app/google-services.json` (single Firebase source, copied at configuration time,
   git-ignored copy in `native/android/app/`). Add it to both `pull_request.paths` and `push.paths`:
   ```yaml
       paths: ['native/android/**', 'native/shared/**', 'scripts/native/**', 'mobile/android/app/google-services.json', '.github/workflows/native-android.yml']
   ```
2. **Snapshots** – names changed (`today-<lang>-<theme>[-medium].png`, `me-*.png`; 13 images). Dispatch once with `record: true`, commit the
   artifact, and remove the obsolete M0 `app/src/test/snapshots/appshell-*.png`. Keep the count gate, raised to the new set:
   ```yaml
             test "$(ls app/src/test/snapshots/*.png | wc -l)" -ge 13 || { echo "::error::thiếu ảnh snapshot"; exit 1; }
   ```
3. **All modules' unit tests + lint-free build** (the JUnit parity tests live in `:app`, but `:core/:design/:feature-*` must compile for
   unit tests too) – replace the APK step so release (R8 + resource shrink) is also proven on every PR, unsigned, without uploads:
   ```yaml
         - name: Build APK debug + release (R8, không ký, không tải mapping)
           working-directory: native/android
           env: { LEXKITE_CRASHLYTICS_UPLOAD: '0' }
           run: gradle --no-daemon :app:assembleDebug :app:assembleRelease && ls -la app/build/outputs/apk/debug/ app/build/outputs/apk/release/
   ```
4. **Signed Play Internal build** (native-release.yml / android.yml job for the native target): same secrets as `mobile/android`, plus
   Crashlytics mapping upload (network on the runner):
   ```yaml
         - name: Bundle release (ký, mapping → Crashlytics)
           working-directory: native/android
           env:
             LEXKITE_KEYSTORE_FILE: ${{ runner.temp }}/upload.jks
             LEXKITE_KEYSTORE_PASSWORD: ${{ secrets.LEXKITE_KEYSTORE_PASSWORD }}
             LEXKITE_KEY_ALIAS: ${{ secrets.LEXKITE_KEY_ALIAS }}
             LEXKITE_KEY_PASSWORD: ${{ secrets.LEXKITE_KEY_PASSWORD }}
             LEXKITE_VERSION_CODE: ${{ github.run_number }}
             LEXKITE_VERSION_NAME: '2.0.0'
           run: |
             echo "${{ secrets.LEXKITE_KEYSTORE_BASE64 }}" | base64 -d > "$LEXKITE_KEYSTORE_FILE"
             gradle --no-daemon :app:bundleRelease :app:uploadCrashlyticsMappingFileRelease
   ```
   (Use the keystore secret names the existing `android.yml` already uses; the env names above are what `app/build.gradle.kts` reads.)
5. **Device matrix** – compact (390 dp) and medium (600 dp) are covered inside the Robolectric snapshot suite (`@Config` qualifiers),
   so no extra emulator job is needed for M1. Sharding is not needed yet (one Robolectric JVM, ~13 snapshots + ~15 JUnit classes).
6. **App links** – `https://lexkite.com/app/*` verification needs the native signing SHA-256 in `web/.well-known/assetlinks.json`
   (same upload key as the Capacitor app → already there if that file lists it; please confirm).
