// swift-tools-version: 5.10
// LexkiteKit – everything except the thin app target (native/ios/project.yml). Built and tested on CI only (.github/workflows/native-ios.yml).
import PackageDescription

let package = Package(
    name: "LexkiteKit",
    defaultLocalization: "en",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "LexkiteKit", targets: ["LKFeatures", "LKCore", "LKDesign", "LKStrings"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.17.0"),
    ],
    targets: [
        .target(name: "LKDesign", resources: [.copy("Resources/frame.json")]),
        .target(name: "LKStrings", resources: [.copy("Resources/strings")]),
        .target(name: "LKCore"),
        .target(name: "LKFeatures", dependencies: ["LKDesign", "LKStrings", "LKCore"]),
        .testTarget(name: "LKCoreTests", dependencies: ["LKCore", "LKStrings", "LKDesign"], resources: [.copy("Resources/scoring.json")]),
        .testTarget(name: "LKSnapshotTests", dependencies: [
            "LKFeatures", .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
        ], exclude: ["__Snapshots__"]),
    ]
)
