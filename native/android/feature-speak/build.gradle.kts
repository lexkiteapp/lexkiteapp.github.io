// :feature-speak – M4 speaking + pronunciation screens (#/speak, #/speaking, #/pron, #/say, #/reflex, #/rtype, #/roleplay, #/handsfree) + P08 #/call (Call Ama & Carlos: list, ring, live call, summary): Compose screens + view models over core/speak;
// colours/spacing/text only from :design (generated tokens, L10nKey). Logic and vector parity live in :core (com.lexkite.app.core.speak); the speech recogniser seam is :feature-lesson's SpeechInput.
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.lexkite.app.feature.speak"
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
    implementation(project(":feature-lesson"))
    implementation(project(":feature-skills")) // QuestionGroups: the question list of #/rtype is the one of the reading / listening screens
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
}
