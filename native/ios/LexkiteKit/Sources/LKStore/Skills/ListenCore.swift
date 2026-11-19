import Foundation
import LKSync
import LKCore
import LKStrings

/// Timings and rates of web/js/listening.js. They also sit in the vector's `events` / `parts`; SkillsVectorTests compares them (a drift fails the test).
public enum ListenRules {
    public static let defaultRate = 0.95, narratorRate = 0.95
    /// clip playbackRate = clamp(rate / defaultRate)
    public static let clipRateMin = 0.6, clipRateMax = 1.3
    public static let rates = [0.8, 0.9, 0.95, 1, 1.1]
    public static let lineGapMs = 280, narratorGapMs = 600, noSpeechGapMs = 300, pauseCapSeconds = 8.0
    /// "🐢" in the dictation
    public static let slowRate = 0.7
    public static let autoReplayMs = 1800
    /// the 30 s of reading before every part of the mock test, ticked every second; the next button opens itself 20 s after the audio started
    public static let readSeconds = 30, tickMs = 1000, nextFallbackMs = 20_000
    public static let toastBlocked = L10nKey.skillListenChamDeNghe
    public static func rate(_ settings: JSON) -> Double { JSON.truthy(settings["listenRate"]) ? JSON.num(settings["listenRate"]) : defaultRate }
}

/// Source keys of the mistakes book (the Vietnamese text is the sync key shared with web, translated on screen by `L10n.translate(source:)`).
enum SkillsKeys {
    static let titleQ = "{title} – Câu {n}: {q}", testQ = "Test {t} – Câu {n}: {q}", blank = "(bỏ trống)", heard = "Nghe: “…{cue}…”"
    static func mistake(kind: String, q: JSON, answer: String, given: String, cue: String, ref: String) -> JSON {
        .obj([("kind", .string(kind)), ("q", q), ("answer", .string(answer)), ("given", given.isEmpty ? .obj([("k", .string(blank))]) : .string(given)),
              ("explain", cue.isEmpty ? .string("") : .obj([("k", .string(heard)), ("v", .obj([("cue", .string(cue))]))])), ("ref", .string(ref))])
    }
}

/// Kokoro voices of a part (web/js/listen/kvoice.js): a fixed pool per accent + gender, the narrator has its own, no voice is reused inside a part.
public enum KVoice {
    static var pool: [String: [String]] { SkillsConsts.current.pools }
    public static var narrator: String { SkillsConsts.current.narrator }
    /// speaker key → Kokoro voice, plus `_narrator`
    public static func voices(_ p: JSON) -> [String: String] {
        var used: Set<String> = [narrator], out = ["_narrator": narrator]
        let speakers = p["speakers"]?.object ?? [:]
        for k in speakers.keys.sorted() {
            let s = speakers[k]!, acc = s.t("accent") ? s.s("accent") : "en-GB"
            let list = pool[acc + ":" + (s.s("gender") == "f" ? "f" : "m")] ?? pool["en-GB:m"] ?? [narrator]
            let v = list.first { !used.contains($0) } ?? list[0]
            used.insert(v); out[k] = v
        }
        return out
    }
    /// the voice of a script line and the clip key of its text
    public static func clipKey(_ l: JSON, voices kv: [String: String]) -> String {
        VoiceCore.lineKey(voice: l.t("say") ? narrator : (kv[l.s("s")] ?? narrator), text: l.t("say") ? l.s("say") : l.s("t"))
    }
}

/// One device voice picked for a speaker (web `castVoices`): the voice name (nil = system default), the accent and the pitch that tells speakers apart.
public struct CastVoice: Equatable, Sendable {
    public var voice: String?
    public var lang: String, pitch: Double
    public init(voice: String?, lang: String, pitch: Double) { self.voice = voice; self.lang = lang; self.pitch = pitch }
}

