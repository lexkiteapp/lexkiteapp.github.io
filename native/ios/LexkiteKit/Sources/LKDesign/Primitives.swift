import SwiftUI

/// A colour role with a light ("Bright Day") and dark ("Tactile Night") value from the generated tokens.
public struct LKDynamicColor: Sendable {
    public let light: UInt32, dark: UInt32
    public init(light: UInt32, dark: UInt32) { self.light = light; self.dark = dark }
    public func resolve(_ scheme: ColorScheme) -> Color { Self.color(scheme == .dark ? dark : light) }
    static func color(_ rgba: UInt32) -> Color {
        Color(.sRGB, red: Double((rgba >> 24) & 0xFF) / 255, green: Double((rgba >> 16) & 0xFF) / 255,
              blue: Double((rgba >> 8) & 0xFF) / 255, opacity: Double(rgba & 0xFF) / 255)
    }
}

public struct LKTextStyle: Sendable {
    public let size: CGFloat, lineHeight: CGFloat, weight: Int, tracking: CGFloat
    public init(size: CGFloat, lineHeight: CGFloat, weight: Int, tracking: CGFloat) {
        self.size = size; self.lineHeight = lineHeight; self.weight = weight; self.tracking = tracking
    }
    public var font: Font {
        let w: Font.Weight = switch weight { case ..<450: .regular; case ..<550: .medium; case ..<650: .semibold; case ..<750: .bold; default: .heavy }
        // relativeTo: keeps Dynamic Type scaling; M1 swaps in the bundled Plus Jakarta Sans (same OFL source as web)
        return .system(size: size, weight: w, design: .rounded)
    }
}

public extension View {
    func lkText(_ s: LKTextStyle) -> some View { font(s.font).tracking(s.tracking * s.size).lineSpacing(max(0, s.lineHeight - s.size * 1.2)) }
}

/// The ONE app frame (docs/DESIGN-SYSTEM.md §5d), generated from web/js/st/v2/runtime.js.
public struct LKFrame: Decodable, Sendable {
    public struct Tab: Decodable, Sendable, Identifiable { public let k, route, icon, sf, compose, label: String; public var id: String { k } }
    public let width: CGFloat, gutter: CGFloat, minTap: CGFloat
    public let tabs: [Tab]
    public static let shared: LKFrame = {
        let url = Bundle.module.url(forResource: "frame", withExtension: "json")!
        return try! JSONDecoder().decode(LKFrame.self, from: Data(contentsOf: url))
    }()
}
