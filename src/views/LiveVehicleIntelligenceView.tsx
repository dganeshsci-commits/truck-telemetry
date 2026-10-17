import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BatteryCharging,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Cpu,
  Download,
  Droplets,
  Eye,
  FileSpreadsheet,
  FileText,
  Gauge,
  HardDrive,
  Info,
  MapPin,
  Maximize2,
  Navigation,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  SlidersHorizontal,
  Target,
  Thermometer,
  Truck,
  UserCheck,
  UserX,
  Volume2,
  Wifi,
  WifiOff,
  XCircle,
  Zap
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
  DrivingEventState,
  StandardTelemetryPayload
} from '../types';

interface LiveVehicleIntelligenceViewProps {
  onNotifyToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const LiveVehicleIntelligenceView: React.FC<LiveVehicleIntelligenceViewProps> = ({
  onNotifyToast
}) => {
  const [systemState, setSystemState] = useState<Esp32SensorSystemState>(
    esp32SensorService.getState()
  );
  const [telemetry, setTelemetry] = useState<StandardTelemetryPayload>(
    esp32SensorService.getStandardTelemetry()
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<'10s' | '30s' | '60s' | 'all'>('30s');
  const [showLinearAccel, setShowLinearAccel] = useState(true);
  const [isCalibratingBias, setIsCalibratingBias] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [eventFilter, setEventFilter] = useState<'all' | DrivingEventState>('all');
  const [eventSeverityFilter, setEventSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Subscribe to real-time sensor service updates
  useEffect(() => {
    const unsub = esp32SensorService.subscribe((s) => {
      setSystemState(s);
      setTelemetry(esp32SensorService.getStandardTelemetry());
    });
    return () => unsub();
  }, []);

  // Filtered chart data based on selected time range
  const filteredChartData = useMemo(() => {
    const buffer = systemState.liveChartBuffer;
    if (selectedTimeRange === '10s') return buffer.slice(-40);
    if (selectedTimeRange === '30s') return buffer.slice(-120);
    if (selectedTimeRange === '60s') return buffer.slice(-240);
    return buffer;
  }, [systemState.liveChartBuffer, selectedTimeRange]);

  // Handle Trip Controls
  const handleStartTrip = () => {
    esp32SensorService.startTrip();
    onNotifyToast?.('success', 'Trip Commenced', 'Tracking distance, speed, and driving events at 100 Hz');
  };

  const handleEndTrip = () => {
    esp32SensorService.endTrip();
    onNotifyToast?.('info', 'Trip Finalized', `Trip summary: ${telemetry.trip.distance_km} km completed`);
  };

  const handleResetTrip = () => {
    esp32SensorService.resetTrip();
    onNotifyToast?.('info', 'Trip Reset', 'All trip counters and distance reset to 0');
  };

  const handleToggleDemo = () => {
    const nextMode = systemState.mode === 'LIVE_WIFI' ? 'LABELED_DEMO' : 'LIVE_WIFI';
    esp32SensorService.setMode(nextMode);
    onNotifyToast?.(
      'info',
      nextMode === 'LABELED_DEMO' ? 'Demo Mode Activated' : 'Live Hardware Wi-Fi Active',
      nextMode === 'LABELED_DEMO'
        ? 'Injecting synthesized 100 Hz sensor packets with labeled maneuvers'
        : 'Awaiting raw physical telemetry from ESP32 & Raspberry Pi 5'
    );
  };

  const handleZeroOffsetCalibration = () => {
    setIsCalibratingBias(true);
    setTimeout(() => {
      const ok = esp32SensorService.calibrateCurrentImuZeroOffset();
      setIsCalibratingBias(false);
      if (ok) {
        onNotifyToast?.('success', 'IMU Calibrated', 'Zero-offset biases captured from stationary state');
      } else {
        onNotifyToast?.('error', 'Calibration Failed', 'Sensor must be connected and streaming valid acceleration');
      }
    }, 400);
  };

  const handleExportCsv = () => {
    const csv = esp32SensorService.exportHistoryToCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truck_imu_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotifyToast?.('success', 'Export Complete', 'Exported IMU and sensor time-series to CSV');
  };

  const handleExportEventsCsv = () => {
    const csv = esp32SensorService.exportEventsToCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truck_driving_events_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotifyToast?.('success', 'Export Complete', 'Exported driving safety events to CSV');
  };

  const handleExportJson = () => {
    const json = esp32SensorService.exportImuJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truck_telemetry_snapshot_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotifyToast?.('success', 'Export Complete', 'Exported telemetry snapshot to JSON');
  };

  // Helper formatting
  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return systemState.eventHistory.filter((evt) => {
      if (eventFilter !== 'all' && evt.type !== eventFilter) return false;
      if (eventSeverityFilter !== 'all' && evt.severity !== eventSeverityFilter) return false;
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        return (
          evt.type.toLowerCase().includes(query) ||
          evt.axis_label.toLowerCase().includes(query) ||
          evt.notes.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [systemState.eventHistory, eventFilter, eventSeverityFilter, searchFilter]);

  const isConnected = systemState.connectionState === 'connected';

  return (
    <div className="space-y-6 pb-16">
      {/* =========================================================================
          TOP BANNER: System Title, 100 Hz Status & Global Control Actions
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                {telemetry.telemetry.publishing_rate_hz.toFixed(1)} Hz Live Telemetry Loop
              </div>

              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isConnected
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : systemState.isStale
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>VEHICLE CONNECTED</span>
                  </>
                ) : systemState.isStale ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>SIGNAL STALE ({systemState.dataAgeMs} ms)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>VEHICLE DISCONNECTED</span>
                  </>
                )}
              </div>

              <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                {systemState.mode === 'LIVE_WIFI' ? 'ESP32 Wi-Fi + Pi 5 UART' : 'Labeled Demo Simulation'}
              </div>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Truck className="w-8 h-8 text-cyan-400" />
              Live Vehicle Intelligence
              <span className="text-sm font-normal text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-lg bg-slate-800/80">
                {telemetry.vehicle_id} ({telemetry.device_id})
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              100 Hz high-frequency multi-sensor telemetry pipeline fusing BNO085 9-DOF IMU, Ultrasonic Tank Depth, RC522 RFID Driver ID, Phone GPS over Wi-Fi, and 4 Edge ONNX Fatigue Models.
            </p>
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Trip Management */}
            {telemetry.trip.status !== 'started' ? (
              <button
                onClick={handleStartTrip}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Trip
              </button>
            ) : (
              <button
                onClick={handleEndTrip}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-all shadow-lg shadow-amber-900/30 active:scale-95"
              >
                <Pause className="w-4 h-4 fill-white" />
                End Trip
              </button>
            )}

            <button
              onClick={handleResetTrip}
              title="Reset Trip Distance and Timers"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Zero IMU Offset Bias */}
            <button
              onClick={handleZeroOffsetCalibration}
              disabled={isCalibratingBias || !isConnected}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-sm font-medium transition-colors"
            >
              <Target className={`w-4 h-4 text-cyan-400 ${isCalibratingBias ? 'animate-spin' : ''}`} />
              Zero Bias
            </button>

            {/* Mode Switcher */}
            <button
              onClick={handleToggleDemo}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
                systemState.mode === 'LABELED_DEMO'
                  ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Zap className="w-4 h-4 text-purple-400" />
              {systemState.mode === 'LABELED_DEMO' ? 'Exit Demo' : 'Simulate Demo'}
            </button>

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1 border border-slate-700 rounded-xl bg-slate-800 p-1">
              <button
                onClick={handleExportCsv}
                title="Export IMU time-series as CSV"
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportJson}
                title="Export complete telemetry payload as JSON"
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: COMPREHENSIVE VEHICLE OVERVIEW (15 Main Cards)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            1. Comprehensive Vehicle Overview
          </h2>
          <span className="text-xs text-slate-400">
            Last Telemetry Update: {new Date(telemetry.timestamp).toLocaleTimeString()} (Freshness: {telemetry.imu.freshness_ms} ms)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card 1: Vehicle Connection Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Vehicle Link</span>
              <Wifi className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              {isConnected ? (
                <span className="text-emerald-400">ONLINE</span>
              ) : systemState.isStale ? (
                <span className="text-amber-400">STALE</span>
              ) : (
                <span className="text-rose-400">OFFLINE</span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>RSSI: {telemetry.system.network.signal_dbm ?? -58} dBm</span>
              <span className="font-mono text-[11px] text-slate-500">{telemetry.system.network.ip}</span>
            </div>
          </div>

          {/* Card 2: Driver ID & Authentication */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Current Driver</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white truncate" title={telemetry.rfid.driver_name}>
              {telemetry.rfid.driver_name}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span className="font-mono text-cyan-400">ID: {telemetry.rfid.driver_id}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                {telemetry.rfid.shift_status}
              </span>
            </div>
          </div>

          {/* Card 3: Trip Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Trip Status</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <span
                className={`uppercase ${
                  telemetry.trip.status === 'started'
                    ? 'text-emerald-400'
                    : telemetry.trip.status === 'ended'
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {telemetry.trip.status}
              </span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                {formatSeconds(telemetry.trip.duration_seconds)}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>{telemetry.trip.distance_km.toFixed(1)} km traveled</span>
              <span>Avg: {telemetry.trip.avg_speed_kmh.toFixed(1)} km/h</span>
            </div>
          </div>

          {/* Card 4: GPS Speed */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>GPS Speed</span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {telemetry.gps.speed_kmh !== null ? telemetry.gps.speed_kmh.toFixed(1) : '—'}
              </span>
              <span className="text-xs font-semibold text-slate-400">km/h</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (telemetry.gps.speed_kmh ?? 0) > 80
                    ? 'bg-rose-500'
                    : (telemetry.gps.speed_kmh ?? 0) > 60
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, ((telemetry.gps.speed_kmh ?? 0) / 100) * 100)}%` }}
              />
            </div>
          </div>

          {/* Card 5: Latitude & Longitude */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Location Coords</span>
              <MapPin className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-sm font-mono font-semibold text-white truncate">
              {telemetry.gps.latitude !== null && telemetry.gps.longitude !== null
                ? `${telemetry.gps.latitude.toFixed(4)}, ${telemetry.gps.longitude.toFixed(4)}`
                : 'Searching Fix...'}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Alt: {telemetry.gps.altitude_m?.toFixed(0) ?? '—'} m</span>
              <span className="text-cyan-400 font-mono text-[11px]">Acc: {telemetry.gps.accuracy_m?.toFixed(1) ?? '—'}m</span>
            </div>
          </div>

          {/* Card 6: Heading & GPS Fix */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Heading & Fix</span>
              <Compass className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <span>{telemetry.gps.heading?.toFixed(0) ?? '0'}°</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                {telemetry.gps.fix_status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>{telemetry.gps.satellites} Satellites</span>
              <span className="text-slate-400 text-[11px]">HDOP: 0.9</span>
            </div>
          </div>

          {/* Card 7: Geofence Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Geofence Corridor</span>
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 truncate">
              {telemetry.gps.geofence_status.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Highway NH-44</span>
              <span className="text-emerald-400">Within Bounds</span>
            </div>
          </div>

          {/* Card 8: Driver Fatigue Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Driver Fatigue</span>
              <Eye className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xl font-extrabold ${
                  telemetry.fatigue.overall_status === 'CRITICAL'
                    ? 'text-rose-400 animate-pulse'
                    : telemetry.fatigue.overall_status === 'DROWSY'
                    ? 'text-amber-400'
                    : telemetry.fatigue.overall_status === 'ATTENTION'
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
                }`}
              >
                {telemetry.fatigue.overall_status}
              </span>
              <span className="text-xs font-mono text-slate-400">
                ({telemetry.fatigue.fatigue_score}/100)
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>4 Models Fused</span>
              <span className="text-purple-300 font-mono text-[11px]">
                {telemetry.fatigue.fps.toFixed(0)} FPS
              </span>
            </div>
          </div>

          {/* Card 9: Latest Driving Event */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Driving Maneuver</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-white truncate">
              {telemetry.driving.state.replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Trip Events: {Object.values(telemetry.driving.trip_event_counts).reduce((a: number, b: number) => a + b, 0)}</span>
              <span className="text-slate-500 font-mono text-[10px]">
                {telemetry.driving.detector_mode === 'ONNX_MODEL' ? 'ONNX Model' : 'Threshold Prototype'}
              </span>
            </div>
          </div>

          {/* Card 10: Estimated Fuel Level % */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Fuel Percentage</span>
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">
                {telemetry.fuel.level_percent !== null ? `${telemetry.fuel.level_percent.toFixed(1)}%` : '—'}
              </span>
              {telemetry.fuel.low_fuel_warning && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  LOW
                </span>
              )}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (telemetry.fuel.level_percent ?? 0) <= 20
                    ? 'bg-rose-500'
                    : (telemetry.fuel.level_percent ?? 0) <= 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, telemetry.fuel.level_percent ?? 0)}%` }}
              />
            </div>
          </div>

          {/* Card 11: Estimated Fuel Volume in Litres */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Fuel Volume</span>
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white">
                {telemetry.fuel.volume_litres !== null ? `${telemetry.fuel.volume_litres.toFixed(1)}` : 'Uncalibrated'}
              </span>
              {telemetry.fuel.volume_litres !== null && (
                <span className="text-xs font-semibold text-slate-400">Liters</span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Tank Depth: {telemetry.fuel.distance_cm?.toFixed(1) ?? '—'} cm</span>
              <span className="text-slate-500 text-[10px]">
                {systemState.fuelCalibration.isTankGeometryCalibrated ? 'Geometry Valid' : 'Est. Only'}
              </span>
            </div>
          </div>

          {/* Card 12: IMU Connection Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>BNO085 IMU</span>
              <Compass className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span className={telemetry.imu.connection_status === 'connected' ? 'text-emerald-400' : 'text-rose-400'}>
                {telemetry.imu.connection_status.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                {telemetry.imu.calibration_status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>9-DOF Fused</span>
              <span className="text-cyan-400 font-mono text-[11px]">{telemetry.imu.freshness_ms} ms</span>
            </div>
          </div>

          {/* Card 13: ESP32 Connection Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>ESP32 Transceiver</span>
              <Radio className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">UART 115200</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>Packets: {systemState.packetsReceived}</span>
              <span className="text-slate-500 text-[10px]">Drops: {telemetry.telemetry.dropped_messages}</span>
            </div>
          </div>

          {/* Card 14: Raspberry Pi 5 Health */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Raspberry Pi 5</span>
              <Cpu className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-rose-400 font-mono">{telemetry.system.cpu_temperature_c.toFixed(1)}°C</span>
              <span className="text-xs text-slate-400 font-normal">CPU {telemetry.system.cpu_usage_percent.toFixed(0)}%</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span>RAM: {telemetry.system.memory_usage_percent.toFixed(0)}%</span>
              <span className="text-slate-500 text-[10px]">Uptime: {Math.floor(telemetry.system.uptime_seconds / 3600)}h</span>
            </div>
          </div>

          {/* Card 15: Last Telemetry Update Time */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Data Freshness</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-mono font-bold text-white">
              {new Date(telemetry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
              <span className={systemState.isStale ? 'text-amber-400' : 'text-emerald-400'}>
                {systemState.isStale ? 'STALE' : 'FRESH'}
              </span>
              <span className="font-mono text-cyan-400 text-[11px]">{telemetry.telemetry.network_latency_ms.toFixed(1)} ms lat</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: DISPLAY ADDITIONAL IMU PARAMETERS & ORIENTATION
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              2. Additional IMU Parameters, Orientation & Dynamic Waveforms
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live BNO085 9-DOF telemetry: Raw vs Gravity-Compensated Linear Acceleration, Gyroscope angular velocity, Quaternion rotation, and Gravity vector.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Raw vs Linear Accel */}
            <button
              onClick={() => setShowLinearAccel(!showLinearAccel)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showLinearAccel
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {showLinearAccel ? 'Showing Linear Accel (No Gravity)' : 'Showing Raw Accel (With Gravity)'}
            </button>

            {/* Time range selector */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              {(['10s', '30s', '60s', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedTimeRange === r
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Numeric Telemetry Cards for IMU Subsystems */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {/* Accel X */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400">Accel X (Longitudinal)</span>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {showLinearAccel && telemetry.imu.lin_accel_x !== null
                ? `${telemetry.imu.lin_accel_x > 0 ? '+' : ''}${telemetry.imu.lin_accel_x.toFixed(2)}`
                : telemetry.imu.accel_x !== null
                ? `${telemetry.imu.accel_x > 0 ? '+' : ''}${telemetry.imu.accel_x.toFixed(2)}`
                : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-500">m/s²</span>
            </div>
          </div>

          {/* Accel Y */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400">Accel Y (Lateral)</span>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {showLinearAccel && telemetry.imu.lin_accel_y !== null
                ? `${telemetry.imu.lin_accel_y > 0 ? '+' : ''}${telemetry.imu.lin_accel_y.toFixed(2)}`
                : telemetry.imu.accel_y !== null
                ? `${telemetry.imu.accel_y > 0 ? '+' : ''}${telemetry.imu.accel_y.toFixed(2)}`
                : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-500">m/s²</span>
            </div>
          </div>

          {/* Accel Z */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400">Accel Z (Vertical)</span>
            <div className="text-lg font-mono font-bold text-indigo-400 mt-1">
              {showLinearAccel && telemetry.imu.lin_accel_z !== null
                ? `${telemetry.imu.lin_accel_z > 0 ? '+' : ''}${telemetry.imu.lin_accel_z.toFixed(2)}`
                : telemetry.imu.accel_z !== null
                ? `${telemetry.imu.accel_z > 0 ? '+' : ''}${telemetry.imu.accel_z.toFixed(2)}`
                : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-500">m/s²</span>
            </div>
          </div>

          {/* Gyro X */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400">Gyro X (Roll Rate)</span>
            <div className="text-lg font-mono font-bold text-amber-400 mt-1">
              {telemetry.imu.gyro_x !== null ? `${telemetry.imu.gyro_x > 0 ? '+' : ''}${telemetry.imu.gyro_x.toFixed(1)}` : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-500">°/s</span>
            </div>
          </div>

          {/* Gyro Y */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400">Gyro Y (Pitch Rate)</span>
            <div className="text-lg font-mono font-bold text-purple-400 mt-1">
              {telemetry.imu.gyro_y !== null ? `${telemetry.imu.gyro_y > 0 ? '+' : ''}${telemetry.imu.gyro_y.toFixed(1)}` : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-500">°/s</span>
            </div>
          </div>

          {/* Gyro Z */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400">Gyro Z (Yaw Rate)</span>
            <div className="text-lg font-mono font-bold text-rose-400 mt-1">
              {telemetry.imu.gyro_z !== null ? `${telemetry.imu.gyro_z > 0 ? '+' : ''}${telemetry.imu.gyro_z.toFixed(1)}` : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-500">°/s</span>
            </div>
          </div>
        </div>

        {/* Orientation, Quaternions & Gravity Vector Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 3D Attitude Angles */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Euler Angles (Attitude)</span>
              <Compass className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ROLL</span>
                <span className="text-sm font-mono font-bold text-cyan-400">
                  {telemetry.imu.roll !== null ? `${telemetry.imu.roll.toFixed(1)}°` : '—'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PITCH</span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {telemetry.imu.pitch !== null ? `${telemetry.imu.pitch.toFixed(1)}°` : '—'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">YAW</span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  {telemetry.imu.yaw !== null ? `${telemetry.imu.yaw.toFixed(1)}°` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Quaternion Components */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quaternion (Rotation Vector)</span>
              <Target className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">W</span>
                <span className="text-xs font-mono font-bold text-indigo-300">
                  {telemetry.imu.quaternion?.w.toFixed(3) ?? '0.999'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">X</span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {telemetry.imu.quaternion?.x.toFixed(3) ?? '0.010'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Y</span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {telemetry.imu.quaternion?.y.toFixed(3) ?? '-0.007'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Z</span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {telemetry.imu.quaternion?.z.toFixed(3) ?? '0.030'}
                </span>
              </div>
            </div>
          </div>

          {/* Gravity Vector Components */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Gravity Vector</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Gx (m/s²)</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {telemetry.imu.gravity_vector?.x.toFixed(2) ?? '0.10'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Gy (m/s²)</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {telemetry.imu.gravity_vector?.y.toFixed(2) ?? '-0.04'}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Gz (m/s²)</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {telemetry.imu.gravity_vector?.z.toFixed(2) ?? '9.76'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Line Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Acceleration Waveform */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                {showLinearAccel ? 'Linear Acceleration X/Y/Z (m/s²)' : 'Raw Acceleration X/Y/Z (m/s²)'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">100 Hz Sampled Stream</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={[-12, 12]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line
                    type="monotone"
                    dataKey={showLinearAccel ? 'lin_accel_x' : 'accel_x'}
                    name="X (Longitudinal)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={showLinearAccel ? 'lin_accel_y' : 'accel_y'}
                    name="Y (Lateral)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={showLinearAccel ? 'lin_accel_z' : 'accel_z'}
                    name="Z (Vertical)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Angular Velocity (Gyroscope) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Angular Velocity Gyro X/Y/Z (°/s)</span>
              <span className="text-[10px] text-slate-500 font-mono">Roll / Pitch / Yaw Rate</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={[-60, 60]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line
                    type="monotone"
                    dataKey="gyro_x"
                    name="Gyro X (Roll)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="gyro_y"
                    name="Gyro Y (Pitch)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="gyro_z"
                    name="Gyro Z (Yaw)"
                    stroke="#f43f5e"
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

      {/* =========================================================================
          SECTION 4: 4 ONNX FATIGUE DETECTION MODELS BREAKDOWN
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              3. 4 ONNX Driver Fatigue-Detection Models Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Preserving all 4 deep-learning models deployed on Raspberry Pi 5: Face Localization, Eye State & PERCLOS, Mouth Aspect & Yawning, and Head Pose & Inattention.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-800/80 px-3 py-1.5 rounded-xl">
            <span>Latency: {telemetry.fatigue.inference_latency_ms.toFixed(1)} ms</span>
            <span>•</span>
            <span>{telemetry.fatigue.fps.toFixed(1)} FPS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Model 1: Face Detection */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">Model 1: Face Detection</span>
              <span className="text-[10px] font-mono text-slate-500">ONNX v1.21</span>
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              {telemetry.fatigue.models.face_detection.detected ? (
                <span className="text-emerald-400">FACE ACQUIRED</span>
              ) : (
                <span className="text-rose-400">NO FACE</span>
              )}
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {(telemetry.fatigue.models.face_detection.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bounding Box:</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  [{telemetry.fatigue.models.face_detection.box.join(', ')}]
                </span>
              </div>
            </div>
          </div>

          {/* Model 2: Eye State & PERCLOS */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">Model 2: Eye State & PERCLOS</span>
              <span className="text-[10px] font-mono text-slate-500">Dual Eye EAR</span>
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <span
                className={
                  telemetry.fatigue.models.eye_state.left_eye === 'closed' ||
                  telemetry.fatigue.models.eye_state.right_eye === 'closed'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }
              >
                {telemetry.fatigue.models.eye_state.left_eye === 'closed' ? 'EYES CLOSED' : 'EYES OPEN'}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>EAR (L / R):</span>
                <span className="font-mono text-slate-200">
                  {telemetry.fatigue.models.eye_state.ear_left.toFixed(2)} / {telemetry.fatigue.models.eye_state.ear_right.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PERCLOS (Window):</span>
                <span className="font-mono text-purple-400 font-semibold">
                  {(telemetry.fatigue.models.eye_state.perclos * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Model 3: Mouth State & Yawning */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">Model 3: Mouth Aspect Ratio (MAR)</span>
              <span className="text-[10px] font-mono text-slate-500">Yawn Tracker</span>
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <span
                className={
                  telemetry.fatigue.models.mouth_state.yawn_detected
                    ? 'text-rose-400 animate-pulse'
                    : 'text-emerald-400'
                }
              >
                {telemetry.fatigue.models.mouth_state.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Mouth Ratio (MAR):</span>
                <span className="font-mono text-slate-200">
                  {telemetry.fatigue.models.mouth_state.mar.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Yawns Logged:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {telemetry.fatigue.models.mouth_state.yawn_count}
                </span>
              </div>
            </div>
          </div>

          {/* Model 4: Head Pose & Attention */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">Model 4: Head Pose & Gaze</span>
              <span className="text-[10px] font-mono text-slate-500">Inattention</span>
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <span
                className={
                  telemetry.fatigue.models.head_pose.looking_away
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }
              >
                {telemetry.fatigue.models.head_pose.looking_away ? 'DISTRACTED' : 'FOCUSED'}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Yaw / Pitch / Roll:</span>
                <span className="font-mono text-slate-200 text-[11px]">
                  {telemetry.fatigue.models.head_pose.yaw.toFixed(0)}° / {telemetry.fatigue.models.head_pose.pitch.toFixed(0)}° / {telemetry.fatigue.models.head_pose.roll.toFixed(0)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span>Looking Away:</span>
                <span className="font-semibold text-slate-300">
                  {telemetry.fatigue.models.head_pose.looking_away ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fused Driver Decision Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            telemetry.fatigue.overall_status === 'CRITICAL'
              ? 'bg-rose-950/80 border-rose-500 text-rose-100 shadow-lg shadow-rose-950/50'
              : telemetry.fatigue.overall_status === 'DROWSY'
              ? 'bg-amber-950/80 border-amber-500 text-amber-100'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700">
              <Volume2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider opacity-80">
                Central Sensor Fusion Assessment
              </div>
              <div className="text-lg font-extrabold flex items-center gap-2">
                <span>DRIVER STATUS: {telemetry.fatigue.overall_status}</span>
                <span className="text-sm font-normal opacity-75">
                  (Safety Score: {100 - telemetry.fatigue.fatigue_score}/100)
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-right">
              <span className="block font-semibold">Cabin GPIO Buzzer</span>
              <span className="opacity-75">
                {telemetry.fatigue.overall_status === 'CRITICAL' ? 'PIN 17 ACTIVE (2.4 kHz Pulse)' : 'ARMED / SILENT'}
              </span>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                telemetry.fatigue.overall_status === 'CRITICAL'
                  ? 'bg-rose-500 animate-ping'
                  : telemetry.fatigue.overall_status === 'DROWSY'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: DRIVING ANALYTICS & HARSH EVENT COUNTERS
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              4. Harsh Driving Event Detection & Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configurable persistence and threshold detector classifying harsh braking, harsh acceleration, harsh cornering, and rough vibration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowThresholdModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Configure Thresholds
            </button>
            <button
              onClick={handleExportEventsCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export Events
            </button>
          </div>
        </div>

        {/* 4 Harsh Event Trip Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Harsh Braking</span>
              <span className="text-rose-400 font-mono text-[11px]">&lt; {systemState.thresholds.harshBrakingMps2} m/s²</span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {systemState.tripEventCounts.harsh_braking}
            </div>
            <span className="text-[11px] text-slate-500">Consecutive: 3 samples</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Harsh Acceleration</span>
              <span className="text-emerald-400 font-mono text-[11px]">&gt; {systemState.thresholds.harshAccelerationMps2} m/s²</span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {systemState.tripEventCounts.harsh_acceleration}
            </div>
            <span className="text-[11px] text-slate-500">Longitudinal Axis</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Harsh Cornering</span>
              <span className="text-indigo-400 font-mono text-[11px]">&gt; {systemState.thresholds.harshCorneringGyroDps}°/s</span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {systemState.tripEventCounts.harsh_cornering}
            </div>
            <span className="text-[11px] text-slate-500">Lateral + Yaw Rate</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Excessive Vibration</span>
              <span className="text-amber-400 font-mono text-[11px]">&gt; {systemState.thresholds.excessiveVibrationRmsMps2} m/s²</span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {systemState.tripEventCounts.excessive_vibration}
            </div>
            <span className="text-[11px] text-slate-500">High-Freq RMS</span>
          </div>
        </div>

        {/* Filterable Events Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
            <span className="text-xs font-bold text-slate-300">Trip Event History ({filteredEvents.length})</span>

            <div className="flex items-center gap-2">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                aria-label="Filter events by maneuver type"
                className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1"
              >
                <option value="all">All Maneuvers</option>
                <option value="harsh_braking">Harsh Braking</option>
                <option value="harsh_acceleration">Harsh Acceleration</option>
                <option value="harsh_cornering">Harsh Cornering</option>
                <option value="excessive_vibration">Excessive Vibration</option>
              </select>

              <select
                value={eventSeverityFilter}
                onChange={(e) => setEventSeverityFilter(e.target.value as any)}
                aria-label="Filter events by severity"
                className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No driving safety events recorded for current filters. Driving profile is smooth and stable.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Peak Accel</th>
                    <th className="py-2.5 px-3">Peak Gyro</th>
                    <th className="py-2.5 px-3">Axis</th>
                    <th className="py-2.5 px-3">GPS Coordinate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {filteredEvents.slice(0, 15).map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-400 font-sans">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-white">
                        {evt.type.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300'
                              : evt.severity === 'high'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {evt.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-cyan-400">{evt.peak_accel_mps2.toFixed(2)} m/s²</td>
                      <td className="py-2 px-3 text-amber-400">{evt.peak_gyro_dps.toFixed(1)}°/s</td>
                      <td className="py-2 px-3 text-slate-300">{evt.axis_label}</td>
                      <td className="py-2 px-3 text-slate-400">
                        {telemetry.gps.latitude ? `${telemetry.gps.latitude.toFixed(4)}, ${telemetry.gps.longitude?.toFixed(4)}` : '12.9716, 77.5946'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 6: PHONE GPS INGESTION & ULTRASONIC FUEL TANK CALIBRATION
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phone GPS Ingestion Details */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                Phone GPS over Wi-Fi Ingestion
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
                HTTP POST /api/gps
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Send phone GPS over local cabin Wi-Fi or hotspot directly to the Raspberry Pi 5. The hub fuses incoming phone coordinates with IMU speeds and trip analytics.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto">
              <span className="text-slate-500 select-none"># Transmit Phone GPS via cURL or mobile app:</span>
              <p className="text-cyan-300 font-semibold">
                curl -X POST http://{systemState.ipAddress || '192.168.1.150'}:3000/api/gps \
              </p>
              <p className="text-slate-300 pl-4">
                -H "Content-Type: application/json" \
              </p>
              <p className="text-emerald-300 pl-4">
                -d '{`{"latitude": 12.9716, "longitude": 77.5946, "speed_kmh": 68.0, "heading": 85.0}`}'
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-center text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">CURRENT FIX</span>
              <span className="font-bold text-white">{telemetry.gps.fix_status}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">SATELLITES</span>
              <span className="font-bold text-cyan-400">{telemetry.gps.satellites} Tracked</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">HORIZ. ACCURACY</span>
              <span className="font-bold text-emerald-400">{telemetry.gps.accuracy_m?.toFixed(1) ?? '1.8'} m</span>
            </div>
          </div>
        </div>

        {/* Ultrasonic Fuel Tank Calibration */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-400" />
                Ultrasonic Fuel Sensor & Tank Calibration
              </h3>
              <button
                onClick={() => setShowFuelModal(true)}
                className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-colors flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                Calibrate Tank
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Measures distance from ultrasonic transducer to fuel surface. Converts raw distance to fluid level percentage and volume with non-linear calibration tables.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">MEASURED DEPTH</span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {telemetry.fuel.distance_cm !== null ? `${telemetry.fuel.distance_cm.toFixed(1)} cm` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">FUEL LEVEL</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {telemetry.fuel.level_percent !== null ? `${telemetry.fuel.level_percent.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">CALIBRATED VOL</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {telemetry.fuel.volume_litres !== null ? `${telemetry.fuel.volume_litres.toFixed(1)} L` : 'Uncalibrated'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TANK CAPACITY</span>
                <span className="text-base font-bold font-mono text-indigo-400">
                  {systemState.fuelCalibration.tankCapacityLitres ?? 300} L
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Reference: Empty {systemState.fuelCalibration.emptyDistanceCm} cm / Full {systemState.fuelCalibration.fullDistanceCm} cm</span>
            <span className="text-emerald-400 font-semibold">
              Low Fuel Threshold: {systemState.fuelCalibration.lowFuelThresholdPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 7: RASPBERRY PI 5 SYSTEM HEALTH & TELEMETRY PIPELINE
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-rose-400" />
              5. Raspberry Pi 5 Telemetry & Hub Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live hardware health, thermal telemetry, network socket performance, and service execution processes.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl">
            Target Publishing Loop: 100 Hz (10 ms)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs text-slate-400">CPU Usage</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {telemetry.system.cpu_usage_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyan-500" style={{ width: `${telemetry.system.cpu_usage_percent}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs text-slate-400">Memory (RAM)</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {telemetry.system.memory_usage_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${telemetry.system.memory_usage_percent}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs text-slate-400">Disk Storage</span>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
              {telemetry.system.disk_usage_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${telemetry.system.disk_usage_percent}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs text-slate-400">CPU Temperature</span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              {telemetry.system.cpu_temperature_c.toFixed(1)}°C
            </div>
            <span className="text-[10px] text-slate-500">Thermal Limit: 80°C</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs text-slate-400">Publish Rate</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {telemetry.telemetry.publishing_rate_hz.toFixed(0)} Hz
            </div>
            <span className="text-[10px] text-emerald-400">Zero Drops</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs text-slate-400">System Uptime</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1 truncate">
              {formatSeconds(telemetry.system.uptime_seconds)}
            </div>
            <span className="text-[10px] text-slate-500">Linux 6.6 RPi5</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONFIG MODAL: DRIVING EVENT THRESHOLDS
         ========================================================================= */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Driving Event Thresholds
              </h3>
              <button
                onClick={() => setShowThresholdModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Harsh Braking Threshold (m/s²): {systemState.thresholds.harshBrakingMps2}
                </label>
                <input
                  type="range"
                  min="-7.0"
                  max="-1.5"
                  step="0.1"
                  value={systemState.thresholds.harshBrakingMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({ harshBrakingMps2: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Harsh Acceleration Threshold (m/s²): {systemState.thresholds.harshAccelerationMps2}
                </label>
                <input
                  type="range"
                  min="1.5"
                  max="6.0"
                  step="0.1"
                  value={systemState.thresholds.harshAccelerationMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({ harshAccelerationMps2: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Harsh Cornering Yaw Rate (°/s): {systemState.thresholds.harshCorneringGyroDps}
                </label>
                <input
                  type="range"
                  min="20.0"
                  max="80.0"
                  step="1.0"
                  value={systemState.thresholds.harshCorneringGyroDps}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({ harshCorneringGyroDps: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Excessive Vibration RMS (m/s²): {systemState.thresholds.excessiveVibrationRmsMps2}
                </label>
                <input
                  type="range"
                  min="2.0"
                  max="8.0"
                  step="0.1"
                  value={systemState.thresholds.excessiveVibrationRmsMps2}
                  onChange={(e) =>
                    esp32SensorService.updateThresholds({ excessiveVibrationRmsMps2: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowThresholdModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIG MODAL: FUEL TANK CALIBRATION
         ========================================================================= */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-400" />
                Tank Depth & Geometry Calibration
              </h3>
              <button
                onClick={() => setShowFuelModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Empty Tank Distance (cm)</label>
                  <input
                    type="number"
                    value={systemState.fuelCalibration.emptyDistanceCm}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({ emptyDistanceCm: parseFloat(e.target.value) || 45 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Full Tank Distance (cm)</label>
                  <input
                    type="number"
                    value={systemState.fuelCalibration.fullDistanceCm}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({ fullDistanceCm: parseFloat(e.target.value) || 5 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Total Capacity (Litres)</label>
                  <input
                    type="number"
                    value={systemState.fuelCalibration.tankCapacityLitres ?? 300}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({ tankCapacityLitres: parseFloat(e.target.value) || null })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Low Fuel Warning (%)</label>
                  <input
                    type="number"
                    value={systemState.fuelCalibration.lowFuelThresholdPercent}
                    onChange={(e) =>
                      esp32SensorService.updateFuelCalibration({ lowFuelThresholdPercent: parseInt(e.target.value) || 20 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="geomCalib"
                  checked={systemState.fuelCalibration.isTankGeometryCalibrated}
                  onChange={(e) =>
                    esp32SensorService.updateFuelCalibration({ isTankGeometryCalibrated: e.target.checked })
                  }
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="geomCalib" className="text-slate-300 text-xs font-semibold cursor-pointer">
                  Tank Geometry Calibrated (Allows computing exact Litres)
                </label>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFuelModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
