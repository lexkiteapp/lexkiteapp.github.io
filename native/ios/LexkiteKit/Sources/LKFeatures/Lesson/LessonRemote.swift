import Foundation
import LKCore

/// CDN-delivered lesson data, fetched like the web does (not bundled): gold bank ("Why?" + score booster) and stories / radio. (Pictures: the web's lexicon-img.json carries no word index today, so the engine's `pic` kind is never built there either.)
/// Network first (8 s), then the last good copy on disk, so a lesson still opens offline.
public protocol LessonTextSource: Sendable {
    func text(_ path: String) async -> String?
}

public actor LessonRemote: LessonTextSource {
    public static let shared = LessonRemote()
    public static let base = URL(string: "https://lexkite.com/")!
    private let dir: URL?
    private let session: URLSession
    private var memo: [String: String] = [:]

    public init(directory: URL? = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("lesson", isDirectory: true),
                session: URLSession = .shared) {
        dir = directory; self.session = session
    }

    public func text(_ path: String) async -> String? {
        if let m = memo[path] { return m }
        let file = dir?.appendingPathComponent(path.replacingOccurrences(of: "/", with: "_"))
        var req = URLRequest(url: Self.base.appendingPathComponent(path))
        req.timeoutInterval = 8
        if let (d, r) = try? await session.data(for: req), (r as? HTTPURLResponse)?.statusCode == 200, let s = String(data: d, encoding: .utf8), !s.isEmpty {
            memo[path] = s
            if let file { try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true); try? d.write(to: file, options: .atomic) }
            return s
        }
        if let file, let s = try? String(contentsOf: file, encoding: .utf8), !s.isEmpty { memo[path] = s; return s }
        return nil
    }
}

/// `self.LESSON_GOLD = {"<word>":[{why,w,r,mem,ex[]}]}` (web/js/lesson/gold.js).
public struct LessonGold: Sendable {
    public struct Entry: Decodable, Sendable, Equatable {
        public var why: String, w: String?, r: String?, mem: String?, ex: [String]?
    }
    public let words: [String: [Entry]]
    public init(words: [String: [Entry]] = [:]) { self.words = words }
    public func entries(for word: String) -> [Entry] { words[LessonEngine.norm(word)] ?? [] }
    /// The "score booster" pair (a frequent mistake → the better phrase): the first entry that has both.
    public func booster(for word: String) -> Entry? { entries(for: word).first { !($0.w ?? "").isEmpty && !($0.r ?? "").isEmpty } }

    public static func parse(_ script: String) -> LessonGold? {
        guard let eq = script.firstIndex(of: "="), let end = script.lastIndex(of: "}") else { return nil }
        guard let d = try? JSONDecoder().decode([String: [Entry]].self, from: Data(script[script.index(after: eq)...end].utf8)) else { return nil }
        return LessonGold(words: d)
    }
}
