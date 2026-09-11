package com.terrasense.alerts.data

import android.os.Build
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Clean interface and client for registering the device's FCM token
 * with the TerraSense FastAPI backend.
 *
 * NOTE: This client only sends public device registration data (FCM token, device model).
 * It contains NO Firebase server keys, NO service accounts, and NO secrets.
 */
interface BackendRegistrationClient {
    suspend fun registerDeviceToken(
        token: String,
        backendBaseUrl: String,
        deviceAlias: String = "${Build.MANUFACTURER} ${Build.MODEL}"
    ): Result<RegistrationResponse>
}

data class RegistrationResponse(
    val success: Boolean,
    val statusCode: Int,
    val responseBody: String
)

class TerraSenseBackendRegistrationClient : BackendRegistrationClient {
    companion object {
        private const val TAG = "TerraSenseBackendClient"
        const val DEFAULT_BACKEND_URL = "http://10.0.2.2:8000" // 10.0.2.2 maps to localhost in Android Emulator
        const val REGISTER_ENDPOINT = "/api/alerts/register-device"
    }

    override suspend fun registerDeviceToken(
        token: String,
        backendBaseUrl: String,
        deviceAlias: String
    ): Result<RegistrationResponse> = withContext(Dispatchers.IO) {
        try {
            val sanitizedUrl = backendBaseUrl.trimEnd('/') + REGISTER_ENDPOINT
            Log.d(TAG, "Attempting to register FCM token with backend at $sanitizedUrl")

            val url = URL(sanitizedUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 8000
                readTimeout = 8000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
            }

            val payload = JSONObject().apply {
                put("fcm_token", token)
                put("device_alias", deviceAlias)
                put("platform", "android")
                put("os_version", Build.VERSION.RELEASE)
                put("registered_at", System.currentTimeMillis())
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = connection.responseCode
            val responseStream = if (responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }

            val responseText = responseStream?.bufferedReader()?.use { it.readText() } ?: ""
            Log.i(TAG, "Backend registration response [$responseCode]: $responseText")

            connection.disconnect()

            if (responseCode in 200..299) {
                Result.success(
                    RegistrationResponse(
                        success = true,
                        statusCode = responseCode,
                        responseBody = responseText
                    )
                )
            } else {
                Result.failure(
                    Exception("Backend returned HTTP $responseCode: $responseText")
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to connect to backend endpoint: ${e.message}")
            Result.failure(e)
        }
    }
}
