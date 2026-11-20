// :feature-vocab – M3 vocabulary screens (#/review, #/practice, #/mistakes, #/deck, #/library, #/topic): Compose screens + view models over core/vocab; colours/spacing/text only from :design (generated tokens, L10nKey).
// Logic lives in :core (com.lexkite.app.core.vocab); the network, audio and image loading are injected by :app (VocabEnv / StudySlots).
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.lexkite.app.feature.vocab"
    compileSdk = 36
    defaultConfig { minSdk = 24 }
    buildFeatures { compose = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    implementation(project(":core"))
    implementation(project(":design"))
    implementation(project(":feature-lesson")) // SpeechInput (practice speak mode)
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
}
