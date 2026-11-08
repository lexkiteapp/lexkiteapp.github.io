import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// Building blocks shared by the vocabulary inner screens (Dict*, Verb*, Usage*, Writing*). Colours / type / spacing come from the
/// generated tokens only, copy only from L10n, every control is ≥ 44 pt and uses leading/trailing (RTL safe).
enum WritingText {
    /// "a <b>b</b> c" → AttributedString (bold run), any other tag dropped. The i18n strings carry a little HTML.
    static func rich(_ s: String) -> AttributedString {
        var out = AttributedString()
        var bold = false
        var rest = Substring(s)
        while !rest.isEmpty {
            if rest.first == "<", let close = rest.firstIndex(of: ">") {
                let tag = rest[rest.index(after: rest.startIndex)..<close].lowercased()
                if tag == "b" || tag == "strong" { bold = true } else if tag == "/b" || tag == "/strong" { bold = false }
                rest = rest[rest.index(after: close)...]
                continue
            }
            let stop = rest.dropFirst().firstIndex(of: "<") ?? rest.endIndex
            var piece = AttributedString(String(rest[rest.startIndex..<stop]))
            if bold { piece.inlinePresentationIntent = .stronglyEmphasized }
            out += piece
            rest = rest[stop...]
        }
        return out
    }
    static func plain(_ s: String) -> String { String(rich(s).characters) }

    /// The word inside a sentence in the accent colour + bold (web `UI.highlight`).
    static func highlight(_ text: String, _ word: String, _ color: Color) -> AttributedString {
        var a = AttributedString(text)
        guard !word.isEmpty else { return a }
        var from = a.startIndex
        while from < a.endIndex, let r = a[from...].range(of: word, options: .caseInsensitive) {
            a[r].foregroundColor = color
            a[r].inlinePresentationIntent = .stronglyEmphasized
            from = r.upperBound
        }
        return a
    }
}

extension L10n {
    /// Same as `callAsFunction`, with the `<b>` markup of the i18n source rendered.
    func rich(_ key: L10nKey, _ vars: [String: CustomStringConvertible] = [:]) -> AttributedString { WritingText.rich(self(key, vars)) }
}

/// Pushed-screen scaffold: system back button + edge swipe (the app frame's inner bar), page colour, one centred content column.
struct WritingPage<Content: View>: View {
    let title: String, spacing: CGFloat, content: Content
    @Environment(\.colorScheme) private var scheme
    init(title: String, spacing: CGFloat = LKSpacing.spaceMd, @ViewBuilder content: () -> Content) { self.title = title; self.spacing = spacing; self.content = content() }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: spacing) { content }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.spaceXl)
                .frame(maxWidth: LKFrame.shared.width, alignment: .leading)
                .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
        .toolbarBackground(LKColor.background.resolve(scheme), for: .navigationBar)
        .toolbar { ToolbarItem(placement: .principal) { Text(title).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).lineLimit(1).accessibilityAddTraits(.isHeader) } }
    }
}

/// Tactile surface with content padding.
struct WritingCard<Content: View>: View {
    var fill: LKDynamicColor = LKColor.surfaceContainer
    var radius: CGFloat = 20
    let content: Content
    init(fill: LKDynamicColor = LKColor.surfaceContainer, radius: CGFloat = 20, @ViewBuilder content: () -> Content) { self.fill = fill; self.radius = radius; self.content = content() }
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) { content }
            .padding(LKSpacing.spaceMd)
            .frame(maxWidth: .infinity, alignment: .leading)
            .tactile(fill: fill, radius: radius)
            .padding(.bottom, 4)
    }
}

struct WritingHeading: View {
    let text: String, icon: String?
    @Environment(\.colorScheme) private var scheme
    init(_ text: String, icon: String? = nil) { self.text = text; self.icon = icon }
    var body: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if let icon { Image(systemName: icon).foregroundStyle(LKColor.secondary.resolve(scheme)) }
            Text(text).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine).accessibilityAddTraits(.isHeader)
    }
}

