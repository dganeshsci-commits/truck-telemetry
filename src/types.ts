export type VehicleStatus = 'Moving' | 'Idling' | 'Ignition On' | 'Ignition Off' | 'No Signal';

export interface Vehicle {
  id: string;
  plateNumber: string;
  name: string;
  type: 'Heavy Truck' | 'Container Trailer' | 'Tanker' | 'Refrigerated Truck' | 'Flatbed Truck';
  currentSpeed: number; // km/h
  status: VehicleStatus;
  statusDuration: string; // e.g. "01:24:35"
  fuelLevel: number; // 0 - 100 %
  fuelCapacity: number; // Liters e.g. 300
  currentFuelLiters: number; // Liters
  lastKnownLocation: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  heading: number; // degrees 0-360
  ignition: boolean; // true = on, false = off
  mileage: number; // total km
  driverId?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  idleMinutes?: number;
  lastUpdated: string;
  engineTemp?: number; // °C
  batteryVoltage?: number; // V
  assignedGeofenceIds?: string[];
  assignedRouteId?: string;
}

export type DriverStatus = 'Active' | 'On Duty' | 'Resting' | 'Inactive';

export interface Driver {
  id: string; // driverId
  driverId?: string; // alias
  name: string; // driverName
  driverName?: string; // alias
  phone: string;
  assignedVehicleId?: string;
  assignedVehicle?: string; // vehicle plate or ID alias
  rfidId: string;
  rfidUid?: string; // alias
  rfidUidAliases?: string[];
  status: DriverStatus;
  licenseNumber: string;
  experienceYears: number;
  avatarUrl?: string;
  joinedDate: string;
  totalTrips: number;
  safetyScore: number; // out of 100
  loginTime?: string;
  lastRfidScan?: string;
}

export type RfidConnectionMode = 'LIVE_HARDWARE' | 'SIMULATION' | 'DISCONNECTED';
export type HardwareOperationMode = 'HARDWARE' | 'DEMO';
export type ImuConnectionStatus = 'ONLINE' | 'SIGNAL_LOST' | 'OFFLINE';

export interface ImuData {
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
  tilt: { roll: number; pitch: number };
  status: ImuConnectionStatus;
  lastUpdate: string;
  lastReceivedTimestamp: number;
  simulatedSpeed: number;
  speedSource: string; // "IMU Simulated Speed"
}

export interface ImuCalibrationConfig {
  FORWARD_THRESHOLD: number;
  BACKWARD_THRESHOLD: number;
  SPEED_ACCELERATION_RATE: number;
  SPEED_DECELERATION_RATE: number;
  MAX_SPEED: number;
  MIN_SPEED: number;
  IMU_DEADZONE: number;
}

export interface RfidHardwareState {
  spduinoConnected: boolean;
  rc522Ready: boolean;
  usbSerialConnected: boolean;
  portName: string;
  baudRate: number;
  lastRfidUid: string;
  lastScanTime: string;
  currentMode: RfidConnectionMode;
  error: string | null;
  diagnostics?: {
    imuSampleRate: number;
    packetCount: number;
    rfidCount: number;
    errorCount: number;
    lastMessage: string;
    uptimeSeconds: number;
  };
}

