import Foundation

/// Lesson engine – a line-by-line port of web/js/lesson/engine.js (pure core: pick words, build exercises, adapt, check, results).
/// Verified against native/shared/gen/vectors/lesson.json (generated from the real JS). Never tune a rule here; change the JS and regenerate.
public enum LessonEngine {
    public static let day: Double = 86_400_000
    /// Speech exercises: a score ≥ `speechPass` passes; the `speechRetries`-th miss in a row is submitted anyway (vectors/lesson.json similarity).
    public static let speechPass = 70
    public static let speechRetries = 2
    public static let hints: [String: [String]] = [
        "gap": ["fifty"], "mean": ["fifty"], "q": ["fifty"], "build": ["first"], "tr": ["first"], "type": ["letter", "bank"], "say": ["slow"], "pic": ["slow"], "match": ["pair"],
    ]
    /// Exercise kinds per path button (`KIND`); nil = everything.
    public static let kind: [String: [String]?] = ["lesson": nil, "review": nil, "listen": ["gap", "build", "type", "match"], "speak": ["say", "pic", "gap"]]

    // MARK: random
    /// xorshift32 with a seed (JS `rng`): numbers in [0,1) with 6 decimals.
    public struct RNG: Sendable {
        var s: UInt32
        public init(seed: Double) {
            let u = UInt32(truncatingIfNeeded: Int64(exactly: seed.rounded(.towardZero)) ?? 0)
            s = u == 0 ? 1 : u
        }
        public mutating func next() -> Double {
            s ^= s << 13; s ^= s >> 17; s ^= s << 5
            return Double(s % 1_000_000) / 1e6
        }
    }
    public static func shuffle<T>(_ a: [T], _ r: inout RNG) -> [T] {
        var a = a
        if a.count < 2 { return a }
        var i = a.count - 1
        while i > 0 {
            let j = Int((r.next() * Double(i + 1)).rounded(.down))
            a.swapAt(i, j)
            i -= 1
        }
        return a
    }

    // MARK: text
    public static func norm(_ s: String) -> String { Answer.norm(s) }
    public static func same(_ a: String, _ b: String) -> Bool { norm(a) == norm(b) }
    static func isWordChar(_ u: UInt16) -> Bool { (u >= 65 && u <= 90) || (u >= 97 && u <= 122) || (u >= 48 && u <= 57) || u == 39 }
    /// JS `toks`: drop “ ” ", split on whitespace, trim everything but A-Za-z0-9' from both ends.
    public static func toks(_ s: String) -> [String] {
        let cleaned = s.replacingOccurrences(of: "\u{201C}", with: "").replacingOccurrences(of: "\u{201D}", with: "").replacingOccurrences(of: "\"", with: "")
        var out: [String] = []
        for part in cleaned.components(separatedBy: .whitespacesAndNewlines) where !part.isEmpty {
            let u = Array(part.utf16)
            var a = 0, b = u.count
            while a < b && !isWordChar(u[a]) { a += 1 }
            while b > a && !isWordChar(u[b - 1]) { b -= 1 }
            if a < b { out.append(String(utf16CodeUnits: Array(u[a..<b]), count: b - a)) }
        }
        return out
    }
    static func pos(_ p: String) -> String {
        let s = p.lowercased()
        func m(_ re: String) -> Bool { s.range(of: re, options: .regularExpression) != nil }
        if m("^(n|noun)\\b|^danh") { return "n" }
        if m("^(v|verb)\\b|^động") { return "v" }
        if m("^adj|^tính") { return "adj" }
        if m("^adv|^trạng") { return "adv" }
        return s.isEmpty ? "?" : s
    }

    /// Where `word` sits in `sentence` (variants allowed: consider → considering; phrases match consecutive tokens).
    public static func findWord(_ sentence: String, _ word: String) -> LessonBlank? {
        let T = toks(sentence), W = toks(word).map { $0.lowercased() }
        if T.isEmpty || W.isEmpty { return nil }
        func stem(_ w: String) -> String {
            guard w.utf16.count > 4, let l = w.last, l == "e" || l == "y" else { return w }
            return String(w.dropLast())
        }
        func hit(_ tok: String, _ w: String, _ last: Bool) -> Bool {
            let x = tok.lowercased()
            return x == w || (last && x.hasPrefix(stem(w)) && x.utf16.count - w.utf16.count <= 3)
        }
        var i = 0
        while i + W.count <= T.count {
            var ok = true
            for k in 0..<W.count where !hit(T[i + k], W[k], k == W.count - 1) { ok = false; break }
            if ok { return LessonBlank(i: i, n: W.count, toks: T, form: T[i..<(i + W.count)].joined(separator: " ")) }
            i += 1
        }
        return nil
    }

