import Foundation
#if !VIMG_DRIVER
import XCTest
@testable import LKSync
import LKCore
#endif

/// Lesson "pic" pictures: LKCore/Lesson/VocabImages against vectors/vimg.json (real web/js/vocab-img.js).
enum VimgVectorCheck {
    static func run(_ V: JSON) -> (checked: Int, failures: [String]) {
        var n = 0, f: [String] = []
        func check(_ ok: Bool, _ s: @autoclosure () -> String) { n += 1; if !ok && f.count < 25 { f.append(s()) } }
        for c in V["pos"]?.array ?? [] { check(VocabImages.pos(c["in"]?.string) == c["out"]?.string, "pos \(c.stableString)") }
        for c in V["sh"]?.array ?? [] { check(VocabImages.shard(c["w"]?.string ?? "", count: Int(c["n"]?.double ?? 0)) == Int(c["out"]?.double ?? -1), "shard \(c.stableString)") }
        check(Double(VocabImages.defaultPct) == V["defaultPct"]?.double, "default pct")
        for c in V["mode"]?.array ?? [] {
            func flag(_ j: JSON?) -> String? {
                switch j { case .bool(let b)?: return b ? "true" : "false"; case .string(let s)?: return s; default: return nil }
            }
            let got = VocabImages.mode(flag: flag(c["vocab_img"]), pct: c["vocab_img_pct"]?.double.map { Int($0) }, bucket: Int(c["bucket"]?.double ?? 0))
            check(Double(got) == c["mode"]?.double, "mode \(c.stableString): \(got)")
        }
        let head = V["head"].flatMap { try? JSONDecoder().decode(VocabImages.Head.self, from: $0.data) }
        check(head != nil && head!.n > 0, "head decodes")
        var shards: [Int: VocabImages.Shard] = [:]
        for c in V["cases"]?.array ?? [] {
            let word = c["word"]?.string ?? "", pos = c["pos"]?.string, k = VocabImages.key(word, pos)
            check(k == c["key"]?.string, "key \(word)")
            let sh = VocabImages.shard(word, count: head?.n ?? 0)
            check(Double(sh) == c["shard"]?.double, "case shard \(word)")
            if let h = c["hash"]?.string {
                var s = shards[sh] ?? VocabImages.Shard()
                s.m[k] = h
                if c["scene"]?.truthy == true { s.s.insert(k) }
                if c["a"]?.truthy == true { s.a.insert(k) }
                shards[sh] = s
            }
        }
        let snap = VocabImages.Snapshot(enabled: true, head: head, shards: shards)
        for c in V["cases"]?.array ?? [] {
            let word = c["word"]?.string ?? "", pos = c["pos"]?.string
            check(snap.picture(word, pos)?.url.absoluteString == c["url"]?.string, "url \(word)")
            let want = c["url"]?.string != nil && c["scene"]?.truthy != true
            check((snap.usable(word, pos, dark: false) != nil) == want, "usable light \(word)")
            check((snap.usable(word, pos, dark: true) != nil) == (want && c["a"]?.truthy == true), "usable dark \(word)")
        }
        check(!VocabImages.Snapshot.none.enabled && VocabImages.Snapshot.none.picture("apple", "n") == nil, "off → no pictures")
        return (n, f)
    }
}

#if !VIMG_DRIVER
final class VimgVectorTests: XCTestCase {
    func testVimgVectors() throws {
        let r = VimgVectorCheck.run(try Vectors.load("vimg.json"))
        XCTAssertGreaterThanOrEqual(r.checked, 600, "too few checks ran")
        XCTAssert(r.failures.isEmpty, r.failures.joined(separator: "\n"))
    }
}
#endif
