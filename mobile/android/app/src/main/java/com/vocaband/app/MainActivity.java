package com.vocaband.app;

import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Chromium WebView từ 140 mới trả env(safe-area-inset-*) đúng trong WebView edge-to-edge (Capacitor SystemBars dùng cùng mốc)
    private static final int WEBVIEW_SAFE_AREA_ENV = 140;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class); // plugin nội bộ cho widget màn hình chính
        registerPlugin(WordWidgetPlugin.class); // widget "Từ mỗi giờ"
        registerPlugin(LexAIPlugin.class); // AI có sẵn trên máy (Gemini Nano/ML Kit) – web/js/ai-local.js
        super.onCreate(savedInstanceState);
        keepInputAboveKeyboard();
    }

    // Đo trên emulator (journey-e2e native=1): (1) Gboard hiện mà innerHeight/visualViewport của WebView không đổi → ô ở nửa dưới
    // (Phòng viết) nằm sau bàn phím; (2) WebView cũ (< 140): env(safe-area-inset-top) = 0 → ô tra từ trên thanh trên nằm dưới thanh trạng
    // thái, chạm không được. Gốc: targetSdk 36 = edge-to-edge bắt buộc (adjustResize vô hiệu) + capacitor.config.json đặt
    // SystemBars.insetsHandling = "disable" (bản css chèn biến safe-area lỗi – 22/10) nên Capacitor không gắn bộ nghe inset nào.
    // Ở đây làm đúng phần inset của SystemBars, KHÔNG chèn CSS: IME hiện → đệm đáy = chiều cao IME (WebView thấp lại, trình duyệt tự
    // cuộn ô focus lên trên bàn phím). WebView ≥ 140: inset thanh hệ thống chuyển nguyên cho CSS env() như cũ; WebView cũ: đệm theo
    // thanh hệ thống (nội dung không chui dưới thanh) và báo inset 0 cho WebView. Khoá: scripts/test/android-ime.mjs.
    private void keepInputAboveKeyboard() {
        View decor = getWindow().getDecorView();
        final boolean envOk = webViewMajor() >= WEBVIEW_SAFE_AREA_ENV;
        final int bars = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            boolean kb = insets.isVisible(WindowInsetsCompat.Type.ime());
            int bottom = kb ? insets.getInsets(WindowInsetsCompat.Type.ime()).bottom : 0;
            Insets sb = insets.getInsets(bars);
            if (envOk) {
                if (v.getPaddingBottom() != bottom || v.getPaddingTop() != 0) v.setPadding(0, 0, 0, bottom);
                if (!kb) return insets;
                // bàn phím đã chiếm đáy (gồm thanh điều hướng) → env(safe-area-inset-bottom) = 0, không chừa đôi
                return new WindowInsetsCompat.Builder(insets).setInsets(bars, Insets.of(sb.left, sb.top, sb.right, 0)).build();
            }
            v.setPadding(sb.left, sb.top, sb.right, kb ? bottom : sb.bottom);
            return new WindowInsetsCompat.Builder(insets).setInsets(bars, Insets.of(0, 0, 0, 0)).build();
        });
        ViewCompat.requestApplyInsets(decor);
    }

    private int webViewMajor() {
        try {
            PackageInfo p = WebViewCompat.getCurrentWebViewPackage(this);
            if (p != null && p.versionName != null) return Integer.parseInt(p.versionName.split("\\.")[0]);
        } catch (Exception e) {
            // không đọc được bản WebView → coi như cũ (an toàn: đệm theo thanh hệ thống)
        }
        return 0;
    }
}
