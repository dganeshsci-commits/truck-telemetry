import { ImuData, ImuCalibrationConfig, HardwareOperationMode } from '../types';

// ============================================================================
// CONFIGURABLE CALIBRATION CONSTANTS
// User-tunable parameters for physical GY-521 MPU6050 IMU on SPDuino ATmega328P
// ============================================================================
export const DEFAULT_IMU_CONFIG: ImuCalibrationConfig = {
  FORWARD_THRESHOLD: 1.5, // degrees of forward tilt (pitch) to initiate acceleration
  BACKWARD_THRESHOLD: -1.5, // degrees of backward tilt (pitch) to initiate deceleration / braking
  SPEED_ACCELERATION_RATE: 1.6, // km/h rate added per tick when tilted forward
  SPEED_DECELERATION_RATE: 2.2, // km/h rate subtracted per tick when tilted backward
  MAX_SPEED: 80, // km/h maximum demonstration demo speed
  MIN_SPEED: 0, // km/h minimum speed floor
  IMU_DEADZONE: 0.8 // dead-zone degrees (±0.8°): sensor noise within this range maintains steady speed
};

export interface SerialPacketLog {
  id: string;
  timestamp: string;
  raw: string;
  type: 'ACCEL' | 'GYRO' | 'TILT' | 'RFID' | 'SYSTEM' | 'RAW';
}

export type ImuUpdateListener = (imu: ImuData, speed: number) => void;
export type SerialPacketListener = (packet: SerialPacketLog) => void;

class ImuSpeedController {
  private config: ImuCalibrationConfig = { ...DEFAULT_IMU_CONFIG };
  private mode: HardwareOperationMode = 'HARDWARE';
  private invertPitchAxis: boolean = false;

  // IMU Data State
  private imuData: ImuData = {
    accel: { x: 0.0, y: 0.0, z: 9.81 },
    gyro: { x: 0.0, y: 0.0, z: 0.0 },
    tilt: { roll: 0.0, pitch: 0.0 },
    status: 'OFFLINE',
    lastUpdate: 'Never',
    lastReceivedTimestamp: 0,
    simulatedSpeed: 0,
    speedSource: 'IMU Simulated Speed'
  };

  // Speed Float Accumulator for smooth increments (e.g. 18 -> 19 -> 21 -> 23 -> 25 km/h)
  private currentSpeedFloat: number = 0;

  // Low-Pass Filter State (Exponential Moving Average)
  // alpha = 0.3 for crisp responsiveness with strong noise rejection
  private filterAlpha: number = 0.3;
  private filteredPitch: number = 0;
  private filteredRoll: number = 0;
  private filteredAccelX: number = 0;
  private filteredAccelY: number = 0;
  private filteredAccelZ: number = 9.81;

  // Listeners
  private updateListeners: Set<ImuUpdateListener> = new Set();
  private packetListeners: Set<SerialPacketListener> = new Set();
  private recentPackets: SerialPacketLog[] = [];
  private lastTiltPacketTimestamp: number = 0;
  private lastNotifyTimestamp: number = 0;
  private notifyTimeoutId: any = null;
  private lastEmittedSpeed: number = -1;
  private lastEmittedStatus: string = '';

  // Watchdog Timer for 2-second timeout ("IMU SIGNAL LOST")
  private watchdogInterval: any = null;

  // Demo Mode Simulation Interval
  private demoInterval: any = null;
  private demoTargetPitch: number = 0;

  constructor() {
    this.startWatchdog();
  }

  public getConfig(): ImuCalibrationConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ImuCalibrationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public setInvertPitch(invert: boolean) {
    this.invertPitchAxis = invert;
  }

  public getInvertPitch(): boolean {
    return this.invertPitchAxis;
  }

  public getMode(): HardwareOperationMode {
    return this.mode;
  }

  public setMode(mode: HardwareOperationMode) {
    this.mode = mode;
    if (mode === 'DEMO') {
      this.startDemoSimulation();
    } else {
      this.stopDemoSimulation();
      // If hardware mode, check if we currently have fresh data
      if (Date.now() - this.imuData.lastReceivedTimestamp > 2000) {
        this.imuData.status = this.imuData.lastReceivedTimestamp === 0 ? 'OFFLINE' : 'SIGNAL_LOST';
        this.notifyUpdate();
      }
    }
  }