public enum ListenCast {
    private static func rx(_ p: String) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: [.caseInsensitive]) }
    static let female = rx("female|woman|samantha|karen|moira|tessa|serena|kate|susan|martha|fiona|victoria|allison|ava|zira|hazel|libby|sonia|maisie|emma|jenny|aria|natasha|catherine|nicky|joanna|salli|kimberly|ivy|amy|olivia|google uk english female|google us english")
    static let male = rx("\\bmale\\b|daniel|alex|fred|oliver|arthur|gordon|\\blee\\b|aaron|\\btom\\b|rishi|ryan|guy|george|james|thomas|william|christopher|eric|brian|russell|matthew|joey|justin|google uk english male")
    private static let plainMale = rx("\\bmale\\b"), plainFemale = rx("female")
    private static func hit(_ r: NSRegularExpression, _ s: String) -> Bool { r.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil }

    /// `voices`: accent → device voice names (best first). Speakers in key order; `_narrator` = the first unused en-GB voice.
    public static func cast(_ p: JSON, voices: [String: [String]]) -> [String: CastVoice] {
        var used = Set<String>(), out: [String: CastVoice] = [:]
        func pick(_ accent: String, _ gender: String) -> CastVoice {
            let own = voices[accent] ?? []
            let list = own.isEmpty ? (voices["en-GB"] ?? []) : own
            let want = gender == "f" ? female : male, avoid = gender == "f" ? male : female
            let v = list.first { !used.contains($0) && hit(want, $0) && !(gender == "f" && hit(plainMale, $0) && !hit(plainFemale, $0)) }
                ?? list.first { !used.contains($0) && !hit(avoid, $0) } ?? list.first { !used.contains($0) } ?? list.first
            if let v { used.insert(v) }
            let same = v != nil && out.values.contains { $0.voice == v }
            return CastVoice(voice: v, lang: accent, pitch: same ? (gender == "f" ? 1.2 : 0.8) : (gender == "f" ? 1.05 : 0.95))
        }
        let speakers = p["speakers"]?.object ?? [:]
        for k in speakers.keys.sorted() { let s = speakers[k]!; out[k] = pick(s.t("accent") ? s.s("accent") : "en-GB", s.s("gender")) }
        let gb = voices["en-GB"] ?? []
        out["_narrator"] = CastVoice(voice: gb.first { !used.contains($0) } ?? gb.first, lang: "en-GB", pitch: 1)
        return out
    }
}

// MARK: - #/listening

/// The hub: which test is open, its tabs, its parts with the learner's best scores (web routes.listening).
public struct ListenHub: Equatable, Sendable {
    public struct Tab: Equatable, Sendable { public var n: Int, done: Bool, selected: Bool }
    public struct Speaker: Equatable, Sendable { public var flag: String, name: String }
    public struct Card: Equatable, Sendable {
        public var id: String, part: Int, partKey: L10nKey
        public var best: Double?
        public var title: String
        /// "titleVi · topic" (Vietnamese UI) or the topic
        public var sub: String
        public var speakers: [Speaker], actions: [String]
    }
    public var empty = true, tabs: [Tab] = []
    public var selected: Int?
    public var band: Double?
    public var fullTest: String?
    public init() {}
    public var parts: [Card] = []
    /// the value written to `vb.listenT`
    public var persistedTest = "1"

    public static let tips: [L10nKey] = [.skillListenDocTruocCauHoi, .skillListenCanThanBayDoi, .skillListenParaphraseCauHoiHiem, .skillListenGioiHanTuOne, .skillListenChepChinhTa10]
    public static let flags = ["en-GB": "🇬🇧", "en-US": "🇺🇸", "en-AU": "🇦🇺"]
    static let partKeys: [L10nKey] = [.skillListenHoiThoaiDoiSong, .skillListenDocThoaiXaHoi, .skillListenThaoLuanHocThuat, .skillListenBaiGiangHocThuat]
    public static func partKey(_ part: Int) -> L10nKey { partKeys[min(max(part, 1), 4) - 1] }
    public static func speakers(_ p: JSON) -> [Speaker] {
        let o = p["speakers"]?.object ?? [:]
        return o.keys.sorted().map { Speaker(flag: flags[o[$0]!.s("accent")] ?? "", name: o[$0]!.s("name")) }
    }

    /// `remembered` = localStorage `vb.listenT`
    public static func build(_ data: SkillsData, query: [String: String], remembered: String?, game: JSON, lang: String) -> ListenHub {
        let all = data.tests
        func num(_ s: String?) -> Int { Int((s ?? "").trimmingCharacters(in: .whitespaces)) ?? 0 }
        var cur = num(query["t"])
        if !all.contains(cur) { cur = num(remembered) }
        if !all.contains(cur) { cur = all.first ?? 1 }
        var h = ListenHub(); h.persistedTest = String(cur)
        guard !all.isEmpty else { return h }
        let best = game["listenBest"] ?? .null, done = game["listenDone"] ?? .null
        h.empty = false; h.selected = cur; h.band = best[String(cur)]?.double; h.fullTest = "#/listen-test/\(cur)"
        if all.count > 1 { h.tabs = all.map { Tab(n: $0, done: best[String($0)].map { $0 != .null } ?? false, selected: $0 == cur) } }
        h.parts = data.parts(of: cur).map { p in
            let id = p.s("id"), vi = lang == "vi" && p.t("titleVi")
            return Card(id: id, part: p.i("part"), partKey: partKey(p.i("part")), best: done[id]?.double, title: p.s("title"), sub: (vi ? p.s("titleVi") + " · " : "") + p.s("topic"),
                        speakers: speakers(p), actions: ["#/listen/\(id)", "#/listen/\(id)?mode=exam", "#/dictation/\(id)"])
        }
        return h
    }
}

