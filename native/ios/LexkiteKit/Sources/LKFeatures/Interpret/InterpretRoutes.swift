import SwiftUI
import LKStore
import LKStrings

/// Route wiring of Phiên dịch (called from AppShell's InnerScreen): `#/interpret[/phrases[/<group>]|/history|/recap/<id>]`, a pushed screen in the Skills tab
/// (a tool, never a main tab). Free end to end: Speech + Translation + NLLanguageRecognizer + AVSpeech on the device.
@MainActor
enum InterpretRoutes {
    static let innerRoutes: Set<String> = ["interpret"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }

    /// the live device side; the translator's online fallback is the free dictionary service, like the web (`Dict.translateTo`)
    static func liveIO(voice: LKVoicePlayer) -> InterpIO {
        let service = DictionaryService(network: DictURLNetwork(), lex: LexStore(loader: nil), cache: nil, config: DictConfig())
        #if os(iOS)
        let rec: SpeakRecognizing = SFSpeakRecognizer()
        #else
        let rec: SpeakRecognizing = ScriptedRecognizer()
        #endif
        return InterpIO(recognizer: rec,
                        translator: AppleInterpTranslator(fallback: { text, from, to in await service.translateTo(text, tl: to, sl: from) }),
                        detector: NLInterpDetector(), speaker: AVInterpSpeaker(voice: voice))
    }
}

struct InterpretInnerScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        if route.arg?.hasPrefix("recap/") == true {
            SkillsHost(make: { InterpretRecapModel(ctx: $0, io: InterpretRoutes.liveIO(voice: $0.core.voice), id: String(route.arg!.dropFirst(6))) }) { InterpretRecapGate(model: $0, onRoute: go) }
        } else {
            SkillsHost(make: { InterpretHubModel(ctx: $0, io: InterpretRoutes.liveIO(voice: $0.core.voice), arg: route.arg) }) { InterpretView(model: $0, onRoute: go) }
        }
    }
}

/// an unknown conversation id → the history (web: `recap(id)` → `history()`)
private struct InterpretRecapGate: View {
    let model: InterpretRecapModel
    var onRoute: (AppRoute) -> Void
    var body: some View {
        if model.conv == nil { Color.clear.onAppear { onRoute(AppRoute("interpret", arg: "history")) } }
        else { InterpretRecapView(model: model, onRoute: onRoute) }
    }
}