/// Pill chip (filter / link / quick pick). Hit area ≥ 44 pt.
struct WritingChip: View {
    let text: String
    var selected = false
    var system: String? = nil
    var english = false
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let system { Image(systemName: system).font(.system(size: 13, weight: .bold)) }
                Text(text).lkTextSafe(LKType.labelMetric).multilineTextAlignment(.leading).environment(\.layoutDirection, english ? .leftToRight : layout)
            }
            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
            .foregroundStyle((selected ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
            .background(Capsule().fill((selected ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
            .contentShape(Capsule())
        }
        .buttonStyle(LKPressStyle())
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }
    @Environment(\.layoutDirection) private var layout
}

/// Round speaker button – audio goes through the M2 voice player (`LKVoicePlayer`, cached Kokoro voice, system TTS fallback).
struct WritingSayButton: View {
    let text: String, label: String, voice: LKVoicePlayer
    var accent = "en-US"
    var slow = false
    /// a single word (cached word audio) instead of a sentence
    var word = false
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button {
            if word { voice.speakWord(text, who: "ama", accent: accent, slow: slow) } else { voice.speak(text, who: "ama", accent: accent, slow: slow) }
        } label: {
            Image(systemName: slow ? "tortoise.fill" : "speaker.wave.2.fill").font(.system(size: 16, weight: .bold))
                .foregroundStyle(LKColor.secondary.resolve(scheme))
                .frame(width: 36, height: 36).background(Circle().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

struct WritingSearchField: View {
    let placeholder: String, clearLabel: String
    @Binding var text: String
    var onSubmit: () -> Void = {}
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Image(systemName: "magnifyingglass").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
            ZStack(alignment: .leading) {
                if text.isEmpty { Text(placeholder).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).lineLimit(2).fixedSize(horizontal: false, vertical: true).allowsHitTesting(false).accessibilityHidden(true) }
                TextField("", text: $text).accessibilityLabel(placeholder)
                    .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search).onSubmit(onSubmit)
                    .lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
            }
            if !text.isEmpty {
                Button { text = "" } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                        .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
                }
                .accessibilityLabel(clearLabel)
            }
        }
        .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 52)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
    }
}

/// Empty / offline / error notice.
struct WritingNotice: View {
    let icon: String, text: String
    var action: (title: String, run: () -> Void)? = nil
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            Image(systemName: icon).font(.system(size: 30, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
            Text(text).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center)
            if let action { Button(action.title, action: action.run).buttonStyle(PrimaryButtonStyle()) }
        }
        .frame(maxWidth: .infinity).padding(LKSpacing.spaceMd)
    }
}

/// Loading placeholder: static bars (no shimmer with Reduce Motion).
struct WritingSkeleton: View {
    var rows = 3
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dim = false
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            ForEach(0..<rows, id: \.self) { i in
                RoundedRectangle(cornerRadius: 8).fill(LKColor.surfaceContainerHighest.resolve(scheme)).frame(height: 18)
                    .frame(maxWidth: i == rows - 1 ? 180 : .infinity, alignment: .leading)
            }
        }
        .opacity(dim && !reduceMotion ? 0.5 : 1)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: dim)
        .onAppear { dim = true }
        .accessibilityHidden(true)
    }
}

/// Small tag (part of speech, level, count).
struct WritingTag: View {
    let text: String
    var tint: LKDynamicColor = LKColor.secondary
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Text(text).lkTextSafe(LKType.labelBadge).textCase(.uppercase).lineLimit(1).fixedSize()
            .padding(.horizontal, LKSpacing.spaceXs).padding(.vertical, 3)
            .foregroundStyle(tint.resolve(scheme))
            .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
    }
}

/// Local, per-device state of these screens (web `Store` keys that never sync): recent words, letter drafts, practised model modes.
enum WritingLocal {
    static func strings(_ key: String, _ d: UserDefaults = .standard) -> [String] { d.stringArray(forKey: key) ?? [] }
    static func dict(_ key: String, _ d: UserDefaults = .standard) -> [String: String] { d.dictionary(forKey: key) as? [String: String] ?? [:] }
    static func setDict(_ key: String, _ k: String, _ v: String?, _ d: UserDefaults = .standard) {
        var m = dict(key, d); m[k] = v; d.set(m, forKey: key)
    }
    static let recentKey = "lk.dict.recent", draftsKey = "lk.letterDrafts", doneKey = "lk.modelDone"
}