  public getImuData(): ImuData {
    return { ...this.imuData };
  }

  public getRecentPackets(): SerialPacketLog[] {
    return [...this.recentPackets];
  }

  public clearRecentPackets() {
    this.recentPackets = [];
  }

  public subscribe(listener: ImuUpdateListener): () => void {
    this.updateListeners.add(listener);
    // Trigger initial state
    listener(this.imuData, Math.round(this.currentSpeedFloat));
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  public subscribePackets(listener: SerialPacketListener): () => void {
    this.packetListeners.add(listener);
    return () => {
      this.packetListeners.delete(listener);
    };
  }

  public setSimulatedSpeedDirect(speed: number) {
    this.currentSpeedFloat = Math.max(this.config.MIN_SPEED, Math.min(this.config.MAX_SPEED, speed));
    this.imuData.simulatedSpeed = Math.round(this.currentSpeedFloat);
    this.notifyUpdate();
  }

  /**
   * Process a single incoming line from SPDuino Web Serial
   * Handles:
   *  - ACCEL,<X>,<Y>,<Z>  (e.g., ACCEL,0.24,-0.08,9.71)
   *  - GYRO,<X>,<Y>,<Z>   (e.g., GYRO,1.42,-0.31,8.25)
   *  - TILT,<ROLL>,<PITCH> (e.g., TILT,4.2,-1.8)
   */
  public handleSerialLine(rawLine: string) {
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const timestamp = new Date().toLocaleTimeString();

    // Log packet for debug monitor
    let packetType: SerialPacketLog['type'] = 'RAW';
    if (trimmed.startsWith('ACCEL')) packetType = 'ACCEL';
    else if (trimmed.startsWith('GYRO')) packetType = 'GYRO';
    else if (trimmed.startsWith('TILT')) packetType = 'TILT';
    else if (trimmed.startsWith('RFID')) packetType = 'RFID';
    else if (trimmed.startsWith('SYSTEM')) packetType = 'SYSTEM';

    const packetLog: SerialPacketLog = {
      id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      raw: trimmed,
      type: packetType
    };

    // Buffer packets instead of immediately updating array to avoid O(N) array copies at 100Hz
    this.recentPackets.push(packetLog);
    if (this.recentPackets.length > 200) {
      this.recentPackets.shift();
    }
    this.packetListeners.forEach((fn) => fn(packetLog));

    // If we are in DEMO mode, ignore real hardware data to avoid mixing
    if (this.mode === 'DEMO') {
      return;
    }

    // Parse ACCEL
    if (trimmed.startsWith('ACCEL,')) {
      const parts = trimmed.split(',');
      if (parts.length >= 4) {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          this.applyAccelData(x, y, z);
        }
      }
    }
    // Parse GYRO
    else if (trimmed.startsWith('GYRO,')) {
      const parts = trimmed.split(',');
      if (parts.length >= 4) {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          this.imuData.gyro = { x, y, z };
          // Do not spam notify on gyro alone to prevent UI jitter
        }
      }
    }
    // Parse TILT
    else if (trimmed.startsWith('TILT,')) {
      const parts = trimmed.split(',');
      if (parts.length >= 3) {
        const roll = parseFloat(parts[1]);
        const pitch = parseFloat(parts[2]);

        if (!isNaN(roll) && !isNaN(pitch)) {
          this.lastTiltPacketTimestamp = Date.now();
          this.applyTiltData(roll, pitch);
        }
      }
    }
  }

  /**
   * Apply raw acceleration data and compute speed delta
   */
  private applyAccelData(rawX: number, rawY: number, rawZ: number) {
    const now = Date.now();
    this.imuData.lastReceivedTimestamp = now;
    this.imuData.status = 'ONLINE';
    this.imuData.lastUpdate = new Date().toLocaleTimeString();

    // Low-pass filter for smooth acceleration readings
    this.filteredAccelX = this.filterAlpha * rawX + (1 - this.filterAlpha) * this.filteredAccelX;
    this.filteredAccelY = this.filterAlpha * rawY + (1 - this.filterAlpha) * this.filteredAccelY;
    this.filteredAccelZ = this.filterAlpha * rawZ + (1 - this.filterAlpha) * this.filteredAccelZ;

    this.imuData.accel = {
      x: Number(rawX.toFixed(2)),
      y: Number(rawY.toFixed(2)),
      z: Number(rawZ.toFixed(2))
    };

    // If no explicit TILT packet was received within the last 500ms, calculate roll and pitch from accelerometer
    if (now - this.lastTiltPacketTimestamp > 500) {
      const computedPitch = Math.atan2(-this.filteredAccelX, Math.sqrt(this.filteredAccelY * this.filteredAccelY + this.filteredAccelZ * this.filteredAccelZ)) * (180 / Math.PI);
      const computedRoll = Math.atan2(this.filteredAccelY, this.filteredAccelZ) * (180 / Math.PI);
      this.applyTiltData(computedRoll, computedPitch);
    }
  }

  /**
   * Apply tilt data (Roll & Pitch) and drive the simulated vehicle speed
   */
  private applyTiltData(rawRoll: number, rawPitch: number) {
    // Low-pass filter for tilt angles
    this.filteredRoll = this.filterAlpha * rawRoll + (1 - this.filterAlpha) * this.filteredRoll;
    this.filteredPitch = this.filterAlpha * rawPitch + (1 - this.filterAlpha) * this.filteredPitch;

    const effectivePitch = this.invertPitchAxis ? -this.filteredPitch : this.filteredPitch;

    this.imuData.tilt = {
      roll: Number(this.filteredRoll.toFixed(1)),
      pitch: Number(effectivePitch.toFixed(1))
    };

    // ========================================================================
    // SPEED CONTROL ALGORITHM
    // ========================================================================
    const {
      FORWARD_THRESHOLD,
      BACKWARD_THRESHOLD,
      SPEED_ACCELERATION_RATE,
      SPEED_DECELERATION_RATE,
      MAX_SPEED,
      MIN_SPEED,
      IMU_DEADZONE
    } = this.config;

    // Check Dead-Zone: when approximately level, maintain or slowly stabilize current speed
    if (Math.abs(effectivePitch) <= IMU_DEADZONE) {
      // Steady state: small natural road coasting stabilization (very gentle)
      // Speed holds steady without erratic fluctuations
    }
    // Forward Tilt / Movement: Increase simulated vehicle speed smoothly
    else if (effectivePitch > FORWARD_THRESHOLD) {
      // Proportional multiplier based on tilt angle (1.0 to ~2.5x for aggressive tilt)
      const tiltExcess = effectivePitch - FORWARD_THRESHOLD;
      const tiltFactor = Math.min(2.5, 1.0 + tiltExcess * 0.08);
      const speedDelta = SPEED_ACCELERATION_RATE * tiltFactor * 0.5; // step increment
      this.currentSpeedFloat = Math.min(MAX_SPEED, this.currentSpeedFloat + speedDelta);
    }
    // Backward Tilt / Movement: Decrease simulated vehicle speed smoothly (braking)
    else if (effectivePitch < BACKWARD_THRESHOLD) {
      const tiltExcess = Math.abs(effectivePitch - BACKWARD_THRESHOLD);
      const tiltFactor = Math.min(3.0, 1.0 + tiltExcess * 0.1);
      const speedDelta = SPEED_DECELERATION_RATE * tiltFactor * 0.6; // step decrement
      this.currentSpeedFloat = Math.max(MIN_SPEED, this.currentSpeedFloat - speedDelta);
    }

    this.imuData.simulatedSpeed = Math.round(this.currentSpeedFloat);
    this.scheduleNotify();
  }

  /**
   * Watchdog timer: checks if no ACCEL packet has arrived for 2 seconds.
   * If > 2s:
   *  - Sets status to "SIGNAL_LOST"
   *  - Stops updating speed from IMU
   */
  private startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);

    this.watchdogInterval = setInterval(() => {
      if (this.mode === 'DEMO') return;

      const timeSinceLast = Date.now() - this.imuData.lastReceivedTimestamp;
      if (this.imuData.lastReceivedTimestamp > 0 && timeSinceLast > 2000) {
        if (this.imuData.status !== 'SIGNAL_LOST') {
          this.imuData.status = 'SIGNAL_LOST';
          this.notifyUpdate();
        }
      }
    }, 250);
  }

  /**
   * Demo Simulation Loop: Generates realistic IMU packets and drives speed
   */
  public setDemoTargetTilt(pitch: number) {
    this.demoTargetPitch = pitch;
  }

  private startDemoSimulation() {
    this.stopDemoSimulation();
    this.imuData.status = 'ONLINE';
    this.imuData.lastReceivedTimestamp = Date.now();

    this.demoInterval = setInterval(() => {
      if (this.mode !== 'DEMO') return;

      // Smoothly approach target pitch
      const pitchDiff = this.demoTargetPitch - this.filteredPitch;
      const currentPitch = this.filteredPitch + pitchDiff * 0.2;

      // Calculate corresponding acceleration
      const rad = (currentPitch * Math.PI) / 180;
      const simAccelX = -Math.sin(rad) * 9.81 + (Math.random() - 0.5) * 0.08;
      const simAccelY = (Math.random() - 0.5) * 0.05;
      const simAccelZ = Math.cos(rad) * 9.81 + (Math.random() - 0.5) * 0.08;
      const simGyroX = (Math.random() - 0.5) * 0.4;
      const simGyroY = (currentPitch * 0.2) + (Math.random() - 0.5) * 0.3;
      const simGyroZ = (Math.random() - 0.5) * 0.2;

      const timestamp = new Date().toLocaleTimeString();
      this.imuData.lastUpdate = timestamp;
      this.imuData.lastReceivedTimestamp = Date.now();
      this.imuData.status = 'ONLINE';

      // Log simulated packets
      const accelLine = `ACCEL,${simAccelX.toFixed(2)},${simAccelY.toFixed(2)},${simAccelZ.toFixed(2)}`;
      const gyroLine = `GYRO,${simGyroX.toFixed(2)},${simGyroY.toFixed(2)},${simGyroZ.toFixed(2)}`;
      const tiltLine = `TILT,0.0,${currentPitch.toFixed(1)}`;

      const pLog: SerialPacketLog = {
        id: `pkt-demo-${Date.now()}`,
        timestamp,
        raw: accelLine,
        type: 'ACCEL'
      };
      this.recentPackets = [...this.recentPackets.slice(-150), pLog];
      this.packetListeners.forEach((fn) => fn(pLog));

      this.applyAccelData(simAccelX, simAccelY, simAccelZ);
      this.applyTiltData(0, currentPitch);
    }, 150);
  }

  private stopDemoSimulation() {
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
  }

  private scheduleNotify() {
    const now = Date.now();
    const currentSpeed = Math.round(this.currentSpeedFloat);
    const statusChanged = this.imuData.status !== this.lastEmittedStatus;
    const speedChanged = currentSpeed !== this.lastEmittedSpeed;

    // If status changed or speed changed or at least 100ms passed, notify immediately
    if (statusChanged || speedChanged || now - this.lastNotifyTimestamp >= 100) {
      if (this.notifyTimeoutId) {
        clearTimeout(this.notifyTimeoutId);
        this.notifyTimeoutId = null;
      }
      this.lastNotifyTimestamp = now;
      this.lastEmittedSpeed = currentSpeed;
      this.lastEmittedStatus = this.imuData.status;
      this.notifyUpdate();
      return;
    }

    // Trailing notification to ensure final resting speed is emitted
    if (!this.notifyTimeoutId) {
      this.notifyTimeoutId = setTimeout(() => {
        this.notifyTimeoutId = null;
        this.lastNotifyTimestamp = Date.now();
        this.lastEmittedSpeed = Math.round(this.currentSpeedFloat);
        this.lastEmittedStatus = this.imuData.status;
        this.notifyUpdate();
      }, 100);
    }
  }

  private notifyUpdate() {
    const currentSpeed = Math.round(this.currentSpeedFloat);
    for (const listener of this.updateListeners) {
      try {
        listener(this.imuData, currentSpeed);
      } catch (err) {
        console.error('Error in ImuUpdateListener:', err);
      }
    }
  }
}

export const imuSpeedController = new ImuSpeedController();
