package com.lexkite.app.platform

import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.lexkite.app.core.auth.CrashReporter

/** Crashlytics behind [CrashReporter]: collection is enabled only in release (manifest placeholder), and the only identity ever
 *  attached is a one-way hash of the Firebase uid – no email, name, words or other learning content. */
class CrashlyticsReporter(private val c: FirebaseCrashlytics = FirebaseCrashlytics.getInstance()) : CrashReporter {
    override fun setUser(uid: String?) = c.setUserId(uid?.let(CrashReporter::hashUid) ?: "")
    override fun log(msg: String) = c.log(msg)
    override fun record(t: Throwable) = c.recordException(t)
}
