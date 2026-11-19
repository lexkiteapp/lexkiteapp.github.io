import Foundation

/// Port of web/js/teacher-mood.js `machine()`: one emotional state for the teacher across the app.
/// answer ok → cheer · wrong → concern, from the 2nd wrong in a row → encourage · streak → laugh · streakLost → empathy · idle → encourage · unknown → nil.
/// The face emotion of a pose is `rig.poseEmo[pose] ?? pose` (Chars.POSE_EMO).
public struct TeacherMood: Sendable {
    public struct Event: Equatable, Sendable { public let type: String; public let pose: String; public let emo: String }
    public private(set) var ok = 0, bad = 0
    let poseEmo: [String: String]

    public init(rig: Rig) { poseEmo = rig.def.poseEmo }

    public mutating func feed(_ type: String, _ data: [String: Bool] = [:]) -> Event? {
        let pose: String
        switch type {
        case "answer":
            if data["ok"] == true { ok += 1; bad = 0; pose = "cheer" } else { bad += 1; ok = 0; pose = bad > 1 ? "encourage" : "concern" }
        case "streak": pose = "laugh"
        case "streakLost": pose = "empathy"
        case "idle": pose = "encourage"
        default: return nil
        }
        return Event(type: type, pose: pose, emo: poseEmo[pose] ?? pose)
    }
}
