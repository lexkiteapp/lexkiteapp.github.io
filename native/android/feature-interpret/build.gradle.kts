// :feature-interpret – Phiên dịch (#/interpret): two people face to face, each side one mic. Compose screens + view model over core/interpret;
// recogniser (:feature-lesson SpeechInput), on-device translation + language id (ML Kit, free, ~30 MB pack downloaded only when the user taps) and TextToSpeech are the platform seams.
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.lexkite.app.feature.interpret"
    compileSdk = 36
    defaultConfig { minSdk = 24 }
    buildFeatures { compose = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    implementation(project(":core"))
    implementation(project(":design"))
    implementation(project(":feature-vocab")) // StudyParts (page, chips, notices), WordEnv (Sổ từ)
    implementation(project(":feature-lesson")) // SpeechInput seam
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("com.google.mlkit:translate:17.0.3") // on-device translation, models downloaded only on a tap (requireWifi)
    implementation("com.google.mlkit:language-id:17.0.6") // bundled model, no download
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")
}