    /// Practice sentence of a card: the learner's own sentence → bilingual sentence → library example; only sentences containing the word, 3–14 tokens.
    public static func sentenceOf(_ c: LessonCard) -> LessonSentenceHit? {
        var cands: [(text: String, tr: String?, own: Bool)] = []
        if !c.ctx.isEmpty { cands.append((c.ctx, nil, true)) }
        for x in c.contexts where !x.text.isEmpty { cands.append((x.text, nil, true)) }
        for x in c.sentences where !x.en.isEmpty { cands.append((x.en, x.vi, false)) }
        if !c.ex.isEmpty { cands.append((c.ex, nil, false)) }
        for s in cands {
            let n = toks(s.text).count
            if let f = findWord(s.text, c.word), n >= 3, n <= 14 { return LessonSentenceHit(text: s.text, tr: s.tr, own: s.own, at: f) }
        }
        return nil
    }

    // MARK: due
    public static func fromExt(_ c: LessonCard) -> Bool {
        if !c.src.isEmpty { return true }
        return c.contexts.contains { $0.source.hasPrefix("http://") || $0.source.hasPrefix("https://") }
    }
    /// End of the local day of `now` (JS `setHours(23,59,59,999)`).
    public static func endOfDay(_ now: Double, _ cal: Calendar) -> Double {
        let d = Date(timeIntervalSince1970: now / 1000)
        var c = cal.dateComponents([.year, .month, .day], from: d)
        c.hour = 23; c.minute = 59; c.second = 59; c.nanosecond = 999_000_000
        return ((cal.date(from: c) ?? d).timeIntervalSince1970 * 1000).rounded()
    }
    static func hasHistory(_ s: LessonSRS) -> Bool { s.reps > 0 || (s.last ?? 0) != 0 }
    public static func isDue(_ c: LessonCard, _ now: Double, calendar: Calendar = .current) -> Bool {
        guard let s = c.srs, hasHistory(s), let due = s.due else { return false }
        return due <= endOfDay(now, calendar)
    }
    static func isNew(_ c: LessonCard) -> Bool { c.srs.map { $0.reps == 0 && ($0.last ?? 0) == 0 } ?? false }

    public struct PickOptions: Sendable {
        public var n = 6, now: Double, mode: String?, starter: [LessonCard]
        public init(n: Int = 6, now: Double, mode: String? = nil, starter: [LessonCard] = []) { self.n = n; self.now = now; self.mode = mode; self.starter = starter }
    }
    /// Words for one lesson: due (oldest first) → looked up with the add-on (newest first) → new cards → starter set.
    public static func pickWords(_ cards: [LessonCard], _ o: PickOptions, calendar: Calendar = .current) -> [LessonPick] {
        let list = cards.filter { !$0.word.isEmpty && (!$0.vi.isEmpty || !$0.def.isEmpty) }
        var out: [LessonPick] = [], seen = Set<String>()
        func add(_ c: LessonCard, _ why: String) {
            let k = norm(c.word)
            if out.count < o.n && !seen.contains(k) { seen.insert(k); out.append(LessonPick(card: c, why: why)) }
        }
        func sorted(_ a: [LessonCard], _ less: (LessonCard, LessonCard) -> Bool) -> [LessonCard] {
            // stable (JS sort is stable): insertion by index tie-break
            a.enumerated().sorted { l, r in less(l.element, r.element) ? true : (less(r.element, l.element) ? false : l.offset < r.offset) }.map(\.element)
        }
        if o.mode == "review" {
            let weak = list.filter { ($0.srs?.lapses ?? 0) > 0 && ($0.srs?.reps == 0 || isDue($0, o.now, calendar: calendar)) }
            for c in sorted(weak, { ($0.srs?.lapses ?? 0) > ($1.srs?.lapses ?? 0) }) { add(c, "due") }
        }
        for c in sorted(list.filter { isDue($0, o.now, calendar: calendar) }, { ($0.srs?.due ?? 0) < ($1.srs?.due ?? 0) }) { add(c, "due") }
        for c in sorted(list.filter { !isDue($0, o.now, calendar: calendar) && fromExt($0) }, { $0.mod > $1.mod }) { add(c, "ext") }
        for c in sorted(list.filter { isNew($0) }, { $0.mod > $1.mod }) { add(c, "new") }
        if out.count < min(4, o.n) { for c in o.starter { add(c, "start") } }
        return out
    }

