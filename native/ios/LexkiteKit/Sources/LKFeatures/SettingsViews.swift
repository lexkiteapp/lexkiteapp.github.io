import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

// P11 – Settings (web #/settings[/<sec>], docs/specs/me-settings-ux.md; Android SettingsScreen). Index + pages look · study · sound · data · help.
// Reminders = C06, account = the Me card. Synced values go to the shared `settings` document with the web keys; theme / language / haptics stay on this device.

enum SettingsSections {
    static let all = ["look", "study", "sound", "data", "help"]
    static func title(_ sec: String, _ t: L10n) -> String {
        t(sec == "look" ? .setLook : sec == "study" ? .setStudy : sec == "sound" ? .setSoundTitle : sec == "data" ? .setData : .setHelp)
    }
}

/// `theme` = the device value "auto" | "light" | "dark" (AppServices); `user` = signed-in name, nil = guest.
struct SettingsState: Equatable {
    var learn = LearnSettings()
    var lang = "en"
    var theme = "auto"
    var haptics = true
    var user: String?
    var wiped = false
}

struct SettingsActions {
    /// writes one web settings key (synced document)
    var set: (String, JSON) -> Void = { _, _ in }
    var setTheme: (String) -> Void = { _ in }
    var setHaptics: (Bool) -> Void = { _ in }
    var setLang: (String) -> Void = { _ in }
    var trySpeak: () -> Void = {}
    var wipe: () -> Void = {}
    var openURL: (URL) -> Void = { _ in }
    static let none = SettingsActions()
}

/// web App.legalUrl outside lexkite.com
func settingsLegalURL(_ lang: String, _ page: String) -> URL? { URL(string: "https://lexkite.com/\(lang)/\(page)") }

// MARK: - route

/// #/settings[/<sec>]: reads the synced settings from the store, writes one key per change (one sync write per slider release).
struct SettingsRoute: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    @Environment(\.openURL) private var openURL
    @Environment(\.l10n) private var t
    @State private var learn = LearnSettings()
    @State private var loaded = false
    @State private var wiped = false
    @State private var voice = LKVoicePlayer()
    private static let sample = "Many people believe that renewable energy is the key to a sustainable future. However, the transition will not happen overnight."

    var body: some View {
        let u = services.auth.user
        let name = [u?.displayName, u?.email].compactMap { $0 }.first { !$0.isEmpty }
        SettingsView(section: route.arg ?? "", state: SettingsState(learn: learn, lang: services.uiLang, theme: services.theme, haptics: services.haptics, user: name, wiped: wiped),
                     actions: actions, open: { services.router.open(AppRoute("settings", arg: $0)) })
            .opacity(loaded ? 1 : 0)
            .task { await reload() }
            .onDisappear { voice.stop() }
    }

    private var actions: SettingsActions {
        SettingsActions(
            set: { k, v in write(k, v) },
            setTheme: { services.setTheme($0) },
            setHaptics: { services.setHaptics($0) },
            setLang: { services.setLanguage($0) },
            trySpeak: { voice.speak(Self.sample, who: "ama", accent: learn.accent, slow: learn.ttsRate < 0.9) },   // the player has one slow switch (web: rate < 0.9 → slow)
            wipe: { Task { await wipe() } },
            openURL: { openURL($0) })
    }

    private func reload() async {
        if let repo = services.repo { learn = LearnSettings.from(try? await repo.snapshot().settings) }
        loaded = true
    }
    private func write(_ key: String, _ value: JSON) {
        guard let repo = services.repo else { return }
        let now = Date().timeIntervalSince1970 * 1000
        Task {
            if let r = try? await repo.mutate({ d in d = LearnSettings.put(d, key: key, value: value, now: now) }) { learn = LearnSettings.from(r.after.settings) }
            services.localChange()
        }
    }
    /// web settings.js sReset: cards, stats and game on THIS device; a signed-in learner gets the cloud copy back on the next pull (Android SettingsRoute.wipe)
    private func wipe() async {
        guard let repo = services.repo else { return }
        _ = try? await repo.mutate { d in d.cards = [:]; d.stats = SyncDoc.emptyStats; d.game = nil }
        var meta = await repo.loadMeta(); meta.pulledHashes = [:]; await repo.saveMeta(meta)
        await services.engine?.signedOut()
        wiped = true
        AccessibilityNotification.Announcement(t(.setWiped)).post()
        if services.auth.user != nil { await services.engine?.syncNow() }
        await services.today.refresh()
    }
}

