import SwiftUI
import Observation
import AVFoundation
import NaturalLanguage
import LKSync
import LKStore
import LKCore
import LKStrings

// P14 – Interpreter (#/interpret): the models of the screens = the Android TalkVm / PhrasesVm / HistoryVm. All heavy parts (speech, translation, voice, storage) are injected through
// `InterpretEnv`, so tests and snapshots need no microphone, no model, no network. Spec: docs/INTERPRET.md.

/// A message of the screen: a string id + variables (translated at draw time, so a language switch re-translates it).
struct InterpretMsg: Equatable {
    var key: L10nKey
    var vars: [String: String] = [:]
    func text(_ t: L10n) -> String { t(key, vars) }
    static let ok: Set<L10nKey> = [.interpretSaved, .interpretReady, .interpretDownloading]
    var isOK: Bool { Self.ok.contains(key) }
    /// recogniser error code → message (web `recErr`)
    static func rec(_ code: String) -> InterpretMsg {
        switch code {
        case "not-allowed": return InterpretMsg(key: .interpretMicNeeded)
        case "no-speech": return InterpretMsg(key: .interpretNothingHeard)
        default: return InterpretMsg(key: .speakUiLoiNhanDangErr, vars: ["err": code])
        }
    }
}

/// A translation and where it came from: `local` = the on-device model (works offline, audio and text never leave the phone).
struct InterpretTranslated: Equatable { var text: String; var local: Bool }

/// On-device translation (Apple Translation framework, iOS 18+). A pack is downloaded ONLY by `download`, which the UI calls from a tap; `translate` never downloads.
@MainActor protocol InterpretTranslating: AnyObject {
    /// false = the OS has no Translation framework (iOS < 18): the screens show `interpret.unsupported` and keep the mics off
    var available: Bool { get }
    /// nil = not possible now (no pack for the pair, unsupported language, error)
    func translate(_ text: String, from: String, to: String) async -> InterpretTranslated?
    /// both directions of the pair ready (true) or not (false)
    func download(_ a: String, _ b: String) async -> Bool
}
/// Language id (NLLanguageRecognizer, on the device): who spoke?
@MainActor protocol InterpretLangID: AnyObject { func detect(_ text: String) -> Interpret.Detected? }
/// Text to speech in the language of the text (`lang` = UI language code); `slow` = 0.55× of the normal rate.
@MainActor protocol InterpretSpeaking: AnyObject {
    func speak(_ text: String, lang: String, slow: Bool, done: (() -> Void)?)
    func stop()
}

// MARK: live adapters

@MainActor final class NLLangID: InterpretLangID {
    func detect(_ text: String) -> Interpret.Detected? {
        let r = NLLanguageRecognizer(); r.processString(text)
        guard let top = r.languageHypotheses(withMaximum: 1).max(by: { $0.value < $1.value }), top.key != .undetermined else { return nil }
        return Interpret.Detected(top.key.rawValue, top.value)
    }
}

/// AVSpeechSynthesizer with the voice of the text's language; one utterance at a time.
@MainActor final class SystemVoice: NSObject, InterpretSpeaking, AVSpeechSynthesizerDelegate {
    static let slowRate: Float = 0.55
    private let synth = AVSpeechSynthesizer()
    private var done: (() -> Void)?
    override init() { super.init(); synth.delegate = self }
    func speak(_ text: String, lang: String, slow: Bool, done: (() -> Void)? = nil) {
        stop()
        guard !text.isEmpty else { done?(); return }
        #if os(iOS)
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers]); try? s.setActive(true)
        #endif
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: Interpret.LOC[Interpret.base(lang)] ?? lang)
        u.rate = AVSpeechUtteranceDefaultSpeechRate * (slow ? Self.slowRate : 1)
        self.done = done; synth.speak(u)
    }
    func stop() { done = nil; if synth.isSpeaking { synth.stopSpeaking(at: .immediate) } }
    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) { Task { @MainActor in let d = self.done; self.done = nil; d?() } }
}

// MARK: scripted (tests, snapshots)

@MainActor final class ScriptedTranslator: InterpretTranslating {
    var available = true
    var table: [String: String]
    var local = true
    private(set) var calls: [String] = []
    private(set) var downloads: [String] = []
    var downloadOK = true
    init(_ table: [String: String] = [:]) { self.table = table }
    func translate(_ text: String, from: String, to: String) async -> InterpretTranslated? {
        calls.append("\(from)>\(to):\(text)")
        return table[text].map { InterpretTranslated(text: $0, local: local) }
    }
    func download(_ a: String, _ b: String) async -> Bool { downloads.append("\(a)>\(b)"); return downloadOK }
}
@MainActor final class ScriptedLangID: InterpretLangID {
    var answers: [Interpret.Detected?]
    init(_ answers: [Interpret.Detected?] = []) { self.answers = answers }
    func detect(_ text: String) -> Interpret.Detected? { answers.isEmpty ? nil : answers.removeFirst() }
}
@MainActor final class SilentVoice: InterpretSpeaking {
    private(set) var spoken: [(text: String, lang: String, slow: Bool)] = []
    func speak(_ text: String, lang: String, slow: Bool, done: (() -> Void)?) { spoken.append((text, lang, slow)); done?() }
    func stop() {}
}