    // MARK: build
    public struct BuildOptions {
        public var seed: Double, pool: [LessonCard], off: LessonOff, perWord: Int, only: [String]?, calm: Bool, match: Bool
        public var hasImg: ((String, String) -> Bool)?, gloss: ((LessonCard, String) -> String)?, mean: ((LessonCard) -> String)?
        public init(seed: Double, pool: [LessonCard] = [], off: LessonOff = LessonOff(), perWord: Int = 2, only: [String]? = nil, calm: Bool = false, match: Bool = true,
                    hasImg: ((String, String) -> Bool)? = nil, gloss: ((LessonCard, String) -> String)? = nil, mean: ((LessonCard) -> String)? = nil) {
            self.seed = seed == 0 ? Date().timeIntervalSince1970 * 1000 : seed; self.pool = pool; self.off = off; self.perWord = perWord; self.only = only; self.calm = calm
            self.match = match; self.hasImg = hasImg; self.gloss = gloss; self.mean = mean
        }
    }

    /// Wrong options of the same part of speech first, never the answer.
    static func distract(_ word: String, _ posS: String, _ pool: [LessonCard], _ k: Int, _ r: inout RNG) -> [String] {
        let P = pos(posS), cand = shuffle(pool.filter { !$0.word.isEmpty && !same($0.word, word) }, &r)
        let pick = cand.filter { pos($0.pos) == P } + cand.filter { pos($0.pos) != P }
        var out: [String] = []
        for c in pick {
            if !out.contains(where: { same($0, c.word) }) { out.append(c.word) }
            if out.count >= k { break }
        }
        return out
    }
    /// Letter tiles for "type the word": the answer's letters (keeps "-", "'") + 3 letters not in the word.
    public static func letterBank(_ word: String, _ r: inout RNG) -> [String] {
        let ch = word.map { String($0) }.filter { $0 != " " }
        let abc = "abcdefghijklmnopqrstuvwxyz".map { String($0) }.filter { !ch.contains($0) }
        return shuffle(ch + Array(shuffle(abc, &r).prefix(3)), &r)
    }

    private struct Planned { var pick: LessonPick, s: LessonSentenceHit?, pair: LessonSentenceHit?, types: [String], order: [String] = [] }

