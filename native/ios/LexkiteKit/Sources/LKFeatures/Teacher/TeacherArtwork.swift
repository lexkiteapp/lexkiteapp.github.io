import SwiftUI
import ImageIO
import CoreGraphics
import LKCore
import LKDesign

/// The rig definition shipped in LKDesign (`teach/rig.json`, generated copy of native/shared/gen/teach/rig.json).
public enum TeacherRigStore {
    public static let shared: Rig = {
        guard let url = LKBrand.bundle.url(forResource: "rig", withExtension: "json", subdirectory: "teach"),
              let data = try? Data(contentsOf: url), let rig = try? Rig.load(from: data) else {
            preconditionFailure("LKDesign teach/rig.json missing or invalid – run node scripts/native/gen.mjs")
        }
        return rig
    }()
}

/// The bundled pre-generated cue table (`teach/cues.json`, LKDesign) and the lip-sync using its dictionary (web `LipSync.setDict(LK_CUES.dict)`); nil if missing.
public enum TeacherCueStore {
    public static let table: CueTable? = LKBrand.bundle.url(forResource: "cues", withExtension: "json", subdirectory: "teach")
        .flatMap { try? Data(contentsOf: $0) }.flatMap { CueTable(data: $0) }
    public static let lip: LipSync? = table.map { LipSync(TeacherRigStore.shared.def, dict: LipSync.parseDict($0.dictText)) }
}

/// Decoded teacher art for one teacher: bare head (face base layer) + pose stills, decoded once off the draw path.
/// Order like web `Chars.still`: bundled (offline, instant) → disk cache → CDN (TeacherArt.load); a pose that cannot be loaded draws `bundle.fallbackPose`.
@MainActor
final class TeacherArtwork {
    private static var cache: [String: TeacherArtwork] = [:]
    static func shared(_ who: String, rig: Rig) -> TeacherArtwork {
        if let a = cache[who] { return a }
        let a = TeacherArtwork(who: who, rig: rig)
        cache[who] = a
        return a
    }

    /// decoded 1108×960 RGBA ≈ 4 MB each → keep the head + the few most recent poses
    static let maxPoses = 4
    let who: String
    let rig: Rig
    let head: Image?
    let palette: [UInt32: Color]
    private var poses: [String: Image] = [:]
    private var order: [String] = []
    private var waiters: [String: [@MainActor () -> Void]] = [:]

    init(who: String, rig: Rig) {
        self.who = who; self.rig = rig
        let headFile = rig.def.people[who]?.head ?? "teach/\(who)/\(rig.def.bundle.head)"
        head = Self.bundledImage(headFile)
        var colors: [RigColor] = [LipFace.white]
        let R = rig.face(who), S = rig.style(who)
        colors += [R.skin, R.ink, S.lip, S.lipHi, S.line, S.inner, S.teeth, S.tongue, S.tongueSh]
        var p: [UInt32: Color] = [:]
        for c in colors { p[c.rgb] = Self.color(c) }
        palette = p
    }

    static func color(_ c: RigColor) -> Color { LKDynamicColor(light: c.rgb << 8 | 0xFF, dark: c.rgb << 8 | 0xFF).resolve(.light) }

    /// `teach/<who>/still-<pose>.webp` from the rig's still pattern
    func stillPath(_ pose: String) -> String { (rig.def.people[who]?.stillPattern ?? "teach/\(who)/still-<pose>.webp").replacingOccurrences(of: "<pose>", with: pose) }
    func isBundled(_ pose: String) -> Bool { rig.def.bundle.poses.contains(pose) }

    static func bundledImage(_ path: String) -> Image? {
        let ns = path as NSString
        guard let url = LKBrand.bundle.url(forResource: (ns.lastPathComponent as NSString).deletingPathExtension, withExtension: ns.pathExtension,
                                           subdirectory: ns.deletingLastPathComponent),
              let data = try? Data(contentsOf: url) else { return nil }
        return decode(data)
    }
    /// ImageIO decode (WebP with alpha, iOS 14+/macOS 11+), forced now so the first drawn frame never decodes.
    static func decode(_ data: Data) -> Image? {
        guard let src = CGImageSourceCreateWithData(data as CFData, nil),
              let cg = CGImageSourceCreateImageAtIndex(src, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary) else { return nil }
        return Image(decorative: cg, scale: 1).interpolation(.high)
    }

    private func remember(_ pose: String, _ img: Image) {
        poses[pose] = img
        order.removeAll { $0 == pose }; order.append(pose)
        while order.count > Self.maxPoses { poses[order.removeFirst()] = nil }
    }

    /// Ready image for a pose (memory or bundled, synchronous); nil when it still has to come from the network.
    func pose(_ pose: String) -> Image? {
        if let i = poses[pose] { remember(pose, i); return i }
        guard isBundled(pose), let i = Self.bundledImage(stillPath(pose)) else { return nil }
        remember(pose, i)
        return i
    }
    /// What to draw for a pose: its image, else the rig fallback pose (offline / not fetched yet).
    func drawable(_ pose: String) -> Image? { poses[pose] ?? self.pose(pose) ?? self.pose(rig.def.bundle.fallbackPose) }

    /// Loads a pose (bundled → disk → CDN). Calls `done` on the main actor when an image (or the fallback) is ready.
    func load(_ pose: String, done: @escaping @MainActor () -> Void) {
        if self.pose(pose) != nil { done(); return }
        #if canImport(UIKit)
        if waiters[pose] != nil { waiters[pose]?.append(done); return } // already fetching: finish together
        waiters[pose] = [done]
        let who = self.who
        Task { @MainActor [weak self] in
            let ui = await TeacherArt.load(who: who, pose: pose)
            let ready = await ui?.byPreparingForDisplay() ?? ui // decode off the main thread, not on the first drawn frame
            guard let self else { return }
            if let cg = ready?.cgImage { self.remember(pose, Image(decorative: cg, scale: 1).interpolation(.high)) }
            let w = self.waiters.removeValue(forKey: pose) ?? []
            for f in w { f() }
        }
        #else
        done()
        #endif
    }
}
