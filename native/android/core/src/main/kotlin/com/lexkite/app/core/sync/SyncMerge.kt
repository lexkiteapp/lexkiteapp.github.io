package com.lexkite.app.core.sync

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import com.lexkite.app.core.sync.Js.prop
import com.lexkite.app.core.sync.Js.spread
import com.lexkite.app.core.sync.Js.truthy

/**
 * The shared learning document (data contract, docs/specs/native-apps.md §4): the same shape web, add-on, iOS and Android sync.
 * Cards stay in the web "slim" form (Cards.make fields minus re-derivable ones); every unknown field is kept verbatim (lossless).
 * Kotlin null = absent (JS undefined).
 */
data class SyncDoc(
    val cards: Map<String, JsonObject> = emptyMap(),
    val deleted: Map<String, JsonElement> = emptyMap(),
    val stats: JsonElement? = null,
    val game: JsonElement? = null,
    val settings: JsonElement? = null,
    val settingsAt: JsonElement? = null,
) {
    fun toJson(): JsonObject = JsonObject(buildMap {
        put("cards", JsonObject(cards)); put("deleted", JsonObject(deleted))
        stats?.let { put("stats", it) }; game?.let { put("game", it) }; settings?.let { put("settings", it) }; settingsAt?.let { put("settingsAt", it) }
    })

    companion object {
        fun from(o: JsonObject): SyncDoc = SyncDoc(
            cards = (o["cards"] as? JsonObject)?.mapNotNull { (k, v) -> (v as? JsonObject)?.let { k to it } }?.toMap(LinkedHashMap()) ?: emptyMap(),
            deleted = (o["deleted"] as? JsonObject)?.toMap(LinkedHashMap()) ?: emptyMap(),
            stats = o["stats"], game = o["game"], settings = o["settings"], settingsAt = o["settingsAt"],
        )
        /** Core.Stats.get() default. */
        val DEFAULT_STATS = JsonObject(mapOf("days" to Js.EMPTY, "newToday" to JsonObject(mapOf("day" to JsonPrimitive(""), "n" to Js.ZERO))))
    }
}

/** Line-by-line port of the deterministic two-way merge in web/js/sync.js (commutative + idempotent). Verified by vectors/sync.json. */
object SyncMerge {
    const val PRUNE_MS = 90L * 86_400_000L

    /** `activity(c) = Math.max(c.srs && c.srs.last || 0, c.added || 0, c.mod || 0)` */
    fun activity(c: JsonElement?): Double {
        val srs = prop(c, "srs")
        val last: JsonElement? = if (!truthy(srs)) Js.ZERO else Js.or(prop(srs, "last"), Js.ZERO)
        return java.lang.Math.max(java.lang.Math.max(Js.num(last), Js.num(Js.or(prop(c, "added"), Js.ZERO))), Js.num(Js.or(prop(c, "mod"), Js.ZERO)))
    }

    /** `stable(v)` – JSON with sorted keys; ties broken by plain UTF-16 string compare. */
    fun stable(v: JsonElement?): String = Js.stringify(v, sortKeys = true)

    fun mergeCards(a: Map<String, JsonObject>, b: Map<String, JsonObject>, deleted: Map<String, JsonElement> = emptyMap()): Map<String, JsonObject> {
        val out = LinkedHashMap(a)
        for ((k, c) in b) {
            val mine = out[k]
            if (mine == null) { out[k] = c; continue }
            val ac = activity(c); val am = activity(mine)
            val remoteWins = ac > am || (ac == am && stable(c) > stable(mine))
            val win = LinkedHashMap<String, JsonElement>(if (remoteWins) c else mine)
            val lose = if (remoteWins) mine else c
            val wc = arr(win["contexts"]); val lc = arr(lose["contexts"])
            val merged = wc + lc.filter { x -> wc.none { y -> Js.strictEq(prop(y, "text"), prop(x, "text")) } }
            win["contexts"] = JsonArray(merged.take(5))
            out[k] = JsonObject(win)
        }
        for ((k, t) in deleted) { val c = out[k]; if (c != null && activity(c) < Js.num(t)) out.remove(k) }
        return out
    }
    /** `x || []` iterated with spread – non-arrays spread as nothing (strings would spread chars; never stored by web). */
    private fun arr(e: JsonElement?): List<JsonElement> = if (truthy(e)) (e as? JsonArray) ?: emptyList() else emptyList()

    private inline fun ord(a: JsonElement?, b: JsonElement?, f: (JsonElement?, JsonElement?) -> JsonElement?): JsonElement? =
        if (truthy(a) && truthy(b) && stable(b) < stable(a)) f(b, a) else f(a, b)

