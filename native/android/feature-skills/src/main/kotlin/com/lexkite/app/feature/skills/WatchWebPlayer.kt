package com.lexkite.app.feature.skills

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect

/** Page → app messages of watch-player.html (one JSON string per event). */
internal class WatchBridge(private val vm: WatchPlayerVm) {
    @JavascriptInterface fun post(s: String) { vm.onBridge(s) }
}

/**
 * The OFFICIAL YouTube IFrame player inside a WebView (docs/specs/video-learn.md §2: nothing over it, no ad blocking, no download): content-pack/watch-player.html loaded with the lexkite.com base URL
 * (the IFrame API needs a real origin), commands in through `lk.cmd(...)`, events out through the `LKBridge` interface. Paused when the screen leaves; the WebView is destroyed on dispose.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
internal fun WatchWebPlayer(vm: WatchPlayerVm, html: String?, id: String, start: Int, lang: String, modifier: Modifier) {
    val holder = remember { arrayOfNulls<WebView>(1) }
    AndroidView(modifier = modifier, factory = { ctx ->
        WebView(ctx).also { w ->
            holder[0] = w
            w.settings.javaScriptEnabled = true; w.settings.domStorageEnabled = true; w.settings.mediaPlaybackRequiresUserGesture = false
            w.settings.allowFileAccess = false; w.settings.allowContentAccess = false
            w.setBackgroundColor(android.graphics.Color.BLACK)
            w.webViewClient = object : WebViewClient() { override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true } // the page never navigates away
            w.addJavascriptInterface(WatchBridge(vm), "LKBridge")
            vm.send = { js -> w.post { w.evaluateJavascript(js, null) } }
            if (html != null) w.loadDataWithBaseURL("https://lexkite.com/watch-player?id=$id&start=$start&hl=$lang", html, "text/html", "utf-8", null)
        }
    })
    LifecycleEventEffect(Lifecycle.Event.ON_PAUSE) { vm.pause(); holder[0]?.let { w -> w.postDelayed({ w.onPause() }, 300) } } // the pause command first, then the page's timers stop
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { holder[0]?.onResume() }
    DisposableEffect(Unit) { onDispose { vm.pause(); vm.send = null; vm.detached(); holder[0]?.let { w -> w.stopLoading(); w.removeJavascriptInterface("LKBridge"); (w.parent as? ViewGroup)?.removeView(w); w.destroy() }; holder[0] = null } }
}
