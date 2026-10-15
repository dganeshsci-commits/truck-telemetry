import {
  AxisMappingOption,
  DetectedDrivingEventRecord,
  DrivingEventState,
  DrivingEventThresholds,
  Esp32FuelReading,
  Esp32ImuReading,
  Esp32TelemetryPayload,
  FuelCalibrationConfig,
  ImuOrientationConfig,
  SensorConnectionState,
  StorageRetentionConfig
} from '../types';

export interface ImuChartPoint {
  timeLabel: string;
  timestampMs: number;
  isoTimestamp: string;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  lin_accel_x: number | null;
  lin_accel_y: number | null;
  lin_accel_z: number | null;
  gyro_x: number | null;
  gyro_y: number | null;
  gyro_z: number | null;
  roll: number | null;
  pitch: number | null;
  yaw: number | null;
  distance_cm: number | null;
  level_percent: number | null;
  volume_litres: number | null;
  driving_state: DrivingEventState;
  is_simulated: boolean;
}

export interface Esp32SensorSystemState {
  connectionState: SensorConnectionState;
  deviceId: string;
  vehicleId: string;
  ipAddress: string;
  wifiRssiDbm: number | null;
  lastReceivedIso: string | null;
  lastReceivedMs: number;
  dataAgeMs: number | null;
  isStale: boolean;
  packetsReceived: number;
  errorMessage: string | null;
  mode: 'LIVE_WIFI' | 'LABELED_DEMO';
  latestPayload: Esp32TelemetryPayload;
  liveChartBuffer: ImuChartPoint[];
  historicalSamples: ImuChartPoint[];
  eventHistory: DetectedDrivingEventRecord[];
  tripEventCounts: Record<Exclude<DrivingEventState, 'normal'>, number>;
  orientationConfig: ImuOrientationConfig;
  thresholds: DrivingEventThresholds;
  fuelCalibration: FuelCalibrationConfig;
  retentionConfig: StorageRetentionConfig;
}

const STORAGE_KEYS = {
  ORIENTATION: 'fleetlogix_esp32_orientation_v1',
  THRESHOLDS: 'fleetlogix_esp32_thresholds_v1',
  FUEL_CAL: 'fleetlogix_esp32_fuel_cal_v1',
  RETENTION: 'fleetlogix_esp32_retention_v1',
  HISTORY: 'fleetlogix_esp32_history_v1',
  EVENTS: 'fleetlogix_esp32_events_v1'
};

const DEFAULT_ORIENTATION: ImuOrientationConfig = {
  isCalibrated: false,
  longitudinalAxis: '+X',
  lateralAxis: '+Y',
  verticalAxis: '+Z',
  accelBiasX: 0.0,
  accelBiasY: 0.0,
  accelBiasZ: 0.0,
  useLinearAccelerationForEvents: true
};

const DEFAULT_THRESHOLDS: DrivingEventThresholds = {
  harshBrakingMps2: -3.5,
  harshAccelerationMps2: 3.2,
  harshCorneringMps2: 3.0,
  harshCorneringGyroDps: 42.0,
  excessiveVibrationRmsMps2: 4.2,
  minPersistenceSamples: 3,
  emaAlpha: 0.45
};

const DEFAULT_FUEL_CALIBRATION: FuelCalibrationConfig = {
  emptyDistanceCm: 45.0,
  fullDistanceCm: 5.0,
  tankCapacityLitres: 300,
  isTankGeometryCalibrated: true,
  lowFuelThresholdPercent: 20,
  minValidDistanceCm: 2.0,
  maxValidDistanceCm: 400.0,
  smoothingWindowSize: 5,
  useCalibrationTable: false,
  calibrationTable: [
    { distanceCm: 45.0, levelPercent: 0, volumeLitres: 0 },
    { distanceCm: 35.0, levelPercent: 22, volumeLitres: 66 },
    { distanceCm: 25.0, levelPercent: 50, volumeLitres: 150 },
    { distanceCm: 15.0, levelPercent: 78, volumeLitres: 234 },
    { distanceCm: 5.0, levelPercent: 100, volumeLitres: 300 }
  ]
};

const DEFAULT_RETENTION: StorageRetentionConfig = {
  storageIntervalMs: 2000,
  maxHistoricalSamples: 1500,
  maxEventRecords: 300,
  staleTimeoutMs: 5000
};

const MAX_LIVE_CHART_POINTS = 240;

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function loadArray<T>(key: string, maxLen: number): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-maxLen) : [];
  } catch {
    return [];
  }
}

class Esp32SensorService {
  private state: Esp32SensorSystemState;
  private subscribers: Array<(state: Esp32SensorSystemState) => void> = [];
  private distanceWindow: number[] = [];
  private emaAccel = { x: 0, y: 0, z: 0 };
  private emaInit = false;
  private vibrationWindow: number[] = [];
  private persistenceCounters: Record<Exclude<DrivingEventState, 'normal'>, number> = {
    harsh_braking: 0,
    harsh_acceleration: 0,
    harsh_cornering: 0,
    excessive_vibration: 0
  };
  private lastEventTriggeredAt = 0;
  private lastPersistedSampleAt = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private demoTimer: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;

