import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// M4 P12 – #/watch hub (web/js/watch.js `hub`): find box (link → player at once), level chips, filters, results, continue, for you, all topics, legal line.
struct WatchHubView: View {
    let model: WatchHubModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @State private var query = ""
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.openURL) private var openURL

    var body: some View {
        StudyPage(title: t(.watchTitle)) {
            Text(t(.watchPitch)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            find
            filters
            if let run = model.run { results(run) }
            if !model.history.isEmpty {
                section(t(.watchContinue)) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                            ForEach(model.history) { h in
                                WatchCard(id: h.id, title: h.title, ch: h.ch, sec: h.len, cc: false, progress: h.progress) {
                                    model.pick(id: h.id, title: h.title, ch: h.ch, topic: h.topic); onRoute(model.route(h.id))
                                }.frame(width: 200)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
            section(t(.watchForYou)) { topicGrid(model.suggested) }
            section(t(.watchAllTopics)) { topicGrid(model.topics.topics) }
            legal
        }
        .task { await model.load() }
        .accessibilityIdentifier("inner-watch")
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            Text(verbatim: title).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
            content()
        }
    }

    // MARK: find + filters
    private var find: some View {
        HStack(spacing: LKSpacing.spaceSm) {
            TextField(t(.watchFind), text: $query)
                .lkTextSafe(LKType.bodyMd).englishText().textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.webSearch).submitLabel(.search)
                .onSubmit(go).onChange(of: query) { _, v in if Watch.ytParse(v) != nil { go() } }   // pasting a link opens it at once
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 48)
                .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
                .accessibilityLabel(t(.watchFind))
            SkillAction(title: t(.watchSearch), icon: "magnifyingglass", primary: true, action: go).fixedSize()
        }
    }
    private func go() { if let r = model.submit(query) { query = ""; onRoute(r) } }

    private var filters: some View {
        let f = model.filters, lv = model.topics.levels
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: LKSpacing.spaceXs) {
                    ForEach(0...lv.count, id: \.self) { n in
                        let on = f.lv == n
                        Button { var x = f; x.lv = n; model.setFilters(x) } label: {
                            Text(verbatim: n == 0 ? t(.watchLvAuto, ["l": lv.indices.contains(model.autoLevel - 1) ? lv[model.autoLevel - 1] : ""]) : lv[n - 1])
                                .studyText(LKType.titlePill, on ? LKColor.onSurface : LKColor.onSurfaceVariant)
                                .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 44)
                                .tactile(fill: on ? LKColor.surfaceContainerHigh : LKColor.surfaceContainerHighest, line: on ? LKColor.secondary : LKColor.outlineVariant,
                                         ledge: on ? LKColor.secondary : LKColor.outlineVariant, radius: 14)
                        }
                        .buttonStyle(LKPressStyle())
                        .accessibilityAddTraits(on ? .isSelected : [])
                        .accessibilityLabel(n == 0 ? t(.watchLvAuto, ["l": lv.indices.contains(model.autoLevel - 1) ? lv[model.autoLevel - 1] : ""]) : lv[n - 1])
                        .accessibilityHint(t(.onbLevelWord))
                    }
                }
                .padding(.vertical, 6).padding(.horizontal, 2)
            }
            FlowLayout(spacing: LKSpacing.spaceXs) {
                menu("dur", f.dur) { var x = f; x.dur = $0; model.setFilters(x) }
                menu("acc", f.acc) { var x = f; x.acc = $0; model.setFilters(x) }
                menu("pace", f.pace) { var x = f; x.pace = $0; model.setFilters(x) }
                Toggle(isOn: Binding(get: { f.cc }, set: { var x = f; x.cc = $0; model.setFilters(x) })) { Text(t(.watchCc)).studyText(LKType.bodyMd) }
                    .toggleStyle(.switch).frame(minHeight: 44).fixedSize()
            }
        }
        .accessibilityElement(children: .contain).accessibilityLabel(t(.watchFilters))
    }
    private func menu(_ key: String, _ value: String, _ set: @escaping (String) -> Void) -> some View {
        let opts = model.topics.options(key), cur = opts.first { $0.value == value } ?? opts.first
        return Menu {
            ForEach(Array(opts.enumerated()), id: \.offset) { _, o in Button { set(o.value) } label: { if o.value == value { Label(t.lv(o.label), systemImage: "checkmark") } else { Text(verbatim: t.lv(o.label)) } } }
        } label: {
            HStack(spacing: 4) {
                Text(verbatim: cur.map { t.lv($0.label) } ?? "").studyText(LKType.titlePill)
                Image(systemName: "chevron.down").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
            }
            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 44)
            .tactile(fill: LKColor.surfaceContainerHighest, line: LKColor.outlineVariant, radius: 14)
        }
        .accessibilityLabel(t(.watchFilters)).accessibilityValue(cur.map { t.lv($0.label) } ?? "")
    }

    // MARK: results
    private let cols = [GridItem(.adaptive(minimum: 150), spacing: LKSpacing.spaceSm, alignment: .top)]
    private func results(_ run: WatchHubModel.Run) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(verbatim: t.lv(run.label)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                    Spacer(minLength: 0)
                    Button { model.close() } label: { Image(systemName: "xmark").font(.system(size: 16, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                        .buttonStyle(.plain).accessibilityLabel(t(.actionClose))
                }
                if let tp = run.topic.flatMap({ model.topics.topic($0) }) {
                    FlowLayout(spacing: 8) {
                        ForEach(tp.q, id: \.self) { q in
                            Button { model.start(q: q, label: run.label, topic: tp.id) } label: {
                                Text(verbatim: q).studyText(LKType.bodySm).englishText().padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
                                    .tactile(fill: LKColor.surfaceContainer, line: LKColor.outlineVariant, radius: 14)
                            }
                            .buttonStyle(LKPressStyle())
                        }
                    }
                }
                if run.loading {
                    LazyVGrid(columns: cols, spacing: LKSpacing.spaceSm) {
                        ForEach(0..<4, id: \.self) { _ in RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)).aspectRatio(16 / 11, contentMode: .fit) }
                    }
                    .accessibilityHidden(true)
                } else if run.items.isEmpty {
                    Text(run.offline ? t(.watchOffline) : t(.watchNoVideos)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                } else {
                    LazyVGrid(columns: cols, spacing: LKSpacing.spaceSm) {
                        ForEach(run.items) { it in
                            WatchCard(id: it.id, title: it.title, ch: it.ch, sec: it.sec, cc: it.cc, progress: 0) {
                                model.pick(id: it.id, title: it.title, ch: it.ch, topic: nil); onRoute(model.route(it.id))
                            }
                        }
                    }
                }
                if !run.loading {
                    Text(t(.watchMore)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    SkillAction(title: t(.watchOpenYt), icon: "magnifyingglass") { openURL(run.yt) }
                }
            }
        }
    }

    // MARK: topics + legal
    private func topicGrid(_ list: [WatchTopic]) -> some View {
        LazyVGrid(columns: cols, spacing: LKSpacing.spaceSm) {
            ForEach(list) { tp in
                Button { model.openTopic(tp.id) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Image(systemName: WatchIcons.symbol(tp.ic)).font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                        Text(verbatim: t.lv(tp.name)).studyText(LKType.titlePill).multilineTextAlignment(.leading)
                        Text(verbatim: t.lv(tp.desc)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading)
                        Text(verbatim: Bidi.ltr(levelRange(tp))).studyText(LKType.bodySm, LKColor.tertiary)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .topLeading).padding(LKSpacing.spaceSm)
                    .tactile(fill: LKColor.surfaceContainerHighest, line: LKColor.outlineVariant, radius: 16)
                }
                .buttonStyle(LKPressStyle())
            }
        }
    }
    private func levelRange(_ tp: WatchTopic) -> String {
        let lv = model.topics.levels
        guard tp.lv.count == 2, lv.indices.contains(tp.lv[0] - 1), lv.indices.contains(tp.lv[1] - 1) else { return "" }
        return "\(lv[tp.lv[0] - 1])–\(lv[tp.lv[1] - 1])"
    }
    private var legal: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(t(.watchLegal)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            HStack(spacing: LKSpacing.spaceMd) {
                Link("YouTube ToS", destination: URL(string: "https://www.youtube.com/t/terms")!).frame(minHeight: 44)
                Link("Google Privacy", destination: URL(string: "https://policies.google.com/privacy")!).frame(minHeight: 44)
            }
            .lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.secondary.resolve(scheme)).englishText()
        }
    }
}

