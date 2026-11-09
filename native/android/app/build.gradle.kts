plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("io.github.takahirom.roborazzi")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

// ONE Firebase project: the live app's mobile/android/app/google-services.json is the only source. It is copied (never edited)
// next to this build file at configuration time because the Google Services plugin only reads it from here; the copy is
// git-ignored (native/android/.gitignore) and refreshed on every build, so it can never drift from mobile/.
run {
    val src = rootProject.file("../../mobile/android/app/google-services.json")
    val dst = file("google-services.json")
    if (src.exists() && (!dst.exists() || dst.readText() != src.readText())) src.copyTo(dst, overwrite = true)
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
    // Release signing = same upload key + env names as mobile/android (CI secrets); only configured when the keystore exists,
    // so debug builds and CI tests never need it.
    val ks = System.getenv("LEXKITE_KEYSTORE_FILE")?.takeIf { it.isNotBlank() && file(it).exists() }
    signingConfigs {
        if (ks != null) create("release") {
            storeFile = file(ks)
            storePassword = System.getenv("LEXKITE_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("LEXKITE_KEY_ALIAS")
            keyPassword = System.getenv("LEXKITE_KEY_PASSWORD")
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["crashlytics"] = "false" // never report from debug/test builds
            configure<com.google.firebase.crashlytics.buildtools.gradle.CrashlyticsExtension> { mappingFileUploadEnabled = false }
        }
        getByName("release") {
            if (ks != null) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            manifestPlaceholders["crashlytics"] = "true"
            // R8 mapping → Crashlytics so release stack traces are readable (needs network on the release runner; off with LEXKITE_CRASHLYTICS_UPLOAD=0)
            configure<com.google.firebase.crashlytics.buildtools.gradle.CrashlyticsExtension> { mappingFileUploadEnabled = System.getenv("LEXKITE_CRASHLYTICS_UPLOAD") != "0" }
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
    // ONE source: generated strings/frame/migration-export.js come from native/shared/gen (scripts/native/gen.mjs) – no copies here.
    // Conformance vectors are test-only (not shipped in the APK).
    sourceSets["main"].assets.srcDirs("../../shared/gen")
    androidResources { ignoreAssetsPatterns += listOf("!.svn", "!.git", "!.ds_store", "!*.scc", ".*", "<dir>_*", "!CVS", "!thumbs.db", "!picasa.ini", "!*~", "<dir>vectors") }
    sourceSets["test"].resources.srcDirs("../../shared/gen/vectors", "../../shared/gen/content-pack", "../../../web/data") // web/data/skills-pack.json = the downloaded P06 pack (test only) // starter.json (bundled pack = main assets) is read by the onboarding test
    testOptions { unitTests { isIncludeAndroidResources = true; all { it.systemProperty("user.timezone", "UTC") } } }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }

dependencies {
    implementation(project(":core"))
    implementation(project(":design"))
    implementation(project(":feature-today"))
    implementation(project(":feature-me"))
    implementation(project(":feature-onboarding"))
    implementation(project(":feature-lesson"))
    implementation(project(":feature-vocab"))
    implementation(project(":feature-skills"))
    implementation(project(":feature-speak"))
    implementation("androidx.core:core-splashscreen:1.0.1") // C17 system splash (brand colour, then Compose brand screen)

    val bom = platform("androidx.compose:compose-bom:2025.06.00")
    implementation(bom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("androidx.navigation:navigation-compose:2.8.9")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")

    // C01 sign-in: Firebase Auth (same project as mobile/) + Credential Manager (Google) + Identity (Drive appdata scope)
    implementation(platform("com.google.firebase:firebase-bom:34.0.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-crashlytics")
    implementation("com.google.firebase:firebase-config")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    implementation("com.google.android.gms:play-services-auth:21.3.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")

    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation(bom)
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.15.1")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    testImplementation("androidx.test:core:1.6.1")
    testImplementation("androidx.room:room-testing:2.7.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.46.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.46.1")
}
