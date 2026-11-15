package com.lexkite.app

import com.lexkite.app.core.write.Confidence
import com.lexkite.app.core.write.FixEngine
import com.lexkite.app.core.write.GrammarCore
import com.lexkite.app.core.write.GrammarPack
import com.lexkite.app.core.write.LearnContent
import com.lexkite.app.core.write.Method
import com.lexkite.app.core.write.Quick
import com.lexkite.app.core.write.StyleQuiz
import com.lexkite.app.core.write.lArr
import com.lexkite.app.core.write.lInt
import com.lexkite.app.core.write.lList
import com.lexkite.app.core.write.lNum
import com.lexkite.app.core.write.lObj
import com.lexkite.app.core.write.lStr
import com.lexkite.app.core.write.lStrs
import com.lexkite.app.core.write.lTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZoneOffset

/**
 * P09 part 2 parity (#/fix #/style #/quick #/confidence #/method #/grammar): FixEngine + Learn.kt (core/write) reproduce every case of vectors/learn.json (web code run in node:vm by
 * scripts/native/gen-learn.mjs). Every case of every list is run and compared.
 */
class LearnVectorsTest {
    private fun res(n: String) = javaClass.classLoader!!.getResource(n)!!.readText()
    private val v = Json.parseToJsonElement(res("learn.json")) as JsonObject
    private val content = LearnContent.parse(res("learn-content.json"))!!

    @Test fun fixRules() {
        val eng = content.fix!!
        assertEquals("rule count", 40, eng.ruleCount)
        var n = 0
        for (c in v.lObj("fix").lList("cases")) {
            val id = c.lStr("id"); val text = c.lStr("text"); val want = c.lList("issues"); val got = eng.check(text)
            assertEquals("$id issues", want.size, got.size)
            got.zip(want).forEach { (a, b) ->
                assertTrue("$id ${b.lStr("rule")} @${b.lInt("s")}-${b.lInt("e")}: got ${a.rule} @${a.s}-${a.e} ${a.reps}",
                    a.s == b.lInt("s") && a.e == b.lInt("e") && a.type == b.lStr("type") && a.reps == b.lStrs("reps") && a.rule == b.lStr("rule") && a.title == b.lStr("title") && a.why == b.lStr("why") && a.lesson == b.lStr("lesson") && (a.levels ?: emptyList()) == b.lStrs("levels"))
                n++
            }
            assertEquals("$id fixed text", c.lStr("fixed"), FixEngine.fixed(text, got))
        }
        assertTrue("issues compared", n > 100)
    }

    @Test fun style() {
        val qs = content.style.lList("questions")
        for (c in v.lObj("style").lList("cases")) {
            val picks = c.lArr("picks").mapIndexed { i, k -> qs[i].lList("opts")[k.lInt()].lStr("style") }
            assertEquals(c.lStr("id"), c.lStr("winner"), StyleQuiz.winner(picks))
        }
        assertEquals(6, qs.size); assertEquals(4, content.style.lObj("styles").size)
    }

    @Test fun quick() {
        val q = v.lObj("quick")
        assertEquals(q.lInt("limit"), Quick.LIMIT); assertEquals(q.lInt("n"), Quick.COUNT); assertEquals(q.lInt("holdRightMs"), Quick.HOLD_RIGHT_MS); assertEquals(q.lInt("holdWrongMs"), Quick.HOLD_WRONG_MS); assertEquals(q.lInt("goodPct"), Quick.GOOD_PCT)
        for (c in q.lList("cases")) {
            val x = Quick.result(c.lInt("right"), c.lInt("total"), c.lTrue("timedOut"), c.lNum("elapsed") ?: 0.0)
            assertTrue("quick ${c.lInt("right")}/${c.lInt("total")}", x.pct == c.lInt("pct") && x.good == c.lTrue("good") && x.xp == c.lInt("xp") && x.secs == c.lInt("secs"))
        }
    }

