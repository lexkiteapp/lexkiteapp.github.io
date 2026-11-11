package com.lexkite.app.design

import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalView

/**
 * C09 – haptics for correct / wrong / lesson done / tap. Uses View.performHapticFeedback WITHOUT FLAG_IGNORE_GLOBAL_SETTING,
 * so the system "Touch feedback" switch is always honoured; the in-app switch (DevicePrefs.haptics) can turn it off too.
 */
class LKHaptics(private val sink: Sink, private val enabled: () -> Boolean) {
    fun interface Sink { fun perform(code: Int): Boolean }
    enum class Kind { TAP, CORRECT, WRONG, DONE }

    fun play(k: Kind): Boolean = enabled() && sink.perform(code(k))
    fun tap() = play(Kind.TAP); fun correct() = play(Kind.CORRECT); fun wrong() = play(Kind.WRONG); fun done() = play(Kind.DONE)

    companion object {
        val Off = LKHaptics({ false }, { false })
        /** API 30+ has semantic CONFIRM/REJECT; older devices get the closest classic constants. */
        fun code(k: Kind, sdk: Int = Build.VERSION.SDK_INT): Int = when (k) {
            Kind.TAP -> HapticFeedbackConstants.VIRTUAL_KEY
            Kind.CORRECT -> if (sdk >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.KEYBOARD_TAP
            Kind.WRONG -> if (sdk >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            Kind.DONE -> if (sdk >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.CONTEXT_CLICK
        }
        fun of(view: View, enabled: () -> Boolean) = LKHaptics({ view.isHapticFeedbackEnabled && view.performHapticFeedback(it) }, enabled)
    }
}

@Composable
fun rememberHaptics(enabled: Boolean): LKHaptics {
    val v = LocalView.current
    return remember(v, enabled) { LKHaptics.of(v) { enabled } }
}
