import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, Info, Download, AlertCircle } from 'lucide-react';

interface SpduinoFirmwareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ARDUINO_FIRMWARE_CODE = `/*
 * =========================================================================
 * FLEETLOGIX IoT TELEMETRY FIRMWARE
 * Target: SPDuino / Arduino Uno (ATmega328P)
 * Sensors: 
 *   - GY-521 (MPU6050 6-Axis IMU via I2C)
 *   - RC522 (13.56MHz RFID Reader via SPI)
 * Serial Baud: 9600
 * =========================================================================
 * 
 * PIN CONNECTIONS:
 * 
 * GY-521 MPU6050 (I2C):
 *   VCC  -> 5V (if breakout has 3.3V LDO regulator) or 3.3V
 *   GND  -> GND
 *   SDA  -> A4 (SPDuino I2C SDA)
 *   SCL  -> A5 (SPDuino I2C SCL)
 *   AD0  -> GND (Sets I2C address to 0x68)
 *   INT  -> Not Connected
 * 
 * RC522 RFID (SPI):
 *   3.3V -> 3.3V (DO NOT CONNECT TO 5V)
 *   GND  -> GND
 *   RST  -> D9
 *   SDA  -> D10 (SPI SS / Chip Select)
 *   MOSI -> D11 (SPI MOSI)
 *   MISO -> D12 (SPI MISO)
 *   SCK  -> D13 (SPI SCK)
 * =========================================================================
 */

#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>

// RC522 Pin Definitions
#define RC522_SS_PIN   10
#define RC522_RST_PIN  9

// MPU6050 I2C Address (when AD0 is connected to GND)
#define MPU6050_ADDR   0x68

// Instances
MFRC522 mfrc522(RC522_SS_PIN, RC522_RST_PIN);

// Non-blocking timer for IMU packet broadcasts
unsigned long lastImuBroadcastTime = 0;
const unsigned long IMU_BROADCAST_INTERVAL_MS = 100; // 10 Hz broadcast rate

// Accelerometer calibration offsets (zeroed when lying flat)
float accelBiasX = 0.0;
float accelBiasY = 0.0;
float accelBiasZ = 0.0;

void setup() {
  // Initialize USB Serial communication at 9600 baud
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect (needed for native USB)
  }

  Serial.println(F("SYSTEM,BOOT,SPDuino ATmega328P Starting..."));

  // 1. Initialize I2C Bus for GY-521 MPU6050
  Wire.begin();
  Wire.setClock(400000); // 400kHz Fast I2C mode

  // Wake up MPU6050 (write 0 to PWR_MGMT_1 register 0x6B)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  byte error = Wire.endTransmission();

  if (error == 0) {
    Serial.println(F("SYSTEM,IMU_OK,GY-521 MPU6050 Detected on 0x68"));
  } else {
    Serial.print(F("SYSTEM,IMU_ERR,GY-521 Error Code: "));
    Serial.println(error);
  }

  // Set Accelerometer sensitivity to +/- 2g (register 0x1C)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x1C);
  Wire.write(0x00);
  Wire.endTransmission();

  // Set Gyroscope sensitivity to +/- 250 deg/s (register 0x1B)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x1B);
  Wire.write(0x00);
  Wire.endTransmission();

  // 2. Initialize SPI Bus and RC522 RFID Reader
  SPI.begin();
  mfrc522.PCD_Init();
  delay(10);
  
  // Verify RC522 firmware version
  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println(F("SYSTEM,RFID_WARN,RC522 Not Detected. Check 3.3V/SPI wiring."));
  } else {
    Serial.print(F("SYSTEM,RFID_OK,RC522 Ready (Firmware Ver: 0x"));
    Serial.print(version, HEX);
    Serial.println(F(")"));
  }

  Serial.println(F("SYSTEM,READY,Listening for RFID scans and IMU dynamics..."));
}

void loop() {
  // -------------------------------------------------------------
  // TASK 1: Check for RFID Card Presentation (High Priority)
  // -------------------------------------------------------------
  checkRfidScanner();

  // -------------------------------------------------------------
  // TASK 2: Broadcast GY-521 IMU Telemetry (100ms non-blocking rate)
  // -------------------------------------------------------------
  unsigned long currentMillis = millis();
  if (currentMillis - lastImuBroadcastTime >= IMU_BROADCAST_INTERVAL_MS) {
    lastImuBroadcastTime = currentMillis;
    readAndBroadcastImu();
  }
}

/**
 * Checks for RFID tags without blocking the microcontroller
 */
void checkRfidScanner() {
  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Format UID as uppercase hex separated by spaces: "RFID,22 9D 30 00"
  Serial.print(F("RFID,"));
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      Serial.print(F("0"));
    }
    Serial.print(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) {
      Serial.print(F(" "));
    }
  }
  Serial.println();

  // Halt PICC and stop crypto to ready for next scan
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

/**
 * Reads GY-521 Accelerometer and Gyroscope registers
 * and transmits telemetry packets formatted for Fleetlogix
 */
void readAndBroadcastImu() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B); // Starting register for Accel X High Byte
  byte err = Wire.endTransmission(false);

  if (err != 0) {
    // Communication error with sensor
    return;
  }

  // Request 14 consecutive bytes:
  // Accel X (2), Accel Y (2), Accel Z (2)
  // Temperature (2)
  // Gyro X (2), Gyro Y (2), Gyro Z (2)
  Wire.requestFrom(MPU6050_ADDR, 14, true);

  if (Wire.available() < 14) {
    return;
  }

  // Read raw 16-bit signed values
  int16_t rawAx = (Wire.read() << 8) | Wire.read();
  int16_t rawAy = (Wire.read() << 8) | Wire.read();
  int16_t rawAz = (Wire.read() << 8) | Wire.read();
  
  int16_t rawTemp = (Wire.read() << 8) | Wire.read();
  
  int16_t rawGx = (Wire.read() << 8) | Wire.read();
  int16_t rawGy = (Wire.read() << 8) | Wire.read();
  int16_t rawGz = (Wire.read() << 8) | Wire.read();

  // Sensitivity scalers:
  // At +/- 2g, sensitivity is 16384 LSB/g. In m/s^2: (raw / 16384.0) * 9.80665
  float ax = (rawAx / 16384.0) * 9.80665;
  float ay = (rawAy / 16384.0) * 9.80665;
  float az = (rawAz / 16384.0) * 9.80665;

  // At +/- 250 deg/s, sensitivity is 131.0 LSB/(deg/s)
  float gx = rawGx / 131.0;
  float gy = rawGy / 131.0;
  float gz = rawGz / 131.0;

  // Calculate Pitch and Roll tilt angles in degrees
  float pitch = atan2(-rawAx, sqrt((float)rawAy * rawAy + (float)rawAz * rawAz)) * 180.0 / 3.14159265;
  float roll  = atan2(rawAy, rawAz) * 180.0 / 3.14159265;

  // 1. Broadcast ACCEL packet: ACCEL,ax,ay,az
  Serial.print(F("ACCEL,"));
  Serial.print(ax, 2);
  Serial.print(F(","));
  Serial.print(ay, 2);
  Serial.print(F(","));
  Serial.println(az, 2);

  // 2. Broadcast GYRO packet: GYRO,gx,gy,gz
  Serial.print(F("GYRO,"));
  Serial.print(gx, 2);
  Serial.print(F(","));
  Serial.print(gy, 2);
  Serial.print(F(","));
  Serial.println(gz, 2);

  // 3. Broadcast TILT packet: TILT,roll,pitch
  Serial.print(F("TILT,"));
  Serial.print(roll, 1);
  Serial.print(F(","));
  Serial.println(pitch, 1);
}
`;

