import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Usb,
  Radio,
  Sliders,
  Terminal,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Gauge,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Compass,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Truck,
  FileCode
} from 'lucide-react';
import {
  Vehicle,
  Driver,
  ImuData,
  ImuCalibrationConfig,
  HardwareOperationMode,
  RfidHardwareState
} from '../types';
import { rfidSerialManager } from '../services/rfidSerial';
import {
  imuSpeedController,
  SerialPacketLog,
  DEFAULT_IMU_CONFIG
} from '../services/imuSpeedController';
import { SpduinoFirmwareModal } from './SpduinoFirmwareModal';

interface SpduinoImuToolbarProps {
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  activeVehicleId: string;
  setActiveVehicleId: (id: string) => void;
  onNotifyToast?: (type: 'success' | 'error' | 'warning', title: string, message: string) => void;
  rfidGlobalState: RfidHardwareState;
}

export const SpduinoImuToolbar: React.FC<SpduinoImuToolbarProps> = ({
  selectedVehicle,
  vehicles,
  drivers,
  activeVehicleId,
  setActiveVehicleId,
  onNotifyToast,
  rfidGlobalState
}) => {
  const isWebSerialSupported = rfidSerialManager.isSupported();

  // Connection states (Synced from global props)
  const isConnected = rfidGlobalState.spduinoConnected;
  const [isConnecting, setIsConnecting] = useState(false);
  const portLabel = rfidGlobalState.portName;
  const connectionError = rfidGlobalState.error;
  const [selectedBaudRate, setSelectedBaudRate] = useState<number>(rfidGlobalState.baudRate || 115200);


  // IMU Data & Mode State
  const [imuData, setImuData] = useState<ImuData>(imuSpeedController.getImuData());
  const [hardwareMode, setHardwareMode] = useState<HardwareOperationMode>(imuSpeedController.getMode());
  const [currentSpeed, setCurrentSpeed] = useState<number>(imuData.simulatedSpeed);

  // Panels
  const [isSerialMonitorOpen, setIsSerialMonitorOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState(false);
  const [calibrationConfig, setCalibrationConfig] = useState<ImuCalibrationConfig>(imuSpeedController.getConfig());
  const [invertPitch, setInvertPitch] = useState(imuSpeedController.getInvertPitch());
  const [recentPackets, setRecentPackets] = useState<SerialPacketLog[]>(imuSpeedController.getRecentPackets());
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Demo tilt slider state (-30 to +30 degrees pitch)
  const [demoPitch, setDemoPitch] = useState(0);

  const serialEndRef = useRef<HTMLDivElement>(null);
  const monitorContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to IMU updates (throttled at service level)
  useEffect(() => {
    const unsubImu = imuSpeedController.subscribe((data, speed) => {
      setImuData(data);
      setCurrentSpeed(speed);
    });

    return () => {
      unsubImu();
    };
  }, []);

  // Only stream packets when the serial monitor modal is actually open
  useEffect(() => {
    if (!isSerialMonitorOpen) return;

    // Load current recent packets immediately
    setRecentPackets(imuSpeedController.getRecentPackets());

    let buffer: SerialPacketLog[] = [];
    let flushInterval = setInterval(() => {
      if (buffer.length > 0) {
        const batch = [...buffer];
        buffer = [];
        setRecentPackets((prev) => [...prev.slice(-150), ...batch].slice(-150));
      }
    }, 250);

    const unsubPackets = imuSpeedController.subscribePackets((packet) => {
      buffer.push(packet);
    });

    return () => {
      clearInterval(flushInterval);
      unsubPackets();
    };
  }, [isSerialMonitorOpen]);

  // Auto-scroll serial monitor without triggering whole-page jitter
  useEffect(() => {
    if (isSerialMonitorOpen && monitorContainerRef.current) {
      monitorContainerRef.current.scrollTop = monitorContainerRef.current.scrollHeight;
    }
  }, [recentPackets.length, isSerialMonitorOpen]);

  // Toggle Mode (Hardware vs Demo)
  const handleToggleMode = (newMode: HardwareOperationMode) => {
    setHardwareMode(newMode);
    imuSpeedController.setMode(newMode);
    if (newMode === 'DEMO') {
      setDemoPitch(0);
      imuSpeedController.setDemoTargetTilt(0);
    }
    if (onNotifyToast) {
      onNotifyToast(
        newMode === 'HARDWARE' ? 'success' : 'warning',
        newMode === 'HARDWARE' ? 'Hardware Mode Active' : 'Demo Mode Active',
        newMode === 'HARDWARE'
          ? 'Reading physical GY-521 MPU6050 sensor data via SPDuino USB Serial.'
          : 'Generating simulated IMU data for testing without physical hardware.'
      );
    }
  };

  // Demo Pitch Button click
  const handleDemoPresetTilt = (pitch: number) => {
    setDemoPitch(pitch);
    imuSpeedController.setDemoTargetTilt(pitch);
  };

  // Save Calibration Config
  const handleConfigChange = (key: keyof ImuCalibrationConfig, value: number) => {
    const updated = { ...calibrationConfig, [key]: value };
    setCalibrationConfig(updated);
    imuSpeedController.updateConfig(updated);
  };

  const handleResetCalibration = () => {
    setCalibrationConfig(DEFAULT_IMU_CONFIG);
    imuSpeedController.updateConfig(DEFAULT_IMU_CONFIG);
    setInvertPitch(false);
    imuSpeedController.setInvertPitch(false);
    if (onNotifyToast) {
      onNotifyToast('info', 'Calibration Reset', 'IMU thresholds and rates restored to defaults.');
    }
  };

  const handleCopyLogs = () => {
    const text = recentPackets.map((p) => `[${p.timestamp}] ${p.raw}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) || selectedVehicle || vehicles[0];
  const assignedDriver = drivers.find((d) => d.id === activeVehicle?.driverId || d.assignedVehicleId === activeVehicle?.id);

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden mb-5">
      {/* Top Banner Row */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Device & Sensor Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white tracking-wide">
                SPDuino Hardware Interface
              </span>

              {/* Hardware / Demo Mode Badge */}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                  hardwareMode === 'HARDWARE'
                    ? 'bg-blue-950/80 text-blue-300 border-blue-700/70'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700/70 animate-pulse'
                }`}
              >
                {hardwareMode === 'HARDWARE' ? 'HARDWARE MODE' : 'DEMO MODE'}
              </span>

              {/* GY-521 Status Badge */}
              {hardwareMode === 'HARDWARE' ? (
                imuData.status === 'ONLINE' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    GY-521: ONLINE
                  </span>
                ) : imuData.status === 'SIGNAL_LOST' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-700/70 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    IMU SIGNAL LOST
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    GY-521: OFFLINE
                  </span>
                )
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SIMULATOR: ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>GY-521 (MPU6050 I2C) + RC522 (SPI) via ATmega328P</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-300">{portLabel}</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Speed Metric & Mode Switch & Connect Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap ml-auto">
          {/* Live Speed Quick Indicator */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-base text-white">{currentSpeed}</span>
                <span className="text-[10px] text-slate-400 font-mono">km/h</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-400 block tracking-tight">
                IMU SIMULATED
              </span>
            </div>
          </div>

          {/* Linked Vehicle Selector / Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">IMU Speed Target:</span>
              <span className="font-mono font-bold text-white text-xs">
                {activeVehicle?.plateNumber || 'TN-01-AB-4821'}
              </span>
            </div>
          </div>

          {/* Mode Toggle Buttons: HARDWARE MODE vs DEMO MODE */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              id="mode-hardware-btn"
              onClick={() => handleToggleMode('HARDWARE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                hardwareMode === 'HARDWARE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              HARDWARE
            </button>
            <button
              id="mode-demo-btn"
              onClick={() => handleToggleMode('DEMO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                hardwareMode === 'DEMO'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DEMO MODE
            </button>
          </div>

          {/* Baud Rate Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
            <label htmlFor="imu-baud-select" className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Baud:</label>
            <select
              id="imu-baud-select"
              disabled={isConnected}
              value={selectedBaudRate}
              onChange={(e) => setSelectedBaudRate(Number(e.target.value))}
              className="bg-transparent border-none p-0 text-xs text-white focus:ring-0 cursor-pointer disabled:opacity-50"
            >
              <option value="4800">4800</option>
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="115200">115200</option>
            </select>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              isConnected 
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' 
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}>
              <Usb className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">
                  Hardware {isConnected ? 'Active' : 'Standby'}
                </span>
                {isConnected && (
                  <span className="text-[9px] font-mono font-bold mt-0.5 opacity-80">
                    {rfidGlobalState.baudRate} baud • {rfidGlobalState.diagnostics?.imuSampleRate || 0} Hz
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Monitor / Calibration toggles */}
          <button
            onClick={() => setIsCalibrationOpen(!isCalibrationOpen)}
            title="Configure IMU Calibration Constants"
            className={`p-2 rounded-xl text-xs border transition-colors ${
              isCalibrationOpen
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSerialMonitorOpen(!isSerialMonitorOpen)}
            title="Open Hardware Serial Debug Monitor"
            className={`p-2 rounded-xl text-xs border transition-colors ${
              isSerialMonitorOpen
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* View & Copy SPDuino Firmware Code */}
          <button
            onClick={() => setIsFirmwareModalOpen(true)}
            title="View & Copy SPDuino / Arduino Firmware Code"
            className="px-2.5 py-2 rounded-xl text-xs border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline font-semibold">Arduino Code</span>
          </button>
        </div>
      </div>

      {/* Error alert banner if any */}
      {connectionError && (
        <div className="bg-rose-950/70 border-b border-rose-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{connectionError}</span>
          </div>
        </div>
      )}

      {/* Demo Mode Interactive Testing Bar (When Demo Mode is Active) */}
      {hardwareMode === 'DEMO' && (
        <div className="bg-amber-950/30 border-b border-amber-800/40 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Demo IMU Tilt Controller:
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Simulate forward acceleration and backward braking tilt angles:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick tilt buttons */}
            <button
              onClick={() => handleDemoPresetTilt(-15)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 flex items-center gap-1 font-semibold"
            >
              <ArrowDown className="w-3 h-3 text-rose-400" />
              <span>Tilt Back (-15° Brake)</span>
            </button>

            <button
              onClick={() => handleDemoPresetTilt(0)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold"
            >
              <span>Level (0° Hold)</span>
            </button>

            <button
              onClick={() => handleDemoPresetTilt(18)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center gap-1 font-semibold"
            >
              <ArrowUp className="w-3 h-3 text-emerald-400" />
              <span>Tilt Forward (+18° Accel)</span>
            </button>

            {/* Slider */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">Tilt:</span>
              <input
                type="range"
                min="-25"
                max="25"
                step="1"
                value={demoPitch}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDemoPitch(val);
                  imuSpeedController.setDemoTargetTilt(val);
                }}
                className="w-24 sm:w-32 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-white text-[11px] w-12 text-right">
                {demoPitch > 0 ? `+${demoPitch}°` : `${demoPitch}°`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Calibration Panel */}
      {isCalibrationOpen && (
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-white">IMU Sensor Calibration & Speed Tuning</span>
              <span className="text-slate-400 text-[11px]">(Frontend Configurable Constants)</span>
            </div>
            <button
              onClick={handleResetCalibration}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                FORWARD_THRESHOLD (°)
              </label>
              <input
                type="number"
                step="0.1"
                value={calibrationConfig.FORWARD_THRESHOLD}
                onChange={(e) => handleConfigChange('FORWARD_THRESHOLD', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">Tilt &gt; threshold accels</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                BACKWARD_THRESHOLD (°)
              </label>
              <input
                type="number"
                step="0.1"
                value={calibrationConfig.BACKWARD_THRESHOLD}
                onChange={(e) => handleConfigChange('BACKWARD_THRESHOLD', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">Tilt &lt; threshold brakes</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                IMU_DEADZONE (°)
              </label>
              <input
                type="number"
                step="0.1"
                value={calibrationConfig.IMU_DEADZONE}
                onChange={(e) => handleConfigChange('IMU_DEADZONE', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">Noise deadband</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                ACCEL_RATE (km/h)
              </label>
              <input
                type="number"
                step="0.1"
                value={calibrationConfig.SPEED_ACCELERATION_RATE}
                onChange={(e) => handleConfigChange('SPEED_ACCELERATION_RATE', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">Step increase rate</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                DECEL_RATE (km/h)
              </label>
              <input
                type="number"
                step="0.1"
                value={calibrationConfig.SPEED_DECELERATION_RATE}
                onChange={(e) => handleConfigChange('SPEED_DECELERATION_RATE', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">Step braking rate</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                MAX_SPEED (km/h)
              </label>
              <input
                type="number"
                value={calibrationConfig.MAX_SPEED}
                onChange={(e) => handleConfigChange('MAX_SPEED', parseInt(e.target.value) || 80)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">Demo ceiling (default 80)</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                INVERT AXIS
              </label>
              <button
                type="button"
                onClick={() => {
                  const inv = !invertPitch;
                  setInvertPitch(inv);
                  imuSpeedController.setInvertPitch(inv);
                }}
                className={`w-full py-1 px-2 rounded-lg font-bold border text-xs transition-colors ${
                  invertPitch
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {invertPitch ? 'Inverted' : 'Standard'}
              </button>
              <span className="text-[9px] text-slate-500 mt-0.5 block">If sensor is flipped</span>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Hardware Serial Monitor */}
      {isSerialMonitorOpen && (
        <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold font-mono">Hardware Serial Monitor (9600 baud)</span>
              <span className="text-slate-500 text-[11px]">
                Showing ACCEL, GYRO, TILT & RFID stream
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedLogs ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={() => imuSpeedController.clearRecentPackets()}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div
            ref={monitorContainerRef}
            className="bg-slate-900 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[11px] border border-slate-800 space-y-1"
          >
            {recentPackets.length === 0 ? (
              <p className="text-slate-600 italic">
                Awaiting serial packets from SPDuino... Click "Connect SPDuino" or switch to "DEMO MODE".
              </p>
            ) : (
              recentPackets.map((pkt) => (
                <div key={pkt.id} className="flex items-center gap-2 leading-relaxed">
                  <span className="text-slate-600 text-[10px] shrink-0">[{pkt.timestamp}]</span>
                  <span
                    className={`font-bold px-1 py-0.2 rounded text-[9px] uppercase shrink-0 ${
                      pkt.type === 'ACCEL'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : pkt.type === 'GYRO'
                        ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        : pkt.type === 'TILT'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : pkt.type === 'RFID'
                        ? 'bg-purple-950 text-purple-400 border border-purple-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {pkt.type}
                  </span>
                  <span
                    className={
                      pkt.type === 'ACCEL'
                        ? 'text-blue-300'
                        : pkt.type === 'GYRO'
                        ? 'text-indigo-300'
                        : pkt.type === 'TILT'
                        ? 'text-emerald-300'
                        : pkt.type === 'RFID'
                        ? 'text-purple-300 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {pkt.raw}
                  </span>
                </div>
              ))
            )}
            <div ref={serialEndRef} />
          </div>
        </div>
      )}

      {/* SPDuino / Arduino Firmware Viewer Modal */}
      <SpduinoFirmwareModal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
      />
    </div>
  );
};
