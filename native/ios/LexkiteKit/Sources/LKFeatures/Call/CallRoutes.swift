import SwiftUI
import LKStore
import LKStrings

/// Route wiring of M4 P08 (called from AppShell's FocusScreen): `#/call` (the list) and `#/call/<id>` (the ring, then the call, then the summary) are ONE
/// full-screen flow – the router already lists `call` among its focus routes. An unknown id shows the list, like the web.
@MainActor
enum CallRoutes {
    static let focusRoutes: Set<String> = ["call"]
    static func handlesFocus(_ name: String) -> Bool { focusRoutes.contains(name) }
}

struct CallFocusScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        SkillsHost(make: { (ctx: SkillsContext) -> CallFlowModel in
            let io = SpeakIO.live(voice: ctx.core.voice)   // one recogniser for the whole flow
            return CallFlowModel(ctx: ctx, arg: route.arg, caps: CallCaps.probe(io), io: { io })
        }) { model in
            CallFlowView(model: model, onClose: { services.router.closeFocus() }, onRoute: { StudyRoutes.go($0, services: services) })
        }
    }
}
