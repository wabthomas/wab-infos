# Garde l'interface JavaScript exposée à la WebView (partage natif)
-keepclassmembers class com.wabinfos.app.MainActivity$NativeBridge {
    public *;
}
-keep class com.wabinfos.app.MainActivity$NativeBridge {
    public *;
}

# WebView JavascriptInterface : nécessaire pour que @JavascriptInterface fonctionne après minification
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# Google Play In-App Updates (reader)
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.**

-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.**

# Évite de supprimer les classes utilisées via réflexion par AndroidX
-keep class androidx.core.app.CoreComponentFactory { *; }
