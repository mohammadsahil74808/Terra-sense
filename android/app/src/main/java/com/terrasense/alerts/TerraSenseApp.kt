package com.terrasense.alerts

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import com.terrasense.alerts.data.AlertPreferences

class TerraSenseApp : Application() {

    companion object {
        const val TAG = "TerraSenseApp"

        // Upgraded to v2 to enforce custom emergency alert tone on existing devices
        // (Android caches channel settings indefinitely once created)
        const val CHANNEL_HIGH_ALERTS_ID = "terrasense_alerts_high_v2"
        const val CHANNEL_HIGH_ALERTS_NAME = "TerraSense High Risk Alerts"
        const val CHANNEL_HIGH_ALERTS_DESC = "Emergency notifications with dedicated alert audio for landslide risk events."

        /**
         * Returns the URI pointing to the bundled custom emergency alert sound.
         */
        fun getAlertSoundUri(context: Context): Uri {
            return Uri.parse(
                "${ContentResolver.SCHEME_ANDROID_RESOURCE}://${context.packageName}/${R.raw.terrasense_alert}"
            )
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing TerraSense Alerts Application...")
        AlertPreferences.initialize(this)
        createNotificationChannels()
    }

    /**
     * Sets up the dedicated high-importance notification channel for TerraSense alerts.
     * Uses custom emergency audio chime, heads-up presentation, and distinct vibration pattern.
     * Does NOT affect normal phone notifications.
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return

            // Clean up obsolete v1 channel without custom sound if present
            try {
                notificationManager.deleteNotificationChannel("terrasense_alerts_high")
            } catch (e: Exception) {
                Log.d(TAG, "Notice on prior channel cleanup: ${e.message}")
            }

            val soundUri = getAlertSoundUri(this)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build()

            val channel = NotificationChannel(
                CHANNEL_HIGH_ALERTS_ID,
                CHANNEL_HIGH_ALERTS_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_HIGH_ALERTS_DESC
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                setSound(soundUri, audioAttributes)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            notificationManager.createNotificationChannel(channel)
            Log.i(TAG, "Dedicated notification channel '$CHANNEL_HIGH_ALERTS_ID' registered with custom alert sound.")
        }
    }
}
