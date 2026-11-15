import Foundation
import LKSync
import LKCore

/// M4 P07 – #/pron logic: ports of web/js/pron.js (hub, lesson rules), pron/pairs.js (minimal-pair speaking), pron/coach.js (rhythm coach).
/// Data (contrasts, IPA, homophones, tips, WEAK, sentences) comes from the content pack, never typed here; randomness and elapsed time are arguments.
/// Verified against vectors/speak.json `pron.*` (SpeakPronVectorTests). Texts are the Vietnamese i18n KEYS the web passes to `t()`.

// MARK: - minimal pairs (pron/pairs.js)

public struct PronContrast: Equatable, Sendable { public var id: String, a: String, b: String, skills: [String], pairs: String }

public struct PronItem: Equatable, Sendable {
    public var c: String, words: [String], ipa: [String], side: Int
    public var retry = false
    public var target: String { words[side] }
    public var other: String { words[1 - side] }
}

/// `{ ok, n, hist:[{d, ok, n}] }` per contrast (localStorage `lk.pronPairs`)
public struct PronStat: Equatable, Sendable {
    public struct Hist: Equatable, Sendable { public var d: String, ok: Int, n: Int }
    public var ok = 0, n = 0
    public var hist: [Hist] = []
    public init(ok: Int = 0, n: Int = 0, hist: [Hist] = []) { self.ok = ok; self.n = n; self.hist = hist }
    public init(json: JSON) { ok = json.i("ok"); n = json.i("n"); hist = json.list("hist").map { Hist(d: $0.s("d"), ok: $0.i("ok"), n: $0.i("n")) } }
    public var json: JSON { .obj([("ok", .int(ok)), ("n", .int(n)), ("hist", .array(hist.map { .obj([("d", .string($0.d)), ("ok", .int($0.ok)), ("n", .int($0.n))]) }))]) }
    public var acc: Double? { n > 0 ? Double(ok) / Double(n) : nil }
}
public typealias PronStats = [String: PronStat]

public struct PronPairs: Sendable {
    public var contrasts: [PronContrast] = []
    public var ipa: [String: String] = [:], num: [String: String] = [:], labels: [String: String] = [:]
    public var hom: [String: [String]] = [:], tips: [String: [String]] = [:]
    public static let storeKey = "lk.pronPairs"

    public init(json: JSON) {
        contrasts = json.list("contrasts").map { PronContrast(id: $0.s("id"), a: $0.s("a"), b: $0.s("b"), skills: $0.strs("skills"), pairs: $0.s("pairs")) }
        for (k, v) in json["ipa"]?.object ?? [:] { ipa[k] = v.string ?? "" }
        for (k, v) in json["num"]?.object ?? [:] { num[k] = v.string ?? "" }
        for (k, v) in json["labels"]?.object ?? [:] { labels[k] = v.string ?? "" }
        for (k, v) in json["hom"]?.object ?? [:] { hom[k] = v.array?.compactMap(\.string) ?? [] }
        for (k, v) in json["tips"]?.object ?? [:] { tips[k] = v.array?.compactMap(\.string) ?? [] }
    }
    public func contrast(_ id: String) -> PronContrast? { contrasts.first { $0.id == id } }
    public func forSkill(_ id: String) -> [PronContrast] { contrasts.filter { $0.skills.contains(id) } }
    /// the Vietnamese key of the contrast's label ("/θ/ – /s/", "Giữ âm cuối", "-ed")
    public func label(_ c: PronContrast) -> String { labels[c.id] ?? "/\(c.a)/ – /\(c.b)/" }
    /// mouth tip for the side (0 = first word's sound)
    public func tip(_ c: String, side: Int) -> String { let t = tips[c] ?? []; return side < t.count ? t[side] : "" }

    /// `{ c, words:[w0,w1], ipa:["/…/","/…/"] }` for every "w0/w1" of the contrast; "word=ipa" overrides the table
    public func pairsOf(_ c: PronContrast) -> [PronItem] {
        c.pairs.split(separator: " ").map { p in
            let parts = p.split(separator: "/", omittingEmptySubsequences: false).map { $0.split(separator: "=", omittingEmptySubsequences: false).map(String.init) }
            let words = parts.map { $0.first ?? "" }
            let ipas = parts.map { x -> String in let own = x.count > 1 ? x[1] : ""; return "/" + (own.isEmpty ? (ipa[x.first ?? ""] ?? "") : own) + "/" }
            return PronItem(c: c.id, words: words, ipa: ipas, side: 0)
        }
    }