  constructor() {
    const orientationConfig = loadJson(STORAGE_KEYS.ORIENTATION, DEFAULT_ORIENTATION);
    const thresholds = loadJson(STORAGE_KEYS.THRESHOLDS, DEFAULT_THRESHOLDS);
    const fuelCalibration = loadJson(STORAGE_KEYS.FUEL_CAL, DEFAULT_FUEL_CALIBRATION);
    const retentionConfig = loadJson(STORAGE_KEYS.RETENTION, DEFAULT_RETENTION);
    const historicalSamples = loadArray<ImuChartPoint>(
      STORAGE_KEYS.HISTORY,
      retentionConfig.maxHistoricalSamples
    );
    const eventHistory = loadArray<DetectedDrivingEventRecord>(
      STORAGE_KEYS.EVENTS,
      retentionConfig.maxEventRecords
    );

    const initialPayload: Esp32TelemetryPayload = {
      device_id: 'truck_esp32_01',
      vehicle_id: 'veh-1',
      timestamp: new Date().toISOString(),
      imu: {
        accel_x: null,
        accel_y: null,
        accel_z: null,
        lin_accel_x: null,
        lin_accel_y: null,
        lin_accel_z: null,
        gyro_x: null,
        gyro_y: null,
        gyro_z: null,
        roll: null,
        pitch: null,
        yaw: null,
        unit_acceleration: 'm/s^2',
        unit_angular_velocity: 'deg/s',
        status: 'disconnected'
      },
      fuel: {
        distance_cm: null,
        raw_distance_cm: null,
        level_percent: null,
        volume_litres: null,
        low_fuel_warning: false,
        status: 'disconnected',
        error_message: null
      },
      events: {
        driving_state: 'normal',
        latest_event: eventHistory.length > 0 ? eventHistory[0] : null,
        detector_mode: 'THRESHOLD_PROTOTYPE',
        orientation_calibrated: orientationConfig.isCalibrated
      }
    };

    this.state = {
      connectionState: 'disconnected',
      deviceId: 'truck_esp32_01',
      vehicleId: 'veh-1',
      ipAddress: 'Awaiting ESP32...',
      wifiRssiDbm: null,
      lastReceivedIso: null,
      lastReceivedMs: 0,
      dataAgeMs: null,
      isStale: false,
      packetsReceived: 0,
      errorMessage: null,
      mode: 'LIVE_WIFI',
      latestPayload: initialPayload,
      liveChartBuffer: [],
      historicalSamples,
      eventHistory,
      tripEventCounts: {
        harsh_braking: 0,
        harsh_acceleration: 0,
        harsh_cornering: 0,
        excessive_vibration: 0
      },
      orientationConfig,
      thresholds,
      fuelCalibration,
      retentionConfig
    };

    if (typeof window !== 'undefined') {
      this.startBackgroundSync();
    }
  }

  public getState(): Esp32SensorSystemState {
    return this.state;
  }

