package com.lexkite.app.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlin.math.floor

/**
 * ONE reward rule for XP – Kotlin port of `Game.xpFor` / `Game.repCut` / `Game.XPR` (web/js/game.js); same as iOS LKStore/RewardRules.swift.
 * Conformance: vectors/rewards.json (RewardsVectorsTest). Integer semantics follow JS: `|0` truncation, Math.round = floor(x + 0.5).
 */
object RewardRules {
    const val PICK = 2; const val TYPE = 3; const val WRITE = 4; const val SAY = 3; const val HARD = 3; const val SET = 10; const val EXAM = 40; const val SEC = 30
    const val PERFECT = 5; const val MIN = 5; const val TALK = 10; const val ESSAY = 20; const val LEARN = 20; const val DAY = 15; const val STEP = 2; const val GREAT = 85; const val PASS = 65
    const val CAP = 150; const val GAME = 40
    /** card XP by [again, review, new] */
    val CARD = intArrayOf(2, 5, 8)

    /** Per-answer XP of a mode (unknown → pick), like `XPR[r.mode] || XPR.pick`. */
    fun perAnswer(mode: String?): Int = when (mode) {
        "pick" -> PICK; "type" -> TYPE; "write" -> WRITE; "say" -> SAY; "hard" -> HARD; "set" -> SET; "exam" -> EXAM; "sec" -> SEC; "perfect" -> PERFECT
        "min" -> MIN; "talk" -> TALK; "essay" -> ESSAY; "learn" -> LEARN; "day" -> DAY; "step" -> STEP; else -> PICK
    }

    fun jsRound(x: Double): Int = floor(x + 0.5).toInt()

    /** xp = xpFor(kind, args). Every argument is optional, exactly like the JS `r = {}` object. */
    fun xp(kind: String, right: Int = 0, total: Int = 0, mode: String? = null, hard: Boolean = false, hints: Int = 0, score: Double? = null,
           paid: Boolean = false, words: Double = 0.0, sections: Int = 0, isNew: Boolean = false, again: Boolean = false): Int {
        val n = maxOf(0, right); val per = perAnswer(mode); val h = minOf(hints, n)
        val full = if (total >= 3 && n >= total) PERFECT else 0
        val x = when (kind) {
            "answer" -> per + (if (hard) HARD else 0)
            "say" -> if (score == null) SAY else if (score >= GREAT) 5 else if (score >= PASS) 3 else 0
            "card" -> CARD[if (again) 0 else if (isNew) 2 else 1]
            "talk" -> maxOf(MIN, TALK + SAY * n - h)
            "essay" -> ESSAY
            "learn" -> LEARN
            "day" -> DAY
            "output" -> minOf(60, jsRound(words / 5))
            "exam" -> EXAM + per * n + SEC * sections + full
            "set", "game" -> maxOf(MIN, SET + (if (paid) 0 else per * n) + full - h)
            else -> STEP
        }
        return minOf(if (kind == "game") GAME else CAP, maxOf(0, x))
    }

    /** web `Game._track` anti-repeat: the same [src] again on one local [day] -> 3rd-4th completion half XP, 5th+ at most 2. [ledger] = the device-only "xprep" value `{"k":day,"m":{src:count}}`; returns the XP and the new ledger. */
    fun cutRepeat(ledger: String?, xp: Int, src: String, day: String): Pair<Int, String> {
        val old = runCatching { Json.parseToJsonElement(ledger ?: "").jsonObject }.getOrNull()
        val m = LinkedHashMap<String, Int>()
        if (old != null && (old["k"] as? JsonPrimitive)?.content == day) (old["m"] as? JsonObject)?.forEach { (k, v) -> (v as? JsonPrimitive)?.content?.toIntOrNull()?.let { m[k] = it } }
        val c = (m[src] ?: 0) + 1; m[src] = c
        val out = JsonObject(mapOf("k" to JsonPrimitive(day), "m" to JsonObject(m.mapValues { JsonPrimitive(it.value) })))
        return repCut(xp, c) to out.toString()
    }

    /** XP for the count-th completion of the same src on one local day. */
    fun repCut(xp: Int, count: Int): Int = if (count >= 5) minOf(xp, STEP) else if (count >= 3) jsRound(xp / 2.0) else xp
}
