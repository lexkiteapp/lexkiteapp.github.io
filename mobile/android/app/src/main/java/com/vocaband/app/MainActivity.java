package com.vocaband.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class); // plugin nội bộ cho widget màn hình chính
        registerPlugin(WordWidgetPlugin.class); // widget "Từ mỗi giờ"
        registerPlugin(LexAIPlugin.class); // AI có sẵn trên máy (Gemini Nano/ML Kit) – web/js/ai-local.js
        super.onCreate(savedInstanceState);
        keepInputAboveKeyboard();
    }

    // Bàn phím ảo che ô đang nhập (đo trên emulator: IME hiện mà visualViewport/innerHeight của WebView không đổi):
    // targetSdk 36 bắt buộc edge-to-edge → adjustResize không còn thu nhỏ cửa sổ, và capacitor.config.json đặt
    // SystemBars.insetsHandling = "disable" (vùng an toàn do CSS env() lo) nên Capacitor không gắn bộ nghe inset nào.
    // Ở đây chỉ làm phần bàn phím của SystemBars: IME hiện → đệm đáy decorView đúng chiều cao IME (WebView thấp lại,
    // trình duyệt tự cuộn ô focus lên trên bàn phím); IME ẩn → 0. Inset thanh hệ thống chuyển nguyên cho WebView như cũ.
    // Khoá: scripts/test/android-ime.mjs (+ đo bàn phím thật: scripts/test/journey-e2e/android.mjs).
    private void keepInputAboveKeyboard() {
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            boolean kb = insets.isVisible(WindowInsetsCompat.Type.ime());
            int bottom = kb ? insets.getInsets(WindowInsetsCompat.Type.ime()).bottom : 0;
            if (v.getPaddingBottom() != bottom || v.getPaddingTop() != 0) v.setPadding(0, 0, 0, bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(decor);
    }
}
