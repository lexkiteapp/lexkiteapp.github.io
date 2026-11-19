// Giao diện widget Lexkite (SwiftUI thuần – không phụ thuộc WidgetKit để render được ảnh xem trước trên macOS).
// Màu theo docs/BRAND-RULES.md: teal #0F3D3E, cam #E5502F → #FFB054, kem #FFF7EA. Sáng/tối, chữ to, RTL (ar).
import SwiftUI

enum LexFamily { case small, medium, rectangular, inline }

extension Color {
    init(hex: UInt32) { self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255) }
    static let lexTeal = Color(hex: 0x0F3D3E), lexTeal2 = Color(hex: 0x17595A), lexCoral = Color(hex: 0xE5502F)
    static let lexAmber = Color(hex: 0xFFB054), lexCream = Color(hex: 0xFFF7EA), lexCream2 = Color(hex: 0xFFE7C2)
}

struct LexPalette {
    let dark: Bool
    var bg: LinearGradient { dark ? LinearGradient(colors: [.lexTeal, .lexTeal2], startPoint: .topLeading, endPoint: .bottomTrailing)
                                  : LinearGradient(colors: [.lexCream, .white], startPoint: .topLeading, endPoint: .bottomTrailing) }
    var ink: Color { dark ? .white : .lexTeal }
    var sub: Color { dark ? Color.white.opacity(0.78) : Color.lexTeal.opacity(0.72) }
    var accent: Color { dark ? .lexAmber : .lexCoral }
    var chip: Color { dark ? Color.white.opacity(0.14) : Color.lexTeal.opacity(0.08) }
    static let kite = LinearGradient(colors: [.lexCoral, .lexAmber], startPoint: .leading, endPoint: .trailing)
}

struct LexBackground: View {
    @Environment(\.colorScheme) var scheme
    var body: some View { LexPalette(dark: scheme == .dark).bg }
}

struct LexWidgetView: View {
    let snap: LexSnapshot
    let word: LexWord?
    let count: Int
    let family: LexFamily
    @Environment(\.colorScheme) var scheme

    var body: some View {
        content.environment(\.layoutDirection, snap.isRTL ? .rightToLeft : .leftToRight)
    }

    @ViewBuilder var content: some View {
        switch family {
        case .small: small
        case .medium: medium
        case .rectangular: rectangular
        case .inline: inline
        }
    }

    private var p: LexPalette { LexPalette(dark: scheme == .dark) }

    // MARK: Màn hình chính
    private var header: some View {
        HStack(spacing: 6) {
            if let lv = word?.lv, !lv.isEmpty {
                Text(lv).font(.system(size: 12, weight: .heavy, design: .rounded)).foregroundColor(.white)
                    .padding(.horizontal, 7).padding(.vertical, 2).background(Capsule().fill(LexPalette.kite))
            }
            Spacer(minLength: 0)
            Text("🔥 \(snap.streakDays)").font(.system(size: 13, weight: .bold, design: .rounded)).foregroundColor(p.ink)
                .padding(.horizontal, 7).padding(.vertical, 2).background(Capsule().fill(p.chip))
                .accessibilityLabel("\(snap.streakText) \(snap.streakDays)")
        }
    }

    private func wordBlock(big: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(word?.w ?? "Lexkite").font(.system(size: big, weight: .heavy, design: .rounded)).foregroundColor(p.ink)
                .lineLimit(1).minimumScaleFactor(0.55).environment(\.layoutDirection, .leftToRight)
            if let ipa = word?.ipa, !ipa.isEmpty {
                Text(ipa).font(.system(size: 13, weight: .medium)).foregroundColor(p.sub).lineLimit(1).minimumScaleFactor(0.7)
                    .environment(\.layoutDirection, .leftToRight)
            }
            Text(word?.m ?? snap.doneText).font(.system(size: 15, weight: .semibold)).foregroundColor(p.ink.opacity(0.92))
                .lineLimit(2).minimumScaleFactor(0.8).fixedSize(horizontal: false, vertical: true)
        }
    }

    private var countLine: some View {
        Text(count > 0 ? snap.countText(count) : snap.noneText)
            .font(.system(size: 13, weight: .bold, design: .rounded)).foregroundColor(p.accent).lineLimit(1).minimumScaleFactor(0.7)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            header
            Spacer(minLength: 0)
            wordBlock(big: 24)
            Spacer(minLength: 0)
            countLine
        }
    }

    private var medium: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                header
                Spacer(minLength: 0)
                wordBlock(big: 28)
                Spacer(minLength: 0)
            }
            VStack(spacing: 4) {
                Text("\(count)").font(.system(size: 40, weight: .black, design: .rounded))
                    .foregroundStyle(LexPalette.kite).lineLimit(1).minimumScaleFactor(0.5)
                Text(snap.titleText).font(.system(size: 12, weight: .semibold)).foregroundColor(p.sub)
                    .multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.8)
                Text(count > 0 ? snap.reviewText : snap.doneText)
                    .font(.system(size: 13, weight: .heavy, design: .rounded)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.6)
                    .padding(.horizontal, 10).padding(.vertical, 5).background(Capsule().fill(LexPalette.kite)).padding(.top, 2)
            }
            .frame(width: 104)
        }
    }

    // MARK: Màn hình khóa (hệ thống tự tô đơn sắc – chỉ dùng độ đậm/nhạt)
    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Text(word?.w ?? "Lexkite").font(.system(size: 17, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.6)
                    .environment(\.layoutDirection, .leftToRight)
                if let lv = word?.lv, !lv.isEmpty { Text(lv).font(.system(size: 11, weight: .bold)).opacity(0.75) }
            }
            Text(word?.m ?? snap.doneText).font(.system(size: 14, weight: .medium)).lineLimit(1).minimumScaleFactor(0.75)
            Text("🔥\(snap.streakDays) · \(count > 0 ? snap.countText(count) : snap.noneText)")
                .font(.system(size: 12, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.7).opacity(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var inline: some View {
        if let w = word {
            return Text("\(w.w) · \(w.m ?? "")")
        }
        return Text("🔥\(snap.streakDays) · \(count > 0 ? snap.countText(count) : snap.noneText)")
    }
}
