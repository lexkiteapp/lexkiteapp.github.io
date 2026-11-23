import SwiftUI
import Observation
import LKStore
import LKSync
import LKStrings

/// What a toast of the web says (`toast(t(...))`), as a value the view turns into a localised line.
enum InterpNote: Equatable {
    case nothingHeard, failed, micDenied, sameLang, saved, unsupported, downloading, ready
    case sayPrompt(String)
    case score(Int, String)
    case recogErr(String)
}

/// The two languages of the pair, kept on this device (`lk.interp.pair`, the web key).
struct InterpPairStore {
    static let key = "lk.interp.pair"
    let defaults: UserDefaults
    func load(me: String) -> InterpPair {
        if let s = defaults.string(forKey: Self.key)?.data(using: .utf8), let p = try? JSONDecoder().decode(InterpPair.self, from: s), p.valid { return p }
        return .initial(me: me)
    }
    func save(_ p: InterpPair) { if let d = try? JSONEncoder().encode(p), let s = String(data: d, encoding: .utf8) { defaults.set(s, forKey: Self.key) } }
}

/// The shared moves of every Interpreter screen: pick a language (swap when it is the other side's), save a phrase to the word list, say-it-back scoring.
@MainActor
class InterpretBase {
    let ctx: SkillsContext
    let io: InterpIO
    let history: InterpHistory
    let pairs: InterpPairStore
    var me: String { Interp.base(ctx.lang) }
    init(ctx: SkillsContext, io: InterpIO, defaults: UserDefaults) {
        self.ctx = ctx; self.io = io; self.history = InterpHistory(defaults: defaults); self.pairs = InterpPairStore(defaults: defaults)
    }
    /// web `saveCards`: the foreign phrase + its meaning in my language, topic `interpret`, pos `phrase`
    func save(_ cards: [InterpCard]) async {
        let title = L10n(lang: ctx.lang)(.interpTitle)
        for c in cards {
            await ctx.addWord(.obj([("word", .string(c.word)), ("def", .string(c.def)), ("pos", .string("phrase")), ("emoji", .string("🗣️")), ("topic", .string("interpret"))]),
                              context: .obj([("text", .string(c.def)), ("title", .string(title))]))
        }
    }
    /// say it back: listen in the language of the phrase, score the best alternative 0…100
    func scoreAttempt(target: String, lang: String) async -> InterpNote {
        let o = await io.recognizer.listen(locale: Interp.locale(lang), maxSeconds: 8, onPartial: nil)
        if let e = o.error { return e == "not-allowed" ? .micDenied : e == "no-speech" ? .nothingHeard : .recogErr(e) }
        let best = o.alts.map { ($0, Interp.score(target: target, heard: $0, lang: lang)) }.max { $0.1 < $1.1 }
        return .score(best?.1 ?? 0, best?.0 ?? "")
    }
}

// MARK: - #/interpret (face to face)
@MainActor @Observable
final class InterpretTalkModel {
    private let base: InterpretBase
    private(set) var pair: InterpPair
    private(set) var listening: InterpSide?
    private(set) var live: [InterpSide: String] = [:]
    private(set) var heard: [InterpSide: String] = [:]
    private(set) var badge: (side: InterpSide, local: Bool)?
    private(set) var last: InterpTurn?
    private(set) var turns = 0
    private(set) var busy = false
    private(set) var note: InterpNote?
    private var cid: String

    init(ctx: SkillsContext, io: InterpIO, defaults: UserDefaults = .standard) {
        let b = InterpretBase(ctx: ctx, io: io, defaults: defaults)
        base = b; pair = b.pairs.load(me: ctx.lang); cid = io.newId()
    }
    var me: String { base.me }
    var translator: InterpTranslating { base.io.translator }
    func reloadPair() { pair = base.pairs.load(me: base.ctx.lang) }
    var hasTurn: Bool { last != nil }
    func lang(_ s: InterpSide) -> String { pair[s] }

    /// one tap on a mic: start listening, or (while listening) stop – what was heard so far is translated
    func tap(_ s: InterpSide) async {
        if busy { return }
        if listening != nil { base.io.recognizer.stop(); return }
        base.io.speaker.stop(); note = nil
        listening = s; live = [:]
        let o = await base.io.recognizer.listen(locale: Interp.locale(pair[s]), maxSeconds: 30, onPartial: { [weak self] x in self?.partial(x, s) })
        listening = nil
        await finish(s, o)
    }
    private func partial(_ x: String, _ s: InterpSide) { live[s] = x; live[s.other] = x }

