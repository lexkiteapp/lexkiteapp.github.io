import SwiftUI
import LKStore
import LKStrings

/// Route wiring of M4 P07 (called from AppShell's InnerScreen and FocusScreen), the same split as the router's `focusRoutes`:
/// pushed #/speak (behind the `speak_pack` flag, default off) · #/speaking · #/pron · #/rtype · #/roleplay, full-screen #/say · #/reflex · #/handsfree.
@MainActor
enum SpeakRoutes {
    static let innerRoutes: Set<String> = ["speak", "speaking", "pron", "rtype", "roleplay"]
    static let focusRoutes: Set<String> = ["say", "reflex", "handsfree"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }
    static func handlesFocus(_ name: String) -> Bool { focusRoutes.contains(name) }
    /// the web flag `speak_pack` (Remote Config key not in flags.json yet): off unless the app sets this default
    static let speakPackKey = "flag.speak_pack"
    static func speakPackOn(_ d: UserDefaults = .standard) -> Bool { d.bool(forKey: speakPackKey) }
}

struct SpeakInnerScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        switch route.name {
        case "speak":
            if SpeakRoutes.speakPackOn() { SpeakSituationScreen(route: route) }
            else { Color.clear.onAppear { services.router.open(AppRoute("skills")) } }   // flag off → #/skills, like the web
        case "speaking": SpeakingScreen(route: route)
        case "pron": PronScreen(route: route)
        case "rtype": RtypeScreen(route: route)
        default: RoleplayScreen(route: route)
        }
    }
}

struct SpeakFocusScreen: View {
    let route: AppRoute
    var body: some View {
        switch route.name {
        case "say": SayScreen(route: route)
        case "reflex": ReflexScreen(route: route)
        default: HandsfreeScreen(route: route)
        }
    }
}

/// The recogniser's error codes as the learner reads them (web `ui.js` REC_ERR, ids speak.ui.*)
enum SpeakErrors {
    static func message(_ code: String, _ t: L10n) -> String {
        switch code {
        case "not-allowed": return "⚠️ " + t(.speakMicDeniedNative)
        case "service-not-allowed": return "⚠️ " + t(.speakUiTrinhDuyetDangChan)
        case "no-speech": return "🤫 " + t(.speakUiKhongNgheThayGi)
        case "audio-capture": return "🎙️ " + t(.speakUiKhongTimThayMicro)
        case "network", "language-not-supported": return "📶 " + t(.speakUiKhongKetNoiDuoc)
        case "busy": return t(.speakUiMicroDangBanThu)
        case "whisper": return "⚠️ " + t(.speakUiChuaChayDuocNhan)
        default: return t(.speakUiLoiNhanDangErr, ["err": code])
        }
    }
}
