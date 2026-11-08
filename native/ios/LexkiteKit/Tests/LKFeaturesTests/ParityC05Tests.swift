import XCTest
import SwiftUI
@testable import LKFeatures
import LKDesign
import LKCore

/// Speech source driven by the test (audio clock + playing + voiced).
final class C05Speech: TeacherSpeechSource {
    var time = 0.0, isPlaying = true, isVoiced = true
}

/// C05 – native 2D teacher rig (web TeacherRig port). The machine numbers themselves are gated by LKSyncTests/RigVectorTests (vectors/rig.json);
/// this checks the app layer: bundled art, controller API, speech → mouth, Reduce Motion, pose cross-fade, real pixels. No network.
@MainActor
final class ParityC05Tests: XCTestCase {
    let rig = TeacherRigStore.shared
    static let fps = 60.0

    /// Steps `c` for `seconds` at 60 fps from `now`, advancing an optional audio clock; returns every frame.
    func run(_ c: TeacherController, from now: inout Double, _ seconds: Double, audio: C05Speech? = nil) -> [RigFrame] {
        var out: [RigFrame] = []
        for _ in 0..<Int((seconds * Self.fps).rounded()) {
            now += 1 / Self.fps
            if let a = audio, a.isPlaying { a.time += 1 / Self.fps }
            out.append(c.step(now: now))
        }
        return out
    }