// MARK: - #/listen/<part>

/// What the page of one part shows before anything is played (web routes.listen header + player card).
public struct ListenPage: Equatable, Sendable {
    public var backHref = "#/listening", switchHref: String
    public var exam: Bool
    public var test: Int, part: Int, qFrom: Int, qTo: Int
    public var title: String, context: String
    public var speakers: [ListenHub.Speaker]
    /// practice only: rate options and the selected one
    public var rates: [(v: Double, selected: Bool)]
    public var tipsOn: Bool
    public var hasBack: Bool { !exam }
    public var hasLive: Bool { !exam }
    public var transcriptHidden: Bool { exam }
    /// the transcript starts blurred (the live switch removes it)
    public var blurred: Bool { true }
    public var partKey: L10nKey { ListenHub.partKey(part) }
    public static func == (a: ListenPage, b: ListenPage) -> Bool { a.title == b.title && a.exam == b.exam && a.part == b.part && a.test == b.test && a.qFrom == b.qFrom && a.qTo == b.qTo && a.rates.map(\.v) == b.rates.map(\.v) }

    public static func build(_ p: JSON, exam: Bool, settings: JSON) -> ListenPage {
        let id = p.s("id"), nums = QE.numbers(p), cur = ListenRules.rate(settings)
        return ListenPage(switchHref: exam ? "#/listen/\(id)" : "#/listen/\(id)?mode=exam", exam: exam, test: p.i("test"), part: p.i("part"), qFrom: nums.min() ?? 0, qTo: nums.max() ?? 0,
                          title: p.s("title"), context: p.s("context"), speakers: ListenHub.speakers(p),
                          rates: exam ? [] : ListenRules.rates.map { ($0, $0 == cur) }, tipsOn: !exam)
    }
    /// "0.8×" / "1×"; the default rate is the word "Chuẩn" (the view translates it)
    public static func rateLabel(_ v: Double) -> String? { v == ListenRules.defaultRate ? nil : JSON.jsNumberString(v) + "×" }
}

/// What the player card of a part shows (web routes.listen `onState` / `onEnd` / `onLine`): the play button, the small line under it.
public struct ListenPlayState: Equatable, Sendable {
    public var exam: Bool
    public var submitted = false, playing = false, ended = false, blocked = false
    public var plays = 0
    public var nowLine = -1
    public init(exam: Bool) { self.exam = exam }

    /// exam: one listen only – a second tap is ignored until the part is submitted (a refused start, `blocked`, may be tapped again)
    public var tapIgnored: Bool { exam && !submitted && plays > 0 && !blocked }
    /// SF Symbol + text key + enabled
    public var label: (icon: String, key: L10nKey, enabled: Bool) {
        // the web's onEnd handler stays after the submit: the end of a (re)listen locks the exam button again
        if exam && ended { return ("checkmark", .skillListenDaNgheXong, false) }
        if exam && !submitted {
            if playing { return ("speaker.wave.2.fill", .skillListenDangPhat, false) }
            return ("play.fill", blocked ? .skillListenChamDeNghe : .lessonKindListen, true)
        }
        if playing { return ("pause.fill", .skillListenTamDung, true) }
        if exam { return ("play.fill", plays > 0 ? .lessonReplay : .lessonKindListen, true) }
        return ("play.fill", plays > 0 ? .skillListenNgheTiep : .lessonKindListen, true)
    }
    /// the note under the player (`#lNote`): the exam rules, after the submit the re-listen hint; practice has none
    public var noteKey: L10nKey? { exam ? (submitted ? .skillListenDaNopBaiGio : .skillListenCheDoThiThat2) : nil }
    /// the line `#lNow` once the audio ended in the exam and nothing is submitted yet
    public var nowKey: L10nKey? { exam && ended && !submitted ? .skillListenHetBaiNgheKiem : nil }
    /// "who speaks" while playing: a key (pause / narrator) or the speaker's name
    public func now(_ p: JSON) -> (icon: String, key: L10nKey?, name: String?)? {
        let script = p.list("script")
        guard playing, nowLine >= 0, nowLine < script.count else { return nil }
        let l = script[nowLine]
        if l["pause"] != nil { return ("ellipsis", .skillListenKhoangLang, nil) }
        if l.t("say") { return ("mic.fill", .skillListenLoiDan, nil) }
        let name = p["speakers"]?[l.s("s")]?.s("name") ?? ""
        return ("person.wave.2.fill", nil, name.isEmpty ? l.s("s") : name)
    }
}

