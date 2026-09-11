package com.terrasense.alerts.service

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.terrasense.alerts.MainActivity
import com.terrasense.alerts.TerraSenseApp
import com.terrasense.alerts.data.AlertPreferences
import com.terrasense.alerts.model.LandslideAlert

class TerraSenseFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "TerraSenseFCM"

        const val EXTRA_NAV_TARGET = "extra_nav_target"
        const val NAV_TARGET_ALERT_DETAILS = "ALERT_DETAILS"

        const val EXTRA_ALERT_ID = "extra_alert_id"
        const val EXTRA_CELL_ID = "extra_cell_id"
        const val EXTRA_RISK_SCORE = "extra_risk_score"
        const val EXTRA_RISK_LEVEL = "extra_risk_level"
        const val EXTRA_RAINFALL = "extra_rainfall"
        const val EXTRA_LOCATION = "extra_location"
        const val EXTRA_MESSAGE = "extra_message"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_IS_DEMO = "extra_is_demo"
        const val EXTRA_TIMESTAMP = "extra_timestamp"
        const val EXTRA_RAW_TIMESTAMP = "extra_raw_timestamp"
    }

    /**
     * Called when a new FCM registration token is generated or rotated.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "=========================================================")
        Log.i(TAG, " TerraSense FCM Registration Token Received:")
        Log.i(TAG, " $token")
        Log.i(TAG, "=========================================================")

        // Persist token in local storage
        AlertPreferences.saveToken(applicationContext, token)
    }

    /**
     * Called when an FCM message is received.
     * Handles both foreground and background data payloads seamlessly.
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "FCM Message received from: ${remoteMessage.from}")

        val dataPayload = remoteMessage.data
        val notificationPayload = remoteMessage.notification

        // Extract or parse the landslide alert model
        val alert = if (dataPayload.isNotEmpty()) {
            LandslideAlert.fromMap(dataPayload)
        } else if (notificationPayload != null) {
            val title = notificationPayload.title ?: LandslideAlert.DEFAULT_ALERT_TITLE
            val isDemo = title.contains("DEMO", ignoreCase = true)
            LandslideAlert(
                alertId = "ALERT-${System.currentTimeMillis() % 100000}",
                title = title,
                message = notificationPayload.body ?: "High landslide risk reported.",
                location = "Monitored Region",
                cellId = "N/A",
                riskScore = null,
                rainfall = null,
                riskLevel = "HIGH",
                isDemo = isDemo,
                timestamp = System.currentTimeMillis()
            )
        } else {
            Log.w(TAG, "Received empty FCM message payload.")
            return
        }

        Log.i(TAG, "Parsed TerraSense Landslide Alert: ${alert.alertId} in ${alert.location}, Risk: ${alert.riskScore}")

        // Save alert into local history
        AlertPreferences.addAlert(applicationContext, alert)

        // Present the heads-up notification with custom audio
        showNotification(alert)
    }

    /**
     * Builds and presents the HIGH priority notification to the user.
     * Uses custom emergency alert tone and routes directly to AlertDetailsScreen.
     */
    private fun showNotification(alert: LandslideAlert) {
        val context = applicationContext

        // Intent to launch MainActivity and navigate to AlertDetailsScreen
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_NAV_TARGET, NAV_TARGET_ALERT_DETAILS)
            putExtra("nav_target", NAV_TARGET_ALERT_DETAILS)
            putExtra(EXTRA_ALERT_ID, alert.alertId)
            putExtra("alert_id", alert.alertId)
            putExtra(EXTRA_CELL_ID, alert.cellId)
            putExtra("cell_id", alert.cellId)
            putExtra(EXTRA_RISK_SCORE, alert.riskScore ?: -1.0)
            alert.riskScore?.let { putExtra("risk_score", it.toString()) }
            putExtra(EXTRA_RISK_LEVEL, alert.riskLevel)
            putExtra("risk_level", alert.riskLevel)
            putExtra(EXTRA_RAINFALL, alert.rainfall ?: -1.0)
            alert.rainfall?.let { putExtra("rainfall", it.toString()) }
            putExtra(EXTRA_LOCATION, alert.location)
            putExtra("location", alert.location)
            putExtra(EXTRA_MESSAGE, alert.message)
            putExtra("message", alert.message)
            putExtra(EXTRA_TITLE, alert.title)
            putExtra("title", alert.title)
            putExtra(EXTRA_IS_DEMO, alert.isDemo)
            putExtra("is_demo", alert.isDemo.toString())
            putExtra(EXTRA_TIMESTAMP, alert.timestamp)
            putExtra(EXTRA_RAW_TIMESTAMP, alert.rawTimestampString)
        }

        val pendingIntentFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            alert.alertId.hashCode(),
            launchIntent,
            pendingIntentFlag
        )

        // Notification content following exact requirements
        val scoreText = alert.riskScore?.let { String.format(java.util.Locale.US, "%.2f", it) } ?: alert.riskLevel
        val notificationTitle = if (alert.isDemo) {
            "🚨 TerraSense Demo Alert"
        } else {
            "🚨 TerraSense HIGH Risk Alert"
        }

        val notificationBody = if (alert.isDemo) {
            "Test notification from TerraSense alert system."
        } else {
            "High landslide risk detected in ${alert.location}. Risk score: $scoreText."
        }

        val expandedBody = buildString {
            appendLine(alert.message)
            appendLine()
            appendLine("• Location: ${alert.location}")
            appendLine("• Cell ID: ${alert.cellId}")
            if (alert.riskScore != null) appendLine("• Risk Score: $scoreText (${alert.formattedRiskPercentage})")
            if (alert.rainfall != null) appendLine("• 7-Day Rainfall: ${alert.formattedRainfall}")
            appendLine("• Alert Reference: ${alert.alertId}")
            if (alert.isDemo) {
                appendLine()
                appendLine("[DEMO NOTIFICATION - NOT A REAL EMERGENCY]")
            }
        }

        val customSoundUri = TerraSenseApp.getAlertSoundUri(context)

        val notificationBuilder = NotificationCompat.Builder(context, TerraSenseApp.CHANNEL_HIGH_ALERTS_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(notificationTitle)
            .setContentText(notificationBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(expandedBody))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(customSoundUri)
            .setVibrate(longArrayOf(0, 400, 200, 400))
            .setContentIntent(pendingIntent)

        try {
            val notificationId = (alert.alertId.hashCode() and 0x7FFFFFFF)
            NotificationManagerCompat.from(context).notify(notificationId, notificationBuilder.build())
            Log.i(TAG, "Displayed heads-up notification for alert ${alert.alertId} (id: $notificationId)")
        } catch (e: SecurityException) {
            Log.w(TAG, "Notification permission not granted, cannot display heads-up alert: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error displaying notification: ${e.message}", e)
        }
    }
}