// MARK: - screen

struct SettingsView: View {
    let section: String
    let state: SettingsState
    var actions: SettingsActions = .none
    var open: (String) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.dismiss) private var dismiss
    @State private var ask = false

    var body: some View {
        let sec = SettingsSections.all.contains(section) ? section : nil
        StudyPage(title: sec.map { SettingsSections.title($0, t) } ?? t(.setTitle)) {
            switch sec {
            case nil: index
            case "look"?: look
            case "study"?: study
            case "sound"?: sound
            case "data"?: data
            default: help
            }
        }
        .alert(t(.setWipe), isPresented: $ask) {
            Button(t(.actionCancel), role: .cancel) {}
            Button(t(.vocabDelete), role: .destructive) { actions.wipe() }
        } message: { Text(t(.setWipeConfirm)) }
        .accessibilityIdentifier("settings-\(sec ?? "index")")
    }

    private var themeLabel: String { t(state.theme == "light" ? .setLight : state.theme == "dark" ? .setDark : .revAuto) }
    private func n(_ v: Int) -> String { Fmt.int(v, t.lang) }
    private func rate(_ r: Double) -> String { String(format: "%.2f×", locale: Locale(identifier: t.lang), r) }

    // MARK: index
    @ViewBuilder private var index: some View {
        SettingsGroup { SettingsNavRow(icon: "icloud.fill", tone: .n1, label: t(.meAccount), value: state.user ?? t(.authSignIn)) { dismiss() } }
        SettingsGroup {
            SettingsNavRow(icon: "paintpalette.fill", tone: .n1, label: t(.setLook), value: (OnbLanguage.names[state.lang] ?? state.lang) + " · " + themeLabel) { open("look") }
            SettingsDivider()
            SettingsNavRow(icon: "target", tone: .n2, label: t(.setStudy), value: t(.setNewPerDay, ["n": n(state.learn.dailyNew)])) { open("study") }
            SettingsDivider()
            SettingsNavRow(icon: "speaker.wave.2.fill", tone: .n3, label: t(.setSound), value: (state.learn.accent == "en-US" ? "US" : "UK") + " · " + rate(state.learn.ttsRate)) { open("sound") }
        }
        SettingsGroup { SettingsNavRow(icon: "externaldrive.fill", tone: .n2, label: t(.setData), value: nil) { open("data") } }
        SettingsGroup { SettingsNavRow(icon: "info.circle.fill", tone: .n1, label: t(.setHelp), value: nil) { open("help") } }
    }

    // MARK: look
    @ViewBuilder private var look: some View {
        SettingsGroup {
            Menu {
                ForEach(L10nLangs.all, id: \.self) { code in
                    Button { actions.setLang(code) } label: {
                        if code == state.lang { Label(OnbLanguage.names[code] ?? code, systemImage: "checkmark") } else { Text(OnbLanguage.names[code] ?? code) }
                    }
                }
            } label: {
                SettingsRowLabel(icon: "globe", tone: .n1, label: t(.setUiLang), value: OnbLanguage.names[state.lang] ?? state.lang)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("set-lang")
        }
        LKCard {
            SettingsLabel(t(.setTheme))
            SettingsSegmented(options: [("auto", t(.revAuto)), ("light", t(.setLight)), ("dark", t(.setDark))], value: state.theme, onPick: actions.setTheme)
        }
    }

    // MARK: study
    @ViewBuilder private var study: some View {
        let l = state.learn
        LKCard {
            SettingsSlider(label: t(.setDailyNew), range: LearnSettings.dailyNewRange, value: Double(l.dailyNew), fmt: { n(Int($0)) }) { actions.set("dailyNew", .number($0)) }
            SettingsSlider(label: t(.setDailyGoal), range: LearnSettings.dailyGoalRange, value: Double(l.dailyGoal), fmt: { n(Int($0)) }) { actions.set("dailyGoal", .number($0)) }
            SettingsSlider(label: t(.setSessionCap), range: LearnSettings.sessionCapRange, value: Double(l.sessionCap), fmt: { $0 <= 0 ? t(.setNoLimit) : n(Int($0)) }) { actions.set("sessionCap", .number($0)) }
            SettingsSlider(label: t(.setRetention), range: LearnSettings.retentionRange, value: l.retention, fmt: { n(Int(($0 * 100).rounded())) + "%" }) { actions.set("retention", .number($0)) }
            Text(t(.setRetentionTip)).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: sound
    @ViewBuilder private var sound: some View {
        let l = state.learn
        LKCard {
            SettingsLabel(t(.setAccent))
            ForEach([("en-GB", t(.setAccentUk)), ("en-US", t(.setAccentUs))], id: \.0) { v, label in
                SettingsRadio(label: label, on: l.accent == v) { actions.set("accent", .string(v)) }.accessibilityIdentifier("set-accent-\(v)")
            }
            SettingsSlider(label: t(.setRate), range: LearnSettings.ttsRateRange, value: l.ttsRate, fmt: rate) { actions.set("ttsRate", .number($0)) }
            Button(t(.setTry)) { actions.trySpeak() }.buttonStyle(PrimaryButtonStyle())
        }
        LKCard {
            SettingsToggle(label: t(.setAutoSpeak), on: l.autoSpeak) { actions.set("autoSpeak", .bool($0)) }
            SettingsToggle(label: t(.setSfx), on: l.sfx) { actions.set("sfx", .bool($0)) }
            SettingsToggle(label: t(.setHaptics), on: state.haptics, onChange: actions.setHaptics)
        }
    }

    // MARK: data
    @Environment(\.colorScheme) private var scheme
    @ViewBuilder private var data: some View {
        LKCard {
            HStack(spacing: LKSpacing.spaceSm) {
                Text(t(.setWipe)).lkText(LKType.bodyMd).foregroundStyle(LKColor.error.resolve(scheme)).frame(maxWidth: .infinity, alignment: .leading)
                Button { ask = true } label: {
                    Text(t(.vocabDelete)).lkText(LKType.titlePill).foregroundStyle(LKColor.onErrorContainer.resolve(scheme))
                        .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
                        .background(Capsule().fill(LKColor.errorContainer.resolve(scheme)))
                }
                .accessibilityIdentifier("set-wipe")
            }
            if state.wiped { Text(t(.setWiped)).lkText(LKType.bodySm).foregroundStyle(LKColor.secondary.resolve(scheme)) }
        }
    }

    // MARK: help
    @ViewBuilder private var help: some View {
        SettingsGroup {
            SettingsNavRow(icon: "hand.raised.fill", tone: .n1, label: t(.setPrivacy), value: nil) { if let u = settingsLegalURL(state.lang, "privacy") { actions.openURL(u) } }
            SettingsDivider()
            SettingsNavRow(icon: "doc.text.fill", tone: .n2, label: t(.setTerms), value: nil) { if let u = settingsLegalURL(state.lang, "terms") { actions.openURL(u) } }
        }
    }
}

// MARK: - building blocks

/// Icon chip tones of the Stitch rows (n1 amber · n2 teal · n3 coral).
enum SettingsTone {
    case n1, n2, n3
    func colors(_ s: ColorScheme) -> (bg: Color, ink: Color) {
        switch self {
        case .n1: (LKColor.tertiaryContainer.resolve(s), LKColor.onTertiaryContainer.resolve(s))
        case .n2: (LKColor.secondaryFixed.resolve(s), LKColor.onSecondaryContainer.resolve(s))
        case .n3: (LKColor.errorContainer.resolve(s), LKColor.onErrorContainer.resolve(s))
        }
    }
}

/// A grouped white card whose rows are separated by 1 pt dividers.
struct SettingsGroup<Content: View>: View {
    let content: Content
    @Environment(\.colorScheme) private var scheme
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    var body: some View {
        VStack(spacing: 0) { content }
            .frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
            .clipShape(RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous))
    }
}

struct SettingsDivider: View {
    @Environment(\.colorScheme) private var scheme
    var body: some View { Rectangle().fill(LKColor.outlineVariant.resolve(scheme)).frame(height: 1).padding(.horizontal, LKSpacing.spaceSm) }
}

/// Stitch row: 32 pt rounded icon chip · label (+ value) · chevron, ≥ 56 pt.
struct SettingsRowLabel: View {
    let icon: String, tone: SettingsTone, label: String
    var value: String?
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let c = tone.colors(scheme)
        HStack(spacing: LKSpacing.spaceSm) {
            Image(systemName: icon).font(.system(size: 15, weight: .bold)).foregroundStyle(c.ink)
                .frame(width: 32, height: 32).background(RoundedRectangle(cornerRadius: LKRadius.xl, style: .continuous).fill(c.bg)).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme))
                if let value, !value.isEmpty { Text(value).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.forward").font(.system(size: 14, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
        }
        .padding(14)
        .frame(minHeight: 56)
        .contentShape(Rectangle())
    }
}

