// Widget WidgetKit của Lexkite: 1 từ đến hạn ôn + số thẻ hôm nay + chuỗi ngày 🔥. Đọc snapshot trong App Group, KHÔNG gọi mạng.
// Timeline đổi từ mỗi giờ (12 mốc), hết mốc thì hệ thống tự xin timeline mới. App gọi reloadAllTimelines khi dữ liệu đổi.
import WidgetKit
import SwiftUI

struct LexEntry: TimelineEntry {
    let date: Date
    let snap: LexSnapshot
    let word: LexWord?
    let count: Int

    init(date: Date, snap: LexSnapshot) {
        let st = snap.state(at: date)
        self.date = date; self.snap = snap; self.count = st.count
        self.word = LexSnapshot.pick(st.words, slot: LexProvider.slot(date))
    }
}

struct LexProvider: TimelineProvider {
    func placeholder(in context: Context) -> LexEntry { LexEntry(date: Date(), snap: .sample) }

    func getSnapshot(in context: Context, completion: @escaping (LexEntry) -> Void) {
        let s = LexSnapshot.load() ?? .sample
        completion(LexEntry(date: Date(), snap: s))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LexEntry>) -> Void) {
        let s = LexSnapshot.load() ?? LexSnapshot()
        let now = Date(), cal = Calendar.current
        let hour = cal.dateInterval(of: .hour, for: now)?.start ?? now
        var entries = [LexEntry(date: now, snap: s)]
        for i in 1..<12 {
            guard let d = cal.date(byAdding: .hour, value: i, to: hour) else { continue }
            entries.append(LexEntry(date: d, snap: s))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }

    static func slot(_ d: Date) -> Int { Int(d.timeIntervalSince1970 / 3600) }
}

struct LexEntryView: View {
    let entry: LexEntry
    @Environment(\.widgetFamily) var widgetFamily

    var family: LexFamily {
        switch widgetFamily {
        case .systemMedium, .systemLarge, .systemExtraLarge: return .medium
        default:
            if #available(iOSApplicationExtension 16.0, *) {
                if widgetFamily == .accessoryRectangular { return .rectangular }
                if widgetFamily == .accessoryInline { return .inline }
            }
            return .small
        }
    }

    var body: some View {
        LexWidgetView(snap: entry.snap, word: entry.word, count: entry.count, family: family)
            .lexContainerBackground(accessory: family == .rectangular || family == .inline)
            .widgetURL(lexReviewURL(entry.word))
    }
}

extension View {
    @ViewBuilder func lexContainerBackground(accessory: Bool) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            if accessory { containerBackground(for: .widget) { Color.clear } }
            else { containerBackground(for: .widget) { LexBackground() } }
        } else if accessory {
            self
        } else {
            padding().background(LexBackground())
        }
    }
}

struct LexkiteReviewWidget: Widget {
    var families: [WidgetFamily] {
        if #available(iOSApplicationExtension 16.0, *) { return [.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline] }
        return [.systemSmall, .systemMedium]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: LexShared.widgetKind, provider: LexProvider()) { LexEntryView(entry: $0) }
            .configurationDisplayName("Lexkite")
            .description(Text("widget.desc"))
            .supportedFamilies(families)
    }
}

@main
struct LexkiteWidgetBundle: WidgetBundle {
    var body: some Widget {
        LexkiteReviewWidget()
        LexkiteWordWidget() // "Từ mỗi giờ" – WordWidget.swift
    }
}