    public static func build(_ picks: [LessonPick], _ o: BuildOptions) -> [LessonItem] {
        var r = RNG(seed: o.seed)
        let pool = o.pool + picks.map(\.card), off = o.off, per = o.perWord
        var byWord: [Planned] = picks.map { p in
            let c = p.card
            var s = sentenceOf(c), types: [String] = []
            var pair: LessonSentenceHit?
            for x in c.sentences where !x.en.isEmpty && !x.vi.isEmpty {
                if let f = findWord(x.en, c.word) {
                    let n = toks(x.en).count
                    if n >= 3 && n <= 10 { pair = LessonSentenceHit(text: x.en, tr: x.vi, own: false, at: f); break }
                }
            }
            if var ss = s, (ss.tr ?? "").isEmpty, let g = o.gloss { ss.tr = g(c, ss.text); s = ss }
            if s != nil { types.append("gap") }
            if let ss = s, ss.at.toks.count <= 10, !(ss.tr ?? "").isEmpty || !off.listen { types.append("build") }
            if let h = o.hasImg, h(c.word, c.pos) { types.append("pic") }
            if pair != nil { types.append("tr") }
            let mn = o.mean?(c) ?? ""
            let w = c.word.trimmingCharacters(in: .whitespacesAndNewlines)
            if !w.contains(where: { $0.isWhitespace }) && c.word.utf16.count >= 3 && (!off.listen || !mn.isEmpty || !c.def.isEmpty) { types.append("type") }
            types.append("say")
            if let only = o.only { let f = types.filter { only.contains($0) }; if !f.isEmpty { types = f } }
            return Planned(pick: p, s: s, pair: pair, types: types)
        }
        var cnt: [String: Double] = ["gap": 0, "build": 0, "pic": 0, "tr": 0, "type": 0, "say": 0]
        let rare: [String: Double] = ["pic": 0, "tr": 0.1, "build": 0.2, "type": 0.25, "gap": 0.3, "say": 0.4]
        for _ in 0..<per {
            for wi in byWord.indices {
                let left = byWord[wi].types.filter { !byWord[wi].order.contains($0) }
                if left.isEmpty { continue }
                let sh = shuffle(left, &r)
                var best = sh[0]
                for x in sh.dropFirst() where (cnt[x]! + rare[x]!) < (cnt[best]! + rare[best]!) { best = x }   // stable sort()[0]
                byWord[wi].order.append(best); cnt[best]! += 1
            }
        }
        var items: [LessonItem] = [], id = 0
        func baseItem(_ type: String, _ c: LessonCard, _ why: String) -> LessonItem {
            id += 1
            var b = LessonItem(id: id, type: type, word: c.word, card: c, hints: hints[type] ?? [])
            b.why = why; b.ipa = !c.ipaUS.isEmpty ? c.ipaUS : c.ipa; b.mean = o.mean?(c) ?? ""
            return b
        }
        func make(_ w: Planned, _ type: String) -> LessonItem {
            let c = w.pick.card
            var b = baseItem(type, c, w.pick.why)
            switch type {
            case "gap":
                let s = w.s!
                b.options = shuffle([s.at.form] + distract(c.word, c.pos, pool, 3, &r), &r)
                b.sent = s.text; b.own = s.own; b.blank = s.at; b.answer = s.at.form; b.tr = s.tr ?? ""
            case "build", "tr":
                let s = (type == "tr" ? w.pair : w.s)!
                let words = toks(s.text), extra = distract(c.word, c.pos, pool, 2, &r).filter { x in !words.contains { same($0, x) } }
                b.sent = s.text; b.own = s.own; b.prompt = s.tr ?? ""; b.answer = words.joined(separator: " "); b.tiles = shuffle(words + extra, &r)
            case "type":
                let wd = c.word.trimmingCharacters(in: .whitespacesAndNewlines)
                var h: UInt64 = 7
                for u in wd.unicodeScalars { h = (h &* 31 &+ UInt64(u.value & 0xFFFF)) & 0xFFFF_FFFF }   // JS: charCodeAt(0) of each code point, >>> 0
                var rr = RNG(seed: Double(h))
                b.answer = wd; b.def = c.def
                b.len = wd.utf16.filter { $0 != 32 && $0 != 39 && $0 != 45 && !(($0 >= 9 && $0 <= 13) || $0 == 160) }.count
                b.first = wd.utf16.first.map { String(utf16CodeUnits: [$0], count: 1) } ?? ""
                b.bank = letterBank(wd.lowercased(), &rr)
            case "pic":
                b.answer = c.word; b.options = shuffle([c.word] + distract(c.word, c.pos, pool, 3, &r), &r)
            default:   // say
                let s = w.s
                let short = s.map { toks($0.text).count <= 8 } ?? false
                var alt: LessonAlt
                if let s {
                    alt = LessonAlt(type: "gap", sent: s.text, own: s.own, blank: s.at, answer: s.at.form,
                                    options: shuffle([s.at.form] + distract(c.word, c.pos, pool, 3, &r), &r), hints: [])
                } else {
                    alt = LessonAlt(type: "mean", sent: nil, own: nil, blank: nil, answer: c.word, options: shuffle([c.word] + distract(c.word, c.pos, pool, 3, &r), &r), hints: [])
                }
                alt.hints = hints[alt.type] ?? []
                if alt.type == "gap" { alt.tr = s?.tr ?? "" }
                b.sent = short ? s!.text : c.word; b.answer = short ? s!.text : c.word; b.alt = alt
            }
            return b
        }
        for round in 0..<per { for w in byWord where round < w.order.count { items.append(make(w, w.order[round])) } }
        // never two items of the same word in a row
        if items.count > 1 {
            for i in 1..<items.count where same(items[i].word, items[i - 1].word) {
                if let j = items.indices.first(where: { $0 > i && !same(items[$0].word, items[i - 1].word) }), j > 0 { items.swapAt(i, j) }
            }
        }
        // matching (word ↔ meaning) in the middle when ≥ 4 words
        let mp = Array(picks.filter { !$0.card.vi.isEmpty || !$0.card.def.isEmpty }.prefix(5))
        if o.match && (o.only?.contains("match") ?? true) && mp.count >= 4 {
            id += 1
            var m = LessonItem(id: id, type: "match", word: "#match", card: nil, hints: hints["match"] ?? [])
            m.answer = ""
            m.pairs = shuffle(mp, &r).prefix(4).map { LessonPair(card: $0.card, word: nil, mean: nil) }
            items.insert(m, at: Int((Double(items.count) / 2).rounded(.up)))
        }
        let out = items.map { adapt($0, o.off) }
        return o.calm ? calm(out) : out
    }