/// Everything the Interpreter needs from the app graph.
@MainActor struct InterpretEnv {
    let me: String
    let io: SpeakIO
    let translator: InterpretTranslating
    let langId: InterpretLangID
    let voice: InterpretSpeaking
    let store: InterpretStore
    var loadPhrases: () -> Interpret.Phrases? = { Interpret.bundledPhrases() }
    /// Sổ từ: the foreign phrase with its meaning in the learner's language (pos "phrase", topic "interpret"), no per-word enrichment
    var saveCards: ([Interpret.Card]) async -> Void = { _ in }
    /// known words of the learner's deck (lower-case keys), so the recap does not list them as new
    var known: () -> Set<String> = { [] }
    var now: () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }

    /// the app: SFSpeechRecognizer + Kokoro voices for the recap, on-device translation and language id, the learner's deck for the saved phrases
    static func live(ctx: SkillsContext, translator: InterpretTranslating) -> InterpretEnv {
        InterpretEnv(me: ctx.lang, io: .live(voice: ctx.core.voice), translator: translator, langId: NLLangID(), voice: SystemVoice(), store: InterpretStore(defaults: ctx.defaults),
                     saveCards: { cards in
                         for c in cards {
                             await ctx.addWord(["word": .string(c.word), "def": .string(c.def), "pos": "phrase", "emoji": "🗣️", "topic": "interpret"], context: ["text": .string(c.def), "title": "interpret"])
                         }
                     },
                     known: { Set(ctx.bundle.cards.map { Vocab.keyOf($0.s("word")) }) }, now: { ctx.now })
    }
}

enum InterpretLabels {
    /// the language in its own name (chooser, headings)
    static func nativeName(_ code: String) -> String {
        let l = Locale(identifier: code)
        return (l.localizedString(forLanguageCode: code) ?? code).capitalized(with: l)
    }
    static func group(_ g: String) -> L10nKey {
        switch g {
        case "hi": return .interpretGHi
        case "go": return .interpretGGo
        case "eat": return .interpretGEat
        case "stay": return .interpretGStay
        default: return .interpretGSos
        }
    }
    static let routes: [(route: String, key: L10nKey)] = [("interpret", .interpretFaceToFace), ("interpret/phrases", .interpretPhrasebook), ("interpret/history", .interpretHistory)]
    /// route of a screen: `interpret`, `interpret/phrases[/<group>]`, `interpret/history`, `interpret/recap/<id>` as an AppRoute
    static func appRoute(_ r: String) -> AppRoute {
        guard let i = r.firstIndex(of: "/") else { return AppRoute(r) }
        return AppRoute(String(r[..<i]), arg: String(r[r.index(after: i)...]))
    }
}

// MARK: face to face

/// Face-to-face screen: side "a" = bottom (the learner), "b" = top (turned 180° for the person opposite).
@MainActor @Observable
final class InterpretTalkModel {
    let env: InterpretEnv
    private(set) var pair: Interpret.Pair2
    /// per side: the translation shown on that half · the live words while somebody speaks
    private(set) var heard: [String: String] = [:]
    private(set) var live: [String: String] = [:]
    /// "a" / "b" = that side's mic is open; "say" = the say-back recogniser
    private(set) var listening: String?
    private(set) var busy = false
    private(set) var last: Interpret.Turn?
    /// which half shows the source badge and whether the translation was on the device
    private(set) var badge: (side: String, local: Bool)?
    private(set) var score: InterpretMsg?
    private(set) var toast: InterpretMsg?
    private(set) var packBusy = false
    private let cid: String
    private var nTurns = 0
    private var token = 0

    init(env: InterpretEnv) {
        self.env = env; cid = "c" + String(env.now())
        pair = env.store.pair(me: env.me)
        if !env.translator.available { toast = InterpretMsg(key: .interpretUnsupported) }
    }
    /// fixed state for fixtures
    func preview(pair: Interpret.Pair2? = nil, heard: [String: String] = [:], live: [String: String] = [:], listening: String? = nil, last: Interpret.Turn? = nil,
                 badge: (side: String, local: Bool)? = nil, score: InterpretMsg? = nil, toast: InterpretMsg? = nil) {
        if let pair { self.pair = pair }
        self.heard = heard; self.live = live; self.listening = listening; self.last = last; self.badge = badge; self.score = score; self.toast = toast
    }

