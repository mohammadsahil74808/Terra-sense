package com.terrasense.alerts

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.terrasense.alerts.data.AlertPreferences
import com.terrasense.alerts.model.LandslideAlert
import com.terrasense.alerts.service.TerraSenseFirebaseMessagingService
import com.terrasense.alerts.ui.AlertDetailsScreen
import com.terrasense.alerts.ui.MainScreen
import com.terrasense.alerts.ui.theme.TerraSenseTheme

class MainActivity : ComponentActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private var hasNotificationPermission by mutableStateOf(false)
    private var selectedAlert by mutableStateOf<LandslideAlert?>(null)

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        hasNotificationPermission = isGranted
        Log.i(TAG, "Notification permission result: $isGranted")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        checkNotificationPermission()
        retrieveFcmToken()

        // Handle cold-start launch from notification tap
        selectedAlert = extractAlertFromIntent(intent)
        if (selectedAlert != null) {
            Log.i(TAG, "Opened via push notification with alert ID: ${selectedAlert?.alertId}")
        }

        setContent {
            TerraSenseTheme {
                // Intercept back button when viewing alert details
                BackHandler(enabled = selectedAlert != null) {
                    selectedAlert = null
                }

                val fcmToken by AlertPreferences.tokenState.collectAsState()
                val recentAlerts by AlertPreferences.alertsState.collectAsState()

                val currentAlert = selectedAlert
                if (currentAlert != null) {
                    AlertDetailsScreen(
                        alert = currentAlert,
                        onBack = { selectedAlert = null }
                    )
                } else {
                    MainScreen(
                        fcmToken = fcmToken,
                        hasNotificationPermission = hasNotificationPermission,
                        recentAlerts = recentAlerts,
                        onRefreshToken = { retrieveFcmToken() },
                        onRequestPermission = { requestNotificationPermission() },
                        onTriggerTestAlert = { triggerTestAlert() },
                        onSelectAlert = { alert -> selectedAlert = alert }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        // Handle warm-start launch from notification tap
        val alertFromIntent = extractAlertFromIntent(intent)
        if (alertFromIntent != null) {
            selectedAlert = alertFromIntent
            Log.i(TAG, "Navigated to alert details via onNewIntent: ${alertFromIntent.alertId}")
        }
    }

    /**
     * Extracts structured LandslideAlert model from notification launch intent extras.
     * Gracefully supports:
     * 1) FCM background notification intents (where FCM unpacks data payload keys directly as Strings in extras)
     * 2) Foreground / custom service PendingIntent extras (with EXTRA_* constants)
     * 3) Local preferences lookup by alertId if payload was partial
     */
    private fun extractAlertFromIntent(intent: Intent?): LandslideAlert? {
        if (intent == null) return null
        val extras = intent.extras ?: return null

        // 1. Gather all bundle keys and string values into a normalized Map
        val dataMap = mutableMapOf<String, String>()
        for (key in extras.keySet()) {
            val value = extras.get(key)
            if (value != null) {
                dataMap[key] = value.toString()
            }
        }

        // 2. Identify target and alert identifiers across all conventions
        val navTarget = extras.getString(TerraSenseFirebaseMessagingService.EXTRA_NAV_TARGET)
            ?: dataMap["nav_target"]
            ?: dataMap["target"]

        val alertId = extras.getString(TerraSenseFirebaseMessagingService.EXTRA_ALERT_ID)
            ?: dataMap["alert_id"]
            ?: dataMap["alertId"]
            ?: dataMap["google.message_id"]

        // 3. Determine if this intent represents an alert notification tap
        val isAlertIntent = navTarget == TerraSenseFirebaseMessagingService.NAV_TARGET_ALERT_DETAILS
            || dataMap.containsKey("alert_id")
            || dataMap.containsKey("alertId")
            || dataMap.containsKey(TerraSenseFirebaseMessagingService.EXTRA_ALERT_ID)
            || dataMap.containsKey("cell_id")
            || dataMap.containsKey("cellId")
            || dataMap.containsKey("risk_score")
            || dataMap.containsKey("riskScore")
            || dataMap.containsKey("risk_level")
            || dataMap["type"]?.startsWith("LANDSLIDE", ignoreCase = true) == true
            || dataMap["type"]?.startsWith("DEMO", ignoreCase = true) == true

        if (!isAlertIntent) {
            return null
        }

        // 4. If alertId is known, check if we already saved the complete alert in history
        if (!alertId.isNullOrBlank()) {
            val cachedAlert = AlertPreferences.getAlertById(this, alertId)
            if (cachedAlert != null) {
                Log.i(TAG, "Reusing cached alert from AlertPreferences: ${cachedAlert.alertId}")
                return cachedAlert
            }
        }

        // 5. Parse alert model using LandslideAlert.fromMap
        val parsedFromMap = LandslideAlert.fromMap(dataMap)

        // 6. Supplement with any explicit typed extras if present
        val explicitRisk = extras.getDouble(TerraSenseFirebaseMessagingService.EXTRA_RISK_SCORE, -1.0)
        val finalRiskScore = if (explicitRisk >= 0.0) explicitRisk else parsedFromMap.riskScore

        val explicitRain = extras.getDouble(TerraSenseFirebaseMessagingService.EXTRA_RAINFALL, -1.0)
        val finalRainfall = if (explicitRain >= 0.0) explicitRain else parsedFromMap.rainfall

        val explicitTimestamp = extras.getLong(TerraSenseFirebaseMessagingService.EXTRA_TIMESTAMP, -1L)
        val finalTimestamp = if (explicitTimestamp > 0) explicitTimestamp else parsedFromMap.timestamp

        val alert = parsedFromMap.copy(
            riskScore = finalRiskScore,
            rainfall = finalRainfall,
            timestamp = finalTimestamp
        )

        // Cache this alert so history and back navigation stay in sync
        AlertPreferences.addAlert(this, alert)

        return alert
    }

    private fun checkNotificationPermission() {
        hasNotificationPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            hasNotificationPermission = true
        }
    }

    /**
     * Safely retrieves the FCM registration token if Firebase has been initialized.
     */
    private fun retrieveFcmToken() {
        try {
            if (FirebaseApp.getApps(this).isNotEmpty()) {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        Log.i(TAG, "Fetched FCM Registration Token: $token")
                        AlertPreferences.saveToken(this, token)
                    } else {
                        Log.w(TAG, "Fetching FCM registration token failed: ${task.exception?.message}")
                    }
                }
            } else {
                Log.d(TAG, "FirebaseApp is not initialized yet.")
            }
        } catch (e: Exception) {
            Log.d(TAG, "FCM token retrieval caught expected placeholder state: ${e.message}")
        }
    }

    /**
     * Simulates receiving a high-risk landslide alert notification locally.
     * Uses the dedicated custom sound channel and PendingIntent to open AlertDetailsScreen.
     */
    private fun triggerTestAlert() {
        val testAlert = LandslideAlert(
            alertId = "SIM-${System.currentTimeMillis() % 10000}",
            title = LandslideAlert.DEFAULT_ALERT_TITLE,
            message = "Critical rainfall threshold exceeded. Immediate slope failure risk detected in Kohima Ridge corridor.",
            location = "Kohima, Nagaland",
            cellId = "NER_0427",
            riskScore = 0.82,
            rainfall = 185.0,
            riskLevel = "HIGH",
            isDemo = false,
            timestamp = System.currentTimeMillis()
        )

        AlertPreferences.addAlert(this, testAlert)

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_NAV_TARGET, TerraSenseFirebaseMessagingService.NAV_TARGET_ALERT_DETAILS)
            putExtra("nav_target", TerraSenseFirebaseMessagingService.NAV_TARGET_ALERT_DETAILS)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_ALERT_ID, testAlert.alertId)
            putExtra("alert_id", testAlert.alertId)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_CELL_ID, testAlert.cellId)
            putExtra("cell_id", testAlert.cellId)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_RISK_SCORE, testAlert.riskScore ?: -1.0)
            putExtra("risk_score", testAlert.riskScore?.toString() ?: "0.82")
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_RISK_LEVEL, testAlert.riskLevel)
            putExtra("risk_level", testAlert.riskLevel)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_RAINFALL, testAlert.rainfall ?: -1.0)
            putExtra("rainfall", testAlert.rainfall?.toString() ?: "185.0")
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_LOCATION, testAlert.location)
            putExtra("location", testAlert.location)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_MESSAGE, testAlert.message)
            putExtra("message", testAlert.message)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_TITLE, testAlert.title)
            putExtra("title", testAlert.title)
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_IS_DEMO, testAlert.isDemo)
            putExtra("is_demo", testAlert.isDemo.toString())
            putExtra(TerraSenseFirebaseMessagingService.EXTRA_TIMESTAMP, testAlert.timestamp)
        }

        val pendingIntentFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            testAlert.alertId.hashCode(),
            launchIntent,
            pendingIntentFlag
        )

        val customSoundUri = TerraSenseApp.getAlertSoundUri(this)
        val builder = NotificationCompat.Builder(this, TerraSenseApp.CHANNEL_HIGH_ALERTS_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("🚨 TerraSense HIGH Risk Alert")
            .setContentText("High landslide risk detected in ${testAlert.location}. Risk score: 0.82.")
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "${testAlert.message}\n\n• Location: ${testAlert.location}\n• Cell: ${testAlert.cellId}\n• Risk Score: 0.82 (82%)\n• 7-Day Rainfall: 185.0 mm\n• Alert ID: ${testAlert.alertId}"
                )
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(customSoundUri)
            .setVibrate(longArrayOf(0, 400, 200, 400))
            .setContentIntent(pendingIntent)

        try {
            NotificationManagerCompat.from(this).notify(testAlert.alertId.hashCode(), builder.build())
        } catch (e: SecurityException) {
            Log.w(TAG, "Notification permission required to display alert: ${e.message}")
            requestNotificationPermission()
        }
    }
}