    /// Switch kind when the learner turns listening / speaking off.
    public static func adapt(_ it: LessonItem, _ off: LessonOff) -> LessonItem {
        var o = it
        o.noAudio = off.listen
        if off.speak && (it.type == "say" || it.type == "pic") {
            if it.type == "pic" { o.choice = true }
            else if let a = it.alt {
                o.type = a.type
                if let v = a.sent { o.sent = v }
                if let v = a.own { o.own = v }
                if let v = a.blank { o.blank = v }
                o.answer = a.answer; o.options = a.options; o.hints = a.hints
                if let v = a.tr { o.tr = v }
                o.spoke = true
            }
        }
        return o
    }

    /// Grade an answer (same rules as Answer.check).
    public static func check(_ it: LessonItem, _ ans: Answer.Given) -> Bool {
        Answer.check(Answer.Item(type: it.type, answer: it.answer ?? "", choice: it.choice ?? false), ans)
    }

    /// Hard kinds (the learner must produce the answer) – never three in a row in calm mode.
    public static func isHard(_ it: LessonItem) -> Bool {
        it.type == "build" || it.type == "tr" || it.type == "type" || (it.type == "say" && it.spoke != true) || (it.type == "pic" && it.choice != true)
    }
    public static func calm(_ items: [LessonItem]) -> [LessonItem] {
        var a = items
        if a.count > 2 {
            for i in 2..<a.count where isHard(a[i]) && isHard(a[i - 1]) && isHard(a[i - 2]) {
                if let j = a.indices.first(where: { $0 > i && !isHard(a[$0]) }), j > 0 { a.swapAt(i, j) }
            }
        }
        return a
    }

    // MARK: results
    public struct Result: Equatable, Sendable {
        public var word: String, grade: Int, card: LessonCard?, add: Bool, entry: LessonCard?
    }
    /// Session → FSRS: wrong ≥ 1 → grade 0 (adds the card if missing); due + right first time → grade 2; otherwise the schedule is untouched.
    public static func results(_ sess: LessonSession, _ items: [LessonItem], cards: [LessonCard], now: Double, calendar: Calendar = .current) -> [Result] {
        var map: [String: LessonCard] = [:]
        for c in cards where !c.word.isEmpty { map[norm(c.word)] = c }
        var order: [String] = [], words: [String: LessonCard] = [:]
        for it in items { if let c = it.card { let k = norm(it.word); if words[k] == nil { order.append(k) }; words[k] = c } }
        var out: [Result] = []
        for k in order {
            let card = words[k]!, c = map[k]
            if sess.wrong[k] != nil { out.append(Result(word: card.word, grade: 0, card: c, add: c == nil, entry: card)) }
            else if let c, sess.firstOk.contains(k), isDue(c, now, calendar: calendar) { out.append(Result(word: card.word, grade: 2, card: c, add: false, entry: nil)) }
        }
        return out
    }

