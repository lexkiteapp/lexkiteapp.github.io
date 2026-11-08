import SwiftUI

/// Route wiring of the dictionary / verb / usage / writing screens (called from AppShell's InnerScreen):
/// #/dict · #/verb · #/usage · #/letters · #/ideas · #/paraphrase · #/phrases · #/models · #/model.
enum DictRoutes {
    static let innerRoutes: Set<String> = ["dict", "verb", "usage", "letters", "ideas", "paraphrase", "phrases", "models", "model"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }
}

struct DictInnerScreen: View {
    let route: AppRoute
    var body: some View {
        switch route.name {
        case "dict": DictView(route: route)
        case "verb": VerbView(route: route)
        case "usage": UsageView(route: route)
        case "letters": WritingLettersView(route: route)
        case "ideas": WritingIdeasView(route: route)
        case "paraphrase": WritingParaphraseView()
        case "phrases": WritingPhrasesView()
        case "models": WritingModelsView(route: route)
        default: WritingModelView(route: route)
        }
    }
}