/// Learner state shared by the screens: the saved cards (read) and the one write path (`WordBook.add` inside the serial repository mutate).
@MainActor
enum WritingCards {
    static func cards(_ services: AppServices) async -> [JSON] {
        guard let doc = try? await services.repo?.snapshot() else { return [] }
        return Array(doc.cards.values)
    }
    static func has(_ word: String, in cards: [JSON]) -> Bool {
        let k = Vocab.keyOf(word)
        return cards.contains { Vocab.cardKey($0) == k }
    }
    /// addWord(entry, context): returns the stored card (nil without a repository, e.g. previews)
    @discardableResult
    static func add(_ entry: JSON, context: JSON? = nil, services: AppServices, now: Date = Date()) async -> Bool {
        guard let repo = services.repo else { return false }
        let ms = Int64(now.timeIntervalSince1970 * 1000)
        let key = Vocab.cardKey(entry)
        _ = try? await repo.mutate { doc in
            var book = WordBook(cards: doc.cards[key].map { [$0] } ?? [])
            let card = book.add(entry, context: context, now: ms)
            doc.cards[key] = card
            doc.deleted[key] = nil
        }
        services.localChange()
        return true
    }
}

/// Secondary action: outlined pill, ≥ 44 pt (the one primary button of a screen stays `PrimaryButtonStyle`).
struct WritingSecondaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .lkTextSafe(LKType.titlePill).lineLimit(1).minimumScaleFactor(0.85)
            .foregroundStyle(LKColor.secondary.resolve(scheme))
            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
            .background(Capsule(style: .circular).inset(by: 1).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 2, lineJoin: .round)))
            .opacity(enabled ? (configuration.isPressed ? 0.7 : 1) : 0.4)
            .contentShape(Capsule())
    }
}

/// An English sentence / word block (always left to right, also in the Arabic UI).
struct WritingEnglish: View {
    let text: String
    var style: LKTextStyle = LKType.bodyLg
    var color: LKDynamicColor = LKColor.onSurface
    @Environment(\.colorScheme) private var scheme
    var body: some View { Text(text).lkTextSafe(style).foregroundStyle(color.resolve(scheme)).multilineTextAlignment(.leading).frame(maxWidth: .infinity, alignment: .leading).englishText() }
}

/// Save-a-phrase form (web `App.savePhraseDialog`): phrase, meaning (Vietnamese learners only), the sentence it came from → a `phrase` card.
struct WritingPhraseSheet: View {
    @State var phrase: String
    @State var meaning: String
    @State var sentence: String
    let showMeaning: Bool
    var contextTitle = ""
    let onSave: (JSON, JSON?) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    field(t(.dictSaveYourOwnPhrase), $phrase, english: true)
                    if showMeaning { field(t(.vocabMeaning), $meaning, english: false) }
                    field(t(.vocabExampleSentence), $sentence, english: true)
                    Button(t(.vocabSave)) {
                        let (entry, ctx) = WritingEngine.phraseEntry(en: phrase.trimmingCharacters(in: .whitespacesAndNewlines), vi: meaning.trimmingCharacters(in: .whitespacesAndNewlines),
                                                                     sentence: sentence.trimmingCharacters(in: .whitespacesAndNewlines), task: "")
                        var c = ctx
                        if !contextTitle.isEmpty { c?["title"] = .string(contextTitle) }
                        onSave(entry, c); dismiss()
                    }
                    .buttonStyle(PrimaryButtonStyle()).disabled(phrase.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(LKFrame.shared.gutter)
            }
            .background(LKColor.background.resolve(scheme).ignoresSafeArea())
            .navigationTitle(t(.dictSavePhrase)).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(t(.actionCancel)) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
    private func field(_ title: String, _ text: Binding<String>, english: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            TextField(title, text: text, axis: .vertical).lineLimit(1...4)
                .lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
                .textInputAutocapitalization(.never).autocorrectionDisabled()
                .padding(LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
                .environment(\.layoutDirection, english ? .leftToRight : layout)
        }
    }
    @Environment(\.layoutDirection) private var layout
}
