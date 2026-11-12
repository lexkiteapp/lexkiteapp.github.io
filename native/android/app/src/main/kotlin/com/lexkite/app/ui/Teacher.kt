package com.lexkite.app.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import com.lexkite.app.design.LKAnim
import com.lexkite.app.design.LocalReduceMotion
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * The 2D teacher still (web Chars.still – the ONLY teacher art: web/teach/characters.json, Ama female / Carlos male).
 * Order: memory → bundled asset (gen.mjs copies the web stills byte for byte into native/shared/gen/teach/<who>/still-<pose>.webp = APK assets,
 * the same relative path as the CDN, so the teacher shows offline and on first frame) → disk cache → CDN (`/teach/<who>/still-<pose>.webp`).
 * Decoded once (no image library → light APK).
 */
object TeacherArt {
    const val BASE = "https://lexkite.com/teach/"
    private const val ROOT = "https://lexkite.com/"
    private val mem = LruCache<String, Bitmap>(24)
    private fun rel(who: String, pose: String) = "teach/$who/still-$pose.webp"

    /** Bundled still, synchronously (small webp, decoded once and kept in memory) – null when this pose is not bundled. */
    fun bundled(ctx: Context, who: String, pose: String): Bitmap? {
        val key = "$who-$pose"
        mem.get(key)?.let { return it }
        return runCatching { ctx.assets.open(rel(who, pose)).use { BitmapFactory.decodeStream(it) } }.getOrNull()?.also { mem.put(key, it) }
    }

    /** Any teacher art by its CDN-relative path (`teach/<who>/head-bare-2x.webp`, `teach/<who>/still-<pose>.webp`): memory → bundled asset, synchronously. */
    fun bundledRel(ctx: Context, rel: String): Bitmap? {
        mem.get(rel)?.let { return it }
        return runCatching { ctx.assets.open(rel).use { BitmapFactory.decodeStream(it) } }.getOrNull()?.also { mem.put(rel, it) }
    }

    /** Same path, with disk cache + CDN for art that is not bundled (poses beyond the bundled ones). */
    suspend fun loadRel(ctx: Context, rel: String): Bitmap? = withContext(Dispatchers.IO) {
        bundledRel(ctx, rel)?.let { return@withContext it }
        val f = File(ctx.cacheDir, "teach/" + rel.removePrefix("teach/").replace('/', '-'))
        val bytes = runCatching { if (f.exists()) f.readBytes() else null }.getOrNull() ?: runCatching {
            val c = URL(ROOT + rel).openConnection() as HttpURLConnection
            try { c.connectTimeout = 8000; c.readTimeout = 15000; if (c.responseCode != 200) null else c.inputStream.use { it.readBytes() } } finally { c.disconnect() }
        }.getOrNull()?.also { b -> runCatching { f.parentFile?.mkdirs(); f.writeBytes(b) } }
        bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }?.also { mem.put(rel, it) }
    }

    suspend fun load(ctx: Context, who: String, pose: String): Bitmap? = withContext(Dispatchers.IO) {
        bundled(ctx, who, pose)?.let { return@withContext it }
        val key = "$who-$pose"
        val f = File(ctx.cacheDir, "teach/still-$key.webp")
        val bytes = runCatching { if (f.exists()) f.readBytes() else null }.getOrNull() ?: runCatching {
            val c = URL("$BASE$who/still-$pose.webp").openConnection() as HttpURLConnection
            try { c.connectTimeout = 8000; c.readTimeout = 15000; if (c.responseCode != 200) null else c.inputStream.use { it.readBytes() } } finally { c.disconnect() }
        }.getOrNull()?.also { b -> runCatching { f.parentFile?.mkdirs(); f.writeBytes(b) } }
        bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }?.also { mem.put(key, it) }
    }
}

@Composable
fun TeacherStill(who: String = "ama", pose: String = "happy", label: String? = null) {
    val ctx = LocalContext.current
    val reduce = LocalReduceMotion.current
    val first = remember(who, pose) { TeacherArt.bundled(ctx, who, pose) } // bundled → visible on the first frame (no fade-in flash, offline-safe)
    var bmp by remember(who, pose) { mutableStateOf(first) }
    LaunchedEffect(who, pose) { if (bmp == null) bmp = TeacherArt.load(ctx, who, pose) }
    if (first != null) bmp?.let { Image(it.asImageBitmap(), label, Modifier.fillMaxSize(), alignment = Alignment.BottomCenter, contentScale = ContentScale.Fit) }
    else AnimatedVisibility(bmp != null, enter = fadeIn(LKAnim.spec(reduce))) {
        bmp?.let { Image(it.asImageBitmap(), label, Modifier.fillMaxSize(), alignment = Alignment.BottomCenter, contentScale = ContentScale.Fit) }
    }
}