    fun mergeStats(a: JsonElement?, b: JsonElement?): JsonElement? = ord(a, b, ::mergeStats0)
    private fun mergeStats0(a: JsonElement?, b: JsonElement?): JsonElement {
        val days = spread(prop(a, "days"))
        for ((k, v) in Js.entries(Js.or(prop(b, "days"), Js.EMPTY))) days[k] = Js.max(Js.or(days[k], Js.ZERO), v)
        val an = prop(a, "newToday"); val bn = prop(b, "newToday")
        val nt: JsonElement? = if (truthy(an) && truthy(bn) && Js.strictEq(prop(an, "day"), prop(bn, "day")))
            JsonObject(LinkedHashMap<String, JsonElement>().apply { prop(an, "day")?.let { put("day", it) }; put("n", Js.max(prop(an, "n"), prop(bn, "n"))) })
        else if (truthy(an) && Js.gt(prop(an, "day"), prop(Js.or(bn, Js.EMPTY), "day"))) an
        else Js.or(bn, an)
        val ha = (prop(a, "hours") as? JsonArray) ?: emptyList<JsonElement>()
        val hb = (prop(b, "hours") as? JsonArray) ?: emptyList<JsonElement>()
        val out = linkedMapOf<String, JsonElement>("days" to JsonObject(days))
        if (nt != null) out["newToday"] = nt
        if (ha.isNotEmpty() || hb.isNotEmpty()) out["hours"] = JsonArray(List(24) { i -> Js.max(Js.or(ha.getOrNull(i), Js.ZERO), Js.or(hb.getOrNull(i), Js.ZERO)) })
        return JsonObject(out)
    }

    /** `maxMerge(x = {}, y = {})` */
    private fun maxMerge(x: JsonElement?, y: JsonElement?): JsonElement {
        val o = spread(Js.or(x, Js.EMPTY))
        for ((k, v) in Js.entries(Js.or(y, Js.EMPTY))) {
            val cur = o[k]
            o[k] = if (Js.isNumber(v) && Js.isNumber(cur)) Js.max(cur, v) else if (cur != null && cur !is JsonNull) cur else v
        }
        return JsonObject(o)
    }
    private fun assign(vararg xs: JsonElement?): JsonObject { val o = LinkedHashMap<String, JsonElement>(); for (x in xs) o.putAll(spread(Js.or(x, Js.EMPTY))); return JsonObject(o) }

    private fun mergeRet(a: JsonElement?, b: JsonElement?): JsonElement? {
        if (!truthy(b)) return a; if (!truthy(a)) return b
        val ev = LinkedHashMap<String, JsonElement>()
        for (src in listOf(Js.or(prop(a, "ev"), Js.EMPTY), Js.or(prop(b, "ev"), Js.EMPTY))) for ((id, arr) in Js.entries(src)) {
            val all = arrList(Js.or(ev[id], JsonArray(emptyList()))) + arrList(arr)
            val set = ArrayList<JsonElement>(); for (x in all) if (set.none { sameValueZero(it, x) }) set.add(x)
            ev[id] = JsonArray(set.sortedWith { p, q -> sortKey(p).compareTo(sortKey(q)) }.take(7))
        }
        val lead = if (Js.num(prop(b, "frameAt")).let { if (it.isNaN()) 0.0 else it } > Js.num(prop(a, "frameAt")).let { if (it.isNaN()) 0.0 else it }) b else a
        val frameAtN = Js.num(prop(lead, "frameAt"))
        return JsonObject(linkedMapOf<String, JsonElement>(
            "ms" to assign(prop(b, "ms"), prop(a, "ms")), "own" to assign(prop(b, "own"), prop(a, "own")), "evDone" to assign(prop(b, "evDone"), prop(a, "evDone")),
            "ev" to JsonObject(ev),
            "opened" to Js.max(numOr0(prop(a, "opened")), numOr0(prop(b, "opened"))),
            "frame" to (Js.or(prop(lead, "frame"), JsonPrimitive("")) ?: JsonPrimitive("")),
            "frameAt" to (if (frameAtN.isNaN() || frameAtN == 0.0) Js.ZERO else (prop(lead, "frameAt")?.takeIf { Js.isNumber(it) } ?: Js.number(frameAtN))),
        ))
    }
    /** `+x || 0` */
    private fun numOr0(x: JsonElement?): JsonElement { val d = Js.num(x); return if (d.isNaN() || d == 0.0) Js.ZERO else if (Js.isNumber(x)) x!! else Js.number(d) }
    private fun arrList(e: JsonElement?): List<JsonElement> = (e as? JsonArray) ?: emptyList()
    private fun sameValueZero(x: JsonElement, y: JsonElement) = if (x is JsonObject || x is JsonArray || y is JsonObject || y is JsonArray) x === y else Js.strictEq(x, y)
    /** Array.prototype.sort() default comparator: String(x) by UTF-16 units. */
    private fun sortKey(e: JsonElement): String = when {
        e is JsonNull -> "null"
        e is JsonPrimitive && e.isString -> e.content
        e is JsonPrimitive -> if (Js.isNumber(e)) Js.numStr(e.content.toDouble()) else e.content
        e is JsonArray -> e.joinToString(",") { if (it is JsonNull) "" else sortKey(it) }
        else -> "[object Object]"
    }

