// :feature-skills – M4 listening + reading screens (#/listening, #/listen, #/listen-test, #/dictation, #/reading, #/read): Compose screens + view models over core/skills;
// colours/spacing/text only from :design (generated tokens, L10nKey). Logic and vector parity live in :core (com.lexkite.app.core.skills); the word popup reuses :feature-vocab (WordEnv, study UI parts).
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.lexkite.app.feature.skills"
    compileSdk = 36
    defaultConfig { minSdk = 24 }
    buildFeatures { compose = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    implementation(project(":core"))
    implementation(project(":design"))
    implementation(project(":feature-vocab"))
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
}
