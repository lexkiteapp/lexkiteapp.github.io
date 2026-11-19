// Widget "Từ mỗi giờ" (Word of the hour) – 1 từ trên màn hình khóa & màn hình chính, đổi theo nhịp người học chọn
// (30 phút / 1 / 2 / 3 giờ, trong khung giờ hoạt động). Đọc WordFeed trong App Group, KHÔNG gọi mạng, KHÔNG thông báo.
// Chạm → lexkite://word/<id> → app mở thẻ từ (#/dict/<từ>). Tắt "Hiện nghĩa" = chế độ đố: chỉ hiện từ, nghĩa xem trong app.
import WidgetKit
import SwiftUI

struct WordEntry: TimelineEntry {
    let date: Date
    let feed: WordFeed
    let item: WordItem?
    init(date: Date, feed: WordFeed) { self.date = date; self.feed = feed; self.item = feed.item(at: date) }
}

struct WordProvider: TimelineProvider {
    private func feed() -> WordFeed? { WordFeed.load(LexShared.defaults) }
    func placeholder(in context: Context) -> WordEntry { WordEntry(date: Date(), feed: .sample) }
    func getSnapshot(in context: Context, completion: @escaping (WordEntry) -> Void) {
        completion(WordEntry(date: Date(), feed: context.isPreview ? .sample : (feed() ?? .sample)))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WordEntry>) -> Void) {
        let f = feed() ?? WordFeed()
        let now = Date()
        var entries = [WordEntry(date: now, feed: f)]
        entries += f.changes(after: now, limit: 47).map { WordEntry(date: $0, feed: f) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct WordEntryView: View {
    let entry: WordEntry
    @Environment(\.widgetFamily) var widgetFamily

    var family: WordFamily {
        switch widgetFamily {
        case .systemMedium, .systemLarge, .systemExtraLarge: return .medium
        default:
            if #available(iOSApplicationExtension 16.0, *) {
                if widgetFamily == .accessoryRectangular { return .rectangular }
                if widgetFamily == .accessoryInline { return .inline }
                if widgetFamily == .accessoryCircular { return .circular }
            }
            return .small
        }
    }

    var body: some View {
        WordWidgetView(feed: entry.feed, item: entry.item, family: family)
            .lexContainerBackground(accessory: family == .rectangular || family == .inline || family == .circular)
            .widgetURL(lexWordURL(entry.item))
    }
}

struct LexkiteWordWidget: Widget {
    var families: [WidgetFamily] {
        if #available(iOSApplicationExtension 16.0, *) {
            return [.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline, .accessoryCircular]
        }
        return [.systemSmall, .systemMedium]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WordShared.kind, provider: WordProvider()) { WordEntryView(entry: $0) }
            .configurationDisplayName(Text("word.name"))
            .description(Text("word.desc"))
            .supportedFamilies(families)
    }
}