    // MARK: deciding what was said
    /// lower-case, accents stripped, ’ → ', everything else but a-z 0-9 ' becomes a gap, digits spelled (NUM)
    public func norm(_ s: String) -> [String] {
        var out = ""
        for u in s.lowercased().decomposedStringWithCompatibilityMapping.replacingOccurrences(of: "\u{2019}", with: "'").replacingOccurrences(of: "\u{2018}", with: "'").unicodeScalars {
            if (0x300...0x36F).contains(u.value) { continue }
            if (u.value >= 97 && u.value <= 122) || (u.value >= 48 && u.value <= 57) || u == "'" || u == " " { out.unicodeScalars.append(u) } else { out.append(" ") }
        }
        return out.split(separator: " ").map { w -> String in
            var s = Substring(w)
            while s.first == "'" { s.removeFirst() }
            while s.last == "'" { s.removeLast() }
            return String(s)
        }.filter { !$0.isEmpty }.map { num[$0] ?? $0 }
    }
    func forms(_ w: String) -> [String] { ([w] + (hom[w] ?? [])).map { String($0.unicodeScalars.filter { ($0.value >= 97 && $0.value <= 122) || $0 == "'" }.map(Character.init)) } }
    func has(_ alt: String, _ w: String) -> Bool {
        let tk = norm(alt), j = tk.joined()
        return forms(w).contains { tk.contains($0) || j == $0 }
    }
    /// the first alternative that holds exactly ONE of the two words decides
    public func decide(_ alts: [String], target: String, other: String) -> (res: String, heard: String) {
        let list = alts.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        for a in list {
            let t = has(a, target), o = has(a, other)
            if t && !o { return ("target", a) }
            if o && !t { return ("other", a) }
        }
        return ("neither", list.first ?? "")
    }

    // MARK: sessions
    public static func weight(_ stats: PronStats, _ id: String) -> Double { stats[id]?.acc.map { 1 + 3 * (1 - $0) } ?? 2 }
    /// `n` words: both words of the pair, weak contrasts drawn more often, never the same pair twice in a row
    public func buildSession(_ cs: [PronContrast], stats: PronStats, n: Int = 10, random rnd: () -> Double) -> [PronItem] {
        struct Pool { var c: PronContrast, ps: [PronItem], used: Int, side: Int }
        var pool: [Pool] = []
        for c in cs { pool.append(Pool(c: c, ps: pairsOf(c), used: 0, side: rnd() < 0.5 ? 0 : 1)) }
        guard !pool.isEmpty else { return [] }
        var out: [PronItem] = []
        for _ in 0..<max(0, n) {
            let w = { (p: Pool) in Self.weight(stats, p.c.id) / (1 + Double(p.used) * 0.5) }
            let tot = pool.reduce(0.0) { $0 + w($1) }
            var r = rnd() * tot, pick = pool.count - 1
            for (i, p) in pool.enumerated() { r -= w(p); if r <= 0 { pick = i; break } }
            var it = pool[pick].ps[pool[pick].used % pool[pick].ps.count]
            it.side = pool[pick].side
            out.append(it); pool[pick].side ^= 1; pool[pick].used += 1
        }
        if out.count > 1 {
            for k in 1..<out.count where out[k].words == out[k - 1].words {
                if let j = out.indices.first(where: { $0 > k && out[$0].words != out[k].words }), j > 0 { out.swapAt(k, j) }
            }
        }
        return out
    }
    /// a wrong answer at `idx` puts the same contrast again `gap` words later (another pair when one is not queued yet), flagged retry
    public func adapt(_ queue: inout [PronItem], at idx: Int, _ it: PronItem, gap: Int = 3) {
        let at = min(idx + gap, queue.count - 1)
        guard at > idx else { return }
        let ps = contrast(it.c).map(pairsOf) ?? []
        let later = queue.suffix(from: idx + 1)
        guard var alt = ps.first(where: { p in p.words != it.words && !later.contains { $0.words == p.words } }) ?? ps.first(where: { $0.words == it.words }) else { return }
        alt.side = it.side; alt.retry = true
        queue[at] = alt
    }
    public static func record(_ stats: inout PronStats, _ id: String, ok: Bool) { var s = stats[id] ?? PronStat(); s.n += 1; if ok { s.ok += 1 }; stats[id] = s }
    /// a session ends: append `{d, ok, n}` per contrast, keep the last 12
    public static func endSession(_ stats: inout PronStats, _ session: [(id: String, ok: Int, n: Int)], day: String) {
        for s in session { var st = stats[s.id] ?? PronStat(); st.hist = Array((st.hist + [.init(d: day, ok: s.ok, n: s.n)]).suffix(12)); stats[s.id] = st }
    }
    /// practised ≥ 2 times with accuracy < 80 %, lowest first
    public static func weak(_ stats: PronStats, ids: [String]? = nil) -> [String] {
        let list = (ids ?? stats.keys.sorted()).filter { id in stats[id].map { $0.n >= 2 && ($0.acc ?? 1) < 0.8 } ?? false }
        return Vocab.stableSorted(list) { (stats[$0]?.acc ?? 0) < (stats[$1]?.acc ?? 0) }
    }

