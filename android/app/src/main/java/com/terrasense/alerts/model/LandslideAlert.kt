package com.terrasense.alerts.model

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Model representing a TerraSense Landslide Alert.
 * Supports all attributes parsed from FCM payloads or local test simulations.
 */
data class LandslideAlert(
    val alertId: String,
    val title: String,
    val message: String,
    val location: String,
    val cellId: String,
    val riskScore: Double?,
    val rainfall: Double?,
    val riskLevel: String = "HIGH",
    val isDemo: Boolean = false,
    val timestamp: Long = System.currentTimeMillis(),
    val rawTimestampString: String? = null
) {
    val formattedDate: String
        get() {
            return try {
                val sdf = SimpleDateFormat("d MMM yyyy, h:mm a", Locale.getDefault())
                sdf.format(Date(timestamp))
            } catch (e: Exception) {
                rawTimestampString ?: "Just now"
            }
        }

    val formattedRiskPercentage: String
        get() {
            return riskScore?.let { "${(it * 100).toInt()}%" } ?: riskLevel
        }

    val formattedRainfall: String
        get() {
            return rainfall?.let { String.format(Locale.US, "%.1f mm", it) } ?: "N/A"
        }

    companion object {
        const val DEFAULT_ALERT_TITLE = "\uD83D\uDEA8 TerraSense HIGH Risk Alert"
        const val DEFAULT_DEMO_TITLE = "\uD83D\uDEA8 TerraSense Demo Alert"

        /**
         * Parses a LandslideAlert from an FCM data payload map.
         * Gracefully handles incomplete or unexpected data without crashing.
         */
        fun fromMap(data: Map<String, String>): LandslideAlert {
            val alertId = data["alert_id"]
                ?: data["alertId"]
                ?: "ALT-${System.currentTimeMillis() % 100000}"

            val type = data["type"] ?: ""
            val isDemo = data["is_demo"]?.toBoolean() == true
                || type.contains("DEMO", ignoreCase = true)
                || alertId.startsWith("DEMO", ignoreCase = true)

            val title = data["title"]
                ?: if (isDemo) DEFAULT_DEMO_TITLE else DEFAULT_ALERT_TITLE

            val message = data["message"]
                ?: data["body"]
                ?: if (isDemo) "Test notification from TerraSense alert system." else "High landslide risk detected in monitored zone."

            val location = data["location"]
                ?: data["state"]
                ?: "Monitored Region"

            val cellId = data["cell_id"]
                ?: data["cellId"]
                ?: "UNKNOWN-CELL"

            val riskScore = data["risk_score"]?.toDoubleOrNull()
                ?: data["riskScore"]?.toDoubleOrNull()

            val rawRain = data["rainfall"] ?: data["rainfall_7d"] ?: data["rain"]
            val cleanRain = rawRain?.replace("mm", "", ignoreCase = true)?.trim()
            val rainfall = cleanRain?.toDoubleOrNull()

            val riskLevel = data["risk_level"]
                ?: data["riskLevel"]
                ?: if (riskScore != null && riskScore >= 0.66) "HIGH" else "HIGH"

            val rawTimestamp = data["timestamp"]

            return LandslideAlert(
                alertId = alertId,
                title = title,
                message = message,
                location = location,
                cellId = cellId,
                riskScore = riskScore,
                rainfall = rainfall,
                riskLevel = riskLevel,
                isDemo = isDemo,
                timestamp = System.currentTimeMillis(),
                rawTimestampString = rawTimestamp
            )
        }
    }
}
