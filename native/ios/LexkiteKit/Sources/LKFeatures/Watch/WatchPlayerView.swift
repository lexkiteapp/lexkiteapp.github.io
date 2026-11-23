import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
#if canImport(WebKit) && os(iOS)
import WebKit
#endif

/// M4 P12 – #/watch/<id> (web `player`): the official YouTube player in a web view (nothing over it), the practice toolbar, title, word lookup, time notes, add-on card.
/// `web` is the injection point of fixtures: a fixed placeholder instead of the live web view.
struct WatchPlayerView: View {
    let model: WatchPlayerModel
    var onRoute: (AppRoute) -> Void = { _ in }
    var web: ((WatchPlayerModel) -> AnyView)?
    @State private var word = "", sentence = "", note = ""
    @Environment(\.colorScheme) private var scheme
    @Environment(\.scenePhase) private var phase
    @Environment(\.l10n) private var t
    @Environment(\.openURL) private var openURL
    @Environment(AppServices.self) private var services

    var body: some View {
        StudyPage(title: t(.watchTitle)) {
            stage
            if model.failed { cantPlay }
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: model.title.isEmpty ? t(.watchVideo) : model.title).studyText(LKType.headlineMd).englishText().fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                if !model.ch.isEmpty { Text(verbatim: model.ch).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
            }
            lookupCard
            notesCard
            addonCard
        }
        .onDisappear { model.leave() }
        .onChange(of: phase) { _, p in if p != .active { model.pause() } }
        .accessibilityIdentifier("inner-watch-player")
    }

    // MARK: player + toolbar
    @ViewBuilder private var stage: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            ZStack {
                Color.clear
                if let web { web(model) } else { liveWeb }
            }
            .aspectRatio(16 / 9, contentMode: .fit).frame(minHeight: 200)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .environment(\.layoutDirection, .leftToRight)
            if model.ready && !model.failed { toolbar }
        }
    }
    @ViewBuilder private var liveWeb: some View {
        #if canImport(WebKit) && os(iOS)
        WatchWebView(model: model, id: model.id, start: model.start, lang: services.uiLang)
        #else
        Color.black
        #endif
    }
    private var toolbar: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            FlowLayout(spacing: LKSpacing.spaceXs) {
                chip(t(.watchBack5), icon: "gobackward.5") { model.back5() }
                chip(t(.watchPlay), icon: model.playing ? "pause.fill" : "play.fill", on: true) { model.togglePlay() }
                Menu {
                    ForEach(Watch.rates, id: \.self) { r in Button { model.setRate(r) } label: { if r == model.rate { Label(rateText(r), systemImage: "checkmark") } else { Text(verbatim: rateText(r)) } } }
                } label: { chipLabel(rateText(model.rate), icon: "speedometer", on: false) }
                    .accessibilityLabel(t(.skillListenTocDo)).accessibilityValue(rateText(model.rate))
                chip("A", label: "A") { model.markA() }
                chip("B", label: "B") { model.markB() }
                chip(model.loop.label ?? t(.watchAb), icon: "repeat", on: model.loop.on, label: t(.watchAb), value: model.loop.label ?? "") { model.toggleLoop() }
                    .accessibilityAddTraits(model.loop.on ? .isSelected : [])
            }
            if model.hint { SkillNote(icon: "info.circle.fill", text: t(.watchAbHint)) }
        }
        .accessibilityElement(children: .contain).accessibilityLabel(t(.watchControls))
    }
    private func rateText(_ r: Double) -> String { Bidi.ltr(JSON.jsNumberString(r) + "×") }
    private func chip(_ text: String, icon: String? = nil, on: Bool = false, label: String? = nil, value: String = "", _ action: @escaping () -> Void) -> some View {
        Button(action: action) { chipLabel(text, icon: icon, on: on) }
            .buttonStyle(LKPressStyle()).accessibilityLabel(label ?? text).accessibilityValue(value)
    }
    private func chipLabel(_ text: String, icon: String?, on: Bool) -> some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.system(size: 15, weight: .bold)).accessibilityHidden(true) }
            Text(verbatim: text).studyText(LKType.titlePill, on ? LKColor.onSecondary : LKColor.onSurface).fixedSize()
        }
        .foregroundStyle((on ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
        .padding(.horizontal, LKSpacing.spaceMd).frame(minWidth: 44, minHeight: 44)
        .tactile(fill: on ? LKColor.secondary : LKColor.surfaceContainerHighest, line: on ? LKColor.secondary : LKColor.outlineVariant, ledge: on ? LKColor.secondaryContainer : LKColor.outlineVariant, radius: 14)
    }
    private var cantPlay: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                SkillNote(icon: "exclamationmark.triangle.fill", text: t(.watchCantPlay), tint: LKColor.error)
                SkillAction(title: t(.watchOpenYt), icon: "arrow.up.right.square", primary: true) { openURL(Watch.ytURL(model.id, at: model.pos)) }
            }
        }
    }

    // MARK: word
    private var lookupCard: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(t(.watchLookupTitle)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                field(t(.watchWordPh), $word, submit: lookup)
                field(t(.watchSentence), $sentence, submit: lookup)
                SkillAction(title: t(.watchLookup), icon: "magnifyingglass", primary: true, enabled: !word.trimmingCharacters(in: .whitespaces).isEmpty, action: lookup)
                if let m = model.lookup { LookupResult(model: m, onDetails: { onRoute(AppRoute("dict", arg: $0)) }) }
            }
        }
        .onChange(of: model.lookup?.saved) { _, s in if s == true { word = ""; sentence = "" } }
    }
    private func lookup() { model.lookupWord(word, sentence: sentence) }
    private func field(_ placeholder: String, _ text: Binding<String>, submit: @escaping () -> Void) -> some View {
        TextField(placeholder, text: text)
            .lkTextSafe(LKType.bodyMd).englishText().textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.done).onSubmit(submit)
            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 48)
            .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
            .accessibilityLabel(placeholder)
    }

    // MARK: notes
    private var notesCard: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(t(.watchNotesTitle)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                HStack(spacing: LKSpacing.spaceSm) {
                    field(t(.watchNotePh), $note, submit: addNote)
                    SkillAction(title: t(.vocabAdd), enabled: !note.trimmingCharacters(in: .whitespaces).isEmpty, action: addNote).fixedSize()
                }
                if model.notes.isEmpty {
                    Text(t(.watchNoNotes)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                } else {
                    ForEach(Array(model.notes.enumerated()), id: \.offset) { i, n in
                        HStack(spacing: LKSpacing.spaceXs) {
                            Button { model.seek(Double(n.t)) } label: {
                                Text(verbatim: Bidi.ltr(Watch.fmt(Double(n.t)))).studyText(LKType.titlePill).padding(.horizontal, LKSpacing.spaceSm).frame(minWidth: 44, minHeight: 44)
                                    .tactile(fill: LKColor.surfaceContainer, line: LKColor.outlineVariant, radius: 14)
                            }
                            .buttonStyle(LKPressStyle()).accessibilityLabel(Watch.fmt(Double(n.t)))
                            Text(verbatim: n.text).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                            Button { model.deleteNote(i) } label: { Image(systemName: "xmark").font(.system(size: 14, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                                .buttonStyle(.plain).accessibilityLabel(t(.watchDelNote))
                        }
                    }
                }
            }
        }
    }
    private func addNote() { model.addNote(note); note = "" }

    private var addonCard: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                SkillNote(icon: "sparkles", text: t(.watchExt))
                SkillAction(title: t(.watchOpenYt), icon: "arrow.up.right.square") { openURL(Watch.ytURL(model.id, at: model.pos)) }
            }
        }
    }
}