    var canListen: Bool { env.translator.available }
    var canDownload: Bool { env.translator.available }
    var hasLast: Bool { last != nil }

    func setLang(_ side: String, _ lang: String) { pair = Interpret.pick(pair, side: side, lang: lang); env.store.savePair(pair); clear() }
    func swap() { pair = Interpret.Pair2(pair.b, pair.a); env.store.savePair(pair); clear() }
    private func clear() { token += 1; env.io.recognizer.cancel(); env.voice.stop(); listening = nil; heard = [:]; live = [:]; last = nil; badge = nil; score = nil; toast = nil }

    /// A second tap on the open mic = done speaking; a tap on the other mic switches.
    func mic(_ side: String) {
        guard canListen, !busy else { return }
        if listening == side { env.io.recognizer.stop(); return }
        if listening != nil { token += 1; env.io.recognizer.cancel() }
        env.voice.stop(); toast = nil; score = nil; listening = side; live = [:]
        token += 1; let my = token
        let loc = Interpret.LOC[Interpret.lang(pair, side)] ?? "en-US"
        Task { [weak self] in
            guard let self else { return }
            let o = await self.env.io.recognizer.listen(locale: loc, maxSeconds: 30, onPartial: { [weak self] x in
                guard let self, self.token == my else { return }
                self.live = [side: x, Interpret.other(side): x]
            })
            guard self.token == my else { return }
            self.listening = nil
            if let e = o.error { self.live = [:]; self.toast = .rec(e); return }
            self.finish(side, o.alts.first ?? "")
        }
    }

    private func finish(_ side: String, _ text: String) {
        let t0 = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t0.isEmpty { toast = InterpretMsg(key: .interpretNothingHeard); return }
        busy = true; live = [Interpret.other(side): t0]
        let p = pair
        Task { [weak self] in
            guard let self else { return }
            let who = Interpret.speaker(self.env.langId.detect(t0), p, side), to = Interpret.other(who)
            let r = await self.env.translator.translate(t0, from: Interpret.lang(p, who), to: Interpret.lang(p, to))
            self.busy = false
            guard let r else { self.live = [:]; self.toast = InterpretMsg(key: .interpretFailed); return }
            let turn = Interpret.Turn(who, t0, Interpret.lang(p, to), r.text, self.env.now())
            self.last = turn; self.nTurns += 1
            self.env.store.saveHistory(Interpret.addTurn(self.env.store.history(), id: self.cid, pair: p, turn: turn))
            self.live = [who: t0]; self.heard = [to: r.text]; self.badge = (to, r.local); self.toast = nil
            self.env.voice.speak(r.text, lang: Interpret.lang(p, to), slow: false, done: nil)
        }
    }

    func play(slow: Bool = false) { guard let t = last else { return }; env.voice.speak(t.tx, lang: t.dst, slow: slow, done: nil) }
    func save() {
        guard let t = last else { return }
        let cs = Interpret.cards(Interpret.Conv(cid, t.ts, pair.a, pair.b, [t]), me: env.me)
        if cs.isEmpty { toast = InterpretMsg(key: .interpretSameLang); return }
        Task { [weak self] in guard let self else { return }; await self.env.saveCards(cs); self.toast = InterpretMsg(key: .interpretSaved) }
    }
    /// "Say it back": the foreign phrase of the last turn, scored 0–100.
    func sayBack() {
        guard let t = last, canListen else { return }
        let me = Interpret.base(env.me), srcL = Interpret.lang(pair, t.from)
        let (w, wl) = srcL == me ? (t.tx, t.dst) : (t.src, srcL)
        if wl == me { return }
        token += 1; let my = token
        env.io.recognizer.cancel(); env.voice.stop(); listening = "say"; toast = nil; score = InterpretMsg(key: .interpretSayThis, vars: ["s": w])
        Task { [weak self] in
            guard let self else { return }
            let o = await self.env.io.recognizer.listen(locale: Interpret.LOC[wl] ?? "en-US", maxSeconds: 20, onPartial: nil)
            guard self.token == my else { return }
            self.listening = nil
            if let e = o.error { self.score = nil; self.toast = .rec(e); return }
            let s = Interpret.score(w, heard: o.alts)
            self.score = InterpretMsg(key: .interpretScore, vars: ["n": String(s.n), "h": s.heard])
        }
    }

