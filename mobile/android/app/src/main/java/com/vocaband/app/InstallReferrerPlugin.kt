// Google Play Install Referrer (docs/META-ADS.md): InstallReferrer.get() → { referrer } – chuỗi utm_* do Play ghi lúc cài (quảng cáo Meta gắn utm_source=apps.facebook.com…).
// Không có SDK Meta, không đọc mã quảng cáo/thiết bị. Thư viện com.android.installreferrer ~ 30 KB (Google, chỉ lớp client); gọi 1 lần, JS nhớ kết quả (mobile/meta-attr.js).
package com.vocaband.app

import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "InstallReferrer")
class InstallReferrerPlugin : Plugin() {
    @PluginMethod
    fun get(call: PluginCall) {
        val client = runCatching { InstallReferrerClient.newBuilder(context).build() }.getOrNull()
        if (client == null) { call.resolve(JSObject().put("referrer", "")); return }
        var done = false
        fun finish(ref: String?) { if (done) return; done = true; runCatching { client.endConnection() }; call.resolve(JSObject().put("referrer", (ref ?: "").take(600))) }
        runCatching {
            client.startConnection(object : InstallReferrerStateListener {
                override fun onInstallReferrerSetupFinished(code: Int) {
                    finish(if (code == InstallReferrerClient.InstallReferrerResponse.OK) runCatching { client.installReferrer.installReferrer }.getOrNull() else null)
                }
                override fun onInstallReferrerServiceDisconnected() = finish(null)
            })
        }.onFailure { finish(null) }
    }
}