struct SettingsNavRow: View {
    let icon: String, tone: SettingsTone, label: String
    var value: String?
    let action: () -> Void
    var body: some View {
        Button(action: action) { SettingsRowLabel(icon: icon, tone: tone, label: label, value: value) }
            .buttonStyle(.plain)
            .accessibilityElement(children: .combine)
    }
}

private struct SettingsLabel: View {
    let text: String
    @Environment(\.colorScheme) private var scheme
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).lkText(LKType.titlePill).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader) }
}

/// Range slider: shows the live value while dragging, writes once on release (one sync write, not one per frame).
private struct SettingsSlider: View {
    let label: String, range: SettingRange, fmt: (Double) -> String, onCommit: (Double) -> Void
    let value: Double
    @State private var v: Double
    @Environment(\.colorScheme) private var scheme
    init(label: String, range: SettingRange, value: Double, fmt: @escaping (Double) -> String, onCommit: @escaping (Double) -> Void) {
        self.label = label; self.range = range; self.value = value; self.fmt = fmt; self.onCommit = onCommit
        _v = State(initialValue: range.snap(value))
    }
    var body: some View {
        let shown = fmt(range.snap(v))
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: LKSpacing.spaceXs) {
                Text(label).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).frame(maxWidth: .infinity, alignment: .leading)
                Text(shown).lkText(LKType.titlePill).foregroundStyle(LKColor.secondary.resolve(scheme))
            }
            .accessibilityHidden(true)
            Slider(value: $v, in: range.min...range.max, step: range.step) { editing in if !editing { onCommit(range.snap(v)) } }
                .tint(LKColor.secondary.resolve(scheme))
                .frame(minHeight: LKFrame.shared.minTap)
                .accessibilityLabel(label).accessibilityValue(shown)
        }
        .onChange(of: value) { _, new in v = range.snap(new) }
    }
}

