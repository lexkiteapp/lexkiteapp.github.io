# iOS M1 – changes requested in `.github/workflows/native-ios.yml` (coordinator applies; iOS agent does not edit workflows)

Why: M1 adds test targets `LKSyncTests` (vectors sync/migration/compat, engine with fake D1) and `LKFeaturesTests`
(`testParityP01/P02/C01/C08/C09/C10/C11`, layout perf), more snapshots (frame + Today + Me × en/vi/ar/de × light/dark = 20 PNG),
and the app target now links Firebase (Auth, Crashlytics, Remote Config) + GoogleSignIn via SPM and references
`mobile/ios/App/App/GoogleService-Info.plist` + `web/js/ota-key.js` (one source, never copied).
The `-Package` scheme already runs every test target, so no `-only-testing` change is needed for the main run.

## 1. `paths` (both `pull_request` and `push`) – add the referenced sources
```yaml
    paths: ['native/ios/**', 'native/shared/**', 'scripts/native/**', '.github/workflows/native-ios.yml',
            'mobile/ios/App/App/GoogleService-Info.plist', 'web/js/ota-key.js']
```

## 2. Job `ios`: SPM cache + timeout for the first Firebase resolve (raising a timeout is not a weaker gate)
```yaml
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: |
            ~/Library/Caches/org.swift.swiftpm
            native/ios/build/SourcePackages
          key: spm-native-ios-${{ hashFiles('native/ios/project.yml', 'native/ios/LexkiteKit/Package.swift') }}
          restore-keys: spm-native-ios-
```

## 3. Snapshot count gate – raise, never lower (20 references after M1)
```yaml
          ls Tests/LKSnapshotTests/__Snapshots__/*/*.png | wc -l | xargs -I{} sh -c 'test {} -ge 20 || { echo "::error::thiếu ảnh snapshot ({})"; exit 1; }'
```

## 4. Build app – keep unsigned simulator build; packages resolve into the cached dir
```yaml
          xcodebuild -project Lexkite.xcodeproj -scheme Lexkite -configuration Debug -sdk iphonesimulator \
            -destination 'generic/platform=iOS Simulator' -derivedDataPath build -clonedSourcePackagesDirPath build/SourcePackages \
            CODE_SIGNING_ALLOWED=NO build 2>&1 | tail -30
          test -d build/Build/Products/Debug-iphonesimulator/Lexkite.app
          # one-source injections happened (Google callback scheme + content key from web/js/ota-key.js)
          /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" build/Build/Products/Debug-iphonesimulator/Lexkite.app/Info.plist | grep -q googleusercontent
          test -n "$(/usr/libexec/PlistBuddy -c 'Print :LKContentKeySPKI' build/Build/Products/Debug-iphonesimulator/Lexkite.app/Info.plist)"
          test -f build/Build/Products/Debug-iphonesimulator/Lexkite.app/migration-export.js
```

## 5. New job: device matrix (spec §7: iPhone SE / 15 / Pro Max / iPad) – parity + layout tests on each size, in parallel
```yaml
  devices:
    runs-on: macos-15
    timeout-minutes: 40
    strategy:
      fail-fast: false
      matrix:
        device: ['iPhone SE (3rd generation)', 'iPhone 16', 'iPhone 16 Pro Max', 'iPad (10th generation)']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with: { path: ~/Library/Caches/org.swift.swiftpm, key: spm-native-ios-kit-${{ hashFiles('native/ios/LexkiteKit/Package.swift') }} }
      - name: Chọn Xcode 26
        run: |
          X=$(ls -d /Applications/Xcode_26*.app 2>/dev/null | sort -V | tail -1)
          [ -n "$X" ] && sudo xcode-select -s "$X/Contents/Developer"; xcodebuild -version
      - name: Chọn máy giả lập ${{ matrix.device }}
        id: sim
        run: |
          DEV=$(xcrun simctl list devices available | grep -F "${{ matrix.device }} (" | head -1 | grep -oE '[A-F0-9-]{36}')
          test -n "$DEV" || { echo "::error::không có ${{ matrix.device }} trên máy chủ"; xcrun simctl list devices available; exit 1; }
          echo "dest=platform=iOS Simulator,id=$DEV" >> "$GITHUB_OUTPUT"
      - name: LKFeaturesTests + LKSyncTests trên ${{ matrix.device }}
        working-directory: native/ios/LexkiteKit
        run: |
          SCHEME=$(xcodebuild -list -json | python3 -c 'import json,sys;s=json.load(sys.stdin)["workspace"]["schemes"];print(next((x for x in s if x.endswith("-Package")),s[0]))')
          set -o pipefail
          xcodebuild test -scheme "$SCHEME" -destination "${{ steps.sim.outputs.dest }}" -skipPackagePluginValidation \
            -only-testing:LKFeaturesTests -only-testing:LKSyncTests 2>&1 | tail -40
```
(Device names: if the runner image renames a simulator, the step fails loudly instead of silently skipping a size.)

## 6. Release later (M6 / TestFlight builds): Crashlytics dSYM upload already runs from project.yml in Release only; the TestFlight
job needs no extra secret for it (GoogleService-Info.plist carries the app id). Associated Domains `applinks:lexkite.com` needs
`https://lexkite.com/.well-known/apple-app-site-association` listing `com.lexkite.app` with path `/app/*` (web/functions side).
