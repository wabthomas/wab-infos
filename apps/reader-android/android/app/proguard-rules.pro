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

# Firebase Cloud Messaging
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.**

# Évite de supprimer les classes utilisées via réflexion par AndroidX
-keep class androidx.core.app.CoreComponentFactory { *; }