    fun mergeGame(a: JsonElement?, b: JsonElement?): JsonElement? = ord(a, b, ::mergeGame0)
    private fun mergeGame0(a: JsonElement?, b: JsonElement?): JsonElement? {
        if (!truthy(b)) return a; if (!truthy(a)) return b
        val days = spread(prop(a, "days"))
        for ((k, v) in Js.entries(Js.or(prop(b, "days"), Js.EMPTY))) {
            val d = spread(Js.or(days[k], Js.EMPTY))
            for ((m, n) in Js.entries(v)) d[m] = Js.max(Js.or(d[m], Js.ZERO), n)
            days[k] = JsonObject(d)
        }
        val total = spread(prop(a, "total")); for ((m, n) in Js.entries(Js.or(prop(b, "total"), Js.EMPTY))) total[m] = Js.max(Js.or(total[m], Js.ZERO), n)
        val best = spread(prop(a, "best"))
        val bb = prop(b, "best"); if (truthy(bb) && truthy(prop(bb, "match"))) best["match"] = Js.min(Js.or(best["match"], JsonPrimitive(1_000_000_000)), prop(bb, "match"))
        val unitDone = spread(Js.or(prop(b, "unitDone"), Js.EMPTY))
        for ((k, v) in Js.entries(Js.or(prop(a, "unitDone"), Js.EMPTY))) unitDone[k] = Js.max(Js.or(unitDone[k], Js.ZERO), v)
        val lead = if (Js.gt(Js.or(prop(b, "xp"), Js.ZERO), Js.or(prop(a, "xp"), Js.ZERO))) b else a
        val rtype = spread(Js.or(prop(b, "rtype"), Js.EMPTY))
        for ((k, v) in Js.entries(Js.or(prop(a, "rtype"), Js.EMPTY))) { val o = rtype[k]; if (!truthy(o) || Js.gt(prop(v, "t"), prop(o, "t"))) rtype[k] = v }
        val at = prop(Js.or(prop(a, "toeicBest"), Js.EMPTY), "total"); val bt = Js.or(prop(Js.or(prop(b, "toeicBest"), Js.EMPTY), "total"), Js.ZERO)
        val toeic = if (at != null && Js.ge(at, bt)) prop(a, "toeicBest") else prop(b, "toeicBest")

        val o = LinkedHashMap<String, JsonElement>()
        o.putAll(spread(b)); o.putAll(spread(a))
        o["xp"] = Js.max(Js.or(prop(a, "xp"), Js.ZERO), Js.or(prop(b, "xp"), Js.ZERO))
        o["days"] = JsonObject(days); o["total"] = JsonObject(total); o["best"] = JsonObject(best); o["unitDone"] = JsonObject(unitDone)
        o["freezes"] = Js.or(prop(lead, "freezes"), Js.ZERO)!!
        o["freezeAt"] = Js.max(Js.or(prop(a, "freezeAt"), Js.ZERO), Js.or(prop(b, "freezeAt"), Js.ZERO))
        o["frozen"] = assign(prop(b, "frozen"), prop(a, "frozen"))
        o["listenDone"] = maxMerge(prop(a, "listenDone"), prop(b, "listenDone")); o["grammarDone"] = maxMerge(prop(a, "grammarDone"), prop(b, "grammarDone"))
        o["pronDone"] = maxMerge(prop(a, "pronDone"), prop(b, "pronDone")); o["listenBest"] = maxMerge(prop(a, "listenBest"), prop(b, "listenBest"))
        o["rtype"] = JsonObject(rtype)
        if (toeic != null) o["toeicBest"] = toeic else o.remove("toeicBest")
        o["badges"] = assign(prop(b, "badges"), prop(a, "badges")); o["readDone"] = assign(prop(b, "readDone"), prop(a, "readDone")); o["questsDone"] = assign(prop(b, "questsDone"), prop(a, "questsDone"))
        if (truthy(prop(a, "ret")) || truthy(prop(b, "ret"))) mergeRet(prop(a, "ret"), prop(b, "ret"))?.let { o["ret"] = it }
        return JsonObject(o)
    }

    fun pruneDel(d: Map<String, JsonElement>, now: Long): Map<String, JsonElement> = d.filterValues { !(Js.num(it) < (now - PRUNE_MS).toDouble()) }

