package com.lexkite.app.feature.me

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.auth.AuthUser
import com.lexkite.app.core.sync.SyncState
import com.lexkite.app.core.sync.SyncStatus
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey

data class MeState(val user: AuthUser?, val sync: SyncStatus, val busy: Boolean = false, val error: String? = null, val appleAvailable: Boolean = true, val notice: Boolean = false)

interface MeActions {
    fun signInGoogle(); fun signInApple(); fun signOut(); fun syncNow(); fun chooseAccount(merge: Boolean)
}

/** Me hub, M1 part = account & sync card (C01/C02). Guests keep using everything; sign-in only adds backup + multi-device. */
@Composable
fun MeScreen(s: MeState, a: MeActions, now: Long = System.currentTimeMillis()) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceMd), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
        LKCard {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(48.dp).clip(CircleShape).background(c.secondaryContainer), contentAlignment = Alignment.Center) {
                    if (s.user != null) Text(s.user.initial, style = LKType.headlineSm.toCompose(), color = c.onSecondaryContainer)
                    else Icon(Icons.Filled.AccountCircle, null, tint = c.onSecondaryContainer)
                }
                Text(t(L10nKey.acctTitle), style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f).semantics { heading() })
            }
            if (s.user == null) {
                Text(t(L10nKey.acctPitch), style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant)
                ProviderButton(t(L10nKey.acctGoogle), s.busy, a::signInGoogle)
                if (s.appleAvailable) ProviderButton(t(L10nKey.acctApple), s.busy, a::signInApple)
                Text(t(L10nKey.acctFree), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
                if (s.notice) Text(t(L10nKey.acctSignedOut), style = LKType.bodySm.toCompose(), color = c.secondary, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
            } else {
                Text(t(L10nKey.acctSignedIn, mapOf("name" to (s.user.name ?: s.user.email ?: ""))), style = LKType.bodyMd.toCompose(), color = c.onSurface)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Icon(Icons.Filled.CloudSync, null, tint = c.secondary, modifier = Modifier.size(20.dp))
                    Text(syncLine(s.sync, now), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant, modifier = Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite })
                }
                LKPrimaryButton(t(L10nKey.syncNow), a::syncNow)
                LKPillButton(t(L10nKey.acctSignOut), a::signOut)
            }
            if (s.error != null) Text(t(L10nKey.acctSignInFail, mapOf("msg" to s.error)), style = LKType.bodySm.toCompose(), color = c.error)
        }
    }
    if (s.sync.state == SyncState.NEEDS_ACCOUNT_CHOICE) AlertDialog(
        onDismissRequest = {},
        text = { Text(t(L10nKey.acctOtherAccount), style = LKType.bodyMd.toCompose(), color = c.onSurface) },
        confirmButton = { TextButton(onClick = { a.chooseAccount(true) }, modifier = Modifier.heightIn(min = MinTap)) { Text(t(L10nKey.actionContinue), color = c.secondary) } },
        dismissButton = { TextButton(onClick = { a.chooseAccount(false) }, modifier = Modifier.heightIn(min = MinTap)) { Text(t(L10nKey.actionCancel), color = c.onSurfaceVariant) } },
        containerColor = c.card,
    )
}

@Composable
private fun syncLine(s: SyncStatus, now: Long): String {
    val t = LocalL10n.current
    return when (s.state) {
        SyncState.SYNCING -> t(L10nKey.syncRunning)
        SyncState.PAUSED -> t(L10nKey.syncPaused)
        SyncState.OFFLINE -> t(L10nKey.syncOffline)
        SyncState.ERROR -> t(L10nKey.syncError, mapOf("msg" to s.error))
        else -> if (s.lastSync > 0) t(L10nKey.syncDone, mapOf("time" to ago(s.lastSync, now))) else t(L10nKey.syncPaused)
    }
}

/** web Sync.ago: "just now" under a minute, else the platform's relative time in the UI language. */
@Composable
private fun ago(ts: Long, now: Long): String {
    val t = LocalL10n.current
    if (now - ts < 60_000) return t(L10nKey.syncJustNow)
    return android.icu.text.RelativeDateTimeFormatter.getInstance(t.locale).let { f ->
        val min = (now - ts) / 60_000
        if (min < 60) f.format(min.toDouble(), android.icu.text.RelativeDateTimeFormatter.Direction.LAST, android.icu.text.RelativeDateTimeFormatter.RelativeUnit.MINUTES)
        else if (min < 1440) f.format((min / 60).toDouble(), android.icu.text.RelativeDateTimeFormatter.Direction.LAST, android.icu.text.RelativeDateTimeFormatter.RelativeUnit.HOURS)
        else f.format((min / 1440).toDouble(), android.icu.text.RelativeDateTimeFormatter.Direction.LAST, android.icu.text.RelativeDateTimeFormatter.RelativeUnit.DAYS)
    }
}

@Composable
private fun ProviderButton(label: String, busy: Boolean, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Box(Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(PillShape).background(c.surface).border(2.dp, c.outlineVariant, PillShape).tactile(if (busy) null else onClick), contentAlignment = Alignment.Center) {
        Text(label, style = LKType.titlePill.toCompose(), color = c.onSurface, modifier = Modifier.padding(horizontal = LKSpacing.spaceMd))
    }
}