    // MARK: storage (`lk.pronPairs` JSON text)
    public static func load(_ raw: String?) -> JSON { if let raw, let j = try? JSON.parse(raw), j.isObject { return j }; return .object([:]) }
    public static func stats(_ j: JSON) -> PronStats { (j.object ?? [:]).mapValues(PronStat.init(json:)) }
    public static func json(_ s: PronStats) -> JSON { .object(s.mapValues(\.json)) }
    public static func load(_ d: UserDefaults) -> PronStats { stats(load(d.string(forKey: storeKey))) }
    public static func save(_ s: PronStats, _ d: UserDefaults) { d.set(json(s).stableString, forKey: storeKey) }
}

/// One "Nói thử" session (pron/sayit.js): 10 words, each attempt is a `decide` result or a platform error. Pure state machine; the screen feeds it.
public struct PronSaySession: Sendable {
    public enum Outcome: Equatable, Sendable { case good, other, neither, blocked(String) }
    public struct Step: Equatable, Sendable {
        public var index: String, target: String, other: String, labelKey: String
        public var retryTag = false
        public var heard = ""
        public var outcome: Outcome
        /// good · other(heard = the other word) · neither(retry) · neither(skip) · blocked
        public var kind: Kind
        public var tip: String?
        public var nextButton: Bool
        public var micDisabled: Bool
        public enum Kind: Equatable, Sendable { case good, other, retry, skip, blocked }
    }
    public static let size = 10, maxRetry = 2
    public let pairs: PronPairs
    public let contrasts: [PronContrast]
    public private(set) var queue: [PronItem]
    public private(set) var i = 0
    public private(set) var ok = 0, scored = 0, retry = 0
    public private(set) var stats: PronStats
    public private(set) var sess: [(id: String, ok: Int, n: Int)] = []
    public var done: Bool { i >= queue.count }
    public var item: PronItem? { done ? nil : queue[i] }

