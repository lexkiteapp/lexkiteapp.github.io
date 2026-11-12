// :feature-onboarding – first-run onboarding (C17): pure flow/settings model + Compose screens; colours/spacing/text only from :design (generated tokens, L10nKey).
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.lexkite.app.feature.onboarding"
    compileSdk = 36
    defaultConfig { minSdk = 24 }
    buildFeatures { compose = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    implementation(project(":core"))
    implementation(project(":design"))
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
}
