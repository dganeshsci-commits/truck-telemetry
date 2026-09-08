/**
 * SPDuino Fleet Management Firmware
 * Hardware: ATmega328P + MFRC522 RFID + GY-521 (MPU6050) IMU
 * 
 * Communication Protocol:
 * - RFID,<UID>             : Sent when card is tapped
 * - TILT,<ROLL>,<PITCH>    : Sent every 100ms
 * - ACCEL,<X>,<Y>,<Z>      : Sent every 100ms
 * - GYRO,<X>,<Y>,<Z>       : Sent every 100ms
 */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>

// RFID Pins (Standard SPI for Arduino Uno/SPDuino)
#define SS_PIN 10
#define RST_PIN 9
MFRC522 rfid(SS_PIN, RST_PIN);

// MPU6050 I2C address
const int MPU_ADDR = 0x68;

// Variables for IMU
int16_t ax, ay, az, gx, gy, gz;
unsigned long lastSensorRead = 0;
const int sensorInterval = 100; // 10Hz updates

void setup() {
  Serial.begin(9600);
  Wire.begin();
  SPI.begin();
  
  // Initialize RC522
  rfid.PCD_Init();
  
  // Initialize MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // set to zero (wakes up the MPU-6050)
  Wire.endTransmission(true);

  Serial.println("SYSTEM:READY");
  Serial.println("SYSTEM:SPDuino Fleet Management Controller Active");
}

void loop() {
  // 1. Check for RFID Taps
  handleRFID();

  // 2. Periodic IMU Telemetry
  if (millis() - lastSensorRead > sensorInterval) {
    lastSensorRead = millis();
    handleIMU();
  }
}

void handleRFID() {
  // Look for new cards
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Format UID as hex string
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uidStr += " ";
  }
  uidStr.toUpperCase();

  // Send to Serial: RFID,XX XX XX XX
  Serial.print("RFID,");
  Serial.println(uidStr);

  // Halt PICC
  rfid.PICC_HaltA();
  // Stop encryption on PCD
  rfid.PCD_StopCrypto1();
}

void handleIMU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // starting with register 0x3B (ACCEL_XOUT_H)
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true); // request 14 registers

  // Read Accelerometer
  ax = Wire.read() << 8 | Wire.read();
  ay = Wire.read() << 8 | Wire.read();
  az = Wire.read() << 8 | Wire.read();
  // Read Temp (ignored)
  Wire.read(); Wire.read();
  // Read Gyroscope
  gx = Wire.read() << 8 | Wire.read();
  gy = Wire.read() << 8 | Wire.read();
  gz = Wire.read() << 8 | Wire.read();

  // Convert to physical units (G's and degrees/sec)
  // Scale factors for default +-2g and +-250deg/s
  float accX = ax / 16384.0 * 9.81;
  float accY = ay / 16384.0 * 9.81;
  float accZ = az / 16384.0 * 9.81;
  
  float gyrX = gx / 131.0;
  float gyrY = gy / 131.0;
  float gyrZ = gz / 131.0;

  // Calculate Roll & Pitch (Simple estimation)
  float roll = atan2(accY, accZ) * 180 / PI;
  float pitch = atan2(-accX, sqrt(accY * accY + accZ * accZ)) * 180 / PI;

  // Output Telemetry
  Serial.print("ACCEL,");
  Serial.print(accX, 2); Serial.print(",");
  Serial.print(accY, 2); Serial.print(",");
  Serial.println(accZ, 2);

  Serial.print("GYRO,");
  Serial.print(gyrX, 2); Serial.print(",");
  Serial.print(gyrY, 2); Serial.print(",");
  Serial.println(gyrZ, 2);

  Serial.print("TILT,");
  Serial.print(roll, 1); Serial.print(",");
  Serial.println(pitch, 1);
}
