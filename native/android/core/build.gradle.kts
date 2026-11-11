// :core – offline-first data (Room keeps every web Cards.make field, DataStore settings), sync (merge port of web/js/sync.js,
// D1 + Drive transports, WorkManager), C03 migration from the Capacitor app, auth/crash interfaces (Firebase lives in :app),
// FSRS + answer check, deep links, Today model. No Firebase here → JVM tests run without it.
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.kapt")
}

android {
    namespace = "com.lexkite.app.core"
    compileSdk = 36
    defaultConfig { minSdk = 24; consumerProguardFiles("consumer-rules.pro") }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }
kapt { correctErrorTypes = true }

dependencies {
    api("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    api("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    api("androidx.room:room-runtime:2.7.2")
    api("androidx.room:room-ktx:2.7.2")
    kapt("androidx.room:room-compiler:2.7.2")
    api("androidx.datastore:datastore-preferences:1.1.7")
    api("androidx.work:work-runtime-ktx:2.10.2")
}
