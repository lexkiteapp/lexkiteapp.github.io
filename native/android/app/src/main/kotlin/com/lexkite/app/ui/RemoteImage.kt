package com.lexkite.app.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

private val images = LruCache<String, Bitmap>(12)

/** Small remote illustration (word picture), decoded once and kept in memory. Absent/offline → nothing is drawn (the exercise is not built without a picture). */
@Composable
fun RemoteImage(url: String, description: String, modifier: Modifier = Modifier) {
    val bmp by produceState<Bitmap?>(images.get(url), url) {
        if (value == null) value = withContext(Dispatchers.IO) {
            runCatching {
                val c = URL(url).openConnection() as HttpURLConnection
                try { c.connectTimeout = 6000; c.readTimeout = 10000; if (c.responseCode == 200) c.inputStream.use { BitmapFactory.decodeStream(it) } else null } finally { c.disconnect() }
            }.getOrNull()?.also { images.put(url, it) }
        }
    }
    bmp?.let { Image(it.asImageBitmap(), description, modifier, contentScale = ContentScale.Crop) }
}