  public subscribe(cb: (state: Esp32SensorSystemState) => void): () => void {
    this.subscribers.push(cb);
    cb(this.state);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    const snapshot = { ...this.state };
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  private startBackgroundSync() {
    // 1. Connect SSE stream for low-latency live updates when local server is running
    this.connectSseStream();

    // 2. Poll /api/sensors/latest every 1000ms as resilient fallback (works on Vercel & local)
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        if (this.state.mode === 'LIVE_WIFI') {
          this.fetchLatestFromBackend();
        }
      }, 1000);
    }

    // 3. Stale data & heartbeat monitor every 500ms
    if (!this.staleCheckTimer) {
      this.staleCheckTimer = setInterval(() => {
        if (this.state.lastReceivedMs > 0) {
          const age = Date.now() - this.state.lastReceivedMs;
          const isStale = age > this.state.retentionConfig.staleTimeoutMs;
          const nextConn: SensorConnectionState =
            age > this.state.retentionConfig.staleTimeoutMs * 2
              ? 'disconnected'
              : isStale
              ? 'stale'
              : 'connected';

          if (
            this.state.isStale !== isStale ||
            this.state.connectionState !== nextConn ||
            Math.abs((this.state.dataAgeMs || 0) - age) >= 400
          ) {
            this.state.dataAgeMs = age;
            this.state.isStale = isStale;
            this.state.connectionState = nextConn;
            if (nextConn === 'disconnected') {
              this.state.latestPayload = {
                ...this.state.latestPayload,
                imu: { ...this.state.latestPayload.imu, status: 'disconnected' },
                fuel: { ...this.state.latestPayload.fuel, status: 'disconnected' }
              };
            }
            this.notify();
          }
        }
      }, 500);
    }

    // Initial history sync from backend
    this.fetchHistoryFromBackend();
  }

  private connectSseStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const es = new EventSource('/api/sensors/stream');
      es.onmessage = (evt) => {
        if (this.state.mode !== 'LIVE_WIFI') return;
        try {
          const data = JSON.parse(evt.data);
          if (data && data.device_id && data.imu) {
            this.ingestRawPacket(data, false);
          }
        } catch {
          // Ignore malformed keepalive
        }
      };
      es.onerror = () => {
        es.close();
        this.eventSource = null;
        // Retry SSE after 5 seconds; polling handles interim updates
        setTimeout(() => {
          if (this.state.mode === 'LIVE_WIFI') {
            this.connectSseStream();
          }
        }, 5000);
      };
      this.eventSource = es;
    } catch {
      // Fallback to polling
    }
  }

  private async fetchLatestFromBackend() {
    try {
      const res = await fetch('/api/sensors/latest');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const json = await res.json();
      if (json && json.latest && json.latest.timestamp) {
        const packetTime = new Date(json.latest.received_at || json.latest.timestamp).getTime();
        // Only ingest if newer than what we already processed
        if (packetTime > this.state.lastReceivedMs && !json.latest.is_simulated) {
          this.ingestRawPacket(json.latest, false);
        }
      }
    } catch {
      // Silent network error during polling
    }
  }

  private async fetchHistoryFromBackend() {
    try {
      const res = await fetch('/api/sensors/history');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const json = await res.json();
      if (Array.isArray(json.history) && json.history.length > 0) {
        this.state.historicalSamples = json.history.slice(-this.state.retentionConfig.maxHistoricalSamples);
      }
      if (Array.isArray(json.events) && json.events.length > 0) {
        this.state.eventHistory = json.events.slice(0, this.state.retentionConfig.maxEventRecords);
      }
      this.notify();
    } catch {
      // Keep localStorage history
    }
  }

  /**
   * Switch between LIVE_WIFI (production hardware) and LABELED_DEMO (bench simulation)
   */
  public setMode(mode: 'LIVE_WIFI' | 'LABELED_DEMO', demoScenario?: DrivingEventState) {
    this.state.mode = mode;
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }

    if (mode === 'LABELED_DEMO') {
      // Explicitly enable orientation calibration in demo mode so users can test event classification
      if (!this.state.orientationConfig.isCalibrated) {
        this.updateOrientationConfig({ isCalibrated: true });
      }
      let tick = 0;
      this.demoTimer = setInterval(() => {
        tick++;
        const nowIso = new Date().toISOString();
        const t = tick * 0.2;
        let ax = Math.sin(t) * 0.35 + (Math.random() - 0.5) * 0.15;
        let ay = Math.cos(t * 0.7) * 0.28 + (Math.random() - 0.5) * 0.12;
        let az = 9.81 + (Math.random() - 0.5) * 0.18;
        let gx = (Math.random() - 0.5) * 1.8;
        let gy = (Math.random() - 0.5) * 1.5;
        let gz = Math.sin(t * 0.5) * 4.2;

        if (demoScenario === 'harsh_braking') {
          ax = -5.2 + (Math.random() - 0.5) * 0.4;
        } else if (demoScenario === 'harsh_acceleration') {
          ax = 4.6 + (Math.random() - 0.5) * 0.4;
        } else if (demoScenario === 'harsh_cornering') {
          ay = 4.4 + (Math.random() - 0.5) * 0.3;
          gz = 54.0 + (Math.random() - 0.5) * 4.0;
        } else if (demoScenario === 'excessive_vibration') {
          ax = (tick % 2 === 0 ? 1 : -1) * 5.5;
          ay = (tick % 2 === 0 ? -1 : 1) * 4.8;
          az = 9.81 + (tick % 2 === 0 ? 6.2 : -6.2);
        }

        const simulatedDistance = 16.4 + Math.sin(t * 0.05) * 0.8;

        this.ingestRawPacket(
          {
            device_id: 'truck_esp32_01 (DEMO)',
            vehicle_id: this.state.vehicleId,
            timestamp: nowIso,
            wifi_rssi_dbm: -58,
            ip_address: '192.168.1.184 (SIM)',
            is_simulated: true,
            imu: {
              accel_x: Number(ax.toFixed(3)),
              accel_y: Number(ay.toFixed(3)),
              accel_z: Number(az.toFixed(3)),
              lin_accel_x: Number(ax.toFixed(3)),
              lin_accel_y: Number(ay.toFixed(3)),
              lin_accel_z: Number((az - 9.81).toFixed(3)),
              gyro_x: Number(gx.toFixed(2)),
              gyro_y: Number(gy.toFixed(2)),
              gyro_z: Number(gz.toFixed(2)),
              roll: Number((Math.sin(t * 0.3) * 2.1).toFixed(1)),
              pitch: Number((ax * -1.8).toFixed(1)),
              yaw: Number(((tick * 1.2) % 360).toFixed(1)),
              unit_acceleration: 'm/s^2',
              unit_angular_velocity: 'deg/s',
              status: 'connected'
            },
            fuel: {
              distance_cm: Number(simulatedDistance.toFixed(2)),
              level_percent: null,
              volume_litres: null,
              low_fuel_warning: false,
              status: 'connected'
            },
            events: {
              driving_state: 'normal',
              latest_event: null,
              detector_mode: 'THRESHOLD_PROTOTYPE',
              orientation_calibrated: this.state.orientationConfig.isCalibrated
            }
          },
          true
        );
      }, 250);
    } else {
      // Returning to LIVE_WIFI mode: clear simulated readings immediately so no fake data lingers
      this.state.connectionState = 'disconnected';
      this.state.lastReceivedMs = 0;
      this.state.lastReceivedIso = null;
      this.state.dataAgeMs = null;
      this.state.isStale = false;
      this.state.latestPayload = {
        ...this.state.latestPayload,
        is_simulated: false,
        imu: {
          accel_x: null,
          accel_y: null,
          accel_z: null,
          lin_accel_x: null,
          lin_accel_y: null,
          lin_accel_z: null,
          gyro_x: null,
          gyro_y: null,
          gyro_z: null,
          roll: null,
          pitch: null,
          yaw: null,
          unit_acceleration: 'm/s^2',
          unit_angular_velocity: 'deg/s',
          status: 'disconnected'
        },
        fuel: {
          distance_cm: null,
          raw_distance_cm: null,
          level_percent: null,
          volume_litres: null,
          low_fuel_warning: false,
          status: 'disconnected',
          error_message: null
        }
      };
      this.notify();
    }
  }

  /**
   * Calibrate zero-offset bias from current stationary IMU reading
   */
  public calibrateCurrentImuZeroOffset() {
    const imu = this.state.latestPayload.imu;
    if (imu.status !== 'connected' || imu.accel_x === null || imu.accel_y === null || imu.accel_z === null) {
      return false;
    }
    const useLin = this.state.orientationConfig.useLinearAccelerationForEvents;
    const bx = useLin && imu.lin_accel_x !== null && imu.lin_accel_x !== undefined ? imu.lin_accel_x : imu.accel_x;
    const by = useLin && imu.lin_accel_y !== null && imu.lin_accel_y !== undefined ? imu.lin_accel_y : imu.accel_y;
    const bz =
      useLin && imu.lin_accel_z !== null && imu.lin_accel_z !== undefined
        ? imu.lin_accel_z
        : imu.accel_z - 9.81;

    this.updateOrientationConfig({
      isCalibrated: true,
      accelBiasX: Number(bx.toFixed(3)),
      accelBiasY: Number(by.toFixed(3)),
      accelBiasZ: Number(bz.toFixed(3))
    });
    return true;
  }

  public updateOrientationConfig(partial: Partial<ImuOrientationConfig>) {
    this.state.orientationConfig = { ...this.state.orientationConfig, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ORIENTATION, JSON.stringify(this.state.orientationConfig));
    }
    this.notify();
  }

  public updateThresholds(partial: Partial<DrivingEventThresholds>) {
    this.state.thresholds = { ...this.state.thresholds, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.THRESHOLDS, JSON.stringify(this.state.thresholds));
    }
    this.notify();
  }

  public updateFuelCalibration(partial: Partial<FuelCalibrationConfig>) {
    this.state.fuelCalibration = { ...this.state.fuelCalibration, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FUEL_CAL, JSON.stringify(this.state.fuelCalibration));
    }
    // Re-evaluate latest fuel reading if connected
    const currentRaw = this.state.latestPayload.fuel.raw_distance_cm ?? this.state.latestPayload.fuel.distance_cm;
    if (currentRaw !== null && currentRaw !== undefined) {
      this.state.latestPayload.fuel = this.computeCalibratedFuel(
        currentRaw,
        this.state.latestPayload.fuel.status
      );
    }
    this.notify();
  }

  public updateRetentionConfig(partial: Partial<StorageRetentionConfig>) {
    this.state.retentionConfig = { ...this.state.retentionConfig, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.RETENTION, JSON.stringify(this.state.retentionConfig));
    }
    this.notify();
  }

  public clearTripCountersAndHistory() {
    this.state.tripEventCounts = {
      harsh_braking: 0,
      harsh_acceleration: 0,
      harsh_cornering: 0,
      excessive_vibration: 0
    };
    this.state.eventHistory = [];
    this.state.historicalSamples = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
    }
    fetch('/api/sensors/history', { method: 'DELETE' }).catch(() => {});
    this.notify();
  }

  private resolveAxisValue(
    axis: AxisMappingOption,
    x: number,
    y: number,
    z: number
  ): number {
    switch (axis) {
      case '+X':
        return x;
      case '-X':
        return -x;
      case '+Y':
        return y;
      case '-Y':
        return -y;
      case '+Z':
        return z;
      case '-Z':
        return -z;
    }
  }

  /**
   * Calibrates and filters ultrasonic fuel distance reading
   */
  public computeCalibratedFuel(
    rawDistanceCm: number | null | undefined,
    sensorStatus: SensorConnectionState
  ): Esp32FuelReading {
    const cal = this.state.fuelCalibration;

    if (sensorStatus === 'disconnected' || rawDistanceCm === null || rawDistanceCm === undefined) {
      return {
        distance_cm: null,
        raw_distance_cm: null,
        level_percent: null,
        volume_litres: null,
        low_fuel_warning: false,
        status: 'disconnected',
        error_message: 'Ultrasonic sensor disconnected'
      };
    }

    if (
      typeof rawDistanceCm !== 'number' ||
      Number.isNaN(rawDistanceCm) ||
      rawDistanceCm < cal.minValidDistanceCm ||
      rawDistanceCm > cal.maxValidDistanceCm
    ) {
      return {
        distance_cm: null,
        raw_distance_cm: Number.isNaN(rawDistanceCm) ? null : rawDistanceCm,
        level_percent: null,
        volume_litres: null,
        low_fuel_warning: false,
        status: 'error',
        error_message: `Invalid ultrasonic reading (${rawDistanceCm} cm outside valid range ${cal.minValidDistanceCm}–${cal.maxValidDistanceCm} cm)`
      };
    }

    // Moving median + average smoothing filter
    this.distanceWindow.push(rawDistanceCm);
    if (this.distanceWindow.length > Math.max(1, cal.smoothingWindowSize)) {
      this.distanceWindow.shift();
    }
    const sorted = [...this.distanceWindow].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const filteredDistance =
      sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    let levelPercent = 0;
    let volumeLitres: number | null = null;

    if (cal.useCalibrationTable && cal.calibrationTable.length >= 2) {
      // Sort table by distance descending (empty = largest distance -> full = smallest distance)
      const table = [...cal.calibrationTable].sort((a, b) => b.distanceCm - a.distanceCm);
      if (filteredDistance >= table[0].distanceCm) {
        levelPercent = table[0].levelPercent;
        volumeLitres = table[0].volumeLitres ?? null;
      } else if (filteredDistance <= table[table.length - 1].distanceCm) {
        levelPercent = table[table.length - 1].levelPercent;
        volumeLitres = table[table.length - 1].volumeLitres ?? null;
      } else {
        for (let i = 0; i < table.length - 1; i++) {
          const p1 = table[i];
          const p2 = table[i + 1];
          if (filteredDistance <= p1.distanceCm && filteredDistance >= p2.distanceCm) {
            const span = Math.max(0.01, p1.distanceCm - p2.distanceCm);
            const ratio = (p1.distanceCm - filteredDistance) / span;
            levelPercent = p1.levelPercent + ratio * (p2.levelPercent - p1.levelPercent);
            if (p1.volumeLitres !== undefined && p2.volumeLitres !== undefined) {
              volumeLitres = p1.volumeLitres + ratio * (p2.volumeLitres - p1.volumeLitres);
            }
            break;
          }
        }
      }
    } else {
      // Standard vertical tank interpolation
      const span = cal.emptyDistanceCm - cal.fullDistanceCm;
      if (span <= 0.1) {
        return {
          distance_cm: Number(filteredDistance.toFixed(2)),
          raw_distance_cm: Number(rawDistanceCm.toFixed(2)),
          level_percent: null,
          volume_litres: null,
          low_fuel_warning: false,
          status: 'error',
          error_message: 'Invalid calibration: Empty reference distance must be greater than Full reference distance'
        };
      }
      const rawPct = ((cal.emptyDistanceCm - filteredDistance) / span) * 100;
      levelPercent = Math.max(0, Math.min(100, rawPct));
    }

    levelPercent = Number(Math.max(0, Math.min(100, levelPercent)).toFixed(1));

    // Only compute litres if tank geometry is calibrated and tank capacity is known
    if (cal.isTankGeometryCalibrated && cal.tankCapacityLitres && cal.tankCapacityLitres > 0) {
      if (volumeLitres === null) {
        volumeLitres = Number(((levelPercent / 100) * cal.tankCapacityLitres).toFixed(1));
      } else {
        volumeLitres = Number(volumeLitres.toFixed(1));
      }
    } else {
      volumeLitres = null;
    }

    return {
      distance_cm: Number(filteredDistance.toFixed(2)),
      raw_distance_cm: Number(rawDistanceCm.toFixed(2)),
      level_percent: levelPercent,
      volume_litres: volumeLitres,
      low_fuel_warning: levelPercent <= cal.lowFuelThresholdPercent,
      status: 'connected',
      error_message: null
    };
  }

  /**
   * Ingests a validated telemetry packet from ESP32 (or labeled demo)
   */
  public ingestRawPacket(raw: any, isSimulated: boolean = false) {
    const nowMs = Date.now();
    const isoNow = raw.timestamp || new Date(nowMs).toISOString();

    const imuIn = raw.imu || {};
    const imuConnected =
      imuIn.status === 'connected' &&
      typeof imuIn.accel_x === 'number' &&
      typeof imuIn.accel_y === 'number' &&
      typeof imuIn.accel_z === 'number';

    const imuReading: Esp32ImuReading = {
      accel_x: imuConnected ? Number(imuIn.accel_x) : null,
      accel_y: imuConnected ? Number(imuIn.accel_y) : null,
      accel_z: imuConnected ? Number(imuIn.accel_z) : null,
      lin_accel_x:
        imuConnected && typeof imuIn.lin_accel_x === 'number' ? Number(imuIn.lin_accel_x) : null,
      lin_accel_y:
        imuConnected && typeof imuIn.lin_accel_y === 'number' ? Number(imuIn.lin_accel_y) : null,
      lin_accel_z:
        imuConnected && typeof imuIn.lin_accel_z === 'number' ? Number(imuIn.lin_accel_z) : null,
      gyro_x: imuConnected && typeof imuIn.gyro_x === 'number' ? Number(imuIn.gyro_x) : null,
      gyro_y: imuConnected && typeof imuIn.gyro_y === 'number' ? Number(imuIn.gyro_y) : null,
      gyro_z: imuConnected && typeof imuIn.gyro_z === 'number' ? Number(imuIn.gyro_z) : null,
      roll: imuConnected && typeof imuIn.roll === 'number' ? Number(imuIn.roll) : null,
      pitch: imuConnected && typeof imuIn.pitch === 'number' ? Number(imuIn.pitch) : null,
      yaw: imuConnected && typeof imuIn.yaw === 'number' ? Number(imuIn.yaw) : null,
      unit_acceleration: imuIn.unit_acceleration || 'm/s^2',
      unit_angular_velocity: imuIn.unit_angular_velocity || 'deg/s',
      sensor_timestamp_ms: imuIn.sensor_timestamp_ms,
      status: imuConnected ? 'connected' : (imuIn.status as SensorConnectionState) || 'disconnected'
    };

    const fuelIn = raw.fuel || {};
    const fuelReading = this.computeCalibratedFuel(
      fuelIn.distance_cm,
      (fuelIn.status as SensorConnectionState) || 'connected'
    );

    // Run Configurable Threshold & Persistence Prototype Detector
    const eventEval = this.evaluateDrivingEvents(
      imuReading,
      raw.device_id || 'truck_esp32_01',
      raw.vehicle_id || this.state.vehicleId,
      isoNow
    );

    const payload: Esp32TelemetryPayload = {
      device_id: raw.device_id || 'truck_esp32_01',
      vehicle_id: raw.vehicle_id || this.state.vehicleId,
      timestamp: isoNow,
      received_at: new Date(nowMs).toISOString(),
      sequence_id: raw.sequence_id,
      wifi_rssi_dbm: typeof raw.wifi_rssi_dbm === 'number' ? raw.wifi_rssi_dbm : null,
      ip_address: raw.ip_address || this.state.ipAddress,
      is_simulated: isSimulated || !!raw.is_simulated,
      imu: imuReading,
      fuel: fuelReading,
      events: {
        driving_state: eventEval.drivingState,
        latest_event: eventEval.latestEvent,
        detector_mode: 'THRESHOLD_PROTOTYPE',
        orientation_calibrated: this.state.orientationConfig.isCalibrated
      }
    };

    const chartPoint: ImuChartPoint = {
      timeLabel: new Date(nowMs).toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      timestampMs: nowMs,
      isoTimestamp: isoNow,
      accel_x: imuReading.accel_x,
      accel_y: imuReading.accel_y,
      accel_z: imuReading.accel_z,
      lin_accel_x: imuReading.lin_accel_x ?? null,
      lin_accel_y: imuReading.lin_accel_y ?? null,
      lin_accel_z: imuReading.lin_accel_z ?? null,
      gyro_x: imuReading.gyro_x,
      gyro_y: imuReading.gyro_y,
      gyro_z: imuReading.gyro_z,
      roll: imuReading.roll ?? null,
      pitch: imuReading.pitch ?? null,
      yaw: imuReading.yaw ?? null,
      distance_cm: fuelReading.distance_cm,
      level_percent: fuelReading.level_percent,
      volume_litres: fuelReading.volume_litres,
      driving_state: eventEval.drivingState,
      is_simulated: !!payload.is_simulated
    };

    // Bounded live chart buffer
    this.state.liveChartBuffer = [
      ...this.state.liveChartBuffer.slice(-(MAX_LIVE_CHART_POINTS - 1)),
      chartPoint
    ];

    // Bounded historical storage with configurable interval & retention policy
    if (nowMs - this.lastPersistedSampleAt >= this.state.retentionConfig.storageIntervalMs) {
      this.lastPersistedSampleAt = nowMs;
      this.state.historicalSamples = [
        ...this.state.historicalSamples.slice(-(this.state.retentionConfig.maxHistoricalSamples - 1)),
        chartPoint
      ];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            STORAGE_KEYS.HISTORY,
            JSON.stringify(this.state.historicalSamples)
          );
        } catch {
          // Quota guard
        }
      }
    }

    this.state.connectionState = 'connected';
    this.state.deviceId = payload.device_id;
    if (payload.ip_address) this.state.ipAddress = payload.ip_address;
    this.state.wifiRssiDbm = payload.wifi_rssi_dbm ?? null;
    this.state.lastReceivedIso = isoNow;
    this.state.lastReceivedMs = nowMs;
    this.state.dataAgeMs = 0;
    this.state.isStale = false;
    this.state.packetsReceived += 1;
    this.state.latestPayload = payload;

    this.notify();
  }

  private evaluateDrivingEvents(
    imu: Esp32ImuReading,
    deviceId: string,
    vehicleId: string,
    isoTimestamp: string
  ): {
    drivingState: DrivingEventState;
    latestEvent: DetectedDrivingEventRecord | null;
  } {
    if (
      imu.status !== 'connected' ||
      imu.accel_x === null ||
      imu.accel_y === null ||
      imu.accel_z === null
    ) {
      return {
        drivingState: 'normal',
        latestEvent: this.state.eventHistory[0] || null
      };
    }

    const orient = this.state.orientationConfig;
    const thresh = this.state.thresholds;

    // Select gravity-compensated linear acceleration when available & configured
    const rawX =
      orient.useLinearAccelerationForEvents && imu.lin_accel_x !== null && imu.lin_accel_x !== undefined
        ? imu.lin_accel_x
        : imu.accel_x;
    const rawY =
      orient.useLinearAccelerationForEvents && imu.lin_accel_y !== null && imu.lin_accel_y !== undefined
        ? imu.lin_accel_y
        : imu.accel_y;
    const rawZ =
      orient.useLinearAccelerationForEvents && imu.lin_accel_z !== null && imu.lin_accel_z !== undefined
        ? imu.lin_accel_z
        : imu.accel_z - 9.81;

    const adjX = rawX - orient.accelBiasX;
    const adjY = rawY - orient.accelBiasY;
    const adjZ = rawZ - orient.accelBiasZ;

    // EMA low-pass filtering
    const alpha = Math.max(0.05, Math.min(1.0, thresh.emaAlpha));
    if (!this.emaInit) {
      this.emaAccel = { x: adjX, y: adjY, z: adjZ };
      this.emaInit = true;
    } else {
      this.emaAccel.x = alpha * adjX + (1 - alpha) * this.emaAccel.x;
      this.emaAccel.y = alpha * adjY + (1 - alpha) * this.emaAccel.y;
      this.emaAccel.z = alpha * adjZ + (1 - alpha) * this.emaAccel.z;
    }

    // High-frequency vibration RMS calculation (orientation-independent)
    const highFreqMag = Math.hypot(
      adjX - this.emaAccel.x,
      adjY - this.emaAccel.y,
      adjZ - this.emaAccel.z
    );
    this.vibrationWindow.push(highFreqMag);
    if (this.vibrationWindow.length > 8) {
      this.vibrationWindow.shift();
    }
    const rmsVibration = Math.sqrt(
      this.vibrationWindow.reduce((acc, v) => acc + v * v, 0) / this.vibrationWindow.length
    );

    const gyroMag = Math.hypot(imu.gyro_x || 0, imu.gyro_y || 0, imu.gyro_z || 0);
    const minSamples = Math.max(1, thresh.minPersistenceSamples);

    let detectedType: Exclude<DrivingEventState, 'normal'> | null = null;
    let peakAccel = 0;
    let axisLabel = 'Uncalibrated';

    // Check vibration first
    if (rmsVibration >= thresh.excessiveVibrationRmsMps2) {
      this.persistenceCounters.excessive_vibration++;
      if (this.persistenceCounters.excessive_vibration >= minSamples) {
        detectedType = 'excessive_vibration';
        peakAccel = Number(rmsVibration.toFixed(2));
        axisLabel = '3-Axis RMS Vibration';
      }
    } else {
      this.persistenceCounters.excessive_vibration = 0;
    }

    // Directional events ONLY when mounting orientation is calibrated!
    if (orient.isCalibrated && !detectedType) {
      const longAccel = this.resolveAxisValue(
        orient.longitudinalAxis,
        this.emaAccel.x,
        this.emaAccel.y,
        this.emaAccel.z
      );
      const latAccel = this.resolveAxisValue(
        orient.lateralAxis,
        this.emaAccel.x,
        this.emaAccel.y,
        this.emaAccel.z
      );

      // 1. Harsh Braking (negative longitudinal acceleration beyond threshold)
      if (longAccel <= thresh.harshBrakingMps2) {
        this.persistenceCounters.harsh_braking++;
        if (this.persistenceCounters.harsh_braking >= minSamples) {
          detectedType = 'harsh_braking';
          peakAccel = Number(longAccel.toFixed(2));
          axisLabel = `Longitudinal (${orient.longitudinalAxis})`;
        }
      } else {
        this.persistenceCounters.harsh_braking = 0;
      }

      // 2. Harsh Acceleration (positive longitudinal acceleration beyond threshold)
      if (!detectedType && longAccel >= thresh.harshAccelerationMps2) {
        this.persistenceCounters.harsh_acceleration++;
        if (this.persistenceCounters.harsh_acceleration >= minSamples) {
          detectedType = 'harsh_acceleration';
          peakAccel = Number(longAccel.toFixed(2));
          axisLabel = `Longitudinal (${orient.longitudinalAxis})`;
        }
      } else if (longAccel < thresh.harshAccelerationMps2) {
        this.persistenceCounters.harsh_acceleration = 0;
      }

      // 3. Harsh Cornering (lateral acceleration or high yaw rate)
      const yawRate = Math.abs(imu.gyro_z || 0);
      if (
        !detectedType &&
        (Math.abs(latAccel) >= thresh.harshCorneringMps2 || yawRate >= thresh.harshCorneringGyroDps)
      ) {
        this.persistenceCounters.harsh_cornering++;
        if (this.persistenceCounters.harsh_cornering >= minSamples) {
          detectedType = 'harsh_cornering';
          peakAccel = Number(latAccel.toFixed(2));
          axisLabel = `Lateral (${orient.lateralAxis})`;
        }
      } else if (
        Math.abs(latAccel) < thresh.harshCorneringMps2 &&
        yawRate < thresh.harshCorneringGyroDps
      ) {
        this.persistenceCounters.harsh_cornering = 0;
      }
    }

    if (!detectedType) {
      return {
        drivingState: 'normal',
        latestEvent: this.state.eventHistory[0] || null
      };
    }

    // Cooldown of 2.5 seconds between logging identical consecutive events
    const now = Date.now();
    if (now - this.lastEventTriggeredAt > 2500) {
      this.lastEventTriggeredAt = now;
      const absRatio = Math.abs(peakAccel) / 3.5;
      const severity: DetectedDrivingEventRecord['severity'] =
        absRatio >= 2.0 ? 'critical' : absRatio >= 1.5 ? 'high' : absRatio >= 1.2 ? 'medium' : 'low';

      const newEvent: DetectedDrivingEventRecord = {
        id: `evt-${now}-${Math.random().toString(36).substring(2, 6)}`,
        device_id: deviceId,
        vehicle_id: vehicleId,
        type: detectedType,
        severity,
        timestamp: isoTimestamp,
        peak_accel_mps2: peakAccel,
        peak_gyro_dps: Number(gyroMag.toFixed(1)),
        axis_label: axisLabel,
        duration_ms: minSamples * 200,
        detector_type: 'THRESHOLD_PROTOTYPE',
        orientation_calibrated: orient.isCalibrated,
        notes: `${detectedType.replace(/_/g, ' ').toUpperCase()} (${peakAccel} m/s² on ${axisLabel})`
      };

      this.state.tripEventCounts[detectedType] =
        (this.state.tripEventCounts[detectedType] || 0) + 1;
      this.state.eventHistory = [
        newEvent,
        ...this.state.eventHistory.slice(0, this.state.retentionConfig.maxEventRecords - 1)
      ];

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.state.eventHistory));
        } catch {
          // Ignore storage error
        }
      }
    }

    return {
      drivingState: detectedType,
      latestEvent: this.state.eventHistory[0] || null
    };
  }

  public exportHistoryToCsv(): string {
    const headers = [
      'Timestamp_ISO',
      'Accel_X_mps2',
      'Accel_Y_mps2',
      'Accel_Z_mps2',
      'LinAccel_X_mps2',
      'LinAccel_Y_mps2',
      'LinAccel_Z_mps2',
      'Gyro_X_dps',
      'Gyro_Y_dps',
      'Gyro_Z_dps',
      'Roll_deg',
      'Pitch_deg',
      'Yaw_deg',
      'Ultrasonic_Distance_cm',
      'Fuel_Level_Percent',
      'Fuel_Volume_Litres',
      'Driving_State',
      'Simulated'
    ];
    const rows = this.state.historicalSamples.map((s) =>
      [
        s.isoTimestamp,
        s.accel_x ?? '',
        s.accel_y ?? '',
        s.accel_z ?? '',
        s.lin_accel_x ?? '',
        s.lin_accel_y ?? '',
        s.lin_accel_z ?? '',
        s.gyro_x ?? '',
        s.gyro_y ?? '',
        s.gyro_z ?? '',
        s.roll ?? '',
        s.pitch ?? '',
        s.yaw ?? '',
        s.distance_cm ?? '',
        s.level_percent ?? '',
        s.volume_litres ?? '',
        s.driving_state,
        s.is_simulated ? 'YES' : 'NO'
      ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  public exportEventsToCsv(): string {
    const headers = [
      'Event_ID',
      'Timestamp_ISO',
      'Device_ID',
      'Event_Type',
      'Severity',
      'Peak_Accel_mps2',
      'Peak_Gyro_dps',
      'Axis_Label',
      'Duration_ms',
      'Detector_Type',
      'Orientation_Calibrated'
    ];
    const rows = this.state.eventHistory.map((e) =>
      [
        e.id,
        e.timestamp,
        e.device_id,
        e.type,
        e.severity,
        e.peak_accel_mps2,
        e.peak_gyro_dps,
        `"${e.axis_label}"`,
        e.duration_ms,
        e.detector_type,
        e.orientation_calibrated ? 'YES' : 'NO'
      ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

export const esp32SensorService = new Esp32SensorService();
