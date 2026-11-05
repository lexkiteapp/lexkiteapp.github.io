plugins {
    id("com.android.application") version "8.13.0" apply false
    id("org.jetbrains.kotlin.android") version "2.2.20" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.20" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.2.20" apply false
    id("io.github.takahirom.roborazzi") version "1.46.1" apply false
    // M1 modules + Firebase (Auth/Crashlytics) + Room (kapt, same Kotlin version → no KSP pin to drift)
    id("com.android.library") version "8.13.0" apply false
    id("org.jetbrains.kotlin.kapt") version "2.2.20" apply false
    id("com.google.gms.google-services") version "4.4.2" apply false
    id("com.google.firebase.crashlytics") version "3.0.2" apply false
}
