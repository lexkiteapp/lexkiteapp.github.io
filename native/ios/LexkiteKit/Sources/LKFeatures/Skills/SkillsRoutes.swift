import SwiftUI
import LKStore

/// Route wiring of M4 P06 (called from AppShell's InnerScreen and FocusScreen):
/// pushed #/listening · #/listen/<part> · #/reading · #/read/<id>, full-screen #/listen-test/<n> · #/dictation/<part>.
@MainActor
enum SkillsRoutes {
    static let innerRoutes: Set<String> = ["listening", "listen", "reading", "read"]
    static let focusRoutes: Set<String> = ["listen-test", "dictation"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }
    static func handlesFocus(_ name: String) -> Bool { focusRoutes.contains(name) }
}

struct SkillsInnerScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        switch route.name {
        case "listen":
            if let p = SkillsContext.content.part(route.arg ?? "") {
                SkillsHost(make: { ListenPartModel(ctx: $0, part: p, exam: route.query["mode"] == "exam") }) { ListenPartView(model: $0, onRoute: go) }
            } else { hub(go) }   // unknown part → the hub, like the web
        case "reading": SkillsHost(make: { ReadingListModel(ctx: $0, query: route.query) }) { ReadingListView(model: $0, onRoute: go) }
        case "read":
            if let r = SkillsContext.content.reading(route.arg ?? "") {
                SkillsHost(make: { ReaderModel(ctx: $0, reading: r) }) { ReaderView(model: $0, onRoute: go) }
            } else { SkillsHost(make: { ReadingListModel(ctx: $0, query: [:]) }) { ReadingListView(model: $0, onRoute: go) } }
        default: hub(go)
        }
    }
    private func hub(_ go: @escaping (AppRoute) -> Void) -> some View {
        SkillsHost(make: { ListenHubModel(ctx: $0, query: route.query) }) { ListenHubView(model: $0, onRoute: go) }
    }
}

struct SkillsFocusScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        let close = { services.router.closeFocus() }
        if route.name == "listen-test" {
            if SkillsContext.content.parts(of: Int(route.arg ?? "") ?? 1).isEmpty { unknown } else {
                SkillsHost(make: { ListenTestModel(ctx: $0, test: Int(route.arg ?? "") ?? 1) }) { ListenTestView(model: $0, onClose: close, onRoute: go) }
            }
        } else if let p = SkillsContext.content.part(route.arg ?? "") {
            SkillsHost(make: { DictationModel(ctx: $0, part: p, query: route.query) }) { DictationView(model: $0, onClose: close, onRoute: go) }
        } else { unknown }
    }
    /// an unknown test / part → the hub (web: `routes.listening()`)
    private var unknown: some View {
        Color.clear.onAppear { services.router.closeFocus(); services.router.open(AppRoute("listening")) }
    }
}
