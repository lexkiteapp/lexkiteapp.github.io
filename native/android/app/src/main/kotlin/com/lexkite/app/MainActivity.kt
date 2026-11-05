package com.lexkite.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.lexkite.app.i18n.L10n
import com.lexkite.app.ui.AppShell

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val t = L10n.load(this, L10n.preferred(resources.configuration.locales.get(0).language))
        setContent { AppShell(t) }
    }
}
