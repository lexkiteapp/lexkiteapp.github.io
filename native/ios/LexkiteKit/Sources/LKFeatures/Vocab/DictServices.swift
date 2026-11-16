import Foundation
import LKSync
import LKStore

/// Network + persistence behind the dictionary screen. All injectable (`DictNetwork`, `DictCache`, `LexShardLoader`) – snapshot tests and
/// previews pass fakes, the app passes these.
struct DictURLNetwork: DictNetwork {
    var session: URLSession = .shared
    func json(_ url: String, timeout: TimeInterval) async -> JSON? {
        guard let u = URL(string: url) else { return nil }
        var req = URLRequest(url: u)
        req.timeoutInterval = timeout
        guard let (d, r) = try? await session.data(for: req), (r as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSON.parse(d)
    }
}

/// Newest lookups on disk (web `dc2:<word>`), so a word opened once opens again offline.
actor DictDiskCache: DictCache {
    private let dir: URL?
    init(directory: URL? = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("dict", isDirectory: true)) { dir = directory }
    private func file(_ word: String) -> URL? {
        guard let name = word.addingPercentEncoding(withAllowedCharacters: .alphanumerics), !name.isEmpty else { return nil }
        return dir?.appendingPathComponent(String(name.prefix(120)) + ".json")
    }
    func get(_ word: String) async -> JSON? {
        guard let f = file(word), let d = try? Data(contentsOf: f) else { return nil }
        return try? JSON.parse(d)
    }
    func set(_ word: String, _ entry: JSON) async {
        guard let f = file(word), let dir else { return }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? entry.data.write(to: f, options: .atomic)
        // keep the newest 150 only
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        if files.count > 150 {
            let dated = files.map { ($0, (try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) }.sorted { $0.1 < $1.1 }
            for (u, _) in dated.prefix(files.count - 150) { try? FileManager.default.removeItem(at: u) }
        }
    }
}

/// Lexicon shards from the same files the web reads (`/data/lex-index.json`, `/data/lex/c/<hash>.json`), cached on disk by `LessonRemote`.
struct DictLexLoader: LexShardLoader {
    var remote: LessonTextSource = LessonRemote.shared
    private func load(_ path: String) async throws -> JSON {
        guard let t = await remote.text(path), let j = try? JSON.parse(t) else { throw URLError(.cannotLoadFromNetwork) }
        return j
    }
    func index() async throws -> JSON { try await load("data/lex-index.json") }
    func shard(hash: String) async throws -> JSON { try await load("data/lex/c/\(hash).json") }
}

/// "Từ liên quan" (web dict-page.js `loadRelated`, Datamuse): adjectives that go with a noun, nouns that follow an adjective, antonyms,
/// similar words. Datamuse down → synonyms / antonyms of the Free Dictionary and a Retry button.
enum DictRelated {
    struct Result: Equatable, Sendable {
        var jjb: [String] = [], jja: [String] = [], ant: [String] = [], syn: [String] = []
        var down = false
        var isEmpty: Bool { jjb.isEmpty && jja.isEmpty && ant.isEmpty && syn.isEmpty && !down }
    }
    static let stop: Set<String> = ["more", "most", "less", "least", "very", "other", "such", "same", "own", "many", "much", "few", "several", "certain", "various", "error", "orthogonal"]

    static func load(_ e: JSON, net: DictNetwork, origin: String) async -> Result {
        let word = e.s("word"), w = Dict.enc(word), pos = e.s("pos").lowercased()
        func get(_ q: String) async -> [JSON]? { await net.json("https://api.datamuse.com/words?\(q)&o=\(Dict.enc(origin))", timeout: 4)?.array }
        let isNoun = pos.hasPrefix("n") || pos.contains("danh"), isAdj = pos.hasPrefix("adj") || pos.contains("tính")
        var ml = await get("ml=\(w)&max=16&md=f"), jjb0: [JSON] = [], jja: [JSON] = [], ant: [JSON] = []
        let down = ml == nil
        if down {
            let d = await net.json("https://api.dictionaryapi.dev/api/v2/entries/en/\(w)", timeout: 3.5)
            let ms = (d?.array ?? []).flatMap { $0.list("meanings") }
            func pick(_ k: String) -> [String] {
                var seen = Set<String>(), out: [String] = []
                for m in ms { for x in m.strs(k) + m.list("definitions").flatMap({ $0.strs(k) }) where seen.insert(x).inserted { out.append(x) } }
                return out
            }
            ant = pick("antonyms").prefix(6).map { .obj([("word", .string($0))]) }
            ml = pick("synonyms").map { .obj([("word", .string($0)), ("tags", .array(["f:9"]))]) }
        } else {
            func opt(_ on: Bool, _ q: String) async -> [JSON]? { on ? await get(q) : nil }
            async let a = opt(isNoun || !isAdj, "rel_jjb=\(w)&max=14")
            async let b = opt(isAdj, "rel_jja=\(w)&max=10")
            async let c = get("rel_ant=\(w)&max=6")
            (jjb0, jja, ant) = (await a ?? [], await b ?? [], await c ?? [])
        }
        let jjb: [JSON] = isAdj ? [] : Array(jjb0.filter { !stop.contains($0.s("word")) && ($0.d("score") ?? 0) > 300 }.prefix(10))
        let syn = Set(e.strs("syn"))
        let stem = String(word.prefix(max(5, word.count - 4)))
        let mlf: [JSON] = Array((ml ?? []).filter { x in
            let xw = x.s("word")
            let f = x.strs("tags").first { $0.hasPrefix("f:") }.flatMap { Double($0.dropFirst(2)) } ?? 0
            return !syn.contains(xw) && !xw.contains(" ") && !xw.hasPrefix(stem) && !word.hasPrefix(String(xw.prefix(6))) && f >= 1
        }.prefix(8))
        return Result(jjb: jjb.map { $0.s("word") }, jja: jja.map { $0.s("word") }, ant: ant.map { $0.s("word") }, syn: mlf.map { $0.s("word") }, down: down)
    }
}