    @Test fun confidence() {
        val V = v.lObj("conf"); val conf = content.conf
        for (c in V.lList("score")) {
            val m = c.lObj("m"); val self = (c["self"] as? JsonPrimitive)?.takeIf { it.content != "null" }?.content?.toDoubleOrNull()?.toInt()
            assertEquals("score $m $self", c.lInt("out"), Confidence.score(m.lNum("secs") ?: 0.0, m.lNum("wpm") ?: 0.0, m.lNum("pausesPerMin") ?: 0.0, m.lInt("phrases"), self))
        }
        for (c in V.lList("norm")) { assertEquals("norm", c.lStr("norm"), Confidence.norm(c.lStr("in"))); assertEquals("toks", c.lStrs("toks"), Confidence.toks(c.lStr("in"))) }
        for (c in V.lList("fillers")) assertEquals("fillers ${c.lStr("in")}", c.lInt("n"), Confidence.fillers(c.lStr("in")))
        val all = Confidence.allPhrases(conf)
        assertEquals("phrase count", V.lObj("counts").lInt("phrases"), all.size)
        for (c in V.lList("used")) assertEquals("used phrases", c.lStrs("used"), Confidence.used(c.lStr("said"), all))
        for (c in V.lList("streak")) assertEquals("streak ${c.lStrs("days")}", c.lInt("out"), Confidence.streak(c.lStrs("days"), c.lStr("today")))
        for (c in V.lList("blank")) assertEquals("blank ${c.lStr("say")}", c.lStr("out"), Confidence.blank(c.lStr("say"), c.lStr("gap")))
        for (c in V.lList("shadow")) assertEquals("shadow ${c.lStr("say")}", c.lStrs("marks"), Confidence.marks(c.lStr("say"), c.lStr("heard")).map { if (it.second == null) "" else if (it.second == true) "y" else "n" })
        for (c in V.lList("rpLevel")) { val x = Confidence.rpLevel(c.lStr("level")); assertTrue("rpLevel ${c.lStr("level")}", x.first == c.lInt("L") && x.second == c.lStrs("lv")) }
        for (c in V.lList("dailyIdx")) assertEquals("daily index", c.lInt("idx"), Confidence.dailyIndex(c.lInt("epochDay") * 86_400_000L, 0, conf.lArr("daily").size))
        assertEquals(V.lObj("counts").lInt("units"), conf.lList("units").size); assertEquals(V.lObj("counts").lInt("toolkit"), conf.lList("toolkit").size); assertEquals(V.lObj("counts").lInt("daily"), conf.lList("daily").size)
        for (u in conf.lList("units")) { val s = Confidence.roleplayScript(u); assertTrue("roleplay script ${u.lStr("id")}", s.lList("turns").all { it.lArr("a").size == 3 && it.lArr("h").size == 3 } && s.lArr("end").size == 3) }
    }

