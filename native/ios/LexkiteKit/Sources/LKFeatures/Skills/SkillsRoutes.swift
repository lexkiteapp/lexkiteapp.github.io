import SwiftUI
import LKStore
import LKDesign
import LKStrings

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

/// The Skills tab root: the doors of M4 P06 (Listening, Reading) and P07 (speaking); more skills join as their items land.
struct SkillsHubView: View {
    let tab: LKFrame.Tab
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .hub, title: t(L10nKey(rawValue: tab.label) ?? .tabSkills))
            ScrollView {
                VStack(spacing: LKSpacing.spaceSm) {
                    door("headphones", t(.skillListenLuyenNgheIelts), AppRoute("listening"))
                    door("book.fill", t(.skillReadBaiDocIelts), AppRoute("reading"))
                    // M4 P07: the speaking doors (#/speak only behind the speak_pack flag, like the web)
                    if SpeakRoutes.speakPackOn() { door("figure.walk", t(.speakSpLuyenNoiTheoCau), AppRoute("speak")) }
                    door("mic.fill", t(.speakSpkPhongLuyenSpeaking), AppRoute("speaking"))
                    door("waveform", t(.speakPronThuVienPhatAm), AppRoute("pron"))
                    door("bubble.left.and.bubble.right.fill", t(.speakRpHoiThoaiDongVai), AppRoute("roleplay"))
                    door("phone.fill", t(.callUiGoiChoAmaCarlos), AppRoute("call"))   // M4 P08
                    door("quote.bubble.fill", t(.speakSayNoiNhuNguoiBan), AppRoute("say"))
                    door("bolt.fill", t(.speakReflexPhanXa60Giay), AppRoute("reflex"))
                    door("list.bullet.rectangle.fill", t(.speakRtypeCacDangCauHoi), AppRoute("rtype"))
                    door("headphones.circle.fill", t(.revHandsFreeMode), AppRoute("handsfree"))
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .accessibilityIdentifier("tab-skills")
    }
    private func door(_ icon: String, _ title: String, _ r: AppRoute) -> some View {
        Button { services.router.open(r) } label: {
            SkillCard {
                HStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: icon).font(.system(size: 22, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: 36).accessibilityHidden(true)
                    Text(verbatim: title).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.forward").font(.system(size: 13, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
                }
                .frame(minHeight: 44)
            }
        }
        .buttonStyle(LKPressStyle())
    }
}