    private func finish(_ s: InterpSide, _ o: RecognizeOutcome) async {
        if let e = o.error { note = e == "not-allowed" ? .micDenied : e == "no-speech" ? .nothingHeard : .recogErr(e); live = [:]; return }
        let text = (o.alts.first ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { note = .nothingHeard; live = [:]; return }
        busy = true; live[s.other] = text
        let who = Interp.speaker(base.io.detector.detect(text), pair: pair, side: s), to = who.other
        let r = await base.io.translator.translate(text, from: pair[who], to: pair[to])
        busy = false
        guard let r else { note = .failed; return }
        let turn = InterpTurn(from: who.rawValue, src: text, dst: pair[to], tx: r.text, ts: base.io.clock())
        last = turn; turns += 1
        base.history.addTurn(id: cid, pair: pair, turn)
        live = [who: text]; heard[to] = r.text; badge = (to, r.local); note = nil
        base.io.speaker.speak(r.text, lang: pair[to], slow: false)
    }

    func replay(slow: Bool = false) { if let l = last { base.io.speaker.speak(l.tx, lang: l.dst, slow: slow) } }
    func saveLast() async {
        guard let l = last else { return }
        let cards = Interp.cards(InterpConv(id: cid, t: l.ts, a: pair.a, b: pair.b, turns: [l]), me: me)
        if cards.isEmpty { note = .sameLang; return }
        await base.save(cards); note = .saved
    }
    /// "say it back": the foreign phrase of the last turn (the one that is not in my language)
    func sayBack() async {
        guard let l = last else { return }
        let srcL = l.from == "a" ? pair.a : pair.b
        let (w, wl) = Interp.base(srcL) == me ? (l.tx, l.dst) : (l.src, srcL)
        if Interp.base(wl) == me { return }
        note = .sayPrompt(w)
        note = await base.scoreAttempt(target: w, lang: wl)
    }
    func swap() { guard listening == nil else { return }; pair = InterpPair(a: pair.b, b: pair.a); base.pairs.save(pair) }
    func setLang(_ s: InterpSide, _ code: String) {
        guard listening == nil, Interp.supported(code) else { return }
        if code == pair[s.other] { pair[s.other] = pair[s] }
        pair[s] = code; base.pairs.save(pair)
    }
    /// "Tải gói dùng offline": both directions, only on the tap (the system asks for Wi-Fi)
    func downloadPack() async {
        note = .downloading
        let x = await base.io.translator.prepare(from: pair.a, to: pair.b), y = await base.io.translator.prepare(from: pair.b, to: pair.a)
        note = x || y ? .ready : .unsupported
    }
    /// leaving: the id of the recap to open (nil = nothing was said → the history)
    func end() -> String? { stop(); return turns > 0 ? cid : nil }
    func stop() { base.io.recognizer.cancel(); base.io.speaker.stop() }
    /// fixed state for snapshot fixtures
    static func fixture(ctx: SkillsContext, io: InterpIO, defaults: UserDefaults, pair: InterpPair, turn: InterpTurn? = nil, listening: InterpSide? = nil, live: [InterpSide: String] = [:], local: Bool = true) -> InterpretTalkModel {
        let m = InterpretTalkModel(ctx: ctx, io: io, defaults: defaults)
        m.pair = pair; m.listening = listening; m.live = live
        if let turn { m.last = turn; m.turns = 1; let to: InterpSide = turn.from == "a" ? .b : .a; m.heard[to] = turn.tx; m.live = [InterpSide(rawValue: turn.from) ?? .a: turn.src]; m.badge = (to, local) }
        return m
    }
}

// MARK: - #/interpret/phrases[/<group>]
@MainActor @Observable
final class InterpretPhrasesModel {
    private let base: InterpretBase
    let data: InterpPhrases
    private(set) var pair: InterpPair
    private(set) var group: String
    private(set) var note: InterpNote?

