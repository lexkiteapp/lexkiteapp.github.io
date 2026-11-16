import Foundation

/// Lesson engine data types – a port of the object shapes of web/js/lesson/engine.js. Cards are plain values; `ref` is the caller's id for a card
/// (the card key in the app, "c:<i>" in the vectors) and is what an item stores in place of the JS `card` object.
public struct LessonSentence: Codable, Equatable, Sendable {
    public var en: String, vi: String
    public init(en: String, vi: String = "") { self.en = en; self.vi = vi }
    private enum CodingKeys: String, CodingKey { case en, vi }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        en = (try? c.decodeIfPresent(String.self, forKey: .en)) ?? ""; vi = (try? c.decodeIfPresent(String.self, forKey: .vi)) ?? ""
    }
}
public struct LessonContext: Codable, Equatable, Sendable {
    public var text: String, source: String
    public init(text: String, source: String = "") { self.text = text; self.source = source }
    private enum CodingKeys: String, CodingKey { case text, source }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        text = (try? c.decodeIfPresent(String.self, forKey: .text)) ?? ""; source = (try? c.decodeIfPresent(String.self, forKey: .source)) ?? ""
    }
}
public struct LessonSRS: Codable, Equatable, Sendable {
    public var reps: Double, lapses: Double
    public var due: Double?, last: Double?
    public init(reps: Double = 0, lapses: Double = 0, due: Double? = nil, last: Double? = nil) { self.reps = reps; self.lapses = lapses; self.due = due; self.last = last }
    private enum CodingKeys: String, CodingKey { case reps, lapses, due, last }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        reps = (try? c.decodeIfPresent(Double.self, forKey: .reps)) ?? 0; lapses = (try? c.decodeIfPresent(Double.self, forKey: .lapses)) ?? 0
        due = try? c.decodeIfPresent(Double.self, forKey: .due); last = try? c.decodeIfPresent(Double.self, forKey: .last)
    }
}

public struct LessonCard: Codable, Equatable, Sendable {
    public var ref: String
    public var word: String, pos: String, ipa: String, ipaUS: String, vi: String, def: String, ex: String, ctx: String, src: String
    public var mod: Double
    public var sentences: [LessonSentence], contexts: [LessonContext]
    public var srs: LessonSRS?

    public init(ref: String = "", word: String, pos: String = "", ipa: String = "", ipaUS: String = "", vi: String = "", def: String = "", ex: String = "",
                ctx: String = "", src: String = "", mod: Double = 0, sentences: [LessonSentence] = [], contexts: [LessonContext] = [], srs: LessonSRS? = nil) {
        self.ref = ref; self.word = word; self.pos = pos; self.ipa = ipa; self.ipaUS = ipaUS; self.vi = vi; self.def = def; self.ex = ex
        self.ctx = ctx; self.src = src; self.mod = mod; self.sentences = sentences; self.contexts = contexts; self.srs = srs
    }
    private enum K: String, CodingKey { case ref, word, pos, ipa, ipaUS, vi, def, ex, ctx, src, mod, sentences, contexts, srs }
    /// Tolerant: a card synced from web/add-on may carry any field type; whatever does not decode as expected counts as absent (JS falsy).
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        func s(_ k: K) -> String { (try? c.decodeIfPresent(String.self, forKey: k)) ?? "" }
        ref = s(.ref); word = s(.word); pos = s(.pos); ipa = s(.ipa); ipaUS = s(.ipaUS); vi = s(.vi); def = s(.def); ex = s(.ex); ctx = s(.ctx); src = s(.src)
        mod = (try? c.decodeIfPresent(Double.self, forKey: .mod)) ?? 0
        sentences = (try? c.decodeIfPresent([LessonSentence].self, forKey: .sentences)) ?? []
        contexts = (try? c.decodeIfPresent([LessonContext].self, forKey: .contexts)) ?? []
        srs = try? c.decodeIfPresent(LessonSRS.self, forKey: .srs)
    }
}
/// Where a word sits in a sentence (`findWord`).
public struct LessonBlank: Codable, Equatable, Sendable { public var i: Int, n: Int, toks: [String], form: String }

/// `sentenceOf` result.
public struct LessonSentenceHit: Equatable, Sendable { public var text: String, tr: String?, own: Bool, at: LessonBlank }

public struct LessonPick: Equatable, Sendable {
    public var card: LessonCard, why: String
    public init(card: LessonCard, why: String) { self.card = card; self.why = why }
}

/// Fallback exercise used when the learner switches speaking off (`alt`).
public struct LessonAlt: Encodable, Equatable, Sendable {
    public var type: String
    public var sent: String?, own: Bool?, blank: LessonBlank?
    public var answer: String, options: [String], hints: [String]
    public var tr: String?
}

