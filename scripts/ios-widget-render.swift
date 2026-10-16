// Render ảnh xem trước widget Lexkite (sáng/tối, vi + ar RTL) bằng chính WidgetViews.swift – chạy trên macOS trong CI ios.yml.
// swiftc -parse-as-library mobile/ios/App/LexkiteWidget/{WidgetSnapshot,WidgetViews}.swift scripts/ios-widget-render.swift -o render && ./render shots/
import SwiftUI
import AppKit

@main
struct Render {
    @MainActor static func main() {
        let out = CommandLine.arguments.dropFirst().first ?? "shots"
        try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
        var ar = LexSnapshot.sample
        ar.rtl = true; ar.lang = "ar"
        ar.words = [LexWord(w: "resilient", ipa: "/rɪˈzɪliənt/", m: "مرن، قادر على التعافي", lv: "B2", due: 0)]
        ar.l = LexLabels(title: "بطاقات اليوم", streak: "أيام متتالية", review: "راجع الآن", done: "", none: "", n: "{n} للمراجعة")
        let sizes: [(LexFamily, String, CGSize)] = [(.small, "small", CGSize(width: 170, height: 170)), (.medium, "medium", CGSize(width: 364, height: 170)),
                                                   (.rectangular, "lock-rect", CGSize(width: 172, height: 76)), (.inline, "lock-inline", CGSize(width: 260, height: 26))]
        for (name, snap) in [("vi", LexSnapshot.sample), ("ar", ar)] {
            for (fam, fname, size) in sizes {
                for dark in [false, true] {
                    let accessory = fam == .rectangular || fam == .inline
                    let view = LexWidgetView(snap: snap, word: snap.list.first, family: fam)
                        .padding(accessory ? 6 : 16)
                        .frame(width: size.width, height: size.height)
                        .foregroundColor(accessory ? .white : nil)
                        .background(accessory ? AnyView(Color.black.opacity(0.55)) : AnyView(LexBackground()))
                        .clipShape(RoundedRectangle(cornerRadius: accessory ? 12 : 22, style: .continuous))
                        .padding(10)
                        .background(Color(white: dark || accessory ? 0.12 : 0.9))
                        .environment(\.colorScheme, dark ? .dark : .light)
                    let r = ImageRenderer(content: view); r.scale = 3
                    guard let img = r.nsImage, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
                          let png = rep.representation(using: .png, properties: [:]) else { print("✗ \(fname)"); continue }
                    let file = "\(out)/widget-\(fname)-\(name)-\(dark ? "dark" : "light").png"
                    try? png.write(to: URL(fileURLWithPath: file)); print("✓ \(file)")
                    if accessory { break } // màn hình khóa: hệ thống tự tô màu, 1 ảnh là đủ
                }
            }
        }
    }
}
