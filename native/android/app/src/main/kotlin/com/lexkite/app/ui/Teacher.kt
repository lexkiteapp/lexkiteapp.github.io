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
 * The 2D teacher still (web Chars.still – the ONLY teacher art: web/teach/characters.json, Ama female / Carlos male), loaded from the
 * same CDN path as web (`/teach/<who>/still-<pose>.webp`), disk-cached for offline, decoded once (no image library → light APK).
 * Rive animation replaces this in M2 (C05).
 */
object TeacherArt {
    const val BASE = "https://lexkite.com/teach/"
    private val mem = LruCache<String, Bitmap>(4)

    suspend fun load(ctx: Context, who: String, pose: String): Bitmap? = withContext(Dispatchers.IO) {
        val key = "$who-$pose"
        mem.get(key)?.let { return@withContext it }
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
    var bmp by remember(who, pose) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(who, pose) { bmp = TeacherArt.load(ctx, who, pose) }
    AnimatedVisibility(bmp != null, enter = fadeIn(LKAnim.spec(reduce))) {
        bmp?.let { Image(it.asImageBitmap(), label, Modifier.fillMaxSize(), alignment = Alignment.BottomCenter, contentScale = ContentScale.Fit) }
    }
}