    init(ctx: SkillsContext, io: InterpIO, group: String?, data: InterpPhrases = .bundled, defaults: UserDefaults = .standard) {
        let b = InterpretBase(ctx: ctx, io: io, defaults: defaults)
        base = b; self.data = data
        pair = b.pairs.load(me: ctx.lang)
        self.group = data.order.contains(group ?? "") ? group! : (data.order.first ?? "hi")
    }
    var me: String { base.me }
    func reloadPair() { pair = base.pairs.load(me: base.ctx.lang) }
    var items: [InterpPhrases.Item] { data.items(in: group) }
    func select(_ g: String) { if data.order.contains(g) { group = g; note = nil } }
    func setLang(_ s: InterpSide, _ code: String) {
        guard Interp.supported(code) else { return }
        if code == pair[s.other] { pair[s.other] = pair[s] }
        pair[s] = code; base.pairs.save(pair)
    }
    func text(_ item: InterpPhrases.Item, _ s: InterpSide) -> String { item.t[pair[s]] ?? "" }
    func play(_ i: Int, slow: Bool = false) { guard items.indices.contains(i) else { return }; base.io.speaker.speak(text(items[i], .b), lang: pair.b, slow: slow) }
    /// my language is the foreign one's meaning: the card is the phrase in the OTHER language (web: `fl = P.a === me ? P.b : P.a`)
    private func foreign() -> String { Interp.base(pair.a) == me ? pair.b : pair.a }
    func save(_ i: Int) async {
        guard items.indices.contains(i) else { return }
        let o = items[i].t, fl = foreign()
        await base.save([InterpCard(word: o[fl] ?? "", def: o[me] ?? o[pair.a] ?? "", lang: fl)]); note = .saved
    }
    func sayBack(_ i: Int) async {
        guard items.indices.contains(i) else { return }
        let o = items[i].t, fl = foreign()
        if Interp.base(fl) == me { return }
        let w = o[fl] ?? ""
        note = .sayPrompt(w); note = await base.scoreAttempt(target: w, lang: fl)
    }
    func stop() { base.io.recognizer.cancel(); base.io.speaker.stop() }
}

// MARK: - #/interpret/history
@MainActor @Observable
final class InterpretHistoryModel {
    private let base: InterpretBase
    private(set) var convs: [InterpConv]
    init(ctx: SkillsContext, io: InterpIO, defaults: UserDefaults = .standard) {
        let b = InterpretBase(ctx: ctx, io: io, defaults: defaults)
        base = b; convs = b.history.load()
    }
    func clear() { base.history.clear(); convs = [] }
    func reload() { convs = base.history.load() }
}

// MARK: - the three sections of #/interpret (Đối mặt · Câu nói mẫu · Lịch sử)
@MainActor @Observable
final class InterpretHubModel {
    enum Section: String, CaseIterable { case talk, phrases, history }
    private(set) var section: Section
    let talk: InterpretTalkModel, phrases: InterpretPhrasesModel, history: InterpretHistoryModel
    init(ctx: SkillsContext, io: InterpIO, arg: String?, defaults: UserDefaults = .standard, data: InterpPhrases = .bundled) {
        let parts = (arg ?? "").split(separator: "/").map(String.init)
        section = Section(rawValue: parts.first ?? "") ?? .talk
        talk = InterpretTalkModel(ctx: ctx, io: io, defaults: defaults)
        phrases = InterpretPhrasesModel(ctx: ctx, io: io, group: parts.count > 1 ? parts[1] : nil, data: data, defaults: defaults)
        history = InterpretHistoryModel(ctx: ctx, io: io, defaults: defaults)
    }
    /// fixtures: ready-made section models
    init(section: Section, talk: InterpretTalkModel, phrases: InterpretPhrasesModel, history: InterpretHistoryModel) {
        self.section = section; self.talk = talk; self.phrases = phrases; self.history = history
    }
    func select(_ s: Section) {
        guard s != section else { return }
        talk.stop(); phrases.stop()
        talk.reloadPair(); phrases.reloadPair()
        if s == .history { history.reload() }
        section = s
    }
    func stop() { talk.stop(); phrases.stop() }
}

// MARK: - #/interpret/recap/<id>
@MainActor @Observable
final class InterpretRecapModel {
    private let base: InterpretBase
    let conv: InterpConv?
    let cards: [InterpCard]
    private(set) var keywords: [String] = []
    let foreign: String
    private(set) var note: InterpNote?
    init(ctx: SkillsContext, io: InterpIO, id: String, defaults: UserDefaults = .standard) {
        let b = InterpretBase(ctx: ctx, io: io, defaults: defaults)
        base = b
        let c = b.history.conv(id), me = b.me
        conv = c
        foreign = c.map { $0.a == me ? $0.b : $0.a } ?? me
        cards = c.map { Interp.cards($0, me: me) } ?? []
        keywords = Interp.keyWords(cards.map(\.word), lang: foreign, n: 8)
    }
    /// the key words skip what is already in the deck, so the deck is loaded first
    func load() async {
        await base.ctx.reload()
        keywords = Interp.keyWords(cards.map(\.word), lang: foreign, n: 8, known: Set(base.ctx.bundle.cards.map { Vocab.cardKey($0) }))
    }
    func play(_ i: Int) { guard cards.indices.contains(i) else { return }; base.io.speaker.speak(cards[i].word, lang: cards[i].lang, slow: false) }
    func saveAll() async { await base.save(cards); note = .saved }
}