/// A match pair: `card` for vocabulary matches, `word`/`mean` for story matches.
public struct LessonPair: Equatable, Sendable {
    public var card: LessonCard?, word: String?, mean: String?
}

/// One exercise (`build` / `storyItems` output). Optional fields are the JS keys that only some types carry.
public struct LessonItem: Encodable, Equatable, Sendable {
    public var id: Int, type: String, word: String
    public var card: LessonCard?
    public var why: String?, ipa: String?
    public var retry: Int
    public var hints: [String], mean: String?, noAudio: Bool?
    public var sent: String?, own: Bool?, blank: LessonBlank?
    public var answer: String?, options: [String]?, tiles: [String]?, prompt: String?, tr: String?
    public var def: String?, len: Int?, first: String?, bank: [String]?
    public var alt: LessonAlt?, choice: Bool?, spoke: Bool?
    public var pairs: [LessonPair]?
    public var free: Bool?, who: String?, radio: Bool?

    public init(id: Int, type: String, word: String, card: LessonCard? = nil, retry: Int = 0, hints: [String] = []) {
        self.id = id; self.type = type; self.word = word; self.card = card; self.retry = retry; self.hints = hints
    }

    private enum K: String, CodingKey {
        case id, type, word, card, why, ipa, retry, hints, mean, noAudio, sent, own, blank, answer, options, tiles, prompt, tr, def, len, first, bank
        case alt, choice, spoke, pairs, free, who, radio
    }
    private struct PairOut: Encodable { let word: String, mean: String }
    public func encode(to e: Encoder) throws {
        var c = e.container(keyedBy: K.self)
        try c.encode(id, forKey: .id); try c.encode(type, forKey: .type); try c.encode(word, forKey: .word)
        if let card { try c.encode(card.ref, forKey: .card) } else { try c.encodeNil(forKey: .card) }
        try c.encodeIfPresent(why, forKey: .why); try c.encodeIfPresent(ipa, forKey: .ipa)
        try c.encode(retry, forKey: .retry); try c.encode(hints, forKey: .hints)
        try c.encodeIfPresent(mean, forKey: .mean); try c.encodeIfPresent(noAudio, forKey: .noAudio)
        try c.encodeIfPresent(sent, forKey: .sent); try c.encodeIfPresent(own, forKey: .own); try c.encodeIfPresent(blank, forKey: .blank)
        try c.encodeIfPresent(answer, forKey: .answer); try c.encodeIfPresent(options, forKey: .options); try c.encodeIfPresent(tiles, forKey: .tiles)
        try c.encodeIfPresent(prompt, forKey: .prompt); try c.encodeIfPresent(tr, forKey: .tr); try c.encodeIfPresent(def, forKey: .def)
        try c.encodeIfPresent(len, forKey: .len); try c.encodeIfPresent(first, forKey: .first); try c.encodeIfPresent(bank, forKey: .bank)
        try c.encodeIfPresent(alt, forKey: .alt); try c.encodeIfPresent(choice, forKey: .choice); try c.encodeIfPresent(spoke, forKey: .spoke)
        if let pairs {
            if pairs.contains(where: { $0.card != nil }) { try c.encode(pairs.compactMap { $0.card?.ref }, forKey: .pairs) }
            else { try c.encode(pairs.map { PairOut(word: $0.word ?? "", mean: $0.mean ?? "") }, forKey: .pairs) }
        }
        try c.encodeIfPresent(free, forKey: .free); try c.encodeIfPresent(who, forKey: .who); try c.encodeIfPresent(radio, forKey: .radio)
    }
}

/// "Can't listen / can't speak right now" switches.
public struct LessonOff: Equatable, Sendable {
    public var listen: Bool, speak: Bool
    public init(listen: Bool = false, speak: Bool = false) { self.listen = listen; self.speak = speak }
}

/// Story / radio document (cpack/lesson/stories.js).
public struct LessonStory: Decodable, Equatable, Sendable {
    public struct Line: Decodable, Equatable, Sendable { public var who: String, en: String }
    public struct Pair: Decodable, Equatable, Sendable { public var en: String, m: [String: String] }
    public struct Check: Decodable, Equatable, Sendable {
        public var at: Int, type: String
        public var line: Int?, q: String?, options: [String]?, answer: Int?, keep: Bool?, why: String?, pairs: [Pair]?
    }
    public var id: String, kind: String
    public var title: String?, cefr: String?
    public var lines: [Line]
    public var checks: [Check]?

    /// Parse `self.LESSON_STORIES = [ … ];` (what the CDN serves) into stories. Nil when the text is not that shape.
    public static func parseScript(_ text: String) -> [LessonStory]? {
        guard let eq = text.firstIndex(of: "="), let end = text.lastIndex(of: "]") else { return nil }
        let body = text[text.index(after: eq)...end]
        return try? JSONDecoder().decode([LessonStory].self, from: Data(body.utf8))
    }
}
