/**
 * FleetLogix / Truck Intelligence Hub — ESP32 Real-Time Sensor Firmware
 *
 * Hardware:
 *   - Microcontroller: ESP32 DevKit V1
 *   - IMU Sensor:      BNO085 9-DOF IMU over I2C (SDA -> GPIO 21, SCL -> GPIO 22)
 *   - Fuel Sensor:     Ultrasonic Sensor (HC-SR04 / JSN-SR04T) (TRIG -> GPIO 5, ECHO -> GPIO 34)
 *
 * Required Arduino Libraries (install via Library Manager):
 *   1. Adafruit BNO08x (by Adafruit)
 *   2. Adafruit BusIO & Adafruit Unified Sensor
 *   3. ArduinoJson (by Benoit Blanchon, v6 or v7)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_BNO08x.h>
#include <ArduinoJson.h>

#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.example.h"
#endif

// ============================================================================
// Global Objects & Telemetry State
// ============================================================================
Adafruit_BNO08x bno08x(BNO085_RESET_PIN);
sh2_SensorValue_t sensorValue;

bool bnoConnected = false;
unsigned long lastTelemetryMs = 0;
unsigned long lastWifiRetryMs = 0;
unsigned long lastImuReconnectMs = 0;

// Latest IMU measurements
struct ImuState {
  float accelX = 0.0f;      // m/s^2 (includes gravity)
  float accelY = 0.0f;
  float accelZ = 0.0f;
  bool hasRawAccel = false;

  float linAccelX = 0.0f;   // m/s^2 (gravity-compensated)
  float linAccelY = 0.0f;
  float linAccelZ = 0.0f;
  bool hasLinAccel = false;

  float gyroX = 0.0f;       // deg/s
  float gyroY = 0.0f;
  float gyroZ = 0.0f;
  bool hasGyro = false;

  float roll = 0.0f;        // deg
  float pitch = 0.0f;
  float yaw = 0.0f;
  bool hasEuler = false;
} imuState;

// Convert BNO085 quaternion (i, j, k, real) to Euler angles in degrees
void quaternionToEuler(float qr, float qi, float qj, float qk, float* roll, float* pitch, float* yaw) {
  float sqr = sq(qr);
  float sqi = sq(qi);
  float sqj = sq(qj);
  float sqk = sq(qk);

  *yaw   = atan2(2.0f * (qi * qj + qk * qr), (sqi - sqj - sqk + sqr)) * RAD_TO_DEG;
  *pitch = asin(-2.0f * (qi * qk - qj * qr) / (sqi + sqj + sqk + sqr)) * RAD_TO_DEG;
  *roll  = atan2(2.0f * (qj * qk + qi * qr), (-sqi - sqj + sqk + sqr)) * RAD_TO_DEG;
}

// Configure BNO085 SH-2 sensor reports
bool configureBno085Reports() {
  bool ok = true;
  // 50 Hz (20,000 us) raw accelerometer (m/s^2 with gravity)
  if (!bno08x.enableReport(SH2_ACCELEROMETER, 20000)) {
    Serial.println("[BNO085] Warning: Could not enable SH2_ACCELEROMETER");
    ok = false;
  }
  // 50 Hz gravity-compensated linear acceleration (m/s^2)
  if (!bno08x.enableReport(SH2_LINEAR_ACCELERATION, 20000)) {
    Serial.println("[BNO085] Warning: Could not enable SH2_LINEAR_ACCELERATION");
  }
  // 50 Hz calibrated gyroscope (rad/s -> converted to deg/s)
  if (!bno08x.enableReport(SH2_GYROSCOPE_CALIBRATED, 20000)) {
    Serial.println("[BNO085] Warning: Could not enable SH2_GYROSCOPE_CALIBRATED");
    ok = false;
  }
  // 25 Hz rotation vector for Roll / Pitch / Yaw
  if (!bno08x.enableReport(SH2_ROTATION_VECTOR, 40000)) {
    Serial.println("[BNO085] Warning: Could not enable SH2_ROTATION_VECTOR");
  }
  return ok;
}

// Poll all pending SH-2 events from BNO085
void pollBno085() {
  if (!bnoConnected) {
    if (millis() - lastImuReconnectMs > 5000) {
      lastImuReconnectMs = millis();
      if (bno08x.begin_I2C(BNO085_I2C_ADDR, &Wire)) {
        bnoConnected = true;
        configureBno085Reports();
        Serial.println("[BNO085] Reconnected over I2C!");
      }
    }
    return;
  }

  if (bno08x.wasReset()) {
    Serial.println("[BNO085] Sensor reset detected; re-enabling SH-2 reports...");
    configureBno085Reports();
  }

  while (bno08x.getSensorEvent(&sensorValue)) {
    switch (sensorValue.sensorId) {
      case SH2_ACCELEROMETER:
        imuState.accelX = sensorValue.un.accelerometer.x;
        imuState.accelY = sensorValue.un.accelerometer.y;
        imuState.accelZ = sensorValue.un.accelerometer.z;
        imuState.hasRawAccel = true;
        break;

      case SH2_LINEAR_ACCELERATION:
        imuState.linAccelX = sensorValue.un.linearAcceleration.x;
        imuState.linAccelY = sensorValue.un.linearAcceleration.y;
        imuState.linAccelZ = sensorValue.un.linearAcceleration.z;
        imuState.hasLinAccel = true;
        break;

      case SH2_GYROSCOPE_CALIBRATED:
        // BNO085 reports gyro in rad/s; convert to deg/s for dashboard
        imuState.gyroX = sensorValue.un.gyroscope.x * RAD_TO_DEG;
        imuState.gyroY = sensorValue.un.gyroscope.y * RAD_TO_DEG;
        imuState.gyroZ = sensorValue.un.gyroscope.z * RAD_TO_DEG;
        imuState.hasGyro = true;
        break;

      case SH2_ROTATION_VECTOR:
        quaternionToEuler(
          sensorValue.un.rotationVector.real,
          sensorValue.un.rotationVector.i,
          sensorValue.un.rotationVector.j,
          sensorValue.un.rotationVector.k,
          &imuState.roll,
          &imuState.pitch,
          &imuState.yaw
        );
        imuState.hasEuler = true;
        break;
    }
  }
}

// Measure single ultrasonic pulse in cm (-1.0f if timeout / disconnected)
float readUltrasonicSingleCm() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  // 30,000 us timeout (~500 cm max range) prevents blocking loop
  long durationUs = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000);
  if (durationUs <= 0) {
    return -1.0f;
  }
  // Speed of sound ~0.0343 cm/us -> divide round-trip by 2
  return (durationUs * 0.0343f) / 2.0f;
}

// 3-sample median filter for ultrasonic distance to reject acoustic spikes
float readUltrasonicFilteredCm() {
  float samples[3];
  int validCount = 0;
  for (int i = 0; i < 3; i++) {
    float d = readUltrasonicSingleCm();
    if (d >= 2.0f && d <= 400.0f) {
      samples[validCount++] = d;
    }
    delayMicroseconds(1500);
  }
  if (validCount == 0) return -1.0f;
  if (validCount == 1) return samples[0];
  if (validCount == 2) return (samples[0] + samples[1]) * 0.5f;

  // Sort 3 elements and return median
  for (int i = 0; i < 2; i++) {
    for (int j = i + 1; j < 3; j++) {
      if (samples[j] < samples[i]) {
        float tmp = samples[i];
        samples[i] = samples[j];
        samples[j] = tmp;
      }
    }
  }
  return samples[1];
}

// Non-blocking Wi-Fi connection supervisor
void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWifiRetryMs >= 5000) {
    lastWifiRetryMs = now;
    Serial.printf("[Wi-Fi] Connecting to SSID: %s ...\n", WIFI_SSID);
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=======================================================");
  Serial.println("FleetLogix ESP32 BNO085 IMU + Ultrasonic Telemetry Node");
  Serial.println("=======================================================");

  // Initialize Ultrasonic GPIO pins
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  // Initialize I2C on ESP32 GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(BNO085_I2C_SDA, BNO085_I2C_SCL);
  Wire.setClock(400000); // 400 kHz Fast I2C for BNO085 SH-2 reports

  if (bno08x.begin_I2C(BNO085_I2C_ADDR, &Wire)) {
    bnoConnected = true;
    configureBno085Reports();
    Serial.println("[BNO085] Initialized successfully on I2C (0x4A).");
  } else {
    bnoConnected = false;
    Serial.println("[BNO085] Not detected at startup. Will retry automatically.");
  }

  // Start Wi-Fi in Station Mode
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiRetryMs = millis();
}

void loop() {
  ensureWifiConnected();
  pollBno085();

  unsigned long now = millis();
  if (now - lastTelemetryMs < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryMs = now;

  // Read ultrasonic fuel distance
  float distanceCm = readUltrasonicFilteredCm();
  bool fuelSensorValid = (distanceCm >= 2.0f && distanceCm <= 400.0f);

  float levelPercent = 0.0f;
  float volumeLitres = 0.0f;
  bool lowFuelWarning = false;

  if (fuelSensorValid) {
    float span = TANK_EMPTY_CM - TANK_FULL_CM;
    if (span > 0.1f) {
      levelPercent = ((TANK_EMPTY_CM - distanceCm) / span) * 100.0f;
      if (levelPercent < 0.0f) levelPercent = 0.0f;
      if (levelPercent > 100.0f) levelPercent = 100.0f;
      volumeLitres = (levelPercent / 100.0f) * TANK_CAPACITY_L;
      lowFuelWarning = (levelPercent <= LOW_FUEL_WARN_PCT);
    }
  }

  // Construct JSON telemetry packet matching Esp32TelemetryPayload schema
  StaticJsonDocument<768> doc;
  doc["device_id"] = DEVICE_ID;
  doc["vehicle_id"] = VEHICLE_ID;
  doc["sensor_timestamp_ms"] = now;
  doc["wifi_rssi_dbm"] = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : nullptr;
  doc["ip_address"] = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : "0.0.0.0";
  doc["is_simulated"] = false;

  JsonObject imuObj = doc.createNestedObject("imu");
  if (bnoConnected && imuState.hasRawAccel) {
    imuObj["accel_x"] = serialized(String(imuState.accelX, 3));
    imuObj["accel_y"] = serialized(String(imuState.accelY, 3));
    imuObj["accel_z"] = serialized(String(imuState.accelZ, 3));
    imuObj["lin_accel_x"] = serialized(String(imuState.linAccelX, 3));
    imuObj["lin_accel_y"] = serialized(String(imuState.linAccelY, 3));
    imuObj["lin_accel_z"] = serialized(String(imuState.linAccelZ, 3));
    imuObj["gyro_x"] = serialized(String(imuState.gyroX, 2));
    imuObj["gyro_y"] = serialized(String(imuState.gyroY, 2));
    imuObj["gyro_z"] = serialized(String(imuState.gyroZ, 2));
    imuObj["roll"] = serialized(String(imuState.roll, 1));
    imuObj["pitch"] = serialized(String(imuState.pitch, 1));
    imuObj["yaw"] = serialized(String(imuState.yaw, 1));
    imuObj["unit_acceleration"] = "m/s^2";
    imuObj["unit_angular_velocity"] = "deg/s";
    imuObj["status"] = "connected";
  } else {
    imuObj["accel_x"] = nullptr;
    imuObj["accel_y"] = nullptr;
    imuObj["accel_z"] = nullptr;
    imuObj["gyro_x"] = nullptr;
    imuObj["gyro_y"] = nullptr;
    imuObj["gyro_z"] = nullptr;
    imuObj["unit_acceleration"] = "m/s^2";
    imuObj["unit_angular_velocity"] = "deg/s";
    imuObj["status"] = "disconnected";
  }

  JsonObject fuelObj = doc.createNestedObject("fuel");
  if (fuelSensorValid) {
    fuelObj["distance_cm"] = serialized(String(distanceCm, 2));
    fuelObj["raw_distance_cm"] = serialized(String(distanceCm, 2));
    fuelObj["level_percent"] = serialized(String(levelPercent, 1));
    fuelObj["volume_litres"] = serialized(String(volumeLitres, 1));
    fuelObj["low_fuel_warning"] = lowFuelWarning;
    fuelObj["status"] = "connected";
  } else {
    fuelObj["distance_cm"] = nullptr;
    fuelObj["level_percent"] = nullptr;
    fuelObj["volume_litres"] = nullptr;
    fuelObj["low_fuel_warning"] = false;
    fuelObj["status"] = "disconnected";
  }

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Print concise Serial diagnostic line
  Serial.printf(
    "[TELEMETRY] WiFi:%s | IMU:%s (A:%.2f,%.2f,%.2f G:%.1f,%.1f,%.1f) | Fuel:%s (%.1f cm, %.1f%%)\n",
    (WiFi.status() == WL_CONNECTED) ? "OK" : "WAIT",
    bnoConnected ? "OK" : "DISC",
    imuState.accelX, imuState.accelY, imuState.accelZ,
    imuState.gyroX, imuState.gyroY, imuState.gyroZ,
    fuelSensorValid ? "OK" : "DISC",
    distanceCm,
    levelPercent
  );

  // Transmit over Wi-Fi if connected
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_API_URL);
    http.setTimeout(1500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", DEVICE_AUTH_TOKEN);

    int httpCode = http.POST(jsonPayload);
    if (httpCode <= 0) {
      Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
}
