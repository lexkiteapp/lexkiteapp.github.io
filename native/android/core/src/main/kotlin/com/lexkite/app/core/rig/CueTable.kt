package com.lexkite.app.core.rig

import android.content.Context
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Pre-generated mouth cues (`teach/cues.json` = web `window.LK_CUES`): `k[lineKey(voice, text)]` → packed `[ms, cues, env?]` (→ [LipSync.unpack]);
 * `dict` is the pronunciation dictionary for `fromText`/`fromEnv` (web `LipSync.setDict`). Bundled asset, parsed once.
 */
class CueTable(private val k: Map<String, JsonArray>, dictText: String) {
    val dict: Map<String, String> by lazy { LipSync.parseDict(dictText) }
    val size get() = k.size
    fun has(key: String) = key in k

    /** The unpacked entry for [key], or null when the line has no pre-generated cues. */
    fun unpacked(key: String): Unpacked? {
        val e = k[key] ?: return null
        return LipSync.unpack(e[0].jsonPrimitive.content.toDouble(), e[1].jsonPrimitive.content, e.getOrNull(2)?.takeIf { it !is JsonNull }?.jsonPrimitive?.content)
    }

    companion object {
        fun parse(json: String): CueTable {
            val o = Json.parseToJsonElement(json).jsonObject
            // web `cue(key)` = `k[key] || null`: lines without cues are stored as 0 → not a table entry
            val k = o.getValue("k").jsonObject.entries.mapNotNull { (key, e) -> (e as? JsonArray)?.let { key to it } }.toMap()
            return CueTable(k, o["dict"]?.jsonPrimitive?.content.orEmpty())
        }
    }
}

/** Bundled teacher data (`teach/rig.json`, `teach/cues.json`), parsed once per process. */
object TeachAssets {
    @Volatile private var rig: RigDef? = null
    @Volatile private var cues: CueTable? = null
    fun rig(ctx: Context): RigDef = rig ?: synchronized(this) { rig ?: RigDef.parse(ctx.assets.open("teach/rig.json").bufferedReader().use { it.readText() }).also { rig = it } }
    fun cues(ctx: Context): CueTable = cues ?: synchronized(this) { cues ?: CueTable.parse(ctx.assets.open("teach/cues.json").bufferedReader().use { it.readText() }).also { cues = it } }
}
