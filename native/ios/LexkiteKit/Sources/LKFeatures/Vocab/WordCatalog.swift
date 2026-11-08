import Foundation
import LKStore
import LKStrings

/// The full word library the learner browses (web `IELTS_DATA`): the same `js/data.js` + `js/lib/*.js` scripts the web loads, read as data (no JavaScript is run),
/// cached on disk by `LessonRemote` so it opens offline after the first visit. Before the first download (or offline without a cache) the bundled starter pack is used.
public actor WordCatalogRemote {
    public static let shared = WordCatalogRemote()
    /// load order of the web app
    static let libs = ["topics-more", "skills", "awl", "ngsl", "ngsl2", "office", "tsl-a", "tsl-b", "domain-a", "domain-b", "exam-vocab", "exam-vocab2", "exam-vocab3", "nawl", "bsl"]
    private let source: LessonTextSource
    private var memo: TopicCatalog?

    public init(source: LessonTextSource = LessonRemote.shared) { self.source = source }

    public func catalog() async -> TopicCatalog {
        if let m = memo { return m }
        guard let data = await source.text("js/data.js") else { return StudyCatalog.bundled() }
        let src = source
        let texts: [String?] = await withTaskGroup(of: (Int, String?).self) { g in
            for (n, l) in Self.libs.enumerated() { g.addTask { (n, await src.text("js/lib/\(l).js")) } }
            var out = [String?](repeating: nil, count: Self.libs.count)
            for await (n, t) in g { out[n] = t }
            return out
        }
        let cat = WebWords.catalog(dataJs: data, libs: texts.compactMap { $0 })
        if cat.topics.isEmpty { return StudyCatalog.bundled() }
        memo = cat
        return cat
    }
}

public extension L10n {
    /// A web source text (Vietnamese key, e.g. a topic or group name of the word library) in the UI language; unknown keys stay as they are, like the web `t()`.
    func src(_ source: String) -> String { translate(source: source) ?? source }
}
