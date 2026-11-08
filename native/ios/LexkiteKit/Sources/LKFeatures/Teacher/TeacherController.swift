import SwiftUI
import LKCore
import LKDesign

/// Audio side of a spoken line (implemented by the lesson audio player).
public protocol TeacherSpeechSource: AnyObject {
    /// seconds since this utterance started, output-latency compensated (`LipClock`)
    var time: Double { get }
    var isPlaying: Bool { get }
    /// current audio energy above the voiced threshold (true if unknown) – drives the live lip cursor
    var isVoiced: Bool { get }
}

/// Everything one frame draws (values only – the Canvas renderer touches no actor state).
struct TeacherScene {
    var head: Image?
    var pose: Image?
    var parts: [[PaintOp]]
    var matrix: [Double]
    var poseW: Double, faceW: Double
    var size: CGSize
    var palette: [UInt32: Color]
}

/// Native 2D teacher (Ama / Carlos): web TeacherRig machine (LKCore/Teacher) driven per displayed frame, drawn by `TeacherView`.
/// Speech: `speak(text:duration:source:)` – with a source the mouth follows its clock (cues → exact shapes; no cues → live cursor gated by
/// `isVoiced`); without a source it runs on the frame clock for `duration` (or the web estimate 65 ms per character) with the live cursor gated by the
/// silences `fromText` estimates for the text (punctuation pauses, lead-in/out), and ends by itself (web `setTimeout(fin, dur + 80 ms)`).
/// With a source the caller ends the line with `quiet()` (audio ended / error).
@MainActor @Observable
public final class TeacherController {
    public let who: String
    public private(set) var reduceMotion: Bool

    let rig: Rig
    let art: TeacherArtwork
    @ObservationIgnored var machine: RigMachine
    @ObservationIgnored var moodState: TeacherMood
    let frozenFrame: RigFrame?
    /// frame clock (seconds since the controller was made) – shared with wall-clock speech
    let clock = FrameClock()
    let epoch = Date()
    @ObservationIgnored var speech: RigSpeech?
    @ObservationIgnored weak var source: TeacherSpeechSource?
    @ObservationIgnored var hasSource = false
    @ObservationIgnored var autoQuietAt: Double?
    @ObservationIgnored var heldPose: String?
    @ObservationIgnored var faceEmotion: String = "neutral"
    @ObservationIgnored public private(set) var lastFrame: RigFrame?

    final class FrameClock { var now = 0.0 }
    // web TeacherRig.mount speak(): no duration known → 65 ms per character, at least .6 s · line ends 80 ms after it
    static let msPerChar = 0.065, minDur = 0.6, endPad = 0.08

    public init(who: String, reduceMotion: Bool = false) {
        let rig = TeacherRigStore.shared
        let w = rig.def.people[who] != nil ? who : "ama"
        self.who = w; self.rig = rig; self.reduceMotion = reduceMotion
        art = TeacherArtwork.shared(w, rig: rig)
        moodState = TeacherMood(rig: rig)
        frozenFrame = nil
        machine = Self.makeMachine(rig, w, calm: reduceMotion)
    }

    init(who: String, frozen: (RigMachine) -> RigFrame) {
        let rig = TeacherRigStore.shared
        let w = rig.def.people[who] != nil ? who : "ama"
        self.who = w; self.rig = rig; reduceMotion = true
        art = TeacherArtwork.shared(w, rig: rig)
        moodState = TeacherMood(rig: rig)
        let m = Self.makeMachine(rig, w, calm: true)
        machine = m
        frozenFrame = frozen(m)
    }

    static func makeMachine(_ rig: Rig, _ who: String, calm: Bool) -> RigMachine {
        let person = rig.def.people[who]
        let poses = Set(person?.poses ?? [])
        return RigMachine(rig: rig, who: who, calm: calm, seed: person?.seed, has: { poses.contains($0) })
    }

    /// One fixed machine state, no time (CI snapshots): the real machine is stepped 2 s on a synthetic clock (springs settle, pose fully faded in),
    /// speaking `shape` when it is not X, eyes open.
    public static func frozen(who: String, shape: String = "X", emotion: String = "neutral", pose: String? = nil) -> TeacherController {
        TeacherController(who: who) { m in
            if !m.setEmotion(emotion) { _ = m.setFaceEmotion(emotion) }
            if shape != "X" {
                m.speak(RigSpeech(clock: { 1 }, playing: { true }, cues: [LipCue(start: 0, end: 60, value: shape)], dur: 60, text: shape))
            }
            if let pose { m.hold(pose) }
            var f = m.step(0)
            for i in 1...120 { f = m.step(Double(i) / 60) }
            f.s.blink = 0
            return f
        }
    }
    public var isFrozen: Bool { frozenFrame != nil }

    // MARK: frame
    /// Steps the machine to `now` (seconds on the frame clock). Called once per displayed frame by `TeacherView`; tests drive it directly.
    @discardableResult public func step(now: Double) -> RigFrame {
        if let f = frozenFrame { return f }
        clock.now = now
        if let q = autoQuietAt, now >= q { quiet() }
        if hasSource && source == nil { quiet() } // the player went away mid-line
        let f = display(machine.step(now))
        lastFrame = f
        return f
    }
    /// Reduce Motion: the still replaces the face instantly (no cross-fade).
    func display(_ f: RigFrame) -> RigFrame {
        guard reduceMotion else { return f }
        var g = f
        g.poseW = f.poseW > 0 ? f.poseWant : 0; g.faceW = 1 - g.poseW
        return g
    }

