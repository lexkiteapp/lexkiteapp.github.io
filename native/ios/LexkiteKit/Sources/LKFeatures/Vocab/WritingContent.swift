import Foundation
import JavaScriptCore
import LKSync
import LKStore
import LKDesign

/// Writing / usage content for #/ideas #/letters #/paraphrase #/models #/model #/usage. The web ships it as plain script files
/// (`self.IDEAS = [...]`), native loads the SAME files over the network like the lesson player does (cached on disk by `LessonRemote`,
/// so a screen opens offline after the first visit) and reads the globals out of a JavaScriptCore context – nothing is retyped.
public protocol WritingContentSource: Sendable {
    func ideas() async -> [JSON]
    func letters() async -> [JSON]
    /// `[[question, paraphrase], …]`
    func paraphrase() async -> [JSON]
    func models() async -> [JSON]
    /// Task 2 prompts `{id, type, topic, text}`
    func prompts() async -> [JSON]
    /// Task 1 chart sets `{id, type, title}`
    func task1() async -> [JSON]
    func usage() async -> UsageStore?
}

enum WritingJS {
    /// Run the scripts in one context and return `JSON.stringify(self.<name>)`.
    static func global(_ name: String, scripts: [String]) -> JSON? {
        guard let ctx = JSContext() else { return nil }
        ctx.exceptionHandler = { _, _ in }
        ctx.evaluateScript("var self = this; var window = this;")
        for s in scripts { ctx.evaluateScript(s) }
        guard let v = ctx.evaluateScript("JSON.stringify(self.\(name) || null)"), v.isString, let str = v.toString(), let j = try? JSON.parse(str) else { return nil }
        return j == .null ? nil : j
    }
}

public actor WritingRemoteContent: WritingContentSource {
    public static let shared = WritingRemoteContent()
    private let source: LessonTextSource
    private var memo: [String: [JSON]] = [:]
    private var usageMemo: UsageStore?

    public init(source: LessonTextSource = LessonRemote.shared) { self.source = source }

    private func scripts(_ paths: [String]) async -> [String] {
        var out: [String] = []
        for p in paths { if let s = await source.text(p) { out.append(s) } }
        return out
    }
    private func global(_ key: String, _ name: String, _ paths: [String]) async -> [JSON] {
        if let m = memo[key] { return m }
        let sc = await scripts(paths)
        guard !sc.isEmpty, let arr = WritingJS.global(name, scripts: sc)?.array else { return [] }
        memo[key] = arr
        return arr
    }
    public func ideas() async -> [JSON] { await global("ideas", "IDEAS", ["cpack/write/ideas.js"]) }
    public func letters() async -> [JSON] { await global("letters", "GT_LETTERS", ["js/write/gt-letters.js"]) }
    public func paraphrase() async -> [JSON] { await global("para", "PARAPHRASE", ["js/lib/paraphrase-data.js"]) }
    public func models() async -> [JSON] {
        await global("models", "MODELS", ["js/models.js", "cpack/write/models2.js", "cpack/write/models3.js", "cpack/write/models4.js", "cpack/write/models5.js", "js/write/gt-letters.js"])
    }
    /// Task 2 prompts: the literal `T('id', 'type', 'topic', 'text')` rows of write.js + `WRITE_MORE`
    public func prompts() async -> [JSON] {
        if let m = memo["prompts"] { return m }
        var out: [JSON] = []
        if let src = await source.text("js/write.js") {
            let re = try? NSRegularExpression(pattern: "T\\('([^']+)',\\s*'([^']+)',\\s*'([^']+)',\\s*'((?:[^'\\\\]|\\\\.)*)'\\)")
            for m in re?.matches(in: src, range: NSRange(src.startIndex..., in: src)) ?? [] {
                func g(_ i: Int) -> String { Range(m.range(at: i), in: src).map { String(src[$0]).replacingOccurrences(of: "\\'", with: "'") } ?? "" }
                out.append(.obj([("id", .string(g(1))), ("type", .string(g(2))), ("topic", .string(g(3))), ("text", .string(g(4)))]))
            }
        }
        if let more = await source.text("cpack/write/task2-more.js"), let rows = WritingJS.global("WRITE_MORE", scripts: [more])?.array {
            for r in rows { guard let a = r.array, a.count >= 4, !out.contains(where: { $0.s("id") == a[0].string }) else { continue }
                out.append(.obj([("id", a[0]), ("type", a[1]), ("topic", a[2]), ("text", a[3])])) }
        }
        memo["prompts"] = out
        return out
    }
    public func task1() async -> [JSON] {
        if let m = memo["task1"] { return m }
        var out: [JSON] = []
        let re = try? NSRegularExpression(pattern: "\\{\\s*id:\\s*'([a-z0-9-]+)',\\s*type:\\s*'([a-z]+)',\\s*title:\\s*'((?:[^'\\\\]|\\\\.)*)'")
        for path in ["js/task1.js", "js/write/task1-more.js", "js/write/task1-more2.js"] {
            guard let src = await source.text(path) else { continue }
            for m in re?.matches(in: src, range: NSRange(src.startIndex..., in: src)) ?? [] {
                func g(_ i: Int) -> String { Range(m.range(at: i), in: src).map { String(src[$0]).replacingOccurrences(of: "\\'", with: "'") } ?? "" }
                if !out.contains(where: { $0.s("id") == g(1) }) { out.append(.obj([("id", .string(g(1))), ("type", .string(g(2))), ("title", .string(g(3)))])) }
            }
        }
        memo["task1"] = out
        return out
    }
    public func usage() async -> UsageStore? {
        if let u = usageMemo { return u }
        let files: [(String, String)] = [("p", "js/usage/prep-adj.js"), ("p", "js/usage/prep-verb.js"), ("p", "js/usage/prep-noun.js"), ("v", "js/usage/verb.js"),
                                         ("a", "js/usage/adv.js"), ("s", "js/usage/struct.js"), ("c", "js/usage/pair.js")]
        var srcs: [String: String] = [:]
        for (kind, path) in files {
            guard let s = await source.text(path), let j = WritingJS.global("LK_USAGE_SRC", scripts: [s])?.object?[kind]?.string else { continue }
            srcs[kind, default: ""] += j
        }
        guard !srcs.isEmpty, let idxScript = await source.text("js/usage-index.js") else { return nil }
        let u = UsageStore(sources: srcs, indexJSON: idxScript, verbs: WritingVerbs.shared)
        usageMemo = u
        return u
    }
}

/// The bundled verb tables (native/shared/gen/verbs.json, generated) → `Verbs`. Shared by #/verb, #/usage and the dictionary buttons.
enum WritingVerbs {
    static let shared: Verbs? = {
        guard let url = LKBrand.bundle.url(forResource: "verbs", withExtension: "json"),
              let d = try? Data(contentsOf: url), let j = try? JSON.parse(d) else { return nil }
        return Verbs(tables: j)
    }()
}
