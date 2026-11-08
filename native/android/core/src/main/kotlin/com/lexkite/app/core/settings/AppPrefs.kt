package com.lexkite.app.core.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Device-only preferences (never synced – the learner's synced settings live in the shared document). */
data class DevicePrefs(val lang: String? = null, val theme: String = "system", val haptics: Boolean = true)

private val Context.lkPrefs: DataStore<Preferences> by preferencesDataStore(name = "lexkite")

class AppPrefs(private val ds: DataStore<Preferences>) {
    constructor(ctx: Context) : this(ctx.applicationContext.lkPrefs)

    val device: Flow<DevicePrefs> = ds.data.map { DevicePrefs(it[LANG], it[THEME] ?: "system", it[HAPTICS] ?: true) }

    suspend fun setLang(l: String?) { ds.edit { if (l == null) it.remove(LANG) else it[LANG] = l } }
    suspend fun setTheme(t: String) { ds.edit { it[THEME] = t } }
    suspend fun setHaptics(on: Boolean) { ds.edit { it[HAPTICS] = on } }

    /** C03: the one-time import from the Capacitor app. */
    suspend fun migrationDone(): Boolean = ds.data.first()[MIG_DONE] ?: false
    suspend fun migrationAttempts(): Int = ds.data.first()[MIG_TRIES] ?: 0
    suspend fun markMigration(done: Boolean) { ds.edit { it[MIG_DONE] = done; it[MIG_TRIES] = (it[MIG_TRIES] ?: 0) + 1 } }

    /** C17: the first-run onboarding was finished or skipped on this device (relaunch goes straight to Today). Device-only; the synced twin is `settings.onboarded`. */
    suspend fun onboardingDone(): Boolean = ds.data.first()[ONB_DONE] ?: false
    suspend fun markOnboardingDone() { ds.edit { it[ONB_DONE] = true } }

    /** Fixed per-device group 0–99 for staged rollouts (web lk.vb): drawn once, then kept. */
    suspend fun rolloutBucket(): Int {
        ds.data.first()[BUCKET]?.let { return it }
        val b = java.security.SecureRandom().nextInt(100); ds.edit { if (it[BUCKET] == null) it[BUCKET] = b }
        return ds.data.first()[BUCKET] ?: b
    }

    companion object {
        private val BUCKET = intPreferencesKey("rollout.bucket")
        private val LANG = stringPreferencesKey("lang")
        private val THEME = stringPreferencesKey("theme")
        private val HAPTICS = booleanPreferencesKey("haptics")
        private val ONB_DONE = booleanPreferencesKey("onboarding.done")
        private val MIG_DONE = booleanPreferencesKey("migration.done")
        private val MIG_TRIES = intPreferencesKey("migration.tries")
    }
}
