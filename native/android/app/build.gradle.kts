plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("io.github.takahirom.roborazzi")
}

android {
    namespace = "com.lexkite.app"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.lexkite.app" // same as the live Capacitor app (mobile/) – the native build replaces it in place at parity
        minSdk = 24 // same as the live app – no device cut
        targetSdk = 36
        versionCode = (System.getenv("LEXKITE_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("LEXKITE_VERSION_NAME") ?: "2.0.0"
    }
    buildFeatures { compose = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
    // ONE source: generated strings/frame come from native/shared/gen (scripts/native/gen.mjs) – no copies here
    sourceSets["main"].assets.srcDirs("../../shared/gen")
    sourceSets["test"].resources.srcDirs("../../shared/gen/vectors")
    testOptions { unitTests { isIncludeAndroidResources = true; all { it.systemProperty("user.timezone", "UTC") } } }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    val bom = platform("androidx.compose:compose-bom:2025.06.00")
    implementation(bom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation(bom)
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.15.1")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.46.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.46.1")
}