    public init(pairs: PronPairs, contrasts: [PronContrast], stats: PronStats, random: () -> Double) {
        self.pairs = pairs; self.contrasts = contrasts; self.stats = stats
        queue = pairs.buildSession(contrasts, stats: stats, n: Self.size, random: random)
    }
    public var progress: String { "\(i + 1)/\(queue.count)" }
    /// a platform result: `alts` are the recogniser's alternatives
    public mutating func answer(alts: [String]) -> Step {
        let d = pairs.decide(alts, target: item!.target, other: item!.other)
        var step = apply(d.res == "target" ? .good : (d.res == "other" ? .other : .neither))
        step.heard = d.heard
        return step
    }
    /// codes the web treats as "neither" (retry, no penalty) vs "blocked" (panel with [Luyện nghe]/[Thử lại])
    public static func outcome(forError code: String) -> Outcome {
        ["no-speech", "network", "busy", "whisper"].contains(code) ? .neither : (Recognize.micBlocked.contains(code) || code == "audio-capture" ? .blocked(code) : .neither)
    }
    public mutating func apply(_ o: Outcome) -> Step {
        let it = queue[i], c = pairs.contrast(it.c)
        var step = Step(index: progress, target: it.target, other: it.other, labelKey: c.map(pairs.label) ?? "", retryTag: it.retry, outcome: o, kind: .good, tip: nil, nextButton: false, micDisabled: false)
        switch o {
        case .blocked: step.kind = .blocked
        case .neither:
            retry += 1
            if retry > Self.maxRetry { step.kind = .skip; step.nextButton = true } else { step.kind = .retry }
        case .good, .other:
            let good = o == .good
            scored += 1; if good { ok += 1 }
            PronPairs.record(&stats, it.c, ok: good)
            if let k = sess.firstIndex(where: { $0.id == it.c }) { sess[k].n += 1; if good { sess[k].ok += 1 } } else { sess.append((it.c, good ? 1 : 0, 1)) }
            if !good { pairs.adapt(&queue, at: i, it) }
            step.kind = good ? .good : .other
            if !good { step.tip = it.ipa[it.side] + " – " + pairs.tip(it.c, side: it.side) }
            step.nextButton = true; step.micDisabled = true
        }
        return step
    }
    /// the Vietnamese key of the panel shown when the microphone cannot be used
    public static func blockedKey(_ code: String) -> String {
        code == "unsupported" ? "Thiết bị này chưa hỗ trợ nhận dạng giọng nói – hãy luyện phần nghe phân biệt bên dưới."
            : "Micro bị chặn. Bấm biểu tượng ổ khóa trên thanh địa chỉ → cho phép Micro, rồi thử lại. Trong lúc đó, bạn có thể luyện phần nghe bên dưới."
    }
    /// "Từ tiếp theo"
    public mutating func next() { i += 1; retry = 0 }
    public var pct: Int { scored > 0 ? Vocab.round(Double(ok) / Double(scored) * 100) : 0 }
    public var xp: Int { 5 + ok * 2 }
    /// the learner's feedback tone: ≥ 80 % ok
    public var good: Bool { pct >= 80 }
    /// at the end: history appended, stats ready to save, the reward of `App.reward`
    public mutating func finish(day: String) -> [String: Int] {
        PronPairs.endSession(&stats, sess, day: day)
        return ["spoken": ok, "pron": 1, "xp": xp]
    }
}

// MARK: - rhythm coach (pron/coach.js)

public enum PronSuggestion: Equatable, Sendable { case pair(id: String, skill: String), rhythm(Int), skill(String) }

public struct PronCoach: Sendable {
    public struct Sentence: Equatable, Sendable { public var s: String, lv: String, w: [String]? }
    public struct PlanWord: Equatable, Sendable { public var w: String, stress: Bool, weak: String, light: Bool }
    public struct Diff: Equatable, Sendable { public var missing: [String], missingContent: [String], missingWeak: [String], extra: [String], cover: Double }
    public var sentences: [Sentence]
    public var light: Set<String>
    /// word → [UK IPA, US IPA, example, …]
    public var weak: [String: [String]] = [:]
    public static let rhythmKey = "vb.pron.rhythm"

    public init(coach: JSON, weak: JSON) {
        sentences = coach.list("sentences").map { Sentence(s: $0.s("s"), lv: $0.s("lv"), w: $0["w"]?.array?.compactMap(\.string)) }
        light = Set(coach.strs("light"))
        for (k, v) in weak.object ?? [:] { self.weak[k] = v.array?.compactMap(\.string) ?? [] }
    }
    public init(sentences: [Sentence] = [], light: Set<String> = [], weak: [String: [String]] = [:]) { self.sentences = sentences; self.light = light; self.weak = weak }

    public static func toks(_ s: String) -> [String] {
        var out: [String] = [], cur = ""
        func isL(_ u: Unicode.Scalar) -> Bool { (u.value >= 65 && u.value <= 90) || (u.value >= 97 && u.value <= 122) }
        for u in s.unicodeScalars {
            if isL(u) || (u == "'" && !cur.isEmpty) { cur.unicodeScalars.append(u) } else if !cur.isEmpty { out.append(cur); cur = "" }
        }
        if !cur.isEmpty { out.append(cur) }
        return out
    }
    static func low(_ s: String) -> String { s.lowercased().replacingOccurrences(of: "\u{2019}", with: "'") }