// MARK: - submit (practice and exam)

public struct ListenOutcome: Sendable {
    public var results: [QResult]
    public var right: Int, total: Int, xp: Int
    public var ok: Bool { right >= 7 }
    public var advice: L10nKey
    /// the App.reward argument
    public var reward: [String: Int]
    public var game: JSON, mistakes: [JSON]
}

public enum ListenSubmit {
    /// exam, audio still playing → the learner is asked first ("Bài nghe chưa phát xong. Vẫn nộp bài?")
    public static func needsConfirm(exam: Bool, playing: Bool) -> Bool { exam && playing }
    public static func advice(_ right: Int) -> L10nKey { right >= 9 ? .skillListenXuatSacMucBand : right >= 7 ? .skillListenTotXemLaiCac : .skillListenMoLoiThoaiBen }

    /// Grade a part: `listenDone[id] = max(right, old)`, per-kind stats, a mistake for every wrong question, 15 + 3·right XP.
    public static func submit(_ p: JSON, answers: QAnswers, game: JSON, mistakes: [JSON], now: Int64) -> ListenOutcome {
        let res = QE.collect(p, answers), nums = res.keys.sorted(), list = nums.compactMap { res[$0] }
        let right = list.filter(\.ok).count, id = p.s("id")
        var log = mistakes
        for r in list where !r.ok {
            let q = JSON.obj([("k", .string(SkillsKeys.titleQ)), ("v", .obj([("title", .string(p.s("title"))), ("n", .int(r.n)), ("q", .string(r.q))]))])
            log = MistakesEngine.log(log, SkillsKeys.mistake(kind: "listening", q: q, answer: r.answer, given: r.given, cue: r.cue, ref: id), now: now)
        }
        var g = QE.record(game, skill: "il", results: list, now: now)
        var done = g["listenDone"]?.object ?? [:]
        done[id] = .number(max(Double(right), JSON.orZero(done[id])))
        g["listenDone"] = .object(done)
        let xp = 15 + right * 3
        return ListenOutcome(results: list, right: right, total: nums.count, xp: xp, advice: advice(right),
                             reward: ["quizzes": 1, "listens": 1, "perfect": right == nums.count ? 1 : 0, "xp": xp], game: g, mistakes: log)
    }

    /// "Từ vựng đáng học": the dictionary hit (or the part's own word + meaning), the line that carries the word as context
    public static func vocabLine(_ p: JSON, word: String) -> String {
        p.list("script").first { $0.t("t") && $0.s("t").lowercased().contains(word.lowercased()) }?.s("t") ?? ""
    }
    public static func vocabSave(_ v: JSON, part p: JSON, dict: JSON?, meaning: String?, translate: (String) async -> String) async -> (entry: JSON, ctx: JSON?) {
        var e = dict ?? .obj([("word", v["w"] ?? ""), ("vi", v["vi"] ?? ""), ("found", true)])
        e["word"] = v["w"] ?? ""; e["vi"] = .string((meaning ?? "").isEmpty ? v.s("vi") : meaning!)
        let line = vocabLine(p, word: v.s("w"))
        guard !line.isEmpty else { return (e, nil) }
        return (e, .obj([("text", .string(line)), ("vi", .string(await translate(line))), ("title", .string("🎧 " + p.s("title")))]))
    }

    /// the popup's "Lưu flashcard": the whitespace-collapsed sentence as context
    public static func popupContext(sentence: String, vi: String, title: String) -> JSON { .obj([("text", .string(sentence)), ("vi", .string(vi)), ("title", .string("🎧 Listening: " + title))]) }
}

// MARK: - #/listen-test/<n>

public struct ListenTestFlow: Sendable {
    public enum Phase: Equatable, Sendable { case intro, reading, loading, playing, blocked, listened, result }
    public let n: Int
    public let parts: [JSON]
    public private(set) var k = 0, left = ListenRules.readSeconds
    public private(set) var phase: Phase = .intro
    public private(set) var nextEnabled = false
    public private(set) var results: [Int: QResult] = [:]
    private var pid: [Int: String] = [:]