    @Test fun method() {
        val now = 1_767_603_600_000L; val day = 86_400_000L
        val key = { t: Long -> Instant.ofEpochMilli(t).atZone(ZoneOffset.UTC).toLocalDate().toString() }
        for (c in v.lObj("method").lList("cases")) {
            val i = c.lObj("input"); val id = c.lStr("id"); val o = c.lObj("out")
            val days = JsonObject(i.lObj("days").entries.associate { (k, x) -> key(now - k.toLong() * day) to x })
            val game = JsonObject(mapOf("xp" to JsonPrimitive(100), "days" to days, "readDone" to i.lObj("readDone"), "listenDone" to i.lObj("listenDone"), "grammarDone" to i.lObj("grammarDone"), "pronDone" to i.lObj("pronDone"), "total" to JsonObject(emptyMap())))
            val cards = i.lList("cards").map { cd ->
                JsonObject(mapOf("word" to cd["word"]!!, "srs" to cd["srs"]!!, "contexts" to JsonArray(cd.lStrs("ctx").map { JsonObject(mapOf("title" to JsonPrimitive(it), "at" to JsonPrimitive(now - day))) })))
            }
            val m = Method.compute(Method.Input(now, key, cards, JsonObject(emptyMap()), game, i.lObj("settings"), i.lList("essays").map { it.lStr("prompt") }, i.lList("mistakes").count { !it.lTrue("fixed") },
                listOf("r1", "r2", "r3"), listOf("l1", "l2"), listOf("g1", "g2"), listOf("p1", "p2", "p3")))
            assertEquals("$id loopDone", o.lInt("loopDone"), m.loopDone)
            val loop = o.lList("loop"); assertEquals("$id loop count", loop.size, m.loop.size)
            loop.forEachIndexed { k, w ->
                val s = m.loop[k]
                assertTrue("$id loop $k", s.done == w.lTrue("done") && s.href == w.lStr("href") && s.sub.key == w.lObj("sub").lStr("k") && s.sub.vars == w.lObj("sub").lObj("v").mapValues { (it.value as JsonPrimitive).content })
            }
            val title = mapOf("in" to "Đầu vào có nghĩa", "out" to "Đầu ra có nghĩa", "lang" to "Tập trung ngôn ngữ", "flu" to "Luyện trôi chảy")
            o.lList("strands").forEachIndexed { k, w -> assertTrue("$id strand $k", title[m.strands[k].id] == w.lObj("title").lStr("k") && m.strands[k].pct == w.lInt("pct") && m.strands[k].weak == w.lTrue("weak")) }
            assertEquals("$id weakest", (o["weakest"] as? JsonPrimitive)?.takeIf { it.content != "null" }?.content, m.weakest?.let { title[it] })
            val ms = o.lList("mstats")
            if (ms.isEmpty()) assertTrue("$id no memory", !m.memory.any && m.memory.learning == 0)
            else { assertEquals(ms[0].lStr("v"), m.memory.remembered.toString()); assertEquals(ms[1].lStr("v"), "${Math.round(m.memory.at(0.0) * 100)}%"); assertEquals(ms[2].lStr("v"), m.memory.due.toString()); assertEquals(ms[3].lStr("v"), m.memory.learning.toString()) }
            val st = m.stage?.takeIf { it in listOf("s0", "s1", "s2", "s3") } ?: "s1"; val plan = content.method.lObj("plans").lObj(st)
            assertEquals("$id plan name", o.lObj("planName").lObj("v").lStr("name"), plan.lObj("name").lObj("v").lStr("name"))
            assertEquals("$id plan items", o.lList("plan").map { "${it.lStr("href")}|${it.lInt("min")}|${it.lObj("label").lStr("k")}" }, plan.lList("items").map { "${it.lStr("href")}|${it.lInt("min")}|${it.lObj("label").lStr("k")}" })
            val prin = o.lList("prin"); assertEquals("$id principle count", prin.size, m.stats.size)
            prin.forEachIndexed { k, p ->
                val want = p.lObj("stat").lObj("v").mapValues { (it.value as JsonPrimitive).content }.toMutableMap(); val have = m.stats[k].vars.toMutableMap()
                if (k == 11) { want.remove("n"); have.remove("n") }   // the streak is App.streak() of the page (review days of the learner), a platform input
                assertTrue("$id principle $k stat ${m.stats[k].key}", m.stats[k].key == p.lObj("stat").lStr("k") && have == want)
            }
        }
        assertEquals(12, content.method.lList("principles").size); assertEquals(5, content.method.lList("faq").size); assertEquals(6, content.method.lList("loop").size)
    }

