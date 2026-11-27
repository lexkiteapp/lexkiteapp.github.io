package com.lexkite.app.feature.skills

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.RewardRules
import com.lexkite.app.core.placement.PEstimate
import com.lexkite.app.core.placement.PQuestion
import com.lexkite.app.core.placement.Placement
import com.lexkite.app.core.placement.PlacementPack
import com.lexkite.app.core.placement.PlacementSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlin.random.Random

/** The bundled question bank (content-pack/placement-bank.json); null = missing / invalid. */
internal suspend fun SkillsEnv.placementPack(): PlacementPack? = withContext(Dispatchers.IO) { runCatching { asset("content-pack/placement-bank.json")?.let { Placement.parse(Json.parseToJsonElement(it) as JsonObject) } }.getOrNull() }

enum class PlacementStage { INTRO, ASK, RESULT }

/** [i] = questions answered so far (the progress bar), [q] = the open question, [result] = the estimate once the test is over, [confirmExit] = the "leave half way?" dialog. */
data class PlacementUi(
    val loaded: Boolean = false, val pack: PlacementPack? = null, val stage: PlacementStage = PlacementStage.INTRO, val q: PQuestion? = null, val i: Int = 0, val n: Int = Placement.N,
    val result: PEstimate? = null, val confirmExit: Boolean = false,
)

class PlacementVm(private val env: SkillsEnv, private val meaningVi: Boolean) : ViewModel() {
    var ui by mutableStateOf(PlacementUi()); private set
    private var session: PlacementSession? = null
    private var shownAt = 0L

    init { viewModelScope.launch { val p = env.placementPack(); ui = ui.copy(loaded = true, pack = p, n = p?.n ?: Placement.N) } }

    fun start() {
        val p = ui.pack ?: return
        val s = PlacementSession(p, { Random.nextDouble() }, System.nanoTime(), meaningVi); session = s
        val q = s.next()
        if (q == null) finish(s) else { shownAt = System.currentTimeMillis(); ui = ui.copy(stage = PlacementStage.ASK, q = q, i = 0) }
    }

    /** [k] = option index, -1 = "I don't know". A second tap within 250 ms of a new question is ignored (the web's double-tap guard). */
    fun answer(k: Int) {
        val s = session ?: return
        if (ui.stage != PlacementStage.ASK || System.currentTimeMillis() - shownAt < 250) return
        s.answer(k)
        val q = s.next()
        if (q == null) finish(s) else { shownAt = System.currentTimeMillis(); ui = ui.copy(q = q, i = s.resp.size) }
    }

    /** Nothing answered yet → true (leave at once); else the "leave half way?" dialog opens (the answers of this run are not saved). */
    fun askExit(): Boolean { if ((session?.resp?.size ?: 0) == 0) return true; ui = ui.copy(confirmExit = true); return false }
    fun keepGoing() { ui = ui.copy(confirmExit = false) }

    private fun finish(s: PlacementSession) {
        val e = Placement.estimate(s.resp)
        ui = ui.copy(stage = PlacementStage.RESULT, q = null, i = s.resp.size, result = e, confirmExit = false)
        val now = env.now
        viewModelScope.launch {
            env.setSetting("placement", Placement.record(e, now))   // synced settings.placement → the day plan and the path read it
            env.word.reward(mapOf("quizzes" to 1), RewardRules.xp("set"))
        }
    }

    class Factory(private val env: SkillsEnv, private val meaningVi: Boolean) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = PlacementVm(env, meaningVi) as T }
}