private struct SettingsToggle: View {
    let label: String, on: Bool, onChange: (Bool) -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Toggle(isOn: Binding(get: { on }, set: onChange)) { Text(label).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)) }
            .tint(LKColor.secondary.resolve(scheme))
            .frame(minHeight: 48)
    }
}

private struct SettingsRadio: View {
    let label: String, on: Bool, action: () -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: action) {
            HStack(spacing: LKSpacing.spaceSm) {
                Image(systemName: on ? "largecircle.fill.circle" : "circle").font(.system(size: 20))
                    .foregroundStyle(on ? LKColor.secondary.resolve(scheme) : LKColor.outline.resolve(scheme)).accessibilityHidden(true)
                Text(label).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : [.isButton])
    }
}

/// Pill-shaped single choice (theme: auto · light · dark).
private struct SettingsSegmented: View {
    let options: [(String, String)], value: String, onPick: (String) -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.0) { k, label in
                let on = k == value
                Button { onPick(k) } label: {
                    Text(label).lkText(LKType.titlePill).foregroundStyle(on ? LKColor.onSecondary.resolve(scheme) : LKColor.onSurface.resolve(scheme))
                        .padding(.horizontal, LKSpacing.spaceXs).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                        .background(Capsule().fill(on ? LKColor.secondary.resolve(scheme) : Color.clear)).contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? [.isButton, .isSelected] : [.isButton])
                .accessibilityIdentifier("set-theme-\(k)")
            }
        }
        .padding(4)
        .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
    }
}