    @Test fun grammar() {
        val V = v.lObj("grammar")
        val pack = GrammarPack.parse(res("grammar-pack.json")); assertNotNull("grammar-pack.json is a grammar pack", pack); pack!!
        for (c in V.lList("answers")) assertEquals("answer ${c.lStr("given")}", c.lTrue("ok"), GrammarCore.matches(c.lStr("given"), c.lStrs("answers")))
        for (c in V.lList("dnorm2")) assertEquals("dnorm2 ${c.lStr("in")}", c.lStr("out"), GrammarCore.dnorm2(c.lStr("in")))
        for (c in V.lList("own")) assertEquals("own ${c.lStr("id")}", c.lStr("hit"), GrammarCore.ownHit(c.lStr("sentence"), c.lStr("src")))
        val want = V.lList("order"); val got = pack.order
        assertEquals("order count", want.size, got.size)
        got.zip(want).forEach { (a, b) -> assertTrue("order ${a.first.lStr("id")} vs ${b.lStr("id")}", a.first.lStr("id") == b.lStr("id") && a.second.lInt("n") == b.lInt("chapter")) }
        assertEquals(V.lObj("counts").lInt("lessons"), pack.index.size); assertEquals(pack.index.size, pack.lessons.size)
        for (s in V.lList("shape")) { val l = pack.lessons[s.lStr("id")]; assertTrue("shape ${s.lStr("id")}", l.lList("quiz").size == s.lInt("quiz") && l.lList("drills").size == s.lInt("drills") && l.lList("blocks").map { it.lStr("type") } == s.lStrs("blocks")) }
        assertEquals(14, pack.l1.size); assertEquals(V.lObj("counts").lInt("check"), pack.check.size)
        val starter = GrammarPack.parse(res("grammar-starter.json")); assertNotNull("grammar-starter.json is bundled", starter)
        assertEquals(pack.index.size, starter!!.index.size); assertEquals(3, starter.lessons.size)
        assertEquals(22, GrammarCore.quizXp(4)); assertEquals(26, GrammarCore.drillXp(4)); assertEquals(18, GrammarCore.mixXp(4))
    }

    /** P09 end to end: the ten routes are wired, the rule engine fixes a draft, a grammar lesson of the offline starter is graded the way the web grades it, the style quiz and the confidence score follow the web rules. */
    @Test fun parity_P09() {
        val all = setOf("write", "task1", "qstats", "criteria", "fix", "grammar", "method", "quick", "style", "confidence")
        assertTrue(com.lexkite.app.feature.vocab.WORD_ROUTES.containsAll(all))
        for (r in all) assertEquals(r, com.lexkite.app.core.link.DeepLink.SKILLS, com.lexkite.app.core.link.DeepLink.parse("lexkite://$r")!!.tab)
        val mix = com.lexkite.app.core.link.DeepLink.parse("lexkite://grammar/mix?ch=3&n=40")!!
        assertEquals("mix", mix.arg); assertEquals("ch=3&n=40", mix.query)
        // #/fix
        val eng = content.fix!!; val text = "i am agree with you."; val issues = eng.check(text)
        assertEquals(listOf("lk:i-lower", "lk:be-agree"), issues.map { it.rule }); assertEquals("I agree with you.", FixEngine.fixed(text, issues))
        // #/grammar: the starter lists every lesson and carries three; a quiz answer is graded by the lesson data, a drill by matchAnswer
        val starter = GrammarPack.parse(res("grammar-starter.json"))!!
        assertEquals(80, starter.index.size); val l = starter.lessons.getValue("present-simple")
        assertEquals(12, l.lList("quiz").size); assertTrue(l.lList("drills").isNotEmpty())
        val d = l.lList("drills").first { it.lStr("t") == "fill" || it.lStr("t") == "verb" }
        val right = GrammarCore.grade(d, d.lStrs("a").first(), null, null) as com.lexkite.app.core.write.DrillOutcome.Graded
        assertTrue(right.ok); assertEquals(d.lStrs("a").first(), right.answer)
        val wrong = GrammarCore.grade(d, "zzz qqq", null, null) as com.lexkite.app.core.write.DrillOutcome.Graded
        assertTrue(!wrong.ok)
        assertEquals(GrammarCore.quizXp(11), 43); assertEquals(GrammarCore.pct(11, 12), 92)
        // #/style and #/confidence
        assertEquals("precision", StyleQuiz.winner(List(6) { "precision" }))
        assertEquals(68, Confidence.score(120.0, 120.0, 1.0, 2, null))
        assertTrue(Confidence.score(120.0, 120.0, 1.0, 2, 5) > Confidence.score(120.0, 120.0, 1.0, 2, 1))
    }
}