    /// "Download offline pack": only from this tap.
    func pack() {
        guard !packBusy, canDownload else { return }
        packBusy = true; toast = InterpretMsg(key: .interpretDownloading)
        let p = pair
        Task { [weak self] in
            guard let self else { return }
            let ok = await self.env.translator.download(p.a, p.b)
            self.packBusy = false; self.toast = InterpretMsg(key: ok ? .interpretReady : .interpretUnsupported)
        }
    }
    /// Ends the conversation → recap of its new words (or the history when nothing was said).
    func end() -> String { leave(); return nTurns > 0 ? "interpret/recap/\(cid)" : "interpret/history" }
    func leave() { token += 1; env.io.recognizer.cancel(); env.voice.stop(); listening = nil }
}

// MARK: phrasebook

/// Travel phrasebook: a group of ready sentences, each in both languages of the pair.
@MainActor @Observable
final class InterpretPhrasesModel {
    let env: InterpretEnv
    private(set) var pair: Interpret.Pair2
    private(set) var book: Interpret.Phrases?
    private(set) var failed = false
    private(set) var group: String
    private(set) var score: InterpretMsg?
    private(set) var toast: InterpretMsg?
    private(set) var saying = false
    private var token = 0

    init(env: InterpretEnv, group: String?) {
        self.env = env; pair = env.store.pair(me: env.me)
        let b = env.loadPhrases(); book = b; failed = b == nil
        self.group = group.flatMap { g in b?.order.contains(g) == true ? g : nil } ?? b?.order.first ?? ""
    }
    var items: [[String: String]] { book?.group(group) ?? [] }
    private func item(_ i: Int) -> [String: String]? { let xs = items; return xs.indices.contains(i) ? xs[i] : nil }
    var foreign: String { pair.a == Interpret.base(env.me) ? pair.b : pair.a }
    func pick(_ g: String) { group = g; score = nil }
    func setLang(_ side: String, _ lang: String) { pair = Interpret.pick(pair, side: side, lang: lang); env.store.savePair(pair); score = nil }
    func play(_ i: Int, slow: Bool) { guard let o = item(i) else { return }; env.voice.speak(o[pair.b] ?? "", lang: pair.b, slow: slow, done: nil) }
    func save(_ i: Int) {
        guard let o = item(i) else { return }
        let me = Interpret.base(env.me), fl = foreign
        Task { [weak self] in
            guard let self else { return }
            await self.env.saveCards([Interpret.Card(o[fl] ?? "", o[me] ?? o[self.pair.a] ?? "", fl)]); self.toast = InterpretMsg(key: .interpretSaved)
        }
    }
    func sayBack(_ i: Int) {
        guard let o = item(i) else { return }
        let wl = foreign, w = o[wl] ?? ""
        if wl == Interpret.base(env.me) || saying { return }
        token += 1; let my = token
        env.io.recognizer.cancel(); env.voice.stop(); saying = true; toast = nil; score = InterpretMsg(key: .interpretSayThis, vars: ["s": w])
        Task { [weak self] in
            guard let self else { return }
            let r = await self.env.io.recognizer.listen(locale: Interpret.LOC[wl] ?? "en-US", maxSeconds: 20, onPartial: nil)
            guard self.token == my else { return }
            self.saying = false
            if let e = r.error { self.score = nil; self.toast = .rec(e); return }
            let s = Interpret.score(w, heard: r.alts)
            self.score = InterpretMsg(key: .interpretScore, vars: ["n": String(s.n), "h": s.heard])
        }
    }
    func leave() { token += 1; env.io.recognizer.cancel(); env.voice.stop(); saying = false }
}

// MARK: history + recap

/// History of conversations on this device + the recap of one (new words after a conversation).
@MainActor @Observable
final class InterpretHistoryModel {
    let env: InterpretEnv
    private(set) var convs: [Interpret.Conv]?
    private(set) var cards: [Interpret.Card] = []
    private(set) var keywords: [String] = []
    private(set) var conv: Interpret.Conv?
    private(set) var toast: InterpretMsg?
    private let id: String?

    init(env: InterpretEnv, id: String?) { self.env = env; self.id = id; load() }
    func load() {
        let h = env.store.history().convs; convs = h
        conv = id.flatMap { i in h.first { $0.id == i } }
        if let c = conv {
            let me = Interpret.base(env.me)
            cards = Interpret.cards(c, me: me)
            keywords = Interpret.keyWords(cards.map(\.word), lang: foreign, n: 8, known: env.known())
        }
    }
    /// the language of the foreign phrases of the open conversation
    var foreign: String { guard let c = conv else { return "en" }; return c.a == Interpret.base(env.me) ? c.b : c.a }
    func speak(_ c: Interpret.Card) { env.voice.speak(c.word, lang: c.lang, slow: false, done: nil) }
    func saveAll() { Task { [weak self] in guard let self else { return }; await self.env.saveCards(self.cards); self.toast = InterpretMsg(key: .interpretSaved) } }
    func clear() { env.store.clearHistory(); convs = [] }
    func leave() { env.voice.stop() }
}
