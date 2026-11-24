import SwiftUI
import LKCore
import LKDesign

/// Loads the VImg v3 index for the words of a lesson: the small head (js/lexicon-img.json) and only the shards (js/vimg/NN.json) those words live in,
/// through `LessonTextSource` (CDN, last good copy on disk). Failure or "off" → `.none`: the lesson simply has no picture exercises.
public struct PictureIndex: Sendable {
    let source: LessonTextSource
    /// Remote Config `vocab_img` ("on" / "off" / ""), `vocab_img_pct`, and the fixed device bucket 0–99.
    let flag: String?, pct: Int?, bucket: Int

    public init(source: LessonTextSource = LessonRemote.shared, flag: String?, pct: Int?, bucket: Int) {
        self.source = source; self.flag = flag; self.pct = pct; self.bucket = bucket
    }

    /// Fixed per-device number 0–99 (web `lk.vb`): random once, then stored.
    public static func deviceBucket(_ d: UserDefaults = .standard) -> Int {
        if let v = d.object(forKey: "lk.vb") as? Int, (0..<100).contains(v) { return v }
        let b = Int.random(in: 0..<100); d.set(b, forKey: "lk.vb"); return b
    }

    /// `extra` = pool words that may serve as picture distractors (lpic): their shards load only while the total stays ≤ `maxShards`,
    /// most-covering shard first, so a lesson start never fans out into many downloads (shards are cached on disk after the first load).
    public func snapshot(words: [String], extra: [String] = [], maxShards: Int = 4) async -> VocabImages.Snapshot {
        let mode = VocabImages.mode(flag: flag, pct: pct, bucket: bucket)
        guard mode != 0 else { return .none }
        guard let text = await source.text("js/lexicon-img.json"), let head = try? JSONDecoder().decode(VocabImages.Head.self, from: Data(text.utf8)) else { return .none }
        guard mode == 1 || head.on, head.n > 0 else { return .none }
        var shards: [Int: Shard] = [:]
        var want = Set(words.map { VocabImages.shard($0, count: head.n) })
        var cover: [Int: Int] = [:]
        for w in extra { let i = VocabImages.shard(w, count: head.n); if !want.contains(i) { cover[i, default: 0] += 1 } }
        for (i, _) in cover.sorted(by: { $0.value != $1.value ? $0.value > $1.value : $0.key < $1.key }) where want.count < maxShards { want.insert(i) }
        for i in want.sorted() {
            if let t = await source.text(String(format: "js/vimg/%02d.json", i)), let s = try? JSONDecoder().decode(VocabImages.Shard.self, from: Data(t.utf8)) { shards[i] = s }
        }
        return VocabImages.Snapshot(enabled: true, head: head, shards: shards)
    }
    typealias Shard = VocabImages.Shard
}

#if canImport(UIKit)
import UIKit
/// Picture of a "pic" exercise: fixed square box (no layout jump), fades in after it decodes, hidden (box kept) when the file cannot be loaded.
/// Bytes are cached on disk by a dedicated URLCache.
struct LessonPicture: View {
    let url: URL, label: String
    var side: CGFloat = 160
    @State private var image: UIImage?
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.urlCache = URLCache(memoryCapacity: 8 << 20, diskCapacity: 60 << 20, diskPath: "lesson-pictures")
        c.requestCachePolicy = .returnCacheDataElseLoad
        c.timeoutIntervalForRequest = 10
        return URLSession(configuration: c)
    }()
    var body: some View {
        ZStack {
            if let image { Image(uiImage: image).resizable().scaledToFit().transition(.opacity).accessibilityLabel(label) }
        }
        .frame(width: side, height: side)
        .frame(maxWidth: .infinity)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: image != nil)
        .task(id: url) {
            guard let (d, r) = try? await Self.session.data(from: url), (r as? HTTPURLResponse)?.statusCode == 200 else { return }
            image = await UIImage(data: d)?.byPreparingForDisplay()
        }
    }
}
#else
struct LessonPicture: View {
    let url: URL, label: String
    var side: CGFloat = 160
    var body: some View { Color.clear.frame(width: side, height: side) }
}
#endif
