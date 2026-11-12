package com.lexkite.app.feature.vocab

import androidx.compose.runtime.Composable

/** Web hash routes (first path segment) that [WordRoute] draws: dictionary + word card, verbs, usage, the writing library, the Writing Room (write, task1) and the criteria / progress pages (criteria, qstats). */
val WORD_ROUTES: Set<String> = setOf("dict", "word", "verb", "usage", "letters", "ideas", "paraphrase", "phrases", "models", "model", "write", "task1", "qstats", "criteria", "fix", "grammar", "method", "quick", "style", "confidence")

/**
 * One entry point for the app shell: [route] is the first segment of the web hash route (`#/dict/went` -> route `dict`, arg `went`),
 * [query] the raw query string, [open] takes a web route (`"verb/go"`, `"model/gt-gt1"`) and navigates inside the frame.
 */
@Composable
fun WordRoute(env: WordEnv, route: String, arg: String, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    when (route) {
        "dict", "word" -> DictRoute(env, arg, onExit, open)
        "verb" -> VerbRoute(env, arg, query, onExit, open)
        "usage" -> UsageRoute(env, arg, query, onExit, open)
        "letters" -> LettersRoute(env, arg, query, onExit, open)
        "ideas" -> IdeasRoute(env, arg, onExit, open)
        "paraphrase" -> ParaphraseRoute(env, onExit, open)
        "phrases" -> PhrasesRoute(env, onExit, open)
        "models" -> ModelsRoute(env, query, onExit, open)
        "model" -> ModelRoute(env, arg, onExit, open)
        "write" -> EssayRoute(env, false, arg, onExit, open)
        "task1" -> EssayRoute(env, true, arg, onExit, open)
        "qstats" -> QStatsRoute(env, onExit, open)
        "criteria" -> CriteriaRoute(env, arg, query, onExit, open)
        "fix" -> FixRoute(env, onExit, open)
        "grammar" -> GrammarRoute(env, arg, query, onExit, open)
        "method" -> MethodRoute(env, onExit, open)
        "quick" -> QuickRoute(env, onExit, open)
        "style" -> StyleRoute(env, onExit, open)
        "confidence" -> ConfidenceRoute(env, arg, onExit, open)
    }
}
