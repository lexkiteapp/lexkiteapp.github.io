// swift-tools-version: 5.10
// LexkiteKit – everything except the thin app target (native/ios/project.yml). Built and tested on CI only (.github/workflows/native-ios.yml).
// Firebase (Auth, Crashlytics) is NOT a dependency here: it lives in the app target behind the LKAuth / LKCrash protocols (LKSync),
// so every LexkiteKit test runs without Firebase, network or credentials.
import PackageDescription

let package = Package(
    name: "LexkiteKit",
    defaultLocalization: "en",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "LexkiteKit", targets: ["LKFeatures", "LKCore", "LKDesign", "LKStrings", "LKSync", "LKStore"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.17.0"),
    ],
    targets: [
        // Assets.xcassets = the brand mark (LexkiteMark, generated from brand/lexkite-mark.svg); teach/ = bundled Ama stills (generated from web/teach/ama, offline first frame)
        .target(name: "LKDesign", resources: [.copy("Resources/frame.json"), .copy("Resources/verbs.json"), .process("Resources/Assets.xcassets"), .copy("Resources/teach")]),
        .target(name: "LKStrings", resources: [.copy("Resources/strings")]),
        .target(name: "LKCore"),
        // Data contract shared with web / add-on / Android (docs/specs/native-apps.md §4): merge port of web/js/sync.js, D1 + Drive transports, auth + crash protocols, SyncEngine
        .target(name: "LKSync", dependencies: ["LKCore"]),
        // Offline-first SwiftData store (CardModel, StatDay, Settings, SyncMeta, LegacyKV) + Capacitor migration import (C03)
        .target(name: "LKStore", dependencies: ["LKSync", "LKCore", "LKStrings"], resources: [.copy("Resources/starter.json"), .copy("Resources/skills-content.json"), .copy("Resources/speak-content.json"), .copy("Resources/call-content.json")]),
        .target(name: "LKFeatures", dependencies: ["LKDesign", "LKStrings", "LKCore", "LKSync", "LKStore"]),
        .testTarget(name: "LKCoreTests", dependencies: ["LKCore", "LKStrings", "LKDesign"], resources: [.copy("Resources/scoring.json")]),
        // vectors are read straight from native/shared/gen/vectors (one source, never copied): sync.json, migration.json, compat.json
        .testTarget(name: "LKSyncTests", dependencies: ["LKSync", "LKStore", "LKCore", "LKStrings"]),
        .testTarget(name: "LKFeaturesTests", dependencies: ["LKFeatures", "LKSync", "LKStore", "LKStrings", "LKDesign", "LKCore"]),
        .testTarget(name: "LKSnapshotTests", dependencies: [
            "LKFeatures", "LKStrings", "LKStore", "LKSync", "LKDesign", "LKCore", .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ], exclude: ["__Snapshots__"]),
    ]
)
