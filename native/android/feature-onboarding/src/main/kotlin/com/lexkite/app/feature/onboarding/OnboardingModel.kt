package com.lexkite.app.feature.onboarding

import com.lexkite.app.core.migration.Migration
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.StarterDeck
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Pure logic of the first-run onboarding (C17): no Android types, so JUnit covers it without a device. */

/** Screens in order. WELCOME has no progress; LANGUAGE..READY are steps 1..5 of [OnbFlow.TOTAL]. */
enum class OnbStep { WELCOME, LANGUAGE, GOAL, LEVEL, PACE, READY }

/** How the flow was left: the host maps each to a destination inside the app (Today or Me). */
enum class OnbExit { START, SKIP_ALL, HAVE_ACCOUNT }

enum class StartRoute { ONBOARDING, TODAY }

object OnbFlow {
    const val TOTAL = 5
    private val all = OnbStep.entries
    fun next(s: OnbStep): OnbStep? = all.getOrNull(s.ordinal + 1)
    /** Back from WELCOME is null: the system Back then leaves the app as usual (never traps the learner). */
    fun back(s: OnbStep): OnbStep? = all.getOrNull(s.ordinal - 1)
    /** Every step except READY can be skipped; skipping keeps the current (default) choice and moves on. */
    fun canSkip(s: OnbStep) = s != OnbStep.READY
    fun skip(s: OnbStep): OnbStep? = if (canSkip(s)) next(s) else null
    /** 1-based progress step, 0 on the Welcome screen. */
    fun stepNo(s: OnbStep) = s.ordinal
    fun fraction(s: OnbStep) = stepNo(s).toFloat() / TOTAL
}

class OnbStage(val id: String, val cefr: String, val band: String = "")
/** Variant chip; the labels are official exam names (not translated, same raw labels as web tracks.js). */
class OnbVariant(val id: String, val label: String)
/** Brand names (IELTS, TOEIC, TOEFL 2026) and the official TOEFL task names are not translated, as on web: [brand]/[subText] replace the keys. */
class OnbTrack(val id: String, private val nameKey: L10nKey?, private val brand: String?, private val subKey: L10nKey?, private val subText: String?, val stages: List<OnbStage>, val variants: List<OnbVariant> = emptyList()) {
    fun name(t: L10n) = brand ?: t(nameKey!!)
    fun sub(t: L10n) = subText ?: t(subKey!!)
}

/** Learning packs as web Tracks.TR (web/js/tracks.js, same ids / stage ids / CEFR labels, same order). */
object OnbTracks {
    val all = listOf(
        OnbTrack("comm", L10nKey.onbTrackComm, null, L10nKey.onbTrackCommSub, null, listOf(OnbStage("comm1", "A1 – A2"), OnbStage("comm2", "A2 – B1"), OnbStage("comm3", "B1 – B2"), OnbStage("comm4", "B2 – C1"))),
        OnbTrack("ielts", null, "IELTS", L10nKey.onbTrackIeltsSub, null,
            listOf(OnbStage("s0", "A1 – B1", "Band 4.0 – 5.0"), OnbStage("s1", "B1 – B2", "Band 5.5 – 6.0"), OnbStage("s2", "B2", "Band 6.5"), OnbStage("s3", "C1", "Band 7.0"), OnbStage("s4", "C1 – C2", "Band 7.5+")),
            listOf(OnbVariant("ac", "Academic"), OnbVariant("gt", "General Training"))),
        OnbTrack("toeic", null, "TOEIC", L10nKey.onbTrackToeicSub, null, listOf(OnbStage("toeic1", "A2 – B1"), OnbStage("toeic2", "B1"), OnbStage("toeic3", "B2"), OnbStage("toeic4", "B2 – C1")),
            listOf(OnbVariant("lr", "Listening & Reading"), OnbVariant("sw", "Speaking & Writing"))),
        OnbTrack("toefl", null, "TOEFL 2026", null, "Complete the Words · Build a Sentence · Listen and Choose a Response", listOf(OnbStage("toefl1", "B1"), OnbStage("toefl2", "B2"), OnbStage("toefl3", "C1"))),
        OnbTrack("work", L10nKey.onbTrackWork, null, L10nKey.onbTrackWorkSub, null, listOf(OnbStage("work1", "A2 – B1"), OnbStage("work2", "B1"), OnbStage("work3", "B2"), OnbStage("work4", "C1"))),
    )
    fun of(id: String) = all.firstOrNull { it.id == id } ?: all.first { it.id == "ielts" }
}

/** Daily intensity (web onboard.js paces / NEW_OF): the id is the value stored in `pace` and `dailyGoal`, [newWords] in `dailyNew`. */
class OnbPace(val id: Int, val name: L10nKey, val sub: L10nKey, val newWords: Int)
object OnbPaces {
    val all = listOf(
        OnbPace(10, L10nKey.onbPaceEasy, L10nKey.onbPaceEasySub, 5),
        OnbPace(20, L10nKey.onbPaceSteady, L10nKey.onbPaceSteadySub, 10),
        OnbPace(40, L10nKey.onbPaceFast, L10nKey.onbPaceFastSub, 20),
    )
    fun of(id: Int) = all.firstOrNull { it.id == id } ?: all[1]
}