    /// nil = unknown test → the hub
    public init?(test n: Int, data: SkillsData) {
        let ps = data.parts(of: n)
        guard !ps.isEmpty else { return nil }
        self.n = n; parts = ps
    }
    public var part: JSON { parts[k] }
    /// the intro heading (an exam name, not translated on the web either)
    public var title: String { "IELTS Listening – Test \(n)" }
    public var isLast: Bool { k == parts.count - 1 }
    public var progressPct: Double { Double(k) / Double(parts.count) * 100 }
    public var chip: (test: Int, part: Int, qFrom: Int, qTo: Int) { let nums = QE.numbers(part); return (n, part.i("part"), nums.min() ?? 0, nums.max() ?? 0) }
    public var reading: Bool { phase == .reading }
    public var nextLabel: L10nKey { isLast ? .skillListenNopBai : .skillListenSangPhanTiep }
    /// "{n} giây đọc câu hỏi" / the state line of the audio
    public var stateKey: L10nKey {
        switch phase {
        case .reading: return .skillListenNGiayDocCau
        case .loading: return .actionLoading
        case .playing: return .skillListenDangPhatChiNghe
        case .blocked: return .skillListenChamDeNghe
        case .listened, .result, .intro: return .skillListenHetPhanNgheKiem
        }
    }

    public mutating func begin() { guard phase == .intro else { return }; startPart(0) }
    private mutating func startPart(_ i: Int) { k = i; left = ListenRules.readSeconds; phase = .reading; nextEnabled = false }
    /// every second of the reading time; true on the 30th (the audio starts)
    public mutating func tick() -> Bool {
        guard phase == .reading else { return false }
        left -= 1
        if left <= 0 { start(); return true }
        return false
    }
    /// "Bắt đầu nghe ngay" or the last tick
    public mutating func start() { guard phase == .reading else { return }; phase = .loading }
    /// the first real sound
    public mutating func sound() { if phase == .loading { phase = .playing } }
    /// iOS refused to play: "Chạm ▶ để nghe"
    public mutating func blocked() { if phase == .loading || phase == .playing { phase = .blocked } }
    public mutating func retry() { if phase == .blocked { phase = .loading } }
    public mutating func ended() { guard phase != .reading, phase != .intro else { return }; phase = .listened; nextEnabled = true }
    /// 20 s after the audio started the button opens even when the audio is stuck
    public mutating func fallback() { guard phase != .reading, phase != .intro else { return }; nextEnabled = true }
    /// "Sang phần tiếp" / "Nộp bài" with the answers of this part; true when that was the last part
    public mutating func next(_ answers: QAnswers) -> Bool {
        let id = part.s("id")
        for (q, r) in QE.collect(part, answers) { results[q] = r; pid[q] = id }
        if isLast { phase = .result; return true }
        startPart(k + 1); return false
    }

    public struct Result: Sendable {
        public var raw: Int, band: Double
        public var byPart: [(href: String, part: Int, right: Int)]
        public var sheet: [QResult]
        public var reward: [String: Int]
        public var game: JSON, mistakes: [JSON]
        /// band ≥ 7: win sound + confetti
        public var celebrates: Bool { band >= 7 }
    }
    /// The result page and everything it writes: `listenBest`, `listenTests` (last 30), per-kind stats, a mistake per wrong question, 40 + 2·raw XP.
    public func finish(game: JSON, mistakes: [JSON], now: Int64) -> Result {
        let nums = results.keys.sorted(), list = nums.compactMap { results[$0] }
        let raw = list.filter(\.ok).count, band = QE.bandOf(raw)
        var log = mistakes
        for r in list where !r.ok {
            let q = JSON.obj([("k", .string(SkillsKeys.testQ)), ("v", .obj([("t", .int(n)), ("n", .int(r.n)), ("q", .string(r.q))]))])
            log = MistakesEngine.log(log, SkillsKeys.mistake(kind: "listening", q: q, answer: r.answer, given: r.given, cue: r.cue, ref: pid[r.n] ?? ""), now: now)
        }
        var g = game
        var bestMap = g["listenBest"]?.object ?? [:]
        bestMap[String(n)] = .number(max(band, JSON.orZero(bestMap[String(n)])))
        g["listenBest"] = .object(bestMap)
        let tests = (g["listenTests"]?.array ?? []) + [.obj([("n", .int(n)), ("raw", .int(raw)), ("band", .number(band)), ("at", .number(Double(now)))])]
        g["listenTests"] = .array(Array(tests.suffix(30)))
        g = QE.record(g, skill: "il", results: list, now: now)
        let byPart = parts.map { p in (href: "#/listen/" + p.s("id"), part: p.i("part"), right: QE.numbers(p).filter { results[$0]?.ok == true }.count) }
        return Result(raw: raw, band: band, byPart: byPart, sheet: list, reward: ["quizzes": 1, "listens": 4, "perfect": raw == 40 ? 1 : 0, "xp": 40 + raw * 2], game: g, mistakes: log)
    }
}