    public func plan(_ sentence: String, forced: [String]? = nil, accent: String) -> [PlanWord] {
        let f = forced.map { Set($0.map(Self.low)) }, us = accent == "en-US" || accent == "US"
        return Self.toks(sentence).map { w in
            let k = Self.low(w), wk = weak[k]
            let stress = f != nil ? f!.contains(k) : (wk == nil && !light.contains(k))
            var ipa = ""
            if let wk, !stress { let i = us ? 1 : 0; ipa = i < wk.count ? "/" + wk[i] + "/" : "//" }
            return PlanWord(w: w, stress: stress, weak: ipa, light: !stress)
        }
    }
    public func diff(heard: String, target: String) -> Diff {
        var pool = Self.toks(heard).map(Self.low), missing: [String] = []
        let want = Self.toks(target).map(Self.low)
        for w in want { if let i = pool.firstIndex(of: w) { pool.remove(at: i) } else { missing.append(w) } }
        let isFn = { (w: String) in self.weak[w] != nil || self.light.contains(w) }
        return Diff(missing: missing, missingContent: missing.filter { !isFn($0) }, missingWeak: missing.filter(isFn), extra: pool,
                    cover: want.isEmpty ? 0 : Double(want.count - missing.count) / Double(want.count))
    }
    public enum Band: String, Sendable { case great, close, again }
    public static func band(_ s: Int) -> Band { s >= 85 ? .great : (s >= 65 ? .close : .again) }
    /// `sim` 0…1 (best of the alternatives) − 12 per missing content word − 3 per missing small word
    public static func score(sim: Double, _ d: Diff) -> Int { max(0, min(100, Vocab.round(sim * 100 - Double(d.missingContent.count) * 12 - Double(d.missingWeak.count) * 3))) }
    /// ≤ 3 next steps: the two weakest contrasts, the first sentence below 85, then lessons to fill up
    public func next(pairs: PronPairs?, stats: PronStats, rhythm: [Int: Int], skill: String) -> [PronSuggestion] {
        var out: [PronSuggestion] = []
        if let pairs {
            for id in PronPairs.weak(stats, ids: pairs.contrasts.map(\.id)).prefix(2) { if let c = pairs.contrast(id) { out.append(.pair(id: id, skill: c.skills.first ?? "")) } }
        }
        if let k = sentences.indices.first(where: { !((rhythm[$0] ?? 0) >= 85) }) { out.append(.rhythm(k)) }
        if out.count < 3 { for id in ["weak-forms", "connected-speech", "word-stress"] where id != skill && out.count < 3 { out.append(.skill(id)) } }
        return Array(out.prefix(3))
    }
    /// `vb.pron.rhythm` = {"0": best, …}
    public static func loadRhythm(_ d: UserDefaults) -> [Int: Int] {
        guard let raw = d.string(forKey: rhythmKey), let j = try? JSON.parse(raw), let o = j.object else { return [:] }
        var r: [Int: Int] = [:]
        for (k, v) in o { if let i = Int(k) { r[i] = Int(JSON.orZero(v)) } }
        return r
    }
    public static func saveRhythm(_ r: [Int: Int], _ d: UserDefaults) {
        d.set(JSON.object(Dictionary(uniqueKeysWithValues: r.map { (String($0.key), JSON.int($0.value)) })).stableString, forKey: rhythmKey)
    }
    /// the saved best per sentence is max(old, new); a reward only from 65 up: {spoken:1, pron:1, xp: ≥85 ? 4 : 2}
    public static func reward(score: Int) -> [String: Int]? { score >= 65 ? ["spoken": 1, "pron": 1, "xp": score >= 85 ? 4 : 2] : nil }
    /// the sentence offered first: the first below 85
    public func first(_ rhythm: [Int: Int]) -> Int { max(0, sentences.indices.first(where: { !((rhythm[$0] ?? 0) >= 85) }) ?? 0) }
}

// MARK: - lesson, hub, mouth (pron.js)

public struct PronMouthShape: Equatable, Sendable {
    public var outer: [Double], inner: [Double], tongue: [Double]
    /// Vietnamese keys of the caption "môi … · hàm …"
    public var lipsKey: String, jawKey: String
}

public enum PronLessonRules {
    /// lesson ids that mount the rhythm coach (pron.js RHYTHM)
    public static let rhythm = ["weak-forms", "word-stress", "stress-shift", "connected-speech", "chunking", "intonation"]
    public static let mouthWordsNeeded = 5
    /// the first word is spoken this long after the lesson opens
    public static let firstWordDelayMs = 300
    /// the sound effect of a scored attempt: ≥ 85 correct, < 65 wrong
    public static func sound(_ score: Int) -> String? { score >= 85 ? "correct" : (score < 65 ? "wrong" : nil) }