/// lucide icon name of watch-topics.json → SF Symbol
enum WatchIcons {
    static func symbol(_ ic: String) -> String {
        ["message-circle": "bubble.left.fill", "sprout": "leaf.fill", "luggage": "suitcase.fill", "briefcase": "briefcase.fill", "chart-column": "chart.bar.fill", "target": "target", "goal": "flag.fill",
         "graduation-cap": "graduationcap.fill", "school": "building.columns.fill", "megaphone": "megaphone.fill", "book-open": "book.fill", "newspaper": "newspaper.fill", "flask-conical": "flask.fill",
         "zap": "bolt.fill", "dna": "allergens", "cloud": "cloud.fill", "landmark": "building.columns", "monitor": "play.tv.fill", "audio-lines": "waveform", "puzzle": "puzzlepiece.fill",
         "layers": "square.stack.3d.up.fill", "smile": "face.smiling.fill"][ic] ?? "play.rectangle.fill"
    }
}

/// A video card: 16:9 thumbnail (i.ytimg.com), duration badge, watched progress, title, channel, CC.
struct WatchCard: View {
    let id: String, title: String, ch: String, sec: Int, cc: Bool, progress: Double
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                ZStack(alignment: .bottomTrailing) {
                    RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme))
                    Image(systemName: "play.rectangle.fill").font(.system(size: 28)).foregroundStyle(LKColor.outlineVariant.resolve(scheme)).accessibilityHidden(true)
                    if live, let url = Watch.thumb(id) { AsyncImage(url: url) { phase in if let img = phase.image { img.resizable().scaledToFill() } } }   // fixtures: no network
                    if sec > 0 {
                        Text(verbatim: Bidi.ltr(Watch.fmt(Double(sec)))).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.inverseOnSurface.resolve(scheme))
                            .padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(LKColor.inverseSurface.resolve(scheme))).padding(6)
                    }
                    if progress > 0 {
                        GeometryReader { g in
                            VStack { Spacer(); HStack { Rectangle().fill(LKColor.secondary.resolve(scheme)).frame(width: g.size.width * progress, height: 4); Spacer(minLength: 0) } }
                        }
                        .environment(\.layoutDirection, .leftToRight)
                    }
                }
                .aspectRatio(16 / 9, contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                Text(verbatim: title.isEmpty ? t(.watchVideo) : title).studyText(LKType.titlePill).englishText().lineLimit(2).multilineTextAlignment(.leading)
                HStack(spacing: 4) {
                    Text(verbatim: ch).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().lineLimit(1)
                    if cc { Text(verbatim: "CC").studyText(LKType.bodySm, LKColor.tertiary).accessibilityHidden(true) }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading).frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([title.isEmpty ? t(.watchVideo) : title, ch, sec > 0 ? Watch.fmt(Double(sec)) : "", cc ? "CC" : ""].filter { !$0.isEmpty }.joined(separator: ", "))
        .accessibilityAddTraits(.isButton)
    }
}