    func scene(at date: Date) -> TeacherScene { scene(frozenFrame ?? step(now: date.timeIntervalSince(epoch))) }
    func scene(_ f: RigFrame) -> TeacherScene {
        let poseImg = f.poseW > 0 ? f.pose.flatMap { art.drawable($0) } : nil
        let poseW = poseImg == nil ? 0 : f.poseW, faceW = poseImg == nil ? 1 : f.faceW
        return TeacherScene(head: art.head, pose: poseImg, parts: faceW > 0 ? LipFace.parts(rig, who: who, f.s) : [], matrix: TeacherRig.matrix(f, rig: rig),
                            poseW: poseW, faceW: faceW, size: CGSize(width: rig.def.canvas.w, height: rig.def.canvas.h), palette: art.palette)
    }

    // MARK: speech
    /// Web teacher.js order: pre-generated cues for `lineKey(voice, text)` (`teach/cues.json`) → exact shapes + loudness; else live / text-timed.
    public func speak(text: String, duration: Double?, source: TeacherSpeechSource?) {
        let key = VoiceCore.lineKey(voice: rig.def.people[who]?.voice ?? "", text: text)
        speak(text: text, duration: duration, source: source, cues: TeacherCueStore.table?.unpacked(key))
    }

    /// `cues`: precomputed mouth cues (LK_CUES `LipSync.unpack`, or `rig.lipDict.fromEnv` on decoded audio) – exact shapes + loudness.
    public func speak(text: String, duration: Double?, source: TeacherSpeechSource?, cues: LipSync.Unpacked?) {
        guard !isFrozen else { return }
        let lip = TeacherCueStore.lip ?? rig.lipDict
        let dur = cues?.dur ?? duration ?? max(Self.minDur, Double(text.utf16.count) * Self.msPerChar)
        let box = clock, t0 = clock.now
        // no real audio (nothing to measure) and no cues → text-timed cues with the dictionary; real audio without cues → live loudness cursor
        let est = lip.fromText(text, dur)
        let timed = cues == nil && source == nil
        let live = cues == nil && !timed ? lip.live(text, dur: dur) : nil
        var s: RigSpeech
        if let source {
            s = RigSpeech(clock: { [weak source] in source?.time ?? 0 }, playing: { [weak source] in source?.isPlaying ?? false },
                          voiced: live == nil ? nil : { [weak source] in source?.isVoiced ?? false })
            autoQuietAt = nil
        } else {
            s = RigSpeech(clock: { box.now - t0 }, playing: { box.now - t0 < dur })
            autoQuietAt = t0 + dur + Self.endPad
        }
        s.cues = cues?.cues ?? (timed ? est : nil); s.env = cues?.env; s.live = live; s.dur = dur; s.text = text
        self.source = source; hasSource = source != nil; speech = s
        machine.speak(s)
    }

    public func quiet() {
        speech = nil; source = nil; hasSource = false; autoQuietAt = nil
        machine.quiet()
    }

    // MARK: expression
    public func setEmotion(_ name: String) {
        if machine.setEmotion(name) || machine.setFaceEmotion(name) { faceEmotion = name }
    }
    public func listen(_ on: Bool) { setEmotion(on ? "listen" : "neutral") }

    /// nod, shake, bob, blink (procedural) or a pose gesture (cheer, thumbs_up, …): the still is loaded first, then cross-faded (web: no pop-in).
    public func gesture(_ name: String) {
        guard !isFrozen, let G = rig.def.people[who]?.gestures[name] else { return }
        guard G.kind == "pose", let p = TeacherRig.poseOf(G, has: { [rig, who] in rig.def.people[who]?.poses.contains($0) ?? false }) else {
            machine.gesture(name, at: clock.now); return
        }
        art.load(p) { [weak self] in guard let self else { return }; self.machine.gesture(name, at: self.clock.now) }
    }

    /// Holds a still (cheer, concern, encourage, …) with its face emotion until `pose(nil)`; speaking drops the still so the mouth syncs (web lesson).
    public func pose(_ name: String?) {
        guard !isFrozen else { return }
        heldPose = name
        guard let p = name else { machine.release(); setEmotion("neutral"); return }
        art.load(p) { [weak self] in
            guard let self, self.heldPose == p else { return }
            self.machine.hold(p)
            self.setEmotion(self.rig.def.poseEmo[p] ?? p)
        }
    }

    /// TeacherMood events (answer ok/bad, streak, streakLost, idle; "calm" releases) → the held pose + its emotion.
    @discardableResult public func mood(_ type: String, _ data: [String: Bool] = [:]) -> TeacherMood.Event? {
        if type == "calm" { pose(nil); return nil }
        guard let e = moodState.feed(type, data) else { return nil }
        pose(e.pose)
        return e
    }

    public func setReduceMotion(_ on: Bool) {
        guard on != reduceMotion, !isFrozen else { return }
        reduceMotion = on
        let m = Self.makeMachine(rig, who, calm: on)
        if !m.setEmotion(faceEmotion) { _ = m.setFaceEmotion(faceEmotion) }
        if let s = speech { m.speak(s) } else if let p = heldPose { m.hold(p) }
        machine = m
    }

    /// current pose being shown (nil = drawn face)
    public var currentPose: String? { lastFrame.flatMap { $0.poseW > 0 ? $0.pose : nil } }
    public var isSpeaking: Bool { machine.speaking }
}
