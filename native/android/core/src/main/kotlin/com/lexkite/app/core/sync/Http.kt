package com.lexkite.app.core.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** Minimal HTTP seam (no OkHttp – keeps the APK light). Tests plug a fake; production uses [UrlHttp]. */
fun interface Http {
    suspend fun send(req: Req): Res
    data class Req(val method: String, val url: String, val headers: Map<String, String> = emptyMap(), val body: ByteArray? = null)
    class Res(val status: Int, val body: ByteArray) { val text get() = body.toString(Charsets.UTF_8); val ok get() = status in 200..299 }
}

class HttpError(val status: Int, val reason: String = "", val body: String = "") : IOException("http $status $reason")

object UrlHttp : Http {
    override suspend fun send(req: Http.Req): Http.Res = withContext(Dispatchers.IO) {
        val c = URL(req.url).openConnection() as HttpURLConnection
        try {
            // HttpURLConnection has no PATCH: Google APIs honour X-HTTP-Method-Override (Drive media update)
            if (req.method == "PATCH") { c.requestMethod = "POST"; c.setRequestProperty("X-HTTP-Method-Override", "PATCH") } else c.requestMethod = req.method
            c.connectTimeout = 15_000; c.readTimeout = 30_000; c.useCaches = false
            req.headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
            if (req.body != null) { c.doOutput = true; c.setFixedLengthStreamingMode(req.body.size); c.outputStream.use { it.write(req.body) } }
            val code = c.responseCode
            val bytes = (if (code >= 400) c.errorStream else c.inputStream)?.use { it.readBytes() } ?: ByteArray(0)
            Http.Res(code, bytes)
        } finally { c.disconnect() }
    }
}
