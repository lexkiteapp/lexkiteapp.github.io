# Lexkite native – R8 rules (release: minify + shrinkResources).
# Readable Crashlytics stack traces (mapping is uploaded by the Crashlytics Gradle plugin).
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile
-keep public class * extends java.lang.Exception

# kotlinx.serialization (LKFrame + nested @Serializable classes)
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.lexkite.app.**$$serializer { *; }
-keepclassmembers class com.lexkite.app.** { *** Companion; }
-keepclasseswithmembers class com.lexkite.app.** { kotlinx.serialization.KSerializer serializer(...); }

# Room: generated *_Impl classes are created reflectively by Room.databaseBuilder
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class com.lexkite.app.core.data.** { *; }

# WebView bridge of the C03 migration (called from JS by name)
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }

# Firebase Auth / Credential Manager / Google ID ship their own consumer rules; keep the Credential Manager provider lookup
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** { *; }