export interface RfidScanLogEntry {
  id: string;
  timestamp: string;
  type: 'raw' | 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface LastRfidScanResult {
  uid: string;
  driverName: string;
  driverId: string;
  vehiclePlate: string;
  vehicleId?: string;
  authentication: 'VERIFIED' | 'DENIED' | 'ALREADY_ACTIVE' | 'PENDING';
  timestamp: string;
  mode: 'LIVE' | 'SIMULATION';
  isUnknown?: boolean;
}

export interface AreaGeofence {
  id: string;
  name: string;
  type: 'area';
  shapeType: 'polygon' | 'circle';
  coordinates: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
  radius?: number; // in meters
  assignedVehicleIds: string[];
  enabled: boolean;
  color: string;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  createdAt: string;
}

export interface RouteGeofence {
  id: string;
  name: string;
  type: 'route';
  startLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  endLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  waypoints: Array<{ lat: number; lng: number }>;
  corridorWidthMeters: number;
  assignedVehicleIds: string[];
  enabled: boolean;
  color: string;
  alertOnDeviation: boolean;
  createdAt: string;
}

export type AlertType =
  | 'Fuel Alert'
  | 'Refuel Alert'
  | 'Idle Alert'
  | 'Geofence Enter'
  | 'Geofence Exit'
  | 'Route Deviation'
  | 'Driver RFID Scan'
  | 'Fatigue Alert'
  | 'Drowsiness Detected'
  | 'Long Eye Closure'
  | 'Yawning Detected'
  | 'Looking Away';

export interface AlertRule {
  id: string;
  alertType: AlertType;
  enabled: boolean;
  vehicleId: string; // 'ALL' or specific vehicle ID
  threshold: string;
  destination: string;
  frequency: string;
  description?: string;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  vehicleId: string;
  vehiclePlate: string;
  alertType: AlertType;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'New' | 'Acknowledged' | 'Resolved';
  location?: string;
  duration?: string;
  driverName?: string;
}

export interface DriverMonitoringData {
  driverId: string;
  vehicleId: string;
  faceDetected: boolean;
  faceBox?: [number, number, number, number]; // x, y, w, h
  faceLandmarks?: number[];

  leftEye: "open" | "closed" | "unknown";
  rightEye: "open" | "closed" | "unknown";

  perclos: number;
  blinkRate: number;

  mouthState: "normal" | "open" | "yawn";
  yawnDetected: boolean;
  yawnDuration: number;
  yawnCount: number;

  headPose: {
    yaw: number;
    pitch: number;
    roll: number;
  };

  lookingAway: boolean;

  fatigueScore: number;

  fatigueState:
    | "NORMAL"
    | "ATTENTION"
    | "DROWSY"
    | "CRITICAL";

  inferenceMode:
    | "DEMO"
    | "LAPTOP_WEBCAM"
    | "RASPBERRY_PI_LIVE";

  cameraStatus:
    | "CONNECTED"
    | "DISCONNECTED"
    | "PERMISSION_DENIED"
    | "NOT_DETECTED";

  aiBackendStatus:
    | "CONNECTED"
    | "DISCONNECTED";

  isModelOnline: boolean;
  modelEngine?: string;

