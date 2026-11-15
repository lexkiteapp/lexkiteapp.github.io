package com.lexkite.app.core.config

import com.lexkite.app.core.generated.FlagDefaults
import com.lexkite.app.core.generated.FlagKey

/**
 * Feature flags / kill switches (spec §4). Production = Firebase Remote Config in :app; JVM tests and offline = [Defaults]
 * (generated FlagDefaults – safe values). Keys come only from the generated [FlagKey] (one table for iOS + Android).
 */
interface Flags {
    fun bool(k: FlagKey): Boolean
    fun long(k: FlagKey): Long
    fun string(k: FlagKey): String

    object Defaults : Flags {
        override fun bool(k: FlagKey) = (FlagDefaults.ALL[k.key] as? Boolean) ?: false
        override fun long(k: FlagKey) = (FlagDefaults.ALL[k.key] as? Number)?.toLong() ?: 0L
        override fun string(k: FlagKey) = FlagDefaults.ALL[k.key]?.toString() ?: ""
    }

    companion object {
        /** Remote numbers are clamped into the generated safe ranges (a bad console value can't break sync/content). */
        fun clamp(k: FlagKey, v: Long): Long = when (k) {
            FlagKey.CONTENT_MAX_SCHEMA -> v.coerceIn(FlagDefaults.CONTENT_MAX_SCHEMA_RANGE)
            FlagKey.SYNC_PUSH_EVERY_MS -> v.coerceIn(FlagDefaults.SYNC_PUSH_EVERY_MS_RANGE)
            else -> v
        }
    }
}