/// The word found: word · IPA · listen · meaning, "+ Lưu flashcard / Thêm ngữ cảnh" (→ "✓ Đã lưu") and the full-meaning route.
private struct LookupResult: View {
    let model: WordPopupModel
    let onDetails: (String) -> Void
    @Environment(\.l10n) private var t
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            switch model.stage {
            case .loading: Text(t(.lessonStoryLookup, ["w": model.word])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            case .notFound: Text(t(.lessonStoryNotFound, ["w": model.word])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            case .found(let f):
                HStack(spacing: LKSpacing.spaceXs) {
                    Text(verbatim: f.word).studyText(LKType.headlineSm).englishText()
                    if !f.ipa.isEmpty { Text(verbatim: f.ipa).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText() }
                    StudySpeak(label: t(.lessonKindListen)) { model.speak() }
                }
                if !f.mean.isEmpty { Text(verbatim: f.mean).studyText(LKType.bodyMd, LKColor.secondary) }
                HStack(spacing: LKSpacing.spaceSm) {
                    if model.saved { SkillNote(icon: "checkmark.circle.fill", text: t(.revSaved), tint: LKColor.success) }
                    else { SkillAction(title: "+ " + t(WordPopup.saveLabel(f)), primary: true, enabled: !model.saving) { Task { await model.save() } } }
                    SkillAction(title: t(.watchFullMeaning)) { onDetails(f.word) }
                }
            }
        }
        .accessibilityElement(children: .contain)
    }
}

#if canImport(WebKit) && os(iOS)
/// The official IFrame player page (LKStore Resources/watch-player.html) in a WKWebView: inline playback, no overlay, torn down on disappear.
struct WatchWebView: UIViewRepresentable {
    let model: WatchPlayerModel
    let id: String, start: Int, lang: String

    @MainActor final class Coord: NSObject, WKScriptMessageHandler {
        weak var model: WatchPlayerModel?
        init(_ m: WatchPlayerModel) { model = m }
        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            if let s = message.body as? String { model?.handle(s) }
        }
    }
    func makeCoordinator() -> Coord { Coord(model) }
    func makeUIView(context: Context) -> WKWebView {
        let c = WKWebViewConfiguration()
        c.allowsInlineMediaPlayback = true
        c.mediaTypesRequiringUserActionForPlayback = []
        c.userContentController.add(context.coordinator, name: "lk")
        let w = WKWebView(frame: .zero, configuration: c)
        w.isOpaque = false; w.backgroundColor = .black; w.scrollView.isScrollEnabled = false; w.scrollView.backgroundColor = .black
        model.evaluate = { [weak w] js in w?.evaluateJavaScript(js, completionHandler: nil) }
        w.loadHTMLString(Watch.playerHTML, baseURL: Watch.playerBase(id: id, start: start, lang: lang))
        return w
    }
    func updateUIView(_ w: WKWebView, context: Context) {}
    static func dismantleUIView(_ w: WKWebView, coordinator: Coord) {
        coordinator.model?.evaluate = { _ in }
        w.configuration.userContentController.removeScriptMessageHandler(forName: "lk")
        w.stopLoading(); w.loadHTMLString("", baseURL: nil)
    }
}
#endif
