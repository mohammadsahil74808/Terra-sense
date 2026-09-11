package com.terrasense.alerts

import com.terrasense.alerts.model.LandslideAlert
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class LandslideAlertTest {

    @Test
    fun testLandslideAlertFromMap_parsesAllRequiredFields() {
        val payload = mapOf(
            "alert_id" to "ALERT-2026-9912",
            "title" to "\uD83D\uDEA8 TerraSense HIGH Risk Alert",
            "message" to "Dangerous slope instability detected in Sector 4B.",
            "state" to "Himachal Pradesh",
            "cell_id" to "HP-SHIMLA-08",
            "risk_score" to "0.94",
            "rainfall" to "165.2"
        )

        val alert = LandslideAlert.fromMap(payload)

        assertEquals("ALERT-2026-9912", alert.alertId)
        assertEquals("\uD83D\uDEA8 TerraSense HIGH Risk Alert", alert.title)
        assertEquals("Dangerous slope instability detected in Sector 4B.", alert.message)
        assertEquals("Himachal Pradesh", alert.location)
        assertEquals("HP-SHIMLA-08", alert.cellId)
        assertEquals(0.94, alert.riskScore ?: 0.0, 0.001)
        assertEquals(165.2, alert.rainfall ?: 0.0, 0.001)
        assertNotNull(alert.timestamp)
    }

    @Test
    fun testLandslideAlertFromMap_handlesDefaults() {
        val payload = mapOf(
            "location" to "Uttarakhand",
            "cellId" to "UK-CHAMOLI-01"
        )

        val alert = LandslideAlert.fromMap(payload)

        assertEquals(LandslideAlert.DEFAULT_ALERT_TITLE, alert.title)
        assertEquals("Uttarakhand", alert.location)
        assertEquals("UK-CHAMOLI-01", alert.cellId)
        assertEquals("HIGH", alert.riskLevel)
        assertEquals(false, alert.isDemo)
    }

    @Test
    fun testLandslideAlertFromMap_parsesDemoPayload() {
        val payload = mapOf(
            "type" to "DEMO_TEST",
            "alert_id" to "DEMO-ABCD12",
            "message" to "Test notification from TerraSense alert system.",
            "is_demo" to "true"
        )

        val alert = LandslideAlert.fromMap(payload)

        assertEquals(true, alert.isDemo)
        assertEquals("🚨 TerraSense Demo Alert", alert.title)
        assertEquals("DEMO-ABCD12", alert.alertId)
    }

    @Test
    fun testLandslideAlertFromMap_parsesFcmBackgroundDataPayload() {
        val fcmDataPayload = mapOf(
            "type" to "LANDSLIDE_HIGH",
            "nav_target" to "ALERT_DETAILS",
            "alert_id" to "ALT-2026-FCM",
            "cell_id" to "NER_0427",
            "location" to "Nagaland · Kohima Ridge",
            "state" to "Nagaland",
            "title" to "🚨 TerraSense HIGH Risk Alert",
            "risk_score" to "0.88",
            "risk_level" to "HIGH",
            "rainfall" to "145.5mm",
            "rainfall_7d" to "145.5",
            "message" to "High landslide risk detected in Kohima Ridge.",
            "is_demo" to "false"
        )

        val alert = LandslideAlert.fromMap(fcmDataPayload)

        assertEquals("ALT-2026-FCM", alert.alertId)
        assertEquals("🚨 TerraSense HIGH Risk Alert", alert.title)
        assertEquals("High landslide risk detected in Kohima Ridge.", alert.message)
        assertEquals("Nagaland · Kohima Ridge", alert.location)
        assertEquals("NER_0427", alert.cellId)
        assertEquals(0.88, alert.riskScore ?: 0.0, 0.001)
        assertEquals(145.5, alert.rainfall ?: 0.0, 0.001)
        assertEquals("HIGH", alert.riskLevel)
        assertEquals(false, alert.isDemo)
    }
}
