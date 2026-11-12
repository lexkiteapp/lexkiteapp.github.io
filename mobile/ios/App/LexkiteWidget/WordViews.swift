// Giao diện widget "Từ mỗi giờ" (SwiftUI thuần – không phụ thuộc WidgetKit để render được ảnh xem trước trên macOS).
// Màu theo docs/BRAND-RULES.md (LexPalette trong WidgetViews.swift): teal #0F3D3E, cam #E5502F → #FFB054, kem #FFF7EA. Sáng/tối, RTL.
import SwiftUI

/// Giao diện SwiftUI thuần (render được ảnh xem trước trên macOS – scripts/ios-widget-render.swift)
struct WordWidgetView: View {
    let feed: WordFeed
    let item: WordItem?
    let family: WordFamily
    @Environment(\.colorScheme) var scheme

    private var p: LexPalette { LexPalette(dark: scheme == .dark) }
    private var word: String { item?.w ?? "Lexkite" }
    private var mean: String? { feed.meaningOn ? item?.mean.flatMap { $0.isEmpty ? nil : $0 } : nil }
    private var ipa: String? { item?.ipa.flatMap { $0.isEmpty ? nil : $0 } }
    private var ex: String? { item?.ex.flatMap { $0.isEmpty ? nil : $0 } }

    var body: some View {
        content.environment(\.layoutDirection, feed.isRTL ? .rightToLeft : .leftToRight)
    }

    @ViewBuilder var content: some View {
        switch family {
        case .small: small
        case .medium: medium
        case .rectangular: rectangular
        case .inline: inline
        case .circular: circular
        }
    }

    private var badge: some View {
        HStack(spacing: 5) {
            Circle().fill(LexPalette.kite).frame(width: 8, height: 8)
            Text(feed.titleText).font(.system(size: 12, weight: .bold, design: .rounded)).foregroundColor(p.sub)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
    }

    private func wordText(_ size: CGFloat) -> some View {
        Text(word).font(.system(size: size, weight: .heavy, design: .rounded)).foregroundColor(p.ink)
            .lineLimit(1).minimumScaleFactor(0.5).environment(\.layoutDirection, .leftToRight)
    }

    private var ipaText: some View {
        Text(ipa ?? "").font(.system(size: 13, weight: .medium)).foregroundColor(p.sub).lineLimit(1).minimumScaleFactor(0.7)
            .environment(\.layoutDirection, .leftToRight)
    }

    private var meanText: some View {
        Group {
            if let m = mean { Text(m).foregroundColor(p.ink.opacity(0.92)) }
            else { Text(feed.tapText).foregroundColor(p.accent) }
        }
        .font(.system(size: 15, weight: .semibold)).lineLimit(2).minimumScaleFactor(0.8)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            badge
            Spacer(minLength: 0)
            wordText(26)
            if ipa != nil { ipaText }
            meanText
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 4) {
            badge
            Spacer(minLength: 0)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                wordText(30)
                if ipa != nil { ipaText }
            }
            meanText
            if let e = ex {
                Text("“\(e)”").font(.system(size: 13, weight: .regular).italic()).foregroundColor(p.sub)
                    .lineLimit(2).minimumScaleFactor(0.85).environment(\.layoutDirection, .leftToRight)
                    .frame(maxWidth: .infinity, alignment: feed.isRTL ? .trailing : .leading)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Màn hình khóa: hệ thống tô đơn sắc – chỉ dùng độ đậm/nhạt
    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(word).font(.system(size: 17, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.6)
                .environment(\.layoutDirection, .leftToRight)
            if let i = ipa { Text(i).font(.system(size: 12, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7).opacity(0.75)
                .environment(\.layoutDirection, .leftToRight) }
            Text(mean ?? feed.tapText).font(.system(size: 13, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.75).opacity(mean == nil ? 0.7 : 1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var inline: some View {
        Text(mean.map { "\(word) — \($0)" } ?? word)
    }

    private var circular: some View {
        ZStack {
            Circle().strokeBorder(lineWidth: 2).opacity(0.5)
            VStack(spacing: 0) {
                Text("✦").font(.system(size: 9, weight: .bold)).opacity(0.7)
                Text(String(word.prefix(word.count <= 4 ? 4 : 3)).capitalized)
                    .font(.system(size: 16, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
            }
            .padding(4)
        }
    }
}

enum WordFamily { case small, medium, rectangular, inline, circular }

