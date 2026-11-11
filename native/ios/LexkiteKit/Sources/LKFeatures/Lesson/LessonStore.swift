import Foundation
import LKCore
import LKStore
import LKSync

/// Reads the learner's cards for a lesson and writes its results back (FSRS review per word, new cards for unknown words, XP).
/// All writes go through `LKRepository.mutate` (serial), so a sync merge never loses an answer.
public enum LessonStore {
    static let pathKey = "lk.lsn.path", accKey = "lk.lsn.acc"

    /// Deck cards as lesson cards (ref = card key).
    public static func cards(from doc: SyncDoc) -> [LessonCard] {
        doc.cards.keys.sorted().compactMap { k in
            guard var c = try? JSONDecoder().decode(LessonCard.self, from: doc.cards[k]!.data) else { return nil }
            c.ref = k; return c
        }
    }

    /// Starter set for learners with (almost) no cards: the bundled onboarding pack of their exam, first topic – never typed here (scripts/native/starter.mjs).
    public static func starter(settings: JSON?, now: Double) -> [LessonCard] {
        guard let pack = StarterDeck.bundled() else { return [] }
        let exam = StarterDeck.exam(track: settings?["track"]?.string, variant: settings?["variant"]?.string ?? "")
        guard let id = pack.byExam[exam]?.first else { return [] }
        return (pack.topics[id] ?? []).prefix(8).compactMap { e in
            var card = StarterDeck.make(e, now: now)
            card["ctx"] = ""; card["src"] = ""
            guard var c = try? JSONDecoder().decode(LessonCard.self, from: card.data) else { return nil }
            c.ref = "starter:" + c.word; return c
        }
    }

    /// Button kind of the learning path (web pathPlan + nextKind): rotates per finished lesson, adapts to the last accuracy.
    public static func nextKind(cards: [LessonCard], now: Double, defaults: UserDefaults = .standard) -> String {
        let n = defaults.integer(forKey: pathKey)
        let plan = LessonEngine.pathPlan(cards, now: now)
        let acc = defaults.object(forKey: accKey) as? Double
        let due = cards.contains { LessonEngine.isDue($0, now) }
        return LessonEngine.nextKind(plan[n % plan.count], acc: acc, due: due)
    }
    static func finished(accuracy: Int, story: Bool, defaults: UserDefaults = .standard) {
        if !story { defaults.set(defaults.integer(forKey: pathKey) + 1, forKey: pathKey) }
        defaults.set(Double(accuracy), forKey: accKey)
    }

    /// FSRS review for each result (wrong → Again, due + right first time → Good), unknown wrong words become new cards, XP → game.
    public static func save(_ results: [LessonEngine.Result], xp: Int, now: Date, repo: LKRepository, calendar: Calendar = .current) async {
        let ms = (now.timeIntervalSince1970 * 1000).rounded()
        let day = TodaySnapshot.dayKey(now, calendar)
        try? await repo.mutate { doc in
            for r in results {
                var key = r.card?.ref ?? ""
                if r.add, let e = r.entry {
                    var entry: [String: JSON] = ["word": .string(e.word), "pos": .string(e.pos), "ipa": .string(e.ipa), "ipaUS": .string(e.ipaUS), "vi": .string(e.vi), "def": .string(e.def), "ex": .string(e.ex)]
                    entry["sentences"] = .array(e.sentences.map { ["en": .string($0.en), "vi": .string($0.vi)] })
                    key = MigrationImport.tlKey(.string(e.word), nil)
                    if doc.cards[key] == nil { var c = StarterDeck.make(.object(entry), now: ms); c["mod"] = .number(ms); doc.cards[key] = c; doc.deleted[key] = nil }
                }
                guard !key.isEmpty, var card = doc.cards[key], let srsJSON = card["srs"],
                      let old = try? JSONDecoder().decode(SRSCard.self, from: srsJSON.data) else { continue }
                let next = SRS(calendar: calendar).review(old, grade: r.grade, now: Int64(ms))
                guard let data = try? JSONEncoder().encode(next), let j = try? JSON.parse(data) else { continue }
                card["srs"] = j; card["mod"] = .number(ms)
                doc.cards[key] = card
            }
            var g = doc.game ?? .object([:])
            g["xp"] = .number(JSON.orZero(g["xp"]) + Double(xp))
            var days = JSON.spread(g["days"])
            var d = JSON.spread(days[day]); d["xp"] = .number(JSON.orZero(d["xp"]) + Double(xp))
            days[day] = .object(d); g["days"] = .object(days)
            doc.game = g
        }
    }
}
