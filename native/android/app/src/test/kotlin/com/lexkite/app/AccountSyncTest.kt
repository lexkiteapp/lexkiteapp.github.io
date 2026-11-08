package com.lexkite.app

import android.app.Activity
import androidx.test.core.app.ApplicationProvider
import com.lexkite.app.core.auth.AuthService
import com.lexkite.app.core.auth.AuthUser
import com.lexkite.app.core.auth.CrashReporter
import com.lexkite.app.core.auth.GuestAuth
import com.lexkite.app.core.data.LexDb
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncConfig
import com.lexkite.app.core.sync.SyncEngine
import com.lexkite.app.core.sync.SyncState
import com.lexkite.app.core.sync.WebCards
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** In-memory twin of functions/api/sync.js: per-uid docs {k: {h, body}}; pull returns docs whose hash differs from `have`. */
class FakeD1 : Http {
    val docs = HashMap<String, HashMap<String, Pair<String, String>>>()
    var pushes = 0
    override suspend fun send(req: Http.Req): Http.Res {
        val uid = req.headers["Authorization"]!!.removePrefix("Bearer tok-")
        val body = Json.parseToJsonElement(req.body!!.toString(Charsets.UTF_8)).jsonObject
        val mine = docs.getOrPut(uid) { HashMap() }
        return when (body["op"]!!.jsonPrimitive.content) {
            "pull" -> {
                val have = body["have"] as? JsonObject ?: Js.EMPTY
                val out = LinkedHashMap<String, JsonElement>()
                for ((k, x) in mine) if ((have[k] as? JsonPrimitive)?.content != x.first || k == "meta") out[k] = Json.parseToJsonElement(x.second)
                Http.Res(200, Js.stringify(JsonObject(mapOf("docs" to JsonObject(out)))).toByteArray())
            }
            "push" -> { pushes++; for ((k, d) in body["docs"]!!.jsonObject) mine[k] = d.jsonObject["h"]!!.jsonPrimitive.content to d.jsonObject["body"]!!.jsonPrimitive.content; Http.Res(200, "{\"ok\":true}".toByteArray()) }
            else -> Http.Res(400, ByteArray(0))
        }
    }
}

class FakeAuth(uid: String?) : AuthService {
    val state = MutableStateFlow(uid?.let { AuthUser(it, "$it@example.invalid", "Test", "google.com") })
    override val user: StateFlow<AuthUser?> = state
    override suspend fun signInGoogle(activity: Activity) = Result.success(state.value!!)
    override suspend fun signInApple(activity: Activity) = Result.success(state.value!!)
    override suspend fun signOut() { state.value = null }
    override suspend fun idToken(force: Boolean) = state.value?.let { "tok-" + it.uid }
    override suspend fun driveToken(activity: Activity?): String? = null
}

/** C01 sign-in + C02 transport: guest works offline, two devices of one account converge through the D1 contract, accounts never mix. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AccountSyncTest {
    private fun store() = LexStore(LexDb.memory(ApplicationProvider.getApplicationContext()))
    private fun addWord(s: LexStore, w: String, at: Long) = runBlocking {
        s.mutate { d -> val (c, del) = WebCards.add(d.cards, d.deleted, JsonObject(mapOf("word" to JsonPrimitive(w))), Js.EMPTY, at); d.copy(cards = c, deleted = del) }
    }

    @Test fun parity_C01() = runBlocking {
        // guest: no account, everything local, sync is a no-op (never an error)
        val guest = GuestAuth(); assertNull(guest.user.value); assertNull(guest.idToken())
        val s = store(); addWord(s, "kerfuffle", 1_000)
        assertTrue(SyncEngine(s, guest, FakeD1()).sync()); assertEquals(1, s.doc().cards.size)
        // signed-in: the same uid on two devices sees the same document
        val server = FakeD1(); val auth = FakeAuth("u1")
        val phone = store(); val tablet = store()
        addWord(phone, "brouhaha", 2_000)
        assertTrue(SyncEngine(phone, auth, server, SyncConfig(), clock = { 3_000 }).sync())
        assertTrue(SyncEngine(tablet, auth, server, SyncConfig(), clock = { 4_000 }).sync())
        assertTrue("brouhaha" in tablet.doc().cards)
        // crash reports only ever carry a one-way hash of the uid
        val h = CrashReporter.hashUid("u1"); assertEquals(16, h.length); assertNotEquals("u1", h); assertFalse(h.contains("u1"))
    }

    @Test fun offlineEditsQueueAndConvergeWithTombstones() = runBlocking {
        val server = FakeD1(); val auth = FakeAuth("u2")
        val a = store(); val b = store()
        addWord(a, "alpha", 1_000); addWord(a, "beta", 1_000)
        SyncEngine(a, auth, server, clock = { 2_000 }).sync(); SyncEngine(b, auth, server, clock = { 3_000 }).sync()
        // b offline: edits alpha, deletes beta – nothing reaches the server until it syncs
        b.mutate { d -> d.copy(cards = d.cards - "beta", deleted = d.deleted + ("beta" to JsonPrimitive(4_000))) }
        val pushesBefore = server.pushes
        assertEquals(pushesBefore, server.pushes)
        SyncEngine(b, auth, server, clock = { 5_000 }).sync(); SyncEngine(a, auth, server, clock = { 6_000 }).sync()
        assertFalse("beta" in a.doc().cards); assertTrue("alpha" in a.doc().cards)
    }

    @Test fun anotherAccountsDataIsNeverMergedSilently() = runBlocking {
        val server = FakeD1(); val s = store()
        val auth = FakeAuth("first"); addWord(s, "mine", 1_000)
        val e1 = SyncEngine(s, auth, server, clock = { 2_000 }); e1.sync()
        auth.state.value = AuthUser("second", null, null, "apple.com")
        val e2 = SyncEngine(s, auth, server, clock = { 3_000 })
        e2.sync(); assertEquals(SyncState.NEEDS_ACCOUNT_CHOICE, e2.status.value.state)
        assertTrue(server.docs["second"].isNullOrEmpty())
        e2.chooseAccount(merge = false) // keep accounts apart: device data backed up, then cleared
        assertTrue(s.get(LexStore.K_BACKUP) is JsonObject); assertTrue(s.doc().cards.isEmpty())
    }
}
