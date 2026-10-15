#ifndef FLEETLOGIX_ESP32_CONFIG_H
#define FLEETLOGIX_ESP32_CONFIG_H

// ============================================================================
// 1. Wi-Fi & Dashboard Backend Configuration
// Copy this file to config.h and update with your local Wi-Fi credentials
// and your computer's LAN IP address running the Truck Intelligence Hub.
// ============================================================================
#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"

// Example local server: "http://192.168.1.100:3000/api/sensors/telemetry"
// Example Vercel cloud: "https://truck-telemetry.vercel.app/api/sensors/telemetry"
#define BACKEND_API_URL     "http://192.168.1.100:3000/api/sensors/telemetry"

// Must match ESP32_DEVICE_TOKEN in server.ts / .env
#define DEVICE_AUTH_TOKEN   "fleetlogix-esp32-secret-2026"
#define DEVICE_ID           "truck_esp32_01"
#define VEHICLE_ID          "veh-1"

// Telemetry transmission interval in milliseconds (250ms = 4 Hz live dashboard update)
#define TELEMETRY_INTERVAL_MS 250

// ============================================================================
// 2. BNO085 9-DOF IMU Pin Configuration (I2C Default)
// ============================================================================
// Standard ESP32 DevKit V1 I2C pins:
//   BNO085 VIN -> 3.3V (or 5V if breakout has onboard 3.3V regulator, e.g. Adafruit 4754)
//   BNO085 GND -> ESP32 GND
//   BNO085 SDA -> ESP32 GPIO 21
//   BNO085 SCL -> ESP32 GPIO 22
#define BNO085_I2C_SDA      21
#define BNO085_I2C_SCL      22
#define BNO085_I2C_ADDR     0x4A  // Default BNO085 I2C address (0x4B if DI/ADR pulled high)
#define BNO085_RESET_PIN    -1    // Set to GPIO pin (e.g. 25) if wired, or -1 for I2C soft reset

// Optional SPI pins if using BNO085 in SPI mode (PS0=1, PS1=1):
#define BNO085_SPI_SCK      18
#define BNO085_SPI_MISO     19
#define BNO085_SPI_MOSI     23
#define BNO085_SPI_CS       27
#define BNO085_SPI_INT      26
#define BNO085_SPI_RST      25

// ============================================================================
// 3. Ultrasonic Fuel-Level Sensor Configuration (HC-SR04 / JSN-SR04T)
// ============================================================================
// IMPORTANT HARDWARE VOLTAGE NOTE:
//   ESP32 GPIOs are 3.3V logic ONLY. If powering a 5V HC-SR04 from VIN (5V),
//   you MUST use a 1kΩ + 2kΩ resistor voltage divider on the ECHO pin to step
//   5V down to 3.3V before connecting to GPIO 34 (or use a 3.3V-compatible HC-SR04P).
#define ULTRASONIC_TRIG_PIN 5
#define ULTRASONIC_ECHO_PIN 34

// Prototype Tank Calibration Reference (in cm)
#define TANK_EMPTY_CM       45.0f
#define TANK_FULL_CM        5.0f
#define TANK_CAPACITY_L     300.0f
#define LOW_FUEL_WARN_PCT   20.0f

#endif // FLEETLOGIX_ESP32_CONFIG_H
