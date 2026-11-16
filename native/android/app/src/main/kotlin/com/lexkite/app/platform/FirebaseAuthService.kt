package com.lexkite.app.platform

import android.app.Activity
import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.OAuthProvider
import com.lexkite.app.R
import com.lexkite.app.core.auth.AuthService
import com.lexkite.app.core.auth.AuthUser
import com.lexkite.app.core.auth.CrashReporter
import com.lexkite.app.core.sync.DriveSync
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.tasks.await

/**
 * C01 – Firebase Auth on the SAME project as the live app (google-services.json of mobile/): Google through Credential Manager
 * (one-tap / account sheet), Sign in with Apple through Firebase OAuthProvider("apple.com") (Custom Tab), guest = no sign-in needed.
 * Same uid as web/iOS/add-on → same synced document.
 */
class FirebaseAuthService(private val ctx: Context, private val crash: CrashReporter) : AuthService {
    private val fa = FirebaseAuth.getInstance()
    private val state = MutableStateFlow(fa.currentUser?.let(::toUser))
    override val user: StateFlow<AuthUser?> = state

    init {
        fa.addAuthStateListener { a -> state.value = a.currentUser?.let(::toUser); crash.setUser(a.currentUser?.uid) }
    }

    private fun toUser(u: FirebaseUser) = AuthUser(u.uid, u.email, u.displayName, u.providerData.map { it.providerId }.firstOrNull { it != "firebase" } ?: "firebase")

    override suspend fun signInGoogle(activity: Activity): Result<AuthUser> = runCatching {
        val opt = GetSignInWithGoogleOption.Builder(activity.getString(R.string.default_web_client_id)).build()
        val res = CredentialManager.create(activity).getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(opt).build())
        val cred = res.credential
        require(cred is CustomCredential && cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) { "credential" }
        val idToken = GoogleIdTokenCredential.createFrom(cred.data).idToken
        val r = fa.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null)).await()
        toUser(requireNotNull(r.user))
    }.onFailure { if (it !is androidx.credentials.exceptions.GetCredentialCancellationException) crash.record(it) }

    override suspend fun signInApple(activity: Activity): Result<AuthUser> = runCatching {
        val p = OAuthProvider.newBuilder("apple.com").setScopes(listOf("email", "name")).build()
        val r = (fa.pendingAuthResult ?: fa.startActivityForSignInWithProvider(activity, p)).await()
        toUser(requireNotNull(r.user))
    }.onFailure { crash.record(it) }

    override suspend fun signOut() {
        runCatching { CredentialManager.create(ctx).clearCredentialState(androidx.credentials.ClearCredentialStateRequest()) }
        fa.signOut()
    }

    override suspend fun idToken(force: Boolean): String? = fa.currentUser?.getIdToken(force)?.await()?.token

    /** drive.appdata only (the app's hidden folder in the learner's own Drive). Silent in background; consent sheet when [activity] given. */
    override suspend fun driveToken(activity: Activity?): String? = runCatching {
        val req = AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(DriveSync.SCOPE))).build()
        val r = (if (activity != null) Identity.getAuthorizationClient(activity) else Identity.getAuthorizationClient(ctx)).authorize(req).await()
        if (r.hasResolution()) { if (activity != null) r.pendingIntent?.intentSender?.let { activity.startIntentSenderForResult(it, REQ_DRIVE, null, 0, 0, 0, null) }; null } else r.accessToken
    }.getOrNull()

    companion object { const val REQ_DRIVE = 4711 }
}