    /// the diagram numbers (web `mouthSvg`): lip width, jaw opening, tongue position
    public static func mouth(_ m: JSON) -> PronMouthShape? {
        guard !m.s("lips").isEmpty else { return nil }
        let jaw = m.s("jaw"), lips = m.s("lips"), tongue = m.s("tongue")
        let open: Double = ["close": 6, "mid": 16, "open": 28][jaw] ?? 14
        let wide: Double = ["spread": 70, "neutral": 56, "round": 34][lips] ?? 56
        let tx: Double = ["front": 92, "central": 100, "back": 112][tongue] ?? 100
        let ty: Double = 108 - (["close": 14, "mid": 8, "open": 2][jaw] ?? 8)
        return PronMouthShape(outer: [100, 98, wide / 2 + 10, open / 2 + 12], inner: [100, 98, wide / 2, open / 2 + 2], tongue: [tx, ty + open / 3, 18, 6],
                              lipsKey: ["spread": "môi dàn rộng", "neutral": "môi tự nhiên", "round": "môi tròn"][lips] ?? "",
                              jawKey: ["close": "hàm khép", "mid": "hàm hé", "open": "hàm mở rộng"][jaw] ?? "")
    }
    static let places = ["lips": "hai môi", "teeth": "môi – răng", "tongue-teeth": "lưỡi – răng", "ridge": "lợi trên", "palate": "vòm miệng", "back": "cuống lưỡi", "throat": "thanh hầu"]
    static let manners = ["stop": "âm tắc (bật hơi)", "fricative": "âm xát", "affricate": "âm tắc – xát", "nasal": "âm mũi", "approximant": "âm tiếp cận"]
    /// the chips of the lesson header (Vietnamese keys; place/manner fall back to the raw value)
    public static func chips(_ m: JSON) -> [String] {
        var c: [String] = []
        if let v = m["voiced"], v != .null { c.append(v.truthy ? "hữu thanh (rung cổ)" : "vô thanh (không rung)") }
        if m.t("long") { c.append("âm dài ː") }
        if m.t("place") { c.append(places[m.s("place")] ?? m.s("place")); c.append(manners[m.s("manner")] ?? m.s("manner")) }
        return c
    }
    /// "#/pron/<encodeURIComponent id>"
    public static func href(_ id: String) -> String { "#/pron/" + (id.addingPercentEncoding(withAllowedCharacters: CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()")) ?? id) }

    /// word / sentence microphone: the colour class, the reward, the best per word and the saved lesson best
    public enum Tone: String, Sendable { case good, hard, again }
    public static func tone(_ score: Int) -> Tone { score >= 85 ? .good : (score >= 65 ? .hard : .again) }
    public static func wordReward(_ score: Int) -> [String: Int]? { score >= 65 ? ["spoken": 1, "xp": 2] : nil }
    public static func sentenceReward(_ score: Int) -> [String: Int]? { score >= 70 ? ["spoken": 2, "xp": 4] : nil }
    /// the web's `target.replace(/[↗↘‿]|\s\/\s/g, ' ')` before recognising
    public static func clean(_ s: String) -> String {
        s.replacingOccurrences(of: "[↗↘‿]| / ", with: " ", options: .regularExpression).split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    /// `scores` holds the best per word; the lesson best = max(old, round(mean)) once ≥ min(5, n) words are scored. nil = nothing to write.
    public static func savedBest(scores: [Int: Int], wordCount: Int, old: Int) -> Int? {
        guard scores.count >= min(mouthWordsNeeded, wordCount) else { return nil }
        let pct = Vocab.round(Double(scores.values.reduce(0, +)) / Double(scores.count))
        return max(pct, old) != old ? max(pct, old) : nil
    }
    /// quick quiz: after the LAST question pct = round(right/n·100), reward, best = max(pct, old)
    public static func quizFinish(right: Int, n: Int, old: Int) -> (reward: [String: Int], best: Int?) {
        let pct = Vocab.round(Double(right) / Double(n) * 100)
        return (["quizzes": 1, "pron": 1, "perfect": pct == 100 ? 1 : 0, "xp": 8 + right * 3], max(pct, old) != old ? max(pct, old) : nil)
    }
    /// quick quiz: one try per question; after the last the lesson is finished
    public struct Quiz: Equatable, Sendable {
        public let answers: [Int]
        public private(set) var picked: [Int?]
        public private(set) var right = 0
        public init(answers: [Int]) { self.answers = answers; picked = Array(repeating: nil, count: answers.count) }
        public var finished: Bool { !picked.contains { $0 == nil } }
        /// nil = the question is locked already (a second tap does nothing)
        public mutating func pick(_ q: Int, _ v: Int) -> Bool? {
            guard q < answers.count, picked[q] == nil else { return nil }
            picked[q] = v
            let ok = v == answers[q]
            if ok { right += 1 }
            return ok
        }
    }
    // MARK: pair listening game
    public static let rounds = 8
    public struct Round: Equatable, Sendable { public var options: [String], answer: Int }
    /// 8 rounds from the lesson pairs (cycled), put in random order by `shuffle` (any shuffle: only randomness is required), the spoken side from `random < 0.5`
    public static func pairRounds(_ pairs: [[String]], shuffle: ([[String]]) -> [[String]] = { $0.shuffled() }, random rnd: () -> Double) -> [Round] {
        guard !pairs.isEmpty else { return [] }
        return shuffle((0..<rounds).map { pairs[$0 % pairs.count] }).map { Round(options: $0, answer: rnd() < 0.5 ? 0 : 1) }
    }
    public static func pairFinish(ok: Int, n: Int = rounds) -> (pct: Int, good: Bool, reward: [String: Int]) {
        let pct = Vocab.round(Double(ok) / Double(n) * 100)
        return (pct, pct >= 75, ["quizzes": 1, "pron": 1, "xp": 5 + ok * 2])
    }
}

/// the hub (pron.js `routes.pron`): five groups in this order, a group without lessons is skipped, ring = lessons with an entry ÷ all lessons
public struct PronHub: Equatable, Sendable {
    public struct Group: Equatable, Sendable {
        public var id: String, titleKey: String, descKey: String, emoji: String
        public var chart: Bool
        public var lessons: [String]
        /// lesson id → best % (chart tiles only use the ✓)
        public var done: [String: Int]
        public var unvoiced: [String]
    }
    public static let groups: [(id: String, name: String, emoji: String, desc: String)] = [
        ("vowels", "Nguyên âm đơn", "🅰️", "12 nguyên âm – phân biệt âm dài/ngắn (ship – sheep)"),
        ("diphthongs", "Nguyên âm đôi", "🔀", "8 nguyên âm đôi – trượt từ âm này sang âm kia"),
        ("consonants", "Phụ âm", "🅱️", "24 phụ âm – vô thanh/hữu thanh, vị trí cấu âm"),
        ("vn", "Sửa lỗi người Việt", "🇻🇳", "Âm cuối, đuôi -ed/-s, /θ ð/, /ʃ s/, cụm phụ âm"),
        ("stress", "Trọng âm & ngữ điệu", "🎵", "Trọng âm từ, câu, ngữ điệu, nối âm – điểm Pronunciation band 7+"),
    ]
    public var groupList: [Group]
    public var lessonCount: Int, doneCount: Int
    public var ring: Int { lessonCount > 0 ? Vocab.round(Double(doneCount) / Double(lessonCount) * 100) : 0 }
    public var ringLabel: String { "\(doneCount)/\(lessonCount)" }

    public static func build(lessons: [JSON], pronDone: JSON) -> PronHub {
        let done = pronDone.object ?? [:]
        let gs: [Group] = groups.compactMap { g in
            let ls = lessons.filter { $0.s("group") == g.id }
            guard !ls.isEmpty else { return nil }
            let chart = ["vowels", "diphthongs", "consonants"].contains(g.id)
            var d: [String: Int] = [:]
            for l in ls { if let v = done[l.s("id")], v.truthy { d[l.s("id")] = Int(JSON.orZero(v)) } }
            return Group(id: g.id, titleKey: g.name, descKey: g.desc, emoji: g.emoji, chart: chart, lessons: ls.map { $0.s("id") }, done: d,
                         unvoiced: ls.filter { $0["mouth"]?["voiced"] == .bool(false) }.map { $0.s("id") })
        }
        return PronHub(groupList: gs, lessonCount: lessons.count, doneCount: done.count)
    }
}
