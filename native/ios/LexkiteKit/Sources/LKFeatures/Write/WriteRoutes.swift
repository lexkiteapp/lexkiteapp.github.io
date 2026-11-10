import SwiftUI
import LKStore

/// Route wiring of M4 P09 (called from AppShell's InnerScreen): pushed #/write · #/task1 · #/qstats · #/criteria.
@MainActor
enum WriteRoutes {
    static let innerRoutes: Set<String> = ["write", "task1", "qstats", "criteria"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }
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
        default: SkillsHost(make: { CriteriaModel(ctx: $0, route: route) }) { CriteriaView(model: $0, onRoute: go) }
        }
    }
}
