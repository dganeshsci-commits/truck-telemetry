# ESP32 + BNO085 IMU + Ultrasonic Fuel Sensor — Hardware & Dashboard Setup Guide

## 1. System Architecture

```text
ESP32 DevKit V1 ──► BNO085 9-DOF IMU (I²C GPIO 21/22) + Ultrasonic Sensor (GPIO 5/34)
                ──► Wi-Fi (HTTP POST JSON + X-Device-Token)
                ──► Dashboard Backend (/api/sensors/telemetry + SSE /api/sensors/stream)
                ──► Live "Vehicle Sensors" Dashboard Tab
```

---

## 2. Hardware Wiring Tables

### A. BNO085 9-DOF IMU → ESP32 DevKit V1 (I²C Default)

| BNO085 Pin | ESP32 Pin | Notes |
| :--- | :--- | :--- |
| **VIN / VCC** | **3V3** | Connect to 3.3V (or 5V only if your breakout board includes an onboard 3.3V regulator such as Adafruit 4754). |
| **GND** | **GND** | Common ground with ESP32. |
| **SDA** | **GPIO 21** | I²C Data line (`0x4A` default address). |
| **SCL** | **GPIO 22** | I²C Clock line (400 kHz Fast Mode). |
| **P0 / PS0 & P1 / PS1** | **LOW (Default)** | Leave open/low for standard I²C mode. |

### B. Ultrasonic Fuel-Level Sensor (HC-SR04 / JSN-SR04T) → ESP32 DevKit V1

| Ultrasonic Pin | ESP32 Pin | Notes |
| :--- | :--- | :--- |
| **VCC** | **5V (VIN)** or **3V3** | Standard HC-SR04 requires 5V; HC-SR04P / JSN-SR04T supports 3.3V–5V. |
| **GND** | **GND** | Common ground. |
| **TRIG** | **GPIO 5** | 3.3V output trigger pulse (10 µs). |
| **ECHO** | **GPIO 34** *(via divider)* | **IMPORTANT:** If powered from 5V, step the 5V `ECHO` signal down to **3.3V** using a `1 kΩ` (series) + `2 kΩ` (to GND) resistor divider before connecting to `GPIO 34`. |

> **Prototype Safety Note:** Standard open-air ultrasonic transducers (`HC-SR04`) are intended for bench testing with a water container or prototype tank. Real diesel/petrol fuel tanks require intrinsically safe, fuel-vapor-rated transducers and a stilling well/baffle to suppress fuel slosh.

---

## 3. Arduino IDE & Library Setup

1. Install **ESP32 Board Support** in Arduino IDE (`esp32 by Espressif Systems`).
2. Open **Tools → Manage Libraries...** and install:
   - **Adafruit BNO08x** (by Adafruit)
   - **Adafruit BusIO** and **Adafruit Unified Sensor**
   - **ArduinoJson** (by Benoit Blanchon)
3. In `esp32_firmware/esp32_bno085_ultrasonic/`:
   - Copy `config.example.h` to `config.h`.
   - Set `WIFI_SSID` and `WIFI_PASSWORD`.
   - Set `BACKEND_API_URL` to your computer's LAN IP (e.g., `http://192.168.1.100:3000/api/sensors/telemetry`).
   - Verify `DEVICE_AUTH_TOKEN` matches `ESP32_DEVICE_TOKEN` in `.env` (default: `fleetlogix-esp32-secret-2026`).
4. Select **Board: DOIT ESP32 DEVKIT V1**, select your COM port, and click **Upload**.

---

## 4. Backend API Endpoints

- `POST /api/sensors/telemetry` — Accepts authenticated ESP32 telemetry JSON packets (`X-Device-Token: fleetlogix-esp32-secret-2026`).
- `GET /api/sensors/latest` — Returns latest telemetry packet, connection state, and packet age.
- `GET /api/sensors/stream` — Server-Sent Events (SSE) stream for low-latency real-time dashboard updates.
- `GET /api/sensors/history` — Returns bounded historical IMU, fuel, and harsh driving event logs.
- `DELETE /api/sensors/history` — Clears stored history.
