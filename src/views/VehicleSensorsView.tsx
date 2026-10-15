import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Compass,
  Cpu,
  Download,
  Droplets,
  Pause,
  Play,
  Radio,
  Settings2,
  ShieldAlert,
  Sliders,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  esp32SensorService,
  Esp32SensorSystemState
} from '../services/esp32SensorService';
import {
  AxisMappingOption,
  DrivingEventState
} from '../types';

const AXIS_OPTIONS: AxisMappingOption[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

function formatMetric(
  value: number | null | undefined,
  decimals: number,
  isConnected: boolean
): string {
  if (!isConnected || value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

function getDrivingStateBadge(state: DrivingEventState) {
  switch (state) {
    case 'harsh_braking':
      return {
        label: 'HARSH BRAKING',
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
        dot: 'bg-rose-500 animate-ping'
      };
    case 'harsh_acceleration':
      return {
        label: 'HARSH ACCELERATION',
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
        dot: 'bg-amber-500 animate-ping'
      };
    case 'harsh_cornering':
      return {
        label: 'HARSH CORNERING',
        bg: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
        dot: 'bg-orange-500 animate-ping'
      };
    case 'excessive_vibration':
      return {
        label: 'EXCESSIVE VIBRATION',
        bg: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
        dot: 'bg-purple-500 animate-ping'
      };
    default:
      return {
        label: 'NORMAL DRIVING',
        bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
        dot: 'bg-emerald-500'
      };
  }
}

export const VehicleSensorsView: React.FC = () => {
  const [sensorState, setSensorState] = useState<Esp32SensorSystemState>(() =>
    esp32SensorService.getState()
  );
  const [isGraphPaused, setIsGraphPaused] = useState(false);
  const [pausedChartData, setPausedChartData] = useState<Esp32SensorSystemState['liveChartBuffer']>([]);
  const [timeWindowSec, setTimeWindowSec] = useState<30 | 60 | 120 | 300>(60);
  const [accelChartMode, setAccelChartMode] = useState<'raw' | 'linear'>('raw');
  const [eventFilter, setEventFilter] = useState<'ALL' | Exclude<DrivingEventState, 'normal'>>('ALL');
  const [demoScenario, setDemoScenario] = useState<DrivingEventState>('normal');
  const [calibrationNotice, setCalibrationNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = esp32SensorService.subscribe((nextState) => {
      setSensorState(nextState);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isGraphPaused) {
      setPausedChartData(sensorState.liveChartBuffer);
    }
  }, [sensorState.liveChartBuffer, isGraphPaused]);

  const activeChartData = useMemo(() => {
    const source = isGraphPaused ? pausedChartData : sensorState.liveChartBuffer;
    const cutoffMs = Date.now() - timeWindowSec * 1000;
    const filtered = source.filter((pt) => pt.timestampMs >= cutoffMs);
    return filtered.length > 0 ? filtered : source.slice(-60);
  }, [isGraphPaused, pausedChartData, sensorState.liveChartBuffer, timeWindowSec]);

  const imu = sensorState.latestPayload.imu;
  const fuel = sensorState.latestPayload.fuel;
  const events = sensorState.latestPayload.events;
  const orient = sensorState.orientationConfig;
  const thresh = sensorState.thresholds;
  const fuelCal = sensorState.fuelCalibration;
  const retention = sensorState.retentionConfig;

  const isImuConnected =
    sensorState.connectionState === 'connected' && imu.status === 'connected';
  const isFuelConnected =
    sensorState.connectionState === 'connected' && fuel.status === 'connected';

  const drivingBadge = getDrivingStateBadge(events.driving_state);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'ALL') return sensorState.eventHistory;
    return sensorState.eventHistory.filter((e) => e.type === eventFilter);
  }, [sensorState.eventHistory, eventFilter]);

  const handleDownloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCalibrateZeroOffset = () => {
    const ok = esp32SensorService.calibrateCurrentImuZeroOffset();
    if (ok) {
      setCalibrationNotice('Zero-offset bias calibrated from current stationary IMU reading & orientation marked calibrated.');
    } else {
      setCalibrationNotice('Cannot calibrate zero-offset while BNO085 IMU is disconnected. Connect ESP32 or enable Bench Demo first.');
    }
    setTimeout(() => setCalibrationNotice(null), 4500);
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          A. SYSTEM STATUS & ESP32 WI-FI TELEMETRY HEADER
      ===================================================================== */}
      <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                sensorState.connectionState === 'connected'
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                  : sensorState.connectionState === 'stale'
                  ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {sensorState.connectionState === 'connected' ? (
                <Wifi className="w-5 h-5" />
              ) : (
                <WifiOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  ESP32 Real-Time Telemetry Link (BNO085 IMU + Ultrasonic Fuel)
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider border ${
                    sensorState.connectionState === 'connected'
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : sensorState.connectionState === 'stale'
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                      : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {sensorState.connectionState === 'connected'
                    ? 'LIVE STREAM ACTIVE'
                    : sensorState.connectionState === 'stale'
                    ? 'DATA STALE'
                    : 'ESP32 DISCONNECTED'}
                </span>
                {sensorState.mode === 'LABELED_DEMO' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                    BENCH DEMO (SIMULATED)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ESP32 DevKit V1 → BNO085 9-DOF IMU (I²C GPIO 21/22) + Ultrasonic Sensor (GPIO 5/34) → Wi-Fi HTTP POST / SSE
              </p>
            </div>
          </div>

          {/* Mode Selector (Live Hardware Default vs Labeled Bench Demo) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => esp32SensorService.setMode('LIVE_WIFI')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                sensorState.mode === 'LIVE_WIFI'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live ESP32 Wi-Fi</span>
            </button>
            <button
              type="button"
              onClick={() => esp32SensorService.setMode('LABELED_DEMO', demoScenario)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                sensorState.mode === 'LABELED_DEMO'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Labeled Bench Demo</span>
            </button>
            {sensorState.mode === 'LABELED_DEMO' && (
              <select
                value={demoScenario}
                onChange={(e) => {
                  const next = e.target.value as DrivingEventState;
                  setDemoScenario(next);
                  esp32SensorService.setMode('LABELED_DEMO', next);
                }}
                className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="normal">Scenario: Normal Driving</option>
                <option value="harsh_braking">Scenario: Harsh Braking</option>
                <option value="harsh_acceleration">Scenario: Harsh Acceleration</option>
                <option value="harsh_cornering">Scenario: Harsh Cornering</option>
                <option value="excessive_vibration">Scenario: Excessive Vibration</option>
              </select>
            )}
          </div>
        </div>

        {/* Top 6 KPI Status Cards matching OverviewDashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">ESP32 Device ID</span>
            <span className="text-sm font-bold font-mono text-white mt-1 block truncate">
              {sensorState.deviceId}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">IP / Signal (RSSI)</span>
            <span className="text-sm font-bold font-mono text-sky-400 mt-1 block truncate">
              {sensorState.ipAddress}{' '}
              {sensorState.wifiRssiDbm !== null ? `(${sensorState.wifiRssiDbm} dBm)` : ''}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">Last Packet Time</span>
            <span className="text-sm font-bold font-mono text-white mt-1 block">
              {sensorState.lastReceivedIso
                ? new Date(sensorState.lastReceivedIso).toLocaleTimeString()
                : 'No packet yet'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">Freshness / Packets</span>
            <span className="text-sm font-bold font-mono text-slate-200 mt-1 block">
              {sensorState.dataAgeMs !== null
                ? `${(sensorState.dataAgeMs / 1000).toFixed(1)}s ago`
                : '—'}{' '}
              <span className="text-xs text-slate-400">({sensorState.packetsReceived})</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">BNO085 IMU Status</span>
            <span
              className={`text-sm font-bold font-mono uppercase mt-1 block ${
                imu.status === 'connected'
                  ? 'text-emerald-400'
                  : imu.status === 'out_of_range'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {imu.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">Ultrasonic Status</span>
            <span
              className={`text-sm font-bold font-mono uppercase mt-1 block ${
                fuel.status === 'connected'
                  ? 'text-emerald-400'
                  : fuel.status === 'out_of_range'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {fuel.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          B. LIVE BNO085 IMU MONITORING SECTION
      ===================================================================== */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Live BNO085 9-DOF IMU Telemetry
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    isImuConnected
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                      : 'bg-rose-950/60 text-rose-400 border-rose-700/60'
                  }`}
                >
                  {isImuConnected ? 'I²C 0x4A ONLINE' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Raw accelerometer includes Earth gravity (~9.81 m/s²). Linear acceleration uses BNO085 SH-2 gravity vector compensation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {([30, 60, 120, 300] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTimeWindowSec(sec)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    timeWindowSec === sec
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsGraphPaused((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                isGraphPaused
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isGraphPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-400" /> Resume Stream
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-400" /> Pause Stream
                </>
              )}
            </button>
          </div>
        </div>

        {/* Numeric Cards Grid: Raw Accel, Linear Accel, Gyroscope, Orientation */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. Raw Accelerometer (Includes Gravity) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Raw Accelerometer (Gravity)
              </span>
              <span className="text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                m/s²
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">
                  {orient.isCalibrated ? `X (${orient.longitudinalAxis})` : 'Sensor X'}
                </span>
                <span className="font-mono text-lg font-bold text-white mt-0.5 block">
                  {formatMetric(imu.accel_x, 2, isImuConnected)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">
                  {orient.isCalibrated ? `Y (${orient.lateralAxis})` : 'Sensor Y'}
                </span>
                <span className="font-mono text-lg font-bold text-white mt-0.5 block">
                  {formatMetric(imu.accel_y, 2, isImuConnected)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">
                  {orient.isCalibrated ? `Z (${orient.verticalAxis})` : 'Sensor Z'}
                </span>
                <span className="font-mono text-lg font-bold text-white mt-0.5 block">
                  {formatMetric(imu.accel_z, 2, isImuConnected)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5">
              Includes ~9.81 m/s² gravitational acceleration vector.
            </p>
          </div>

          {/* 2. Gravity-Compensated Linear Acceleration */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Linear Acceleration (No Gravity)
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                m/s²
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Lin X</span>
                <span className="font-mono text-lg font-bold text-emerald-400 mt-0.5 block">
                  {formatMetric(imu.lin_accel_x, 2, isImuConnected)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Lin Y</span>
                <span className="font-mono text-lg font-bold text-emerald-400 mt-0.5 block">
                  {formatMetric(imu.lin_accel_y, 2, isImuConnected)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Lin Z</span>
                <span className="font-mono text-lg font-bold text-emerald-400 mt-0.5 block">
                  {formatMetric(imu.lin_accel_z, 2, isImuConnected)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5">
              Gravity-compensated dynamic motion (SH2_LINEAR_ACCELERATION).
            </p>
          </div>

          {/* 3. Gyroscope Angular Velocity */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Gyroscope Angular Velocity
              </span>
              <span className="text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                °/s (deg/s)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Gyro X</span>
                <span className="font-mono text-lg font-bold text-purple-300 mt-0.5 block">
                  {formatMetric(imu.gyro_x, 1, isImuConnected)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Gyro Y</span>
                <span className="font-mono text-lg font-bold text-purple-300 mt-0.5 block">
                  {formatMetric(imu.gyro_y, 1, isImuConnected)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Gyro Z (Yaw)</span>
                <span className="font-mono text-lg font-bold text-purple-300 mt-0.5 block">
                  {formatMetric(imu.gyro_z, 1, isImuConnected)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5">
              Calibrated 3-axis rotational velocity around X, Y, Z axes.
            </p>
          </div>

          {/* 4. Euler Orientation (Roll, Pitch, Yaw) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Quaternion Euler Attitude
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                deg (°)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Roll</span>
                <span className="font-mono text-lg font-bold text-amber-400 mt-0.5 block">
                  {formatMetric(imu.roll, 1, isImuConnected)}°
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Pitch</span>
                <span className="font-mono text-lg font-bold text-amber-400 mt-0.5 block">
                  {formatMetric(imu.pitch, 1, isImuConnected)}°
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Yaw</span>
                <span className="font-mono text-lg font-bold text-amber-400 mt-0.5 block">
                  {formatMetric(imu.yaw, 1, isImuConnected)}°
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5">
              Rotation Vector • Sampled at{' '}
              {sensorState.lastReceivedIso
                ? new Date(sensorState.lastReceivedIso).toLocaleTimeString()
                : '—'}
            </p>
          </div>
        </div>

        {/* Scrolling Line Charts for Acceleration and Angular Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Acceleration Line Chart */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-white">
                  Real-Time 3-Axis Acceleration ({accelChartMode === 'raw' ? 'Raw m/s²' : 'Linear m/s²'})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Scrolling window: last {timeWindowSec}s • Units: m/s²
                </p>
              </div>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAccelChartMode('raw')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    accelChartMode === 'raw'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Raw Accel
                </button>
                <button
                  type="button"
                  onClick={() => setAccelChartMode('linear')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    accelChartMode === 'linear'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Linear Accel
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    label={{
                      value: 'm/s²',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: '#94a3b8' }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                  <Line
                    type="monotone"
                    dataKey={accelChartMode === 'raw' ? 'accel_x' : 'lin_accel_x'}
                    name="X-Axis (m/s²)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={accelChartMode === 'raw' ? 'accel_y' : 'lin_accel_y'}
                    name="Y-Axis (m/s²)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={accelChartMode === 'raw' ? 'accel_z' : 'lin_accel_z'}
                    name="Z-Axis (m/s²)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gyroscope Angular Velocity Line Chart */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-white">
                  Real-Time 3-Axis Gyroscope Angular Velocity (°/s)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Scrolling window: last {timeWindowSec}s • Units: deg/s (°/s)
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {activeChartData.length} samples plotted
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    label={{
                      value: 'deg/s',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 11, fill: '#94a3b8' }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                  <Line
                    type="monotone"
                    dataKey="gyro_x"
                    name="Gyro X (°/s)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="gyro_y"
                    name="Gyro Y (°/s)"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="gyro_z"
                    name="Gyro Z Yaw (°/s)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          C. HARSH DRIVING EVENT DETECTION & MOUNTING ORIENTATION CALIBRATION
      ===================================================================== */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Harsh Driving Event Detection Module
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Configurable Threshold & Persistence Prototype Detector
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Classifies Harsh Braking, Harsh Acceleration, Harsh Cornering, Excessive Vibration, and Normal Driving using EMA filtering & persistence.
              </p>
            </div>
          </div>

          {/* Current Driving Status Banner */}
          <div
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs ${drivingBadge.bg}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${drivingBadge.dot}`} />
            <span>STATUS: {drivingBadge.label}</span>
          </div>
        </div>

        {/* Mounting Orientation Calibration Warning if Uncalibrated */}
        {!orient.isCalibrated && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <p className="font-bold text-amber-300">
                  Mounting Orientation Not Yet Calibrated
                </p>
                <p className="mt-0.5 text-slate-300">
                  Directional Longitudinal Braking/Acceleration and Lateral Cornering classifications remain locked until the BNO085 mounting orientation in the truck cabin is confirmed below.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => esp32SensorService.updateOrientationConfig({ isCalibrated: true })}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Confirm Axis Orientation
            </button>
          </div>
        )}

        {calibrationNotice && (
          <div className="bg-blue-950/60 border border-blue-500/40 text-blue-200 text-xs font-mono px-4 py-2.5 rounded-xl">
            {calibrationNotice}
          </div>
        )}

        {/* Trip Event Counters + Latest Detected Event */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/30">
            <span className="text-xs text-rose-400 font-semibold block">Harsh Braking</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {sensorState.tripEventCounts.harsh_braking}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30">
            <span className="text-xs text-amber-400 font-semibold block">Harsh Acceleration</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {sensorState.tripEventCounts.harsh_acceleration}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-orange-500/30">
            <span className="text-xs text-orange-400 font-semibold block">Harsh Cornering</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {sensorState.tripEventCounts.harsh_cornering}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-purple-500/30">
            <span className="text-xs text-purple-400 font-semibold block">Excessive Vibration</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {sensorState.tripEventCounts.excessive_vibration}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">Latest Detected Event</span>
            {events.latest_event ? (
              <div className="mt-1">
                <span className="text-xs font-bold font-mono text-white uppercase block truncate">
                  {events.latest_event.type.replace(/_/g, ' ')} ({events.latest_event.severity})
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {events.latest_event.peak_accel_mps2} m/s² •{' '}
                  {new Date(events.latest_event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono font-semibold text-emerald-400 mt-1 block">
                None this trip
              </span>
            )}
          </div>
        </div>

        {/* Orientation Calibration & Threshold Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mounting Orientation & Zero-Offset Panel */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white">
                  Mounting Orientation & Axis Calibration
                </h4>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orient.isCalibrated}
                  onChange={(e) =>
                    esp32SensorService.updateOrientationConfig({
                      isCalibrated: e.target.checked
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                Orientation Calibrated
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Longitudinal (Forward)
                </label>
                <select
                  value={orient.longitudinalAxis}
                  onChange={(e) =>
                    esp32SensorService.updateOrientationConfig({
                      longitudinalAxis: e.target.value as AxisMappingOption
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {AXIS_OPTIONS.map((ax) => (
                    <option key={ax} value={ax}>
                      Sensor {ax}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Lateral (Left/Right)
                </label>
                <select
                  value={orient.lateralAxis}
                  onChange={(e) =>
                    esp32SensorService.updateOrientationConfig({
                      lateralAxis: e.target.value as AxisMappingOption
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {AXIS_OPTIONS.map((ax) => (
                    <option key={ax} value={ax}>
                      Sensor {ax}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Vertical (Up/Gravity)
                </label>
                <select
                  value={orient.verticalAxis}
                  onChange={(e) =>
                    esp32SensorService.updateOrientationConfig({
                      verticalAxis: e.target.value as AxisMappingOption
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {AXIS_OPTIONS.map((ax) => (
                    <option key={ax} value={ax}>
                      Sensor {ax}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
              <div className="text-slate-400 font-mono text-[11px]">
                Zero Offsets: dX={orient.accelBiasX} dY={orient.accelBiasY} dZ={orient.accelBiasZ} m/s²
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCalibrateZeroOffset}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  Tare Stationary Zero-Offset
                </button>
                <button
                  type="button"
                  onClick={() =>
                    esp32SensorService.updateOrientationConfig({
                      accelBiasX: 0,
                      accelBiasY: 0,
                      accelBiasZ: 0
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Reset Bias
                </button>
              </div>
            </div>
          </div>

          {/* Configurable Thresholds & Persistence Filter Panel */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">
                  Configurable Truck Event Thresholds & Persistence
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Multi-sample noise rejection
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Harsh Braking (m/s²)
                </label>
                <input
                  type="number"
                  step="0.2"
                  max="-0.5"
                  value={thresh.harshBrakingMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({
                      harshBrakingMps2: parseFloat(e.target.value) || -3.5
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Harsh Accel (m/s²)
                </label>
                <input
                  type="number"
                  step="0.2"
                  min="0.5"
                  value={thresh.harshAccelerationMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({
                      harshAccelerationMps2: parseFloat(e.target.value) || 3.2
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Cornering Accel (m/s²)
                </label>
                <input
                  type="number"
                  step="0.2"
                  min="0.5"
                  value={thresh.harshCorneringMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({
                      harshCorneringMps2: parseFloat(e.target.value) || 3.0
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Cornering Gyro (°/s)
                </label>
                <input
                  type="number"
                  step="2"
                  min="5"
                  value={thresh.harshCorneringGyroDps}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({
                      harshCorneringGyroDps: parseFloat(e.target.value) || 42.0
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Vibration RMS (m/s²)
                </label>
                <input
                  type="number"
                  step="0.2"
                  min="0.5"
                  value={thresh.excessiveVibrationRmsMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({
                      excessiveVibrationRmsMps2: parseFloat(e.target.value) || 4.2
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Persistence (Samples)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="20"
                  value={thresh.minPersistenceSamples}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({
                      minPersistenceSamples: Math.max(1, parseInt(e.target.value, 10) || 3)
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event History Log Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white">
              Detected Driving Event History ({filteredEvents.length})
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                className="text-xs border border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-900 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Event Types</option>
                <option value="harsh_braking">Harsh Braking</option>
                <option value="harsh_acceleration">Harsh Acceleration</option>
                <option value="harsh_cornering">Harsh Cornering</option>
                <option value="excessive_vibration">Excessive Vibration</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  handleDownloadCsv(
                    esp32SensorService.exportEventsToCsv(),
                    `fleetlogix_driving_events_${Date.now()}.csv`
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Export Events CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Event Classification</th>
                  <th className="py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">Peak Accel (m/s²)</th>
                  <th className="py-2.5 px-3 font-semibold">Peak Gyro (°/s)</th>
                  <th className="py-2.5 px-3 font-semibold">Calibrated Axis</th>
                  <th className="py-2.5 px-3 font-semibold">Detector Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No harsh driving events recorded in the current log.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 15).map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 font-bold uppercase text-white">
                        {ev.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            ev.severity === 'critical' || ev.severity === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : ev.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-200">
                        {ev.peak_accel_mps2} m/s²
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">
                        {ev.peak_gyro_dps} °/s
                      </td>
                      <td className="py-2 px-3 text-slate-300">{ev.axis_label}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                        {ev.detector_type}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =====================================================================
          D. ULTRASONIC FUEL-LEVEL MONITORING & TANK CALIBRATION SECTION
      ===================================================================== */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Ultrasonic Fuel-Level Telemetry & Tank Calibration
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    fuel.status === 'connected'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                      : fuel.status === 'out_of_range'
                      ? 'bg-amber-950/60 text-amber-400 border-amber-700/60'
                      : 'bg-rose-950/60 text-rose-400 border-rose-700/60'
                  }`}
                >
                  {fuel.status.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Measures top-down ultrasonic distance (cm) to liquid surface with median + moving-average slosh filtering.
              </p>
            </div>
          </div>

          {fuel.low_fuel_warning && isFuelConnected && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              LOW FUEL WARNING: Level below {fuelCal.lowFuelThresholdPercent}% threshold!
            </div>
          )}
        </div>

        {/* Prototype Tank Safety Warning Callout */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">Prototype Bench / Water Container Safety Notice: </span>
            Standard open-air ultrasonic transducers (HC-SR04 / JSN-SR04T) are designed for safe bench test containers using water or non-flammable liquids. Real vehicle fuel tanks require intrinsically safe, fuel-vapor-rated sensors and slosh baffling.
          </div>
        </div>

        {fuel.error_message && (
          <div className="bg-amber-950/50 border border-amber-500/40 text-amber-200 rounded-xl p-3 text-xs font-mono">
            Sensor Diagnostic: {fuel.error_message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Fuel Tank Gauge + Key Metrics */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Tank Level Gauge
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Updated:{' '}
                {sensorState.lastReceivedIso
                  ? new Date(sensorState.lastReceivedIso).toLocaleTimeString()
                  : '—'}
              </span>
            </div>

            <div className="flex items-center gap-6 my-2">
              {/* Vertical Visual Tank Bar */}
              <div className="w-16 h-44 rounded-2xl border-2 border-slate-700 bg-slate-900 p-1.5 flex flex-col justify-end relative overflow-hidden shadow-inner">
                <div
                  className={`w-full rounded-xl transition-all duration-500 ${
                    !isFuelConnected || fuel.level_percent === null
                      ? 'bg-slate-800'
                      : fuel.low_fuel_warning
                      ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  }`}
                  style={{
                    height: `${
                      isFuelConnected && fuel.level_percent !== null
                        ? Math.max(4, Math.min(100, fuel.level_percent))
                        : 0
                    }%`
                  }}
                />
              </div>

              <div className="space-y-3 flex-1">
                <div>
                  <span className="text-xs text-slate-400 block">Estimated Fuel Level</span>
                  <span className="text-3xl font-bold font-mono text-white mt-0.5 block">
                    {isFuelConnected && fuel.level_percent !== null
                      ? `${fuel.level_percent.toFixed(1)}%`
                      : 'DISCONNECTED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block">Filtered Distance</span>
                    <span className="font-mono font-bold text-sky-400 text-sm">
                      {isFuelConnected && fuel.distance_cm !== null
                        ? `${fuel.distance_cm.toFixed(2)} cm`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated Volume</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {!fuelCal.isTankGeometryCalibrated
                        ? 'Uncalibrated'
                        : isFuelConnected && fuel.volume_litres !== null
                        ? `${fuel.volume_litres.toFixed(1)} L`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 mt-3 pt-3 border-t border-slate-800 flex justify-between">
              <span>Full: {fuelCal.fullDistanceCm} cm</span>
              <span>Empty: {fuelCal.emptyDistanceCm} cm</span>
              <span>Filter: {fuelCal.smoothingWindowSize} pkts</span>
            </div>
          </div>

          {/* Tank Geometry & Ultrasonic Calibration Controls */}
          <div className="lg:col-span-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white">
                Tank Geometry & Ultrasonic Calibration Parameters
              </h4>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fuelCal.isTankGeometryCalibrated}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({
                        isTankGeometryCalibrated: e.target.checked
                      })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-emerald-600"
                  />
                  Tank Capacity Known (Show Litres)
                </label>
                <label className="flex items-center gap-1.5 font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fuelCal.useCalibrationTable}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({
                        useCalibrationTable: e.target.checked
                      })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-emerald-600"
                  />
                  Use Non-Linear Lookup Table
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Empty Tank Distance (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="400"
                  value={fuelCal.emptyDistanceCm}
                  onChange={(e) =>
                    esp32SensorService.updateFuelCalibration({
                      emptyDistanceCm: parseFloat(e.target.value) || 45.0
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Full Tank Distance (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="200"
                  value={fuelCal.fullDistanceCm}
                  onChange={(e) =>
                    esp32SensorService.updateFuelCalibration({
                      fullDistanceCm: parseFloat(e.target.value) || 5.0
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Tank Capacity (Litres)
                </label>
                <input
                  type="number"
                  step="5"
                  min="1"
                  value={fuelCal.tankCapacityLitres || 300}
                  onChange={(e) =>
                    esp32SensorService.updateFuelCalibration({
                      tankCapacityLitres: parseFloat(e.target.value) || 300
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Low-Fuel Alert Threshold (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="50"
                  value={fuelCal.lowFuelThresholdPercent}
                  onChange={(e) =>
                    esp32SensorService.updateFuelCalibration({
                      lowFuelThresholdPercent: parseFloat(e.target.value) || 20
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Slosh Filter Window (Samples)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="15"
                  value={fuelCal.smoothingWindowSize}
                  onChange={(e) =>
                    esp32SensorService.updateFuelCalibration({
                      smoothingWindowSize: Math.max(1, parseInt(e.target.value, 10) || 5)
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Valid Range (Min–Max cm)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={fuelCal.minValidDistanceCm}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({
                        minValidDistanceCm: parseFloat(e.target.value) || 2.0
                      })
                    }
                    className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2 py-1.5 font-mono focus:outline-none"
                  />
                  <span className="text-slate-500">–</span>
                  <input
                    type="number"
                    value={fuelCal.maxValidDistanceCm}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({
                        maxValidDistanceCm: parseFloat(e.target.value) || 400.0
                      })
                    }
                    className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2 py-1.5 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] text-slate-400 font-mono">
              Formula (Linear Vertical Tank): Fuel % = clamp(((Empty_cm - Measured_cm) / (Empty_cm - Full_cm)) × 100, 0, 100)
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          E. HISTORICAL TELEMETRY ARCHIVE, RETENTION POLICY & CSV EXPORT
      ===================================================================== */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Historical Sensor Trend & Bounded Storage Policy
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Downsamples high-frequency IMU streams to a bounded interval ({retention.storageIntervalMs} ms) with a cap of {retention.maxHistoricalSamples} historical records.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleDownloadCsv(
                  esp32SensorService.exportHistoryToCsv(),
                  `fleetlogix_sensor_history_${Date.now()}.csv`
                )
              }
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export Sensor History CSV ({sensorState.historicalSamples.length})
            </button>
            <button
              type="button"
              onClick={() => esp32SensorService.clearTripCountersAndHistory()}
              className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History & Counters
            </button>
          </div>
        </div>

        {/* Retention Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">
              Historical Storage Interval (ms)
            </label>
            <input
              type="number"
              step="500"
              min="500"
              max="60000"
              value={retention.storageIntervalMs}
              onChange={(e) =>
                esp32SensorService.updateRetentionConfig({
                  storageIntervalMs: Math.max(500, parseInt(e.target.value, 10) || 2000)
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium block mb-1">
              Max Stored Historical Samples
            </label>
            <input
              type="number"
              step="100"
              min="100"
              max="5000"
              value={retention.maxHistoricalSamples}
              onChange={(e) =>
                esp32SensorService.updateRetentionConfig({
                  maxHistoricalSamples: Math.max(100, parseInt(e.target.value, 10) || 1500)
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium block mb-1">
              ESP32 Stale Heartbeat Timeout (ms)
            </label>
            <input
              type="number"
              step="500"
              min="2000"
              max="30000"
              value={retention.staleTimeoutMs}
              onChange={(e) =>
                esp32SensorService.updateRetentionConfig({
                  staleTimeoutMs: Math.max(2000, parseInt(e.target.value, 10) || 5000)
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Fuel Level & Ultrasonic Distance Historical Chart */}
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensorState.historicalSamples.slice(-100)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="left" domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="level_percent"
                name="Fuel Level (%)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="distance_cm"
                name="Ultrasonic Distance (cm)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
