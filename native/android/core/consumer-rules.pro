# Room entities/DAOs are generated; WebView bridge methods are called from JS by name (C03 migration)
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keep class com.lexkite.app.core.data.** { *; }
-keep class * extends androidx.work.ListenableWorker { <init>(android.content.Context, androidx.work.WorkerParameters); }
