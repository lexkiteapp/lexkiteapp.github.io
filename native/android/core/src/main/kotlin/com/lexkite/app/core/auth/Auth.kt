package com.lexkite.app.core.auth

import android.app.Activity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.security.MessageDigest

/** Signed-in learner (Firebase uid = the account id of the shared data contract). Guest = no user, app fully usable. */
data class AuthUser(val uid: String, val email: String?, val name: String?, val provider: String) {
    val initial: String get() = ((name ?: email ?: "").trim().firstOrNull()?.uppercaseChar() ?: 'L').toString()
}

/**
 * Sign-in seam (C01). Production = Firebase Auth (Google via Credential Manager, Apple via OAuthProvider) in :app;
 * JVM tests and builds without Firebase use [GuestAuth]. No Firebase type leaks into :core.
 */
interface AuthService {
    val user: StateFlow<AuthUser?>
    suspend fun signInGoogle(activity: Activity): Result<AuthUser>
    suspend fun signInApple(activity: Activity): Result<AuthUser>
    suspend fun signOut()
    /** Firebase ID token for /api/sync (Bearer). */
    suspend fun idToken(force: Boolean = false): String?
    /** Google OAuth access token with scope drive.appdata – silent when [activity] is null (background sync), else may show consent. */
    suspend fun driveToken(activity: Activity?): String?
}

open class GuestAuth : AuthService {
    protected val state = MutableStateFlow<AuthUser?>(null)
    override val user: StateFlow<AuthUser?> = state
    override suspend fun signInGoogle(activity: Activity) = Result.failure<AuthUser>(UnsupportedOperationException("auth unavailable"))
    override suspend fun signInApple(activity: Activity) = Result.failure<AuthUser>(UnsupportedOperationException("auth unavailable"))
    override suspend fun signOut() { state.value = null }
    override suspend fun idToken(force: Boolean): String? = null
    override suspend fun driveToken(activity: Activity?): String? = null
}

/** Crash reporting seam: production = Crashlytics (release only) in :app, never personal data – only a hashed uid. */
interface CrashReporter {
    fun setUser(uid: String?)
    fun log(msg: String)
    fun record(t: Throwable)

    object None : CrashReporter { override fun setUser(uid: String?) {}; override fun log(msg: String) {}; override fun record(t: Throwable) {} }

    companion object {
        /** Irreversible pseudonym: first 16 hex of SHA-256("lexkite:" + uid). */
        fun hashUid(uid: String): String = MessageDigest.getInstance("SHA-256").digest("lexkite:$uid".toByteArray()).take(8).joinToString("") { "%02x".format(it) }
    }
}
