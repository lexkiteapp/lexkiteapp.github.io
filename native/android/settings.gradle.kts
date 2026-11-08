// Native Android app (Kotlin + Jetpack Compose). Built and tested on CI only: .github/workflows/native-android.yml
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "Lexkite"
include(":app", ":core", ":design", ":feature-today", ":feature-me", ":feature-onboarding", ":feature-lesson", ":feature-vocab")