export const SpduinoFirmwareModal: React.FC<SpduinoFirmwareModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ARDUINO_FIRMWARE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([ARDUINO_FIRMWARE_CODE], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fleetlogix_SPDuino_Firmware.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                SPDuino / Arduino Uno Firmware
                <span className="text-[11px] font-semibold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                  GY-521 + RC522
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ready-to-flash C++ sketch for simultaneous RFID authentication and real-time IMU speed simulation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ino</span>
            </button>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-xs">
          {/* Hardware Pinout Quick Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GY-521 (MPU6050) Card */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                GY-521 MPU6050 IMU Wiring (I2C)
              </h3>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">VCC</span>
                  <span className="text-emerald-400 font-bold">5V or 3.3V</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">GND</span>
                  <span>GND</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">SDA</span>
                  <span className="text-blue-400 font-bold">A4 (SPDuino SDA)</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">SCL</span>
                  <span className="text-blue-400 font-bold">A5 (SPDuino SCL)</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">AD0</span>
                  <span className="text-slate-300">GND (Address 0x68)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">INT</span>
                  <span className="text-slate-500">Not Connected</span>
                </div>
              </div>
            </div>

            {/* RC522 RFID Card */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                RC522 RFID Reader Wiring (SPI)
              </h3>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">3.3V</span>
                  <span className="text-amber-400 font-bold">3.3V Only (Never 5V)</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">GND</span>
                  <span>GND</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">RST</span>
                  <span className="text-cyan-400 font-bold">D9</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">SDA / SS</span>
                  <span className="text-cyan-400 font-bold">D10 (Chip Select)</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">MOSI</span>
                  <span className="text-cyan-400 font-bold">D11 (SPI MOSI)</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/40 py-0.5">
                  <span className="text-slate-400">MISO</span>
                  <span className="text-cyan-400 font-bold">D12 (SPI MISO)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">SCK</span>
                  <span className="text-cyan-400 font-bold">D13 (SPI SCK)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50 space-y-2">
            <h4 className="font-bold text-sm text-blue-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Arduino IDE Flashing Instructions
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 leading-relaxed">
              <li>Open <strong>Arduino IDE</strong> (v1.8+ or v2.x).</li>
              <li>Install library: Go to <strong>Sketch &rarr; Include Library &rarr; Manage Libraries</strong>, search for <code>MFRC522</code> (by GithubCommunity / Miguel Balboa) and install it. <code>Wire.h</code> and <code>SPI.h</code> are built into Arduino.</li>
              <li>Connect your <strong>SPDuino</strong> via USB. Select <strong>Tools &rarr; Board &rarr; Arduino Uno</strong> and choose your COM/Serial port.</li>
              <li>Click <strong>Upload</strong> (Ctrl+U / Cmd+U).</li>
              <li><strong>Important:</strong> Close the Arduino IDE Serial Monitor before clicking <strong>Connect SPDuino</strong> in this browser dashboard, so the browser can access the USB COM port.</li>
            </ol>
          </div>

          {/* Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                spduino_telemetry_firmware.ino
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300/90 overflow-x-auto leading-relaxed max-h-[360px] select-all">
              {ARDUINO_FIRMWARE_CODE}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>9600 Baud • Standard 8-N-1 Serial • Non-blocking loop timing</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
