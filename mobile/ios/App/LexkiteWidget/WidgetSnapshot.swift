// Dữ liệu widget Lexkite: snapshot JSON nhỏ do app ghi (web/js/native.js → WidgetBridge) vào App Group.
// Dùng chung cho app (ghi), widget (đọc) và công cụ render ảnh xem trước trên macOS (scripts/ios-widget-render.swift).
import Foundation

enum LexShared {
    static let appGroup = "group.com.lexkite.app"
    static let key = "lexkite.widget"
    static let widgetKind = "LexkiteReviewWidget"
    static var defaults: UserDefaults { UserDefaults(suiteName: appGroup) ?? .standard }
}

struct LexWord: Codable, Hashable {
    var w: String
    var ipa: String?
    var m: String?
    var lv: String?
    var due: Double?
}

struct LexLabels: Codable, Hashable {
    var title: String?
    var streak: String?
    var review: String?
    var done: String?
    var none: String?
    var n: String?
}

struct LexSnapshot: Codable, Hashable {
    var v: Int?
    var at: Double?
    var due: Int?
    var streak: Int?
    var lang: String?
    var rtl: Bool?
    var words: [LexWord]?
    var l: LexLabels?

    var dueCount: Int { max(0, due ?? 0) }
    var streakDays: Int { max(0, streak ?? 0) }
    var isRTL: Bool { rtl ?? false }
    var list: [LexWord] { words ?? [] }
    // Nhãn đã dịch sẵn theo ngôn ngữ giao diện của app (15 ngôn ngữ, qua i18n của web); thiếu → tiếng Anh
    var titleText: String { l?.title ?? "Cards due today" }
    var streakText: String { l?.streak ?? "Day streak" }
    var reviewText: String { l?.review ?? "Review now" }
    var doneText: String { l?.done ?? "You’re all caught up for today!" }
    var noneText: String { l?.none ?? "No cards due" }
    func countText(_ n: Int) -> String { (l?.n ?? "{n} to review").replacingOccurrences(of: "{n}", with: String(n)) }

    static func decode(_ json: String?) -> LexSnapshot? {
        guard let d = json?.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(LexSnapshot.self, from: d)
    }
    static func load() -> LexSnapshot? { decode(LexShared.defaults.string(forKey: LexShared.key)) }

    /// Từ hiển thị ở mốc giờ `slot` (đổi mỗi giờ, xoay vòng trong ≤ 20 từ đến hạn)
    func word(at slot: Int) -> LexWord? {
        let ws = list
        guard !ws.isEmpty else { return nil }
        return ws[((slot % ws.count) + ws.count) % ws.count]
    }

    static let sample = LexSnapshot(v: 1, at: 0, due: 12, streak: 7, lang: "vi", rtl: false,
        words: [LexWord(w: "meticulous", ipa: "/məˈtɪkjələs/", m: "tỉ mỉ, kỹ lưỡng", lv: "C1", due: 0)],
        l: LexLabels(title: "Thẻ đến hạn hôm nay", streak: "Chuỗi ngày", review: "Ôn ngay", done: "Hôm nay bạn đã ôn hết!", none: "Không còn thẻ đến hạn", n: "{n} thẻ ôn lại"))
}

func lexReviewURL(_ word: LexWord?) -> URL {
    var c = URLComponents()
    c.scheme = "lexkite"; c.host = "review"
    if let w = word?.w { c.queryItems = [URLQueryItem(name: "w", value: w)] }
    return c.url ?? URL(string: "lexkite://review")!
}
