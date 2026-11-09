import Foundation
import LKSync
import LKStore
import LKDesign

/// Writing / usage content for #/ideas #/letters #/paraphrase #/models #/model #/usage. The web ships it as plain script files
/// (`self.IDEAS = [...]`), native loads the SAME files over the network like the lesson player does (cached on disk by `LessonRemote`,
/// so a screen opens offline after the first visit) and reads the literals as data with a pure Swift reader (no JavaScript is ever run) – nothing is retyped.
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
    private func text(_ path: String) async -> String { await source.text(path) ?? "" }
    private func cached(_ key: String, _ build: () async -> [JSON]) async -> [JSON] {
        if let m = memo[key] { return m }
        let v = await build()
        if !v.isEmpty { memo[key] = v }
        return v
    }
    /// every script that defines or extends MODELS / GT_LETTERS, in the order the web loads them
    private static let modelFiles = ["js/models.js", "cpack/write/models2.js", "cpack/write/models3.js", "cpack/write/models4.js", "cpack/write/models5.js",
                                     "js/write/gt-letters.js", "cpack/write/task2-more.js", "js/write/task1-more.js", "js/write/task1-more2.js"]
    private func concat(_ name: String) async -> [JSON] {
        var out: [JSON] = []
        for t in await scripts(Self.modelFiles) { out = WritingData.concatInto(name, cur: out, text: t) }
        return out
    }
    public func ideas() async -> [JSON] { await cached("ideas") { WritingData.ideas(await text("cpack/write/ideas.js")) } }
    public func letters() async -> [JSON] { await cached("letters") { await concat("GT_LETTERS") } }
    public func paraphrase() async -> [JSON] { await cached("para") { WritingData.paraphrase(await text("js/lib/paraphrase-data.js")) } }
    public func models() async -> [JSON] { await cached("models") { await concat("MODELS") } }
    /// Task 2 prompts: the literal `T('id', 'type', 'topic', 'text')` rows of write.js + `WRITE_MORE`
    public func prompts() async -> [JSON] {
        await cached("prompts") { WritingData.prompts(writeJs: await text("js/write.js"), more: await scripts(["cpack/write/task2-more.js"])) }
    }
    public func task1() async -> [JSON] {
        await cached("task1") { WritingData.task1(task1Js: await text("js/task1.js"), more: await scripts(["js/write/task1-more.js", "js/write/task1-more2.js"])) }
    }
    public func usage() async -> UsageStore? {
        if let u = usageMemo { return u }
        var srcs: [String: String] = [:]
        for path in ["js/usage/prep-adj.js", "js/usage/prep-verb.js", "js/usage/prep-noun.js", "js/usage/verb.js", "js/usage/adv.js", "js/usage/struct.js", "js/usage/pair.js"] {
            guard let s = await source.text(path), let u = WritingData.usageSource(s) else { continue }
            srcs[u.kind, default: ""] += u.body
        }
        guard !srcs.isEmpty, let idxScript = await source.text("js/usage-index.js") else { return nil }
        let u = UsageStore(sources: srcs, indexJSON: idxScript, verbs: WritingVerbs.shared)
        usageMemo = u
        return u
    }
}

/// The bundled verb tables (native/shared/gen/verbs.json, generated) → `Verbs`. Shared by #/verb, #/usage and the dictionary buttons.
enum WritingVerbs {
    /// the raw generated tables (verbs.json); also carries `VI_TYPO` for the dictionary
    static let tables: JSON? = {
        guard let url = LKBrand.bundle.url(forResource: "verbs", withExtension: "json"),
              let d = try? Data(contentsOf: url) else { return nil }
        return try? JSON.parse(d)
    }()
    static let shared: Verbs? = tables.map { Verbs(tables: $0) }
}