    // MARK: phonetics
    public struct Stress: Equatable, Sendable { public var syl: Int, of: Int }
    public static func stress(_ ipa: String) -> Stress? {
        var s = ipa
        if s.hasPrefix("/") { s.removeFirst() }
        if s.hasSuffix("/") { s.removeLast() }
        guard let i = s.firstIndex(of: "\u{02C8}") else { return nil }
        let parts = s.split(whereSeparator: { ".\u{02C8}\u{02CC}".contains($0) }).count
        let before = s[..<i].split(whereSeparator: { ".\u{02CC}".contains($0) }).count
        return Stress(syl: before + 1, of: max(parts, before + 1))
    }
    public static func usuk(_ c: LessonCard) -> (uk: String, us: String)? {
        func strip(_ s: String) -> String { String(s.unicodeScalars.filter { $0 != "/" && !CharacterSet.whitespacesAndNewlines.contains($0) }) }
        if !c.ipa.isEmpty && !c.ipaUS.isEmpty && strip(c.ipa) != strip(c.ipaUS) { return (c.ipa, c.ipaUS) }
        return nil
    }
    /// Text → viseme timeline [(seconds, shape)] when no pre-made cues exist.
    public static func visemes(_ text: String, dur: Double?) -> [(Double, String)] {
        let s = text.lowercased()
        func map(_ ch: Character) -> String? {
            if "mbp".contains(ch) { return "A" }
            if "fv".contains(ch) { return "G" }
            if ch == "l" { return "H" }
            if "ouw".contains(ch) { return ch == "o" ? "E" : "F" }
            if ch == "a" { return "D" }
            if "eiy".contains(ch) { return "C" }
            if ch.isASCII && ch.isLetter { return "B" }
            if ",.;:!?".contains(ch) { return "X" }
            return nil
        }
        var seq: [String] = []
        for ch in s {
            if let v = map(ch), seq.last != v { seq.append(v) }
            else if ch == " " && seq.last != "B" { seq.append("B") }
        }
        let d = (dur ?? 0) != 0 ? dur! : max(0.6, Double(s.utf16.count) * 0.065)
        let step = d / Double(max(1, seq.count))
        func fix(_ x: Double) -> Double { Double(String(format: "%.3f", x)) ?? x }
        var cues: [(Double, String)] = seq.enumerated().map { (fix(Double($0.offset) * step), $0.element) }
        cues.append((fix(Double(seq.count) * step), "X"))
        return cues
    }

    // MARK: path plans
    public struct Has: Sendable, Equatable {
        public var story = false, radio = false, odd = false, exam = false
        public init(story: Bool = false, radio: Bool = false, odd: Bool = false, exam: Bool = false) { self.story = story; self.radio = radio; self.odd = odd; self.exam = exam }
    }
    static func dueWeak(_ cards: [LessonCard], _ now: Double, _ cal: Calendar) -> Int {
        let l = cards.filter { $0.srs != nil }
        return l.filter { isDue($0, now, calendar: cal) }.count + l.filter { ($0.srs?.lapses ?? 0) > 0 }.count
    }
    public static func pathPlan(_ cards: [LessonCard], now: Double, has: Has = Has(), calendar: Calendar = .current) -> [String] {
        [dueWeak(cards, now, calendar) >= 3 ? "review" : "lesson", has.story ? "story" : "listen", has.story ? "listen" : "lesson", "speak", has.radio ? "radio" : "lesson", "review"]
    }
    public static func unitPlan(_ cards: [LessonCard], now: Double, has: Has = Has(), calendar: Calendar = .current) -> [String] {
        let mid = has.radio && (has.odd || !has.story) ? "radio" : has.story ? "story" : "lesson"
        return [dueWeak(cards, now, calendar) >= 3 ? "review" : "lesson", "listen", "speak", mid, "review", has.exam ? "exam" : "lesson"]
    }
    /// Adaptive next button: last accuracy < 60 % → review instead of speak/radio; ≥ 95 % and nothing due → learn instead of review.
    public static func nextKind(_ kind: String, acc: Double?, due: Bool) -> String {
        if let acc, acc < 60, kind == "speak" || kind == "radio" { return "review" }
        if let acc, acc >= 95, kind == "review", !due { return "lesson" }
        return kind
    }

