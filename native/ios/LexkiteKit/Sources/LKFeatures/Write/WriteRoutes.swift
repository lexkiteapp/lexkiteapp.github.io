import SwiftUI
import LKStore
import LKSync

/// Route wiring of M4 P09 (called from AppShell): pushed #/write · #/task1 · #/qstats · #/criteria · #/fix · #/grammar · #/method · #/style · #/confidence, full-screen #/quick.
@MainActor
enum WriteRoutes {
    static let innerRoutes: Set<String> = ["write", "task1", "qstats", "criteria", "fix", "grammar", "method", "style", "confidence"]
    static let focusRoutes: Set<String> = ["quick"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }
    static func handlesFocus(_ name: String) -> Bool { focusRoutes.contains(name) }
}

struct WriteInnerScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        switch route.name {
        case "write": SkillsHost(make: { EssayModel(ctx: $0, kind: .task2, arg: route.arg) }) { EssayView(model: $0, onRoute: go) }
        case "task1": SkillsHost(make: { EssayModel(ctx: $0, kind: .task1, arg: route.arg) }) { EssayView(model: $0, onRoute: go) }
        case "qstats": SkillsHost(make: { QStatsModel(ctx: $0) }) { QStatsView(model: $0, onRoute: go) }
        case "fix": SkillsHost(make: { _ in FixModel() }) { FixView(model: $0, onRoute: go) }
        case "method": SkillsHost(make: { MethodModel(ctx: $0) }) { MethodView(model: $0, onRoute: go) }
        case "style": SkillsHost(make: { StyleModel(ctx: $0) }) { StyleView(model: $0, onRoute: go) }
        case "grammar": GrammarScreen(route: route, go: go)
        case "confidence": ConfidenceScreen(route: route, go: go)
        default: SkillsHost(make: { CriteriaModel(ctx: $0, route: route) }) { CriteriaView(model: $0, onRoute: go) }
        }
    }
}

struct WriteFocusScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        SkillsHost(make: { QuickModel(ctx: $0) }) { QuickView(model: $0, onClose: { services.router.closeFocus() }, onRoute: { StudyRoutes.go($0, services: services) }) }
    }
}

/// #/grammar (hub) · #/grammar/mix[?ch=&n=] · #/grammar/<lesson>[?view=full]
struct GrammarScreen: View {
    let route: AppRoute
    let go: (AppRoute) -> Void
    @State private var version = 0
    var body: some View {
        Group {
            if route.arg == "mix" {
                SkillsHost(make: { GrammarMixModel(ctx: $0, chapter: route.query["ch"].flatMap { Int($0) }, count: route.query["n"].flatMap { Int($0) } ?? 20) }) { GrammarMixView(model: $0, onRoute: go) }
            } else if let id = route.arg, !id.isEmpty {
                SkillsHost(make: { GrammarLessonModel(ctx: $0, id: id, full: route.query["view"] == "full") }) { GrammarLessonView(model: $0, onRoute: go) }
            } else {
                SkillsHost(make: { GrammarHubModel(ctx: $0) }) { GrammarHubView(model: $0, onRoute: go) }
            }
        }
        .id(route.id + "#\(version)")
    }
}

private struct RoleplayItem: Identifiable { let id: String; let script: JSON }

/// #/confidence · #/confidence/<unit>[#<phrase>] · #/confidence/toolkit[#<phrase>] · #/confidence/daily
struct ConfidenceScreen: View {
    let route: AppRoute
    let go: (AppRoute) -> Void
    @Environment(AppServices.self) private var services
    @State private var roleplay: RoleplayItem?
    private var page: ConfidenceModel.Page {
        let parts = (route.arg ?? "").split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
        let id = (parts.first ?? "").split(separator: "/").first.map(String.init) ?? "", frag = parts.count > 1 && !parts[1].isEmpty ? parts[1] : nil
        switch id { case "": return .overview; case "toolkit": return .toolkit(frag); case "daily": return .daily; default: return .unit(id, phrase: frag) }
    }
    var body: some View {
        SkillsHost(make: { ConfidenceModel(ctx: $0, page: page, io: .live(voice: $0.core.voice)) }) { m in
            ConfidenceView(model: m, onRoute: go, onRoleplay: { u in roleplay = RoleplayItem(id: u.s("id"), script: Confidence.roleplayScript(u)) })
                .fullScreenCover(item: $roleplay) { item in
                    NavigationStack {
                        SkillsHost(make: { ctx in
                            RoleplayFlowModel(ctx: ctx, script: item.script, rules: RoleplayContent.rules, signedIn: services.auth.user != nil,
                                              server: { LexkiteAIServer(token: { [weak services] in
                                                  guard let a = services?.auth, a.user != nil else { return nil }
                                                  return try? await a.auth.idToken(forceRefresh: false)
                                              }, device: LexkiteAIServer.deviceID()) },
                                              io: { SpeakIO.live(voice: ctx.core.voice) })
                        }) { RoleplayFlowView(model: $0, onRoute: go) }
                    }
                }
        }
    }
}
