package com.lexkite.app.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import com.lexkite.app.design.LocalLKColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

private val images = LruCache<String, Bitmap>(12)

/**
 * Small remote illustration (word picture): memory → disk cache (`cacheDir/vimg-img`) → network, decoded off the main thread. The caller gives a FIXED square box,
 * so nothing jumps while it loads; a soft placeholder fills the box and on error the box simply stays empty (no broken-image icon).
 */
@Composable
fun RemoteImage(url: String, description: String, modifier: Modifier = Modifier) {
    val dir = File(LocalContext.current.cacheDir, "vimg-img")
    val bmp by produceState<Bitmap?>(images.get(url), url) {
        if (value == null) value = withContext(Dispatchers.IO) {
            val f = File(dir, url.substringAfterLast('/'))
            runCatching { if (f.length() > 0) BitmapFactory.decodeFile(f.path) else null }.getOrNull()
                ?: runCatching {
                    val c = URL(url).openConnection() as HttpURLConnection
                    try {
                        c.connectTimeout = 6000; c.readTimeout = 10000
                        if (c.responseCode == 200) c.inputStream.use { it.readBytes() }.also { b -> runCatching { dir.mkdirs(); f.writeBytes(b) } }.let { BitmapFactory.decodeByteArray(it, 0, it.size) } else null
                    } finally { c.disconnect() }
                }.getOrNull()
        }?.also { images.put(url, it) }
    }
    Box(modifier.background(LocalLKColors.current.cardLow)) {
        bmp?.let { Image(it.asImageBitmap(), description, Modifier.matchParentSize(), contentScale = ContentScale.Crop) }
    }
}
