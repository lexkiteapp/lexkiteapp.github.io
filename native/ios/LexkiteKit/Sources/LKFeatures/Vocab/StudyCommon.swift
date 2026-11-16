import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
import LKCore

// MARK: - text helpers

/// Strings that carry a little HTML in the web sources (`<b>`, `<span class="kbd">`): bold is kept, everything else is dropped.
enum StudyText {
    static func plain(_ s: String) -> String {
        var t = s.replacingOccurrences(of: "<[^>]*>", with: "", options: .regularExpression)
        for (a, b) in [("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\"")] { t = t.replacingOccurrences(of: a, with: b) }
        return t
    }
    static func rich(_ s: String) -> AttributedString {
        var t = s.replacingOccurrences(of: "<b>", with: "\u{1}").replacingOccurrences(of: "</b>", with: "\u{2}")
        t = plain(t)
        var out = AttributedString(), bold = false, run = ""
        func flush() {
            guard !run.isEmpty else { return }
            var piece = AttributedString(run)
            if bold { piece.inlinePresentationIntent = .stronglyEmphasized }
            out += piece; run = ""
        }
        for ch in t {
            if ch == "\u{1}" { flush(); bold = true } else if ch == "\u{2}" { flush(); bold = false } else { run.append(ch) }
        }
        flush()
        return out
    }
}

enum StudyFmt {
    static func calendar(_ lang: String) -> Calendar { var c = Calendar(identifier: .gregorian); c.locale = Locale(identifier: lang); return c }
    /// "10 min · 1 day · 3 months" for the grade buttons (system unit names, no hand-typed copy)
    static func interval(_ p: SRSPreview, lang: String) -> String {
        var comps = DateComponents(), units: NSCalendar.Unit = .day
        switch p {
        case .minutes(let n): comps.minute = n; units = .minute
        case .oneDay: comps.day = 1; units = .day
        case .days(let n): comps.day = n; units = .day
        case .months(let n): comps.month = n; units = .month
        case .years(let y): if y >= 2 { comps.year = Int(y.rounded()); units = .year } else { comps.month = max(12, Int((y * 12).rounded())); units = .month }
        }
        let f = DateComponentsFormatter()
        f.unitsStyle = .abbreviated; f.allowedUnits = units; f.calendar = calendar(lang); f.maximumUnitCount = 1
        return spaced(f.string(from: comps) ?? "", lang)
    }
    /// Vietnamese abbreviated units come without a gap ("16ngày"): add the thin gap between digit and word.
    static func spaced(_ s: String, _ lang: String) -> String {
        lang.hasPrefix("vi") ? s.replacingOccurrences(of: "(\\d)(\\p{L})", with: "$1 $2", options: .regularExpression) : s
    }
    static func minutes(_ n: Int, lang: String) -> String {
        var c = DateComponents(); c.minute = n
        let f = DateComponentsFormatter(); f.unitsStyle = .abbreviated; f.allowedUnits = [.minute]; f.calendar = calendar(lang)
        return spaced(f.string(from: c) ?? "\(n)", lang)
    }
    static func date(_ ms: Int64, lang: String) -> String {
        Date(timeIntervalSince1970: Double(ms) / 1000).formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: lang)))
    }
    static func weekday(_ ms: Int64, lang: String) -> String {
        Date(timeIntervalSince1970: Double(ms) / 1000).formatted(.dateTime.weekday(.abbreviated).locale(Locale(identifier: lang)))
    }
    static func seconds(_ s: Double, lang: String) -> String {
        let style = Measurement<UnitDuration>.FormatStyle(width: .narrow, locale: Locale(identifier: lang), usage: .asProvided, numberFormatStyle: .number.precision(.fractionLength(1)))
        return Measurement(value: s, unit: UnitDuration.seconds).formatted(style)
    }
    static func percent(_ n: Int, lang: String) -> String { (Double(n) / 100).formatted(.percent.locale(Locale(identifier: lang))) }
}

/// Proper names that are not translated (sources and brands); everything else comes from L10n.
enum StudyNames {
    static func origin(_ k: String) -> String? {
        ["youtube": "YouTube", "web": "Web", "reading": "Reading", "anki": "Anki"][k]
    }
    static func originIcon(_ k: String) -> String {
        ["youtube": "play.rectangle.fill", "web": "globe", "reading": "book.fill", "dict": "magnifyingglass", "library": "books.vertical.fill", "anki": "rectangle.stack.fill", "doc": "tray.and.arrow.down.fill"][k] ?? "tray.fill"
    }
}

// MARK: - styling

struct StudyTextModifier: ViewModifier {
    let style: LKTextStyle, color: LKDynamicColor
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View { content.lkTextSafe(style).foregroundStyle(color.resolve(scheme)) }
}
extension View {
    func studyText(_ style: LKTextStyle, _ color: LKDynamicColor = LKColor.onSurface) -> some View { modifier(StudyTextModifier(style: style, color: color)) }
}

/// Secondary action: tactile outlined rounded button, ≥ 44 pt.
struct StudyOutlineButtonStyle: ButtonStyle {
    var tint: LKDynamicColor = LKColor.onSurface
    var fill: LKDynamicColor = LKColor.surfaceContainer
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .lkTextSafe(LKType.titlePill)
            .foregroundStyle(tint.resolve(scheme))
            .padding(.horizontal, LKSpacing.spaceMd)
            .frame(minHeight: max(LKFrame.shared.minTap, 48))
            .frame(maxWidth: .infinity)
            .tactile(fill: fill, line: LKColor.outlineVariant, ledge: LKColor.outlineVariant, radius: 16)
            .offset(y: LKMotionPolicy.pressOffset(pressed: configuration.isPressed, reduce: reduceMotion, down: 2))
            .animation(LKMotionPolicy.animation(response: 0.22, damping: 0.7, reduce: reduceMotion), value: configuration.isPressed)
            .lkHaptic(.tap, trigger: configuration.isPressed, when: { $0 })
    }
}