  timestamp: string;
}

export interface DriverMonitoringSettings {
  perclosWindow: number; // seconds
  eyeClosureThreshold: number; // 0-1
  longEyeClosureDuration: number; // ms
  yawnDurationThreshold: number; // ms
  lookingAwayDurationThreshold: number; // ms
  fatigueScoreThresholds: {
    attention: number;
    drowsy: number;
    critical: number;
  };
  cameraFps: number;
  inferenceFps: number;
  mode: "DEMO" | "LAPTOP_WEBCAM" | "RASPBERRY_PI_LIVE";
  backendUrl: string;
}

export interface DriverSafetyEvent {
  id: string;
  timestamp: string;
  driverName: string;
  vehiclePlate: string;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  duration: string;
  status: "Active" | "Resolved";
}

export interface RefuelEvent {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  timestamp: string;
  fuelBefore: number; // Liters
  fuelAfter: number; // Liters
  fuelAdded: number; // Liters
  location: string;
  stationName?: string;
  driverName?: string;
  odometer?: number;
  receiptNumber?: string;
  cost?: number;
}

export interface FuelDrainEvent {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  timestamp: string;
  amountDrained: number; // Liters
  location: string;
  suspectedTheft: boolean;
}

export interface FuelTelemetryPoint {
  timestamp: string;
  fuelLevelPercent: number;
  fuelLiters: number;
  speed: number;
  distanceKm: number;
  isRefuel?: boolean;
  isDrain?: boolean;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'fleet'
  | 'drivers'
  | 'geofencing'
  | 'monitoring'
  | 'sensors'
  | 'fuel'
  | 'notifications'
  | 'settings';

export type SensorConnectionState = 'connected' | 'disconnected' | 'stale' | 'error' | 'initializing';

export type DrivingEventState =
  | 'normal'
  | 'harsh_braking'
  | 'harsh_acceleration'
  | 'harsh_cornering'
  | 'excessive_vibration';

export type AxisMappingOption = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export interface ImuOrientationConfig {
  isCalibrated: boolean;
  longitudinalAxis: AxisMappingOption; // Forward / braking axis once calibrated
  lateralAxis: AxisMappingOption;      // Left / right cornering axis once calibrated
  verticalAxis: AxisMappingOption;     // Vertical axis
  accelBiasX: number;
  accelBiasY: number;
  accelBiasZ: number;
  useLinearAccelerationForEvents: boolean;
}

export interface DrivingEventThresholds {
  harshBrakingMps2: number;       // e.g. -3.5 m/s² along calibrated longitudinal axis
  harshAccelerationMps2: number;  // e.g. +3.2 m/s² along calibrated longitudinal axis
  harshCorneringMps2: number;     // e.g. 3.0 m/s² magnitude along calibrated lateral axis
  harshCorneringGyroDps: number;  // e.g. 45.0 °/s yaw rate
  excessiveVibrationRmsMps2: number; // e.g. 4.5 m/s² high-frequency RMS / peak deviation
  minPersistenceSamples: number;  // Consecutive samples required to trigger an event
  emaAlpha: number;               // Low-pass filter smoothing factor (0.1 - 1.0)
}

export interface TankCalibrationPoint {
  distanceCm: number;
  levelPercent: number;
  volumeLitres?: number;
}

export interface FuelCalibrationConfig {
  emptyDistanceCm: number;        // Distance from sensor to tank bottom (0%)
  fullDistanceCm: number;         // Distance from sensor to full fuel surface (100%)
  tankCapacityLitres: number | null; // Null if unknown; only compute litres when geometry calibrated
  isTankGeometryCalibrated: boolean;
  lowFuelThresholdPercent: number;
  minValidDistanceCm: number;     // e.g. 2.0 cm (sensor blind zone)
  maxValidDistanceCm: number;     // e.g. 400.0 cm
  smoothingWindowSize: number;    // Moving median/average filter window
  useCalibrationTable: boolean;   // Use non-linear table for irregular tank shapes
  calibrationTable: TankCalibrationPoint[];
}

export interface StorageRetentionConfig {
  storageIntervalMs: number;      // Minimum interval between persisted history samples (e.g. 2000 ms)
  maxHistoricalSamples: number;   // Max retained telemetry points (e.g. 2000)
  maxEventRecords: number;        // Max retained driving event records (e.g. 500)
  staleTimeoutMs: number;         // Mark data stale after N ms without ESP32 packets (e.g. 5000 ms)
}

export interface Esp32ImuReading {
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  lin_accel_x?: number | null;
  lin_accel_y?: number | null;
  lin_accel_z?: number | null;
  gyro_x: number | null;
  gyro_y: number | null;
  gyro_z: number | null;
  roll?: number | null;
  pitch?: number | null;
  yaw?: number | null;
  unit_acceleration: string;
  unit_angular_velocity: string;
  sensor_timestamp_ms?: number;
  status: SensorConnectionState;
}

export interface Esp32FuelReading {
  distance_cm: number | null;
  raw_distance_cm?: number | null;
  level_percent: number | null;
  volume_litres: number | null;
  low_fuel_warning: boolean;
  status: SensorConnectionState;
  error_message?: string | null;
}

export interface DetectedDrivingEventRecord {
  id: string;
  device_id: string;
  vehicle_id?: string;
  type: Exclude<DrivingEventState, 'normal'>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  peak_accel_mps2: number;
  peak_gyro_dps: number;
  axis_label: string;
  duration_ms: number;
  detector_type: 'THRESHOLD_PROTOTYPE' | 'ESP32_EDGE_THRESHOLD';
  orientation_calibrated: boolean;
  notes: string;
}

export interface Esp32TelemetryPayload {
  device_id: string;
  vehicle_id?: string;
  timestamp: string;
  received_at?: string;
  sequence_id?: number;
  wifi_rssi_dbm?: number | null;
  ip_address?: string;
  is_simulated?: boolean;
  imu: Esp32ImuReading;
  fuel: Esp32FuelReading;
  events: {
    driving_state: DrivingEventState;
    latest_event: DetectedDrivingEventRecord | null;
    detector_mode: 'THRESHOLD_PROTOTYPE';
    orientation_calibrated: boolean;
  };
}

