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

    public func snapshot(words: [String]) async -> VocabImages.Snapshot {
        let mode = VocabImages.mode(flag: flag, pct: pct, bucket: bucket)
        guard mode != 0 else { return .none }
        guard let text = await source.text("js/lexicon-img.json"), let head = try? JSONDecoder().decode(VocabImages.Head.self, from: Data(text.utf8)) else { return .none }
        guard mode == 1 || head.on, head.n > 0 else { return .none }
        var shards: [Int: Shard] = [:]
        for i in Set(words.map { VocabImages.shard($0, count: head.n) }) {
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
        .frame(width: 160, height: 160)
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
    var body: some View { Color.clear.frame(width: 160, height: 160) }
}
#endif