/** What the learner picked. `level` "" = first stage of the track (as web), [PLACEMENT] = wants the quick placement test. */
data class OnbChoice(val lang: String? = null, val track: String = "ielts", val variant: String = "", val level: String = "", val pace: Int = 20) {
    val trackDef get() = OnbTracks.of(track)
    /** Stage shown as selected: the explicit one, else the first (web "chưa chọn = chặng đầu sáng sẵn"). */
    val stage: OnbStage get() = trackDef.stages.firstOrNull { it.id == level } ?: trackDef.stages.first()
    val placement get() = level == PLACEMENT
    /** Web examOf: IELTS General Training is its own exam id; TOEIC/TOEFL map 1:1; the two general packs are `general`. */
    val exam: String get() = when (track) { "ielts" -> if (variant == "gt") "ieltsgt" else "ielts"; "toeic" -> "toeic"; "toefl" -> "toefl"; else -> "general" }

    companion object { const val PLACEMENT = "test" }
}

/**
 * The settings the web writes at the end of its setup (web/js/onboard.js `go.onclick` + tracks.js `startSetup`), with the SAME keys,
 * so the sync document carries them unchanged: exam, examTarget, targetBand (IELTS), pace, dailyGoal, dailyNew, tracks, onboarded.
 */
object OnbSettings {
    private val defaultTarget = mapOf("ielts" to "7.0", "ieltsgt" to "6.5", "toeic" to "650", "toefl" to "4.5", "general" to "B1")
    fun target(exam: String) = defaultTarget[exam] ?: "B1"

    /** [choice] null = the learner skipped the whole setup: only `onboarded` is set (web default settings stay). Existing keys are kept. */
    fun apply(existing: JsonElement?, choice: OnbChoice?, nowMs: Long): JsonObject {
        val out = Js.spread(existing)
        out["onboarded"] = JsonPrimitive(true)
        if (choice == null) return JsonObject(out)
        val pace = OnbPaces.of(choice.pace)
        out["exam"] = JsonPrimitive(choice.exam)
        out["examTarget"] = JsonPrimitive(target(choice.exam))
        if (choice.exam.startsWith("ielts")) out["targetBand"] = JsonPrimitive(target(choice.exam))
        out["pace"] = JsonPrimitive(pace.id); out["dailyGoal"] = JsonPrimitive(pace.id); out["dailyNew"] = JsonPrimitive(pace.newWords)
        val lv = LinkedHashMap<String, JsonElement>()
        if (choice.level.isNotEmpty() && !choice.placement) lv[choice.track] = JsonObject(mapOf("s" to JsonPrimitive(choice.level), "at" to JsonPrimitive(nowMs)))
        fun variant(track: String, def: String) = JsonPrimitive(if (choice.track == track && choice.variant.isNotEmpty()) choice.variant else def)
        out["tracks"] = JsonObject(mapOf(
            "cur" to JsonPrimitive(choice.track), "on" to JsonArray(listOf(JsonPrimitive(choice.track))), "legacy" to JsonPrimitive(choice.track),
            "lv" to JsonObject(lv), "v" to JsonObject(mapOf("ielts" to variant("ielts", "ac"), "toeic" to variant("toeic", "lr"))), "goals" to JsonObject(emptyMap()),
        ))
        return JsonObject(out)
    }
}

/**
 * The starter deck web adds at the end of its setup (web/js/onboard.js `go.onclick`: first 3 topics of the chosen exam, words already in the deck untouched),
 * same cards as `Core.Cards.add` (core `StarterDeck`, bundled pack content-pack/starter.json). Only when the learner reaches the end ([OnbExit.START]):
 * skipping the whole setup or "I already have an account" adds nothing.
 */
object OnbStarter {
    fun apply(doc: SyncDoc, choice: OnbChoice?, exit: OnbExit, pack: StarterDeck.Pack?, nowMs: Long): SyncDoc =
        if (exit != OnbExit.START || choice == null || pack == null) doc else StarterDeck.add(doc, choice.exam, pack, nowMs)
}

/** First launch → onboarding; relaunch, or anyone who already has learning data (Capacitor migration, signed-in sync) → Today. */
object OnbGate {
    /** Web `hasData`: settings.onboarded, any card, or any XP. */
    fun hasLearnerData(doc: SyncDoc): Boolean =
        doc.cards.isNotEmpty() || Js.truthy(Js.prop(doc.settings, "onboarded")) || Js.num(Js.prop(doc.game, "xp")).let { !it.isNaN() && it > 0 }

    /** [migration] = outcome of this launch's C03 run (null when it did not run). FAILED/IMPORTED mean old data exists or may exist: never show setup over it. */
    fun route(done: Boolean, migration: Migration.Outcome?, doc: SyncDoc?): StartRoute = when {
        done -> StartRoute.TODAY
        migration == Migration.Outcome.IMPORTED || migration == Migration.Outcome.FAILED -> StartRoute.TODAY
        doc != null && hasLearnerData(doc) -> StartRoute.TODAY
        else -> StartRoute.ONBOARDING
    }
}