/// A coloured chip (level, part of speech, counts).
struct StudyChip: View {
    let text: String
    var icon: String?
    var tint: LKDynamicColor = LKColor.secondary
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.system(size: 12, weight: .bold)).accessibilityHidden(true) }
            Text(verbatim: text).lkTextSafe(LKType.labelBadge)
        }
        .foregroundStyle(tint.resolve(scheme))
        .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 5)
        .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
    }
}

/// Centered empty / info state with an optional primary action.
struct StudyEmpty: View {
    let icon: String, title: String
    var message: String?
    var action: (title: String, run: () -> Void)?
    var secondary: (title: String, run: () -> Void)?
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            Image(systemName: icon).font(.system(size: 44, weight: .semibold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: title).studyText(LKType.headlineMd).multilineTextAlignment(.center)
            if let message { Text(verbatim: message).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center) }
            if let action { Button(action.title, action: action.run).buttonStyle(PrimaryButtonStyle()) }
            if let secondary { Button(secondary.title, action: secondary.run).buttonStyle(StudyOutlineButtonStyle()) }
        }
        .frame(maxWidth: .infinity)
        .padding(LKSpacing.spaceLg)
    }
}

/// Mastery dots (0…3) – never colour alone: the filled count is also read out.
struct StudyDots: View {
    let level: Int
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<3, id: \.self) { i in
                Circle().fill(i < level ? LKColor.secondary.resolve(scheme) : LKColor.outlineVariant.resolve(scheme)).frame(width: 8, height: 8)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityValue(Text(verbatim: "\(level)/3"))
    }
}

/// Word picture: the card's image when it loads, else its emoji (offline-safe).
struct StudyThumb: View {
    let emoji: String, image: String
    var size: CGFloat = 52
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme))
            if let url = URL(string: image), !image.isEmpty {
                AsyncImage(url: url) { phase in
                    if let img = phase.image { img.resizable().scaledToFill() } else { Text(verbatim: emoji).font(.system(size: size * 0.5)) }
                }
            } else {
                Text(verbatim: emoji.isEmpty ? "📘" : emoji).font(.system(size: size * 0.5))
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityHidden(true)
    }
}

/// Round speaker button (≥ 44 pt).
struct StudySpeak: View {
    let label: String
    var slow = false
    let action: () -> Void
    var body: some View {
        LessonIconButton(system: slow ? "tortoise.fill" : "speaker.wave.2.fill", label: label, action: action)
    }
}

/// Page scaffold for pushed screens: inner top bar (Back ≥ 44 pt) + a scrolling column of the app width.
struct StudyPage<Content: View>: View {
    let title: String
    var onBack: (() -> Void)?
    let content: Content
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    init(title: String, onBack: (() -> Void)? = nil, @ViewBuilder content: () -> Content) { self.title = title; self.onBack = onBack; self.content = content() }
    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: title) { if let onBack { onBack() } else { dismiss() } }
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) { content }
                    .padding(.horizontal, LKFrame.shared.gutter)
                    .padding(.top, LKSpacing.spaceSm)
                    .padding(.bottom, LKSpacing.space2xl)
                    .frame(maxWidth: LKFrame.shared.width)
                    .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }
}

// MARK: - shared runtime of the study models

/// Clock, data and voice shared by the study models. Injected so tests and snapshots need no clock, no network and no sound.
@MainActor
final class StudyCore {
    let data: VocabDataSource
    let now: @Sendable () -> Int64
    let clock: VocabClock
    let voice: LKVoicePlayer
    var onChange: () -> Void = {}
    init(data: VocabDataSource, voice: LKVoicePlayer = LKVoicePlayer(), calendar: Calendar = .current, now: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }) {
        self.data = data; self.voice = voice; self.clock = VocabClock(calendar: calendar); self.now = now
    }
    func commit(_ e: VocabEdit) async { await data.commit(e, now: now()); onChange() }
    func accent(_ settings: JSON) -> String { settings.s("accent") == "uk" ? "en-GB" : "en-US" }
    func speak(_ text: String, settings: JSON, slow: Bool = false) { voice.speakWord(text, who: "ama", accent: accent(settings), slow: slow) }
    func speakSentence(_ text: String, settings: JSON) { voice.speak(text, who: "ama", accent: accent(settings)) }

    /// `addWord(entry, context)` of app.js (Cards.add): merge into the saved card or create it. Updates `bundle` and returns the stored card.
    func addWord(_ entry: JSON, context: JSON? = nil, into bundle: inout VocabBundle) -> JSON {
        let key = Vocab.cardKey(entry)
        var book = WordBook(cards: bundle.cards.filter { Vocab.cardKey($0) == key })
        let card = book.add(entry, context: context, now: now())
        if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == key }) { bundle.cards[i] = card } else { bundle.cards.append(card) }
        return card
    }
    /// translate a stored `{k, v}` web key into the UI language (falls back to the key text itself, like the web)
    func translator(_ l10n: L10n) -> MistakesEngine.Translate {
        { k, v in
            var vars: [String: String] = [:]
            for (n, x) in v?.object ?? [:] { vars[n] = x.jsToString }
            return l10n.translate(source: k, vars) ?? MistakesEngine.fill(k, v)
        }
    }
}

extension AppServices {
    /// The vocabulary data of this app: the SwiftData repository, or an empty in-memory book (previews).
    @MainActor func vocabSource(_ injected: VocabDataSource?) -> VocabDataSource {
        if let injected { return injected }
        if let repo { return RepoVocabData(repo: repo) }
        return MemoryVocabData()
    }
}
