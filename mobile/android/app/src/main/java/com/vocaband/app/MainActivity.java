package com.vocaband.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class); // plugin nội bộ cho widget màn hình chính
        registerPlugin(WordWidgetPlugin.class); // widget "Từ mỗi giờ"
        registerPlugin(LexAIPlugin.class); // AI có sẵn trên máy (Gemini Nano/ML Kit) – web/js/ai-local.js
        super.onCreate(savedInstanceState);
    }
}