    func opaquePixels(_ cg: CGImage) -> Int {
        let w = cg.width, h = cg.height
        var buf = [UInt8](repeating: 0, count: w * h * 4)
        let ok: Bool = buf.withUnsafeMutableBytes { raw -> Bool in
            guard let ctx = CGContext(data: raw.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
            return true
        }
        XCTAssertTrue(ok)
        return stride(from: 3, to: buf.count, by: 4).reduce(0) { $0 + (buf[$1] > 16 ? 1 : 0) }
    }

    func testParityC05() throws {
        // 1. both teachers, rig + bundled offline art (head + 9 poses each)
        XCTAssertEqual(Set(rig.def.people.keys), ["ama", "carlos"])
        XCTAssertEqual(rig.def.bundle.poses.count, 9)
        for who in ["ama", "carlos"] {
            let art = TeacherArtwork.shared(who, rig: rig)
            XCTAssertNotNil(art.head, "\(who) head-bare-2x.webp")
            XCTAssertNotNil(LKBrand.bundle.url(forResource: "head-bare-2x", withExtension: "webp", subdirectory: "teach/\(who)"))
            for p in rig.def.bundle.poses {
                XCTAssertNotNil(LKBrand.bundle.url(forResource: "still-\(p)", withExtension: "webp", subdirectory: "teach/\(who)"), "\(who) still-\(p)")
                XCTAssertNotNil(art.pose(p), "\(who) \(p) decodes")
            }
            XCTAssertNotNil(art.drawable("wave"), "pose not bundled → fallback still \(rig.def.bundle.fallbackPose)")
            XCTAssertEqual(TeacherController(who: who).who, who)
        }
        XCTAssertEqual(TeacherController(who: "nobody").who, "ama")

        // 2. speaking drives the mouth: cue shapes while playing, back to X after quiet()
        let c = TeacherController(who: "ama"), audio = C05Speech()
        var now = 10.0
        _ = run(c, from: &now, 0.5)
        let cues = LipSync.Unpacked(dur: 1.2, cues: [LipCue(start: 0, end: 0.2, value: "X"), LipCue(start: 0.2, end: 0.7, value: "D"),
                                                      LipCue(start: 0.7, end: 1.0, value: "F"), LipCue(start: 1.0, end: 1.2, value: "X")], env: nil)
        c.speak(text: "Hello there", duration: nil, source: audio, cues: cues)
        XCTAssertTrue(c.isSpeaking)
        let speaking = run(c, from: &now, 0.45, audio: audio)
        XCTAssertTrue(speaking.last!.talking)
        XCTAssertEqual(speaking.last!.shape, "D", "audio t=0.45 s is inside the D cue")
        XCTAssertGreaterThan(speaking.last!.s.open, 0.3)
        XCTAssertTrue(run(c, from: &now, 0.4, audio: audio).contains { $0.shape == "F" })
        c.quiet(); audio.isPlaying = false
        let after = run(c, from: &now, 0.3)
        XCTAssertFalse(c.isSpeaking)
        XCTAssertEqual(after.last!.shape, "X"); XCTAssertEqual(after.last!.s.open, 0); XCTAssertFalse(after.last!.talking)

        // no cues + live source: the cursor only moves while voiced
        let live = TeacherController(who: "carlos"), mic = C05Speech()
        var tl = 0.0
        mic.isVoiced = false
        live.speak(text: "Maybe the bubble moves up.", duration: 2, source: mic)
        XCTAssertTrue(run(live, from: &tl, 0.5, audio: mic).allSatisfy { $0.shape == "X" }, "silent audio → mouth closed")
        mic.isVoiced = true
        XCTAssertTrue(run(live, from: &tl, 0.8, audio: mic).contains { $0.shape != "X" }, "voiced → live shapes")

        // no source: frame clock, estimated duration, ends by itself
        let tts = TeacherController(who: "ama")
        var tt = 0.0
        tts.speak(text: "Hello, how are you today?", duration: 1.5, source: nil)
        XCTAssertTrue(run(tts, from: &tt, 1.0).contains { $0.shape != "X" && $0.talking })
        _ = run(tts, from: &tt, 0.7)
        XCTAssertFalse(tts.isSpeaking, "auto quiet after duration + 80 ms")

        // 3. Reduce Motion → calm: no tilt / nod / sway / breath over a speaking run with head gestures, but blink + lip sync stay
        let calm = TeacherController(who: "carlos", reduceMotion: true), a2 = C05Speech()
        var tc = 0.0
        calm.listen(true); calm.gesture("nod"); calm.gesture("shake"); calm.gesture("blink")
        calm.speak(text: "It is a good idea to try again.", duration: 2, source: a2)
        let calmFrames = run(calm, from: &tc, 2, audio: a2)
        XCTAssertTrue(calmFrames.allSatisfy { $0.tilt == 0 && $0.nod == 0 && $0.sway == 0 && $0.breath == 0 })
        XCTAssertTrue(calmFrames.contains { $0.s.blink > 0.5 }, "blink still runs")
        XCTAssertTrue(calmFrames.contains { $0.shape != "X" }, "lip sync still runs")
        let lively = TeacherController(who: "carlos")
        var tv = 0.0
        lively.gesture("nod")
        XCTAssertTrue(run(lively, from: &tv, 1).contains { $0.nod > 1 && $0.breath != 0 }, "without Reduce Motion the head moves")
        calm.setReduceMotion(false)
        XCTAssertFalse(calm.reduceMotion)
        XCTAssertTrue(calm.isSpeaking, "the line in progress survives the switch")

        // 4. pose cross-fade: poseW rises (1/60)/fade per frame, faceW = 1 − poseW, holds, then fades back to the face
        let p = TeacherController(who: "ama")
        var tp = 0.0
        _ = run(p, from: &tp, 0.1)
        p.gesture("cheer")
        let fade = run(p, from: &tp, 0.25)
        for (n, f) in fade.enumerated() {
            XCTAssertEqual(f.poseW, min(1, Double(n + 1) / Self.fps / rig.def.fade), accuracy: 1e-9)
            XCTAssertEqual(f.faceW, 1 - f.poseW, accuracy: 1e-12)
            XCTAssertEqual(f.pose, "cheer")
        }
        let mid = p.scene(fade[4])
        XCTAssertTrue(mid.poseW > 0 && mid.faceW > 0 && mid.pose != nil && !mid.parts.isEmpty, "mid-fade draws face + still")
        XCTAssertEqual(p.currentPose, "cheer")
        XCTAssertTrue(run(p, from: &tp, 1.0).allSatisfy { $0.poseW == 1 }, "held for the gesture hold (1.2 s)")
        _ = run(p, from: &tp, 0.6)
        XCTAssertEqual(p.lastFrame?.poseW, 0); XCTAssertNil(p.currentPose)
        // Reduce Motion: cut, never a partial mix
        let pc = TeacherController(who: "ama", reduceMotion: true)
        var tq = 0.0
        pc.gesture("thumbs_up")
        XCTAssertTrue(run(pc, from: &tq, 2).allSatisfy { $0.poseW == 0 || $0.poseW == 1 })

        // 5. emotion / mood / held pose API
        let m = TeacherController(who: "ama")
        var tm = 0.0
        m.setEmotion("happy")
        XCTAssertEqual(run(m, from: &tm, 0.1).last?.emo, "happy")
        XCTAssertEqual(m.mood("answer", ["ok": true])?.pose, "cheer")
        XCTAssertEqual(run(m, from: &tm, 3).last?.poseW, 1, "held until released")
        XCTAssertEqual(m.lastFrame?.emo, "cheer")
        XCTAssertEqual(m.mood("answer", ["ok": false])?.pose, "concern")
        XCTAssertEqual(m.mood("answer", ["ok": false])?.pose, "encourage")
        XCTAssertNil(m.mood("unknown"))
        m.pose(nil)
        XCTAssertEqual(run(m, from: &tm, 0.5).last?.poseW, 0)
        m.pose("concern")
        _ = run(m, from: &tm, 0.5)
        m.speak(text: "Try again", duration: 1, source: nil)
        XCTAssertEqual(run(m, from: &tm, 0.4).last?.poseW, 0, "speaking drops the still so the mouth syncs")

        // 6. real pixels: frozen (deterministic) teacher renders the face; a pose renders the still; live view lays out at 390 pt
        for who in ["ama", "carlos"] {
            for (shape, pose) in [("X", nil), ("D", nil), ("X", "cheer")] as [(String, String?)] {
                let r = ImageRenderer(content: TeacherView(controller: .frozen(who: who, shape: shape, pose: pose)).frame(width: 390, height: 338))
                r.scale = 1
                let cg = try XCTUnwrap(r.cgImage, "\(who) \(shape) \(pose ?? "-") renders")
                let n = opaquePixels(cg), total = cg.width * cg.height
                XCTAssertGreaterThan(n, total / 10, "\(who) \(shape) \(pose ?? "face"): teacher pixels")
                XCTAssertLessThan(n, total, "transparent background")
            }
        }
        #if canImport(UIKit)
        let host = UIHostingController(rootView: TeacherView(controller: TeacherController(who: "carlos")))
        host.view.frame = CGRect(x: 0, y: 0, width: 390, height: 338)
        host.view.layoutIfNeeded()
        XCTAssertEqual(host.view.bounds.width, 390)
        #endif
    }
}
