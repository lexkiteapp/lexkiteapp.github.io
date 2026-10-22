package com.vocaband.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class); // plugin nội bộ cho widget màn hình chính
        registerPlugin(WordWidgetPlugin.class); // widget "Từ mỗi giờ"
        super.onCreate(savedInstanceState);
    }
}
