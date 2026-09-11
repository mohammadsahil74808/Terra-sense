# Proguard rules for TerraSense Alerts
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.firebase.database.IgnoreExtraProperties *;
}