    // MARK: stories
    /// Story / radio → item queue: each line is a free `line` step; checks (tap = build, q, match) follow their line.
    public static func storyItems(_ st: LessonStory, lang: String, seed: Double) -> [LessonItem] {
        var r = RNG(seed: seed == 0 ? 1 : seed)
        var out: [LessonItem] = [], id = 0
        var seenW = Set<String>(), words: [String] = []
        for l in st.lines { for w in toks(l.en).map({ $0.lowercased() }) where seenW.insert(w).inserted { words.append(w) } }
        for (i, l) in st.lines.enumerated() {
            id += 1
            var line = LessonItem(id: id, type: "line", word: "#story", card: nil, hints: [])
            line.free = true; line.who = l.who; line.sent = l.en; line.radio = st.kind == "radio"
            out.append(line)
            for c in (st.checks ?? []) where c.at == i {
                id += 1
                var it = LessonItem(id: id, type: c.type, word: "#story", card: nil, hints: [])
                if c.type == "tap", let li = c.line {
                    let T = toks(st.lines[li].en)
                    let extra = Array(shuffle(words.filter { w in !T.contains { $0.lowercased() == w } }, &r).prefix(2))
                    it.type = "build"; it.sent = st.lines[li].en; it.who = st.lines[li].who; it.answer = T.joined(separator: " "); it.tiles = shuffle(T + extra, &r)
                } else if c.type == "q", let opts = c.options, let a = c.answer {
                    it.prompt = c.q; it.answer = opts[a]; it.why = c.why ?? ""; it.options = c.keep == true ? opts : shuffle(opts, &r)
                } else if c.type == "match", let ps = c.pairs {
                    it.pairs = ps.map { LessonPair(card: nil, word: $0.en, mean: $0.m[lang] ?? $0.m["en"] ?? "") }
                } else { id -= 1; continue }
                out.append(it)
            }
        }
        for i in out.indices { out[i].hints = hints[out[i].type] ?? [] }
        return out
    }
}

/// Lesson session: queue + retries of wrong answers (≤ maxRetry) + COMBO + progress (only grows when solved).
public struct LessonSession: Sendable {
    public struct Answered: Equatable, Sendable { public var ok: Bool, combo: Int, requeued: Bool?, free: Bool? }
    public struct Log: Equatable, Sendable { public var id: Int, type: String, word: String, ok: Bool?, retry: Int?, skip: Bool? }

    public private(set) var q: [LessonItem]
    public let total: Int
    public private(set) var solved = 0, combo = 0, best = 0, n = 0, ok1 = 0, miss = 0
    public private(set) var wrong: [String: Int] = [:]
    public private(set) var firstOk: [String] = []
    public private(set) var log: [Log] = []
    public let maxRetry: Int, ease: Bool

    public init(_ items: [LessonItem], maxRetry: Int = 2, ease: Bool = false) { q = items; total = items.count; self.maxRetry = maxRetry; self.ease = ease }
    public var cur: LessonItem? { q.first }
    public var done: Bool { q.isEmpty }
    public var progress: Double { total == 0 ? 1 : min(1, Double(solved) / Double(total)) }
    public var accuracy: Int {
        guard n > 0 else { return 0 }
        let retried = log.filter { ($0.retry ?? 0) != 0 }.count
        return Int((Double(ok1 * 100) / Double(max(1, n - retried)) + 0.5).rounded(.down))
    }

    @discardableResult
    public mutating func answer(_ ok: Bool) -> Answered? {
        guard !q.isEmpty else { return nil }
        let it = q.removeFirst()
        if it.free == true { solved += 1; return Answered(ok: true, combo: combo, requeued: nil, free: true) }
        n += 1
        let k = it.card != nil ? LessonEngine.norm(it.word) : "#" + LessonEngine.norm(it.word) // câu không thuộc từ nào (#match/#story): khóa '#…' như web/js/lesson/engine.js
        log.append(Log(id: it.id, type: it.type, word: it.word, ok: ok, retry: it.retry, skip: nil))
        miss = ok ? 0 : miss + 1
        if !ok && ease && miss >= 2 && q.count > 1 && LessonEngine.isHard(q[0]) {
            if let j = q.indices.first(where: { !LessonEngine.isHard(q[$0]) && q[$0].free != true }), j > 0 { let e = q.remove(at: j); q.insert(e, at: 0) }
        }
        if ok {
            solved += 1; combo += 1; best = max(best, combo)
            if it.retry == 0 { ok1 += 1; if wrong[k] == nil && !firstOk.contains(k) { firstOk.append(k) } }
            return Answered(ok: true, combo: combo, requeued: nil, free: nil)
        }
        combo = 0; wrong[k, default: 0] += 1; firstOk.removeAll { $0 == k }
        let again = it.retry < maxRetry
        if again { var c = it; c.retry += 1; q.append(c) } else { solved += 1 }
        return Answered(ok: false, combo: 0, requeued: again, free: nil)
    }
    public mutating func skip() {
        guard !q.isEmpty else { return }
        let it = q.removeFirst(); solved += 1
        log.append(Log(id: it.id, type: it.type, word: it.word, ok: nil, retry: nil, skip: true))
    }
    public mutating func replace(_ f: (LessonItem) -> LessonItem) { q = q.map(f) }
}
