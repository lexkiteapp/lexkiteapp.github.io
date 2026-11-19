// Widget "Từ mỗi giờ" (Word of the hour): danh sách ~48 từ do app ghi (web/js/widget-feed.js → plugin WordWidget) vào App Group.
// Dùng chung cho app (kiểm tra + ghi), widget (đọc) và công cụ render ảnh trên macOS. Không WidgetKit, không gọi mạng.
// Nhịp đổi từ: mỗi intervalMin phút trong khung giờ [startHour, endHour); ngoài khung giữ từ cuối cùng. Không gửi thông báo.
import Foundation

enum WordShared {
    static let key = "lexkite.words"
    static let kind = "LexkiteWordWidget"
}

struct WordItem: Codable, Hashable {
    var w: String
    var ipa: String?
    var mean: String?
    var ex: String?
    var id: String?
}

struct WordLabels: Codable, Hashable {
    var title: String?
    var tap: String?
}

struct WordFeed: Codable, Hashable {
    var v: Int?
    var at: Double?
    var items: [WordItem]?
    var intervalMin: Int?
    var startHour: Int?
    var endHour: Int?
    var showMean: Bool?
    var rtl: Bool?
    var l: WordLabels?

    var list: [WordItem] { items ?? [] }
    var interval: Int { [30, 60, 120, 180].contains(intervalMin ?? 60) ? (intervalMin ?? 60) : 60 }
    /// Khung giờ hợp lệ; start ≥ end → cả ngày
    var window: (Int, Int) {
        let s = max(0, min(23, startHour ?? 7)), e = max(1, min(24, endHour ?? 22))
        return s < e ? (s, e) : (0, 24)
    }
    var meaningOn: Bool { showMean ?? true }
    var isRTL: Bool { rtl ?? false }
    var titleText: String { l?.title ?? WordFeed.loc("word.name", "Word of the hour") }
    var tapText: String { l?.tap ?? WordFeed.loc("word.tap", "Tap to see the meaning") }
    private static func loc(_ key: String, _ en: String) -> String {
        let s = Bundle.main.localizedString(forKey: key, value: nil, table: nil)
        return s == key ? en : s
    }

    static func decode(_ json: String?) -> WordFeed? {
        guard let d = json?.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WordFeed.self, from: d)
    }
    static func load(_ defaults: UserDefaults) -> WordFeed? { decode(defaults.string(forKey: WordShared.key)) }

    /// Số thứ tự nhịp ở thời điểm `date` (tăng dần qua các ngày). Trước giờ bắt đầu = nhịp cuối hôm trước; sau giờ kết thúc = nhịp cuối hôm nay.
    func slot(at date: Date, calendar cal: Calendar = .current) -> Int {
        let (s, e) = window, per = max(1, Int(ceil(Double((e - s) * 60) / Double(interval))))
        let day0 = cal.startOfDay(for: date)
        let dayN = Int(floor((day0.timeIntervalSince1970 + Double(cal.timeZone.secondsFromGMT(for: day0))) / 86_400))
        let mins = Int(date.timeIntervalSince(day0) / 60)
        if mins < s * 60 { return dayN * per - 1 }
        if mins >= e * 60 { return dayN * per + per - 1 }
        return dayN * per + (mins - s * 60) / interval
    }

    func item(at date: Date, calendar cal: Calendar = .current) -> WordItem? {
        let ws = list
        guard !ws.isEmpty else { return nil }
        let k = slot(at: date, calendar: cal)
        return ws[((k % ws.count) + ws.count) % ws.count]
    }

    /// Các mốc đổi từ tiếp theo sau `date` (tối đa `limit` mốc, trong ≤ 2 ngày) – dùng cho timeline WidgetKit.
    func changes(after date: Date, limit: Int = 48, calendar cal: Calendar = .current) -> [Date] {
        let (s, e) = window
        var out: [Date] = []
        var day = cal.startOfDay(for: date)
        for _ in 0..<3 {
            var m = s * 60
            while m < e * 60 {
                if let d = cal.date(byAdding: .minute, value: m, to: day), d > date { out.append(d); if out.count >= limit { return out } }
                m += interval
            }
            guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }
        return out
    }

    /// Mẫu cho thư viện widget (chưa mở app): nghĩa tiếng Anh, nhãn lấy từ Localizable.strings của widget (đúng ngôn ngữ máy)
    static let sample = WordFeed(v: 1, at: 0, items: [
        WordItem(w: "meticulous", ipa: "/məˈtɪkjələs/", mean: "very careful about every detail", ex: "She keeps meticulous notes of every lesson.", id: "meticulous"),
        WordItem(w: "resilient", ipa: "/rɪˈzɪliənt/", mean: "able to recover quickly", ex: "Children are often more resilient than adults.", id: "resilient"),
    ], intervalMin: 60, startHour: 7, endHour: 22, showMean: true, rtl: false, l: nil)
}

func lexWordURL(_ item: WordItem?) -> URL {
    guard let raw = item?.id ?? item?.w, !raw.isEmpty,
          let enc = raw.lowercased().addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-._~"))),
          let u = URL(string: "lexkite://word/" + enc) else { return URL(string: "lexkite://word")! }
    return u
}
