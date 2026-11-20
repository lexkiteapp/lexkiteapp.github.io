import Foundation
import XCTest
@testable import LKSync

/// Generated vectors are read straight from native/shared/gen/vectors (one source – never copied into the package).
/// The simulator test process can read the checkout on the CI host, so #filePath resolves to the same tree gen.mjs wrote.
enum Vectors {
    static let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../../shared/gen/vectors").standardized

    static func load(_ name: String, file: StaticString = #filePath, line: UInt = #line) throws -> JSON {
        let url = dir.appendingPathComponent(name)
        guard FileManager.default.fileExists(atPath: url.path) else {
            XCTFail("missing vector file \(url.path) – run node scripts/native/gen.mjs", file: file, line: line)
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSON.parse(try Data(contentsOf: url))
    }
}

/// Structural JSON equality with a readable first difference (path) for failures.
func jsonDiff(_ a: JSON?, _ b: JSON?, path: String = "$") -> String? {
    switch (a, b) {
    case (nil, nil): return nil
    case (.object(let x)?, .object(let y)?):
        for k in Set(x.keys).union(y.keys).sorted() { if let d = jsonDiff(x[k], y[k], path: "\(path).\(k)") { return d } }
        return nil
    case (.array(let x)?, .array(let y)?):
        if x.count != y.count { return "\(path): array length \(x.count) ≠ \(y.count)" }
        for i in 0..<x.count { if let d = jsonDiff(x[i], y[i], path: "\(path)[\(i)]") { return d } }
        return nil
    default:
        return a == b ? nil : "\(path): \(a.map { String($0.stableString.prefix(160)) } ?? "undefined") ≠ \(b.map { String($0.stableString.prefix(160)) } ?? "undefined")"
    }
}

extension SyncDoc {
    /// The Doc as the vectors write it (Drive snapshot without v/at): cards slimmed like web snapLocal.
    func vectorJSON(keys: [String]? = nil) -> JSON {
        var o = (json.object ?? [:])
        o["cards"] = .object(cards.mapValues(SyncCodec.slim))
        if let keys { o = o.filter { keys.contains($0.key) } }
        return .object(o)
    }
}
