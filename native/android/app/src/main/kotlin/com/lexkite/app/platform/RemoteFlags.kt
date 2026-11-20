package com.lexkite.app.platform

import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings
import com.lexkite.app.core.config.Flags
import com.lexkite.app.core.generated.FlagDefaults
import com.lexkite.app.core.generated.FlagKey

/** Firebase Remote Config behind [Flags]: in-app defaults = generated FlagDefaults (safe offline), fetched at most every 12 h,
 *  activated on the NEXT launch (no mid-session behaviour flips). */
class RemoteFlags(private val rc: FirebaseRemoteConfig = FirebaseRemoteConfig.getInstance()) : Flags {
    init {
        rc.setConfigSettingsAsync(FirebaseRemoteConfigSettings.Builder().setMinimumFetchIntervalInSeconds(12 * 3600).build())
        rc.setDefaultsAsync(FlagDefaults.ALL)
        rc.fetch().addOnSuccessListener { /* activated on next start */ }
        rc.activate()
    }
    override fun bool(k: FlagKey) = rc.getBoolean(k.key)
    override fun long(k: FlagKey) = Flags.clamp(k, rc.getLong(k.key))
    override fun string(k: FlagKey): String = rc.getString(k.key)
}
