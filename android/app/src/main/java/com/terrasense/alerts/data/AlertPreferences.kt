package com.terrasense.alerts.data

import android.content.Context
import android.content.SharedPreferences
import com.terrasense.alerts.model.LandslideAlert
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local storage manager for TerraSense FCM token and recent alerts history.
 */
object AlertPreferences {
    private const val PREFS_NAME = "terrasense_alerts_prefs"
    private const val KEY_FCM_TOKEN = "fcm_token"
    private const val KEY_BACKEND_URL = "backend_url"
    private const val KEY_ALERTS_JSON = "recent_alerts_json"
    private const val MAX_STORED_ALERTS = 30

    private val _tokenState = MutableStateFlow<String?>(null)
    val tokenState: StateFlow<String?> = _tokenState.asStateFlow()

    private val _alertsState = MutableStateFlow<List<LandslideAlert>>(emptyList())
    val alertsState: StateFlow<List<LandslideAlert>> = _alertsState.asStateFlow()

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun initialize(context: Context) {
        val prefs = getPrefs(context)
        _tokenState.value = prefs.getString(KEY_FCM_TOKEN, null)
        _alertsState.value = loadAlerts(context)
    }

    fun saveToken(context: Context, token: String) {
        getPrefs(context).edit().putString(KEY_FCM_TOKEN, token).apply()
        _tokenState.value = token
    }

    fun getToken(context: Context): String? {
        val token = getPrefs(context).getString(KEY_FCM_TOKEN, null)
        _tokenState.value = token
        return token
    }

    fun saveBackendUrl(context: Context, url: String) {
        getPrefs(context).edit().putString(KEY_BACKEND_URL, url).apply()
    }

    fun getBackendUrl(context: Context): String {
        return getPrefs(context).getString(KEY_BACKEND_URL, "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"
    }

    fun addAlert(context: Context, alert: LandslideAlert) {
        val currentList = loadAlerts(context).toMutableList()
        currentList.add(0, alert)
        if (currentList.size > MAX_STORED_ALERTS) {
            currentList.subList(MAX_STORED_ALERTS, currentList.size).clear()
        }
        saveAlerts(context, currentList)
        _alertsState.value = currentList
    }

    fun getAlertById(context: Context, alertId: String): LandslideAlert? {
        if (alertId.isBlank()) return null
        val inMemory = _alertsState.value.firstOrNull { it.alertId == alertId }
        if (inMemory != null) return inMemory
        return loadAlerts(context).firstOrNull { it.alertId == alertId }
    }

    fun getAlerts(context: Context): List<LandslideAlert> {
        val alerts = loadAlerts(context)
        _alertsState.value = alerts
        return alerts
    }

    fun clearAlerts(context: Context) {
        getPrefs(context).edit().remove(KEY_ALERTS_JSON).apply()
        _alertsState.value = emptyList()
    }

    private fun saveAlerts(context: Context, alerts: List<LandslideAlert>) {
        val jsonArray = JSONArray()
        for (alert in alerts) {
            val json = JSONObject()
            json.put("alertId", alert.alertId)
            json.put("title", alert.title)
            json.put("message", alert.message)
            json.put("location", alert.location)
            json.put("cellId", alert.cellId)
            if (alert.riskScore != null) json.put("riskScore", alert.riskScore)
            if (alert.rainfall != null) json.put("rainfall", alert.rainfall)
            json.put("riskLevel", alert.riskLevel)
            json.put("isDemo", alert.isDemo)
            json.put("timestamp", alert.timestamp)
            if (alert.rawTimestampString != null) json.put("rawTimestampString", alert.rawTimestampString)
            jsonArray.put(json)
        }
        getPrefs(context).edit().putString(KEY_ALERTS_JSON, jsonArray.toString()).apply()
    }

    private fun loadAlerts(context: Context): List<LandslideAlert> {
        val jsonString = getPrefs(context).getString(KEY_ALERTS_JSON, null) ?: return emptyList()
        val list = mutableListOf<LandslideAlert>()
        try {
            val jsonArray = JSONArray(jsonString)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                list.add(
                    LandslideAlert(
                        alertId = obj.optString("alertId", "ALERT-$i"),
                        title = obj.optString("title", LandslideAlert.DEFAULT_ALERT_TITLE),
                        message = obj.optString("message", ""),
                        location = obj.optString("location", "Unknown"),
                        cellId = obj.optString("cellId", "N/A"),
                        riskScore = if (obj.has("riskScore")) obj.getDouble("riskScore") else null,
                        rainfall = if (obj.has("rainfall")) obj.getDouble("rainfall") else null,
                        riskLevel = obj.optString("riskLevel", "HIGH"),
                        isDemo = obj.optBoolean("isDemo", false),
                        timestamp = obj.optLong("timestamp", System.currentTimeMillis()),
                        rawTimestampString = if (obj.has("rawTimestampString")) obj.getString("rawTimestampString") else null
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }
}