    /**
     * mergeIn(remote, remoteCards) of web/js/sync.js applied to a local doc: tombstones = max of both, cards by per-card latest activity,
     * stats/game via mergeStats/mergeGame, settings by settingsAt (remote must be strictly newer). `now` = pruning clock (null = no pruning).
     */
    fun merge(local: SyncDoc, remote: SyncDoc, now: Long? = null): SyncDoc {
        val del = LinkedHashMap<String, JsonElement>(remote.deleted)
        for ((k, t) in local.deleted) del[k] = Js.max(Js.or(del[k], Js.ZERO), t)
        val deleted = if (now != null) pruneDel(del, now) else del
        val cards = mergeCards(local.cards, remote.cards, deleted)
        val stats = mergeStats(local.stats ?: SyncDoc.DEFAULT_STATS, Js.or(remote.stats, JsonObject(mapOf("days" to Js.EMPTY))))
        val game = mergeGame(local.game, remote.game)
        val takeRemote = truthy(remote.settings) && Js.gt(Js.or(remote.settingsAt, Js.ZERO), local.settingsAt ?: Js.ZERO)
        return SyncDoc(cards, deleted, stats, game, if (takeRemote) remote.settings else local.settings, if (takeRemote) remote.settingsAt else local.settingsAt)
    }

    /** game.js EMPTY() */
    fun gameEmpty(): JsonObject = JsonObject(linkedMapOf("xp" to Js.ZERO, "days" to Js.EMPTY,
        "total" to JsonObject(listOf("reviews", "newWords", "quizzes", "perfect", "matches", "spoken", "readings", "lookups").associateWith { Js.ZERO }),
        "best" to Js.EMPTY, "badges" to Js.EMPTY, "questsDone" to Js.EMPTY))
    /** Game.get(): stored game over EMPTY(), totals over EMPTY().total. */
    fun gameGet(s: JsonElement?): JsonObject {
        val e = gameEmpty(); if (!truthy(s)) return e
        val o = LinkedHashMap<String, JsonElement>(e); o.putAll(spread(s))
        o["total"] = JsonObject(LinkedHashMap<String, JsonElement>(e["total"] as JsonObject).apply { putAll(spread(prop(s, "total"))) })
        return JsonObject(o)
    }

    /**
     * The full web pipeline of one sync on an install (web/js/sync.js mergeIn + snapLocal): local store (fat, normalised) merged with a
     * remote Doc (cards fat()'d), read back as the wire Doc (slim cards, pruned tombstones, Game.get defaults). [now] = the clock.
     */
    fun mergeWire(local: SyncDoc, remote: SyncDoc, now: Long, lex: Lexicon = Lexicon.NONE): SyncDoc {
        val del = LinkedHashMap<String, JsonElement>(remote.deleted)
        for ((k, t) in local.deleted) del[k] = Js.max(Js.or(del[k], Js.ZERO), t)
        val deleted = pruneDel(del, now)
        val mine = WebCards.normalize(local.cards.mapValues { WebCards.fat(it.value, lex, now) }, now)
        val rc = LinkedHashMap<String, JsonObject>(); for ((k, v) in remote.cards) rc[k] = WebCards.fat(v, lex, now)
        val cards = WebCards.normalize(mergeCards(mine, rc, deleted), now)
        val stats = mergeStats(local.stats ?: SyncDoc.DEFAULT_STATS, Js.or(remote.stats, JsonObject(mapOf("days" to Js.EMPTY))))
        val game = mergeGame(gameGet(local.game), remote.game)
        val takeRemote = truthy(remote.settings) && Js.gt(Js.or(remote.settingsAt, Js.ZERO), local.settingsAt ?: Js.ZERO)
        return SyncDoc(cards, deleted, stats, game, if (takeRemote) remote.settings else local.settings, if (takeRemote) remote.settingsAt else local.settingsAt)
    }

    /** snapLocal() without v/at: what the install sends (and what vectors call a Doc). */
    fun wire(d: SyncDoc, now: Long, lex: Lexicon = Lexicon.NONE): SyncDoc {
        val cards = LinkedHashMap<String, JsonObject>(); for (k in d.cards.keys.sorted()) cards[k] = WebCards.slim(d.cards.getValue(k), lex)
        val g = gameGet(d.game)
        return SyncDoc(cards, pruneDel(d.deleted, now), d.stats ?: SyncDoc.DEFAULT_STATS, JsonObject(LinkedHashMap<String, JsonElement>(g).apply { put("questsDone", Js.EMPTY) }),
            d.settings ?: Js.EMPTY, d.settingsAt ?: Js.ZERO)
    }
}
