import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Cpu,
  Usb,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  Terminal,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  UserCheck,
  UserX,
  CreditCard,
  FileCode
} from 'lucide-react';
import {
  Driver,
  Vehicle,
  RfidHardwareState,
  RfidScanLogEntry,
  LastRfidScanResult,
  AlertEvent
} from '../types';
import { rfidSerialManager } from '../services/rfidSerial';

interface RfidHardwareTestSectionProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateDriver: (driver: Driver) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onTriggerAlert: (alert: AlertEvent) => void;
  onNotifyToast?: (type: 'success' | 'error' | 'warning', title: string, message: string) => void;
  rfidGlobalState: RfidHardwareState;
}

export const RfidHardwareTestSection: React.FC<RfidHardwareTestSectionProps> = ({
  drivers,
  vehicles,
  onUpdateDriver,
  onUpdateVehicle,
  onTriggerAlert,
  onNotifyToast,
  rfidGlobalState
}) => {
  const isWebSerialSupported = rfidSerialManager.isSupported();

  // Local state for UI controls
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [logs, setLogs] = useState<RfidScanLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'RFID Subsystem initialized. Web Serial API ready for SPDuino ATmega328 connection.'
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Awaiting 9600 baud serial stream: format "RFID,<UID>" from RC522 reader.'
    }
  ]);

  const [lastScanResult, setLastScanResult] = useState<LastRfidScanResult | null>(null);
  const [isSerialMonitorOpen, setIsSerialMonitorOpen] = useState(true);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [selectedBaudRate, setSelectedBaudRate] = useState<number>(115200);
  const [customSimUid, setCustomSimUid] = useState('RFID102934');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [quickAssignDriverId, setQuickAssignDriverId] = useState<string>(drivers[0]?.id || 'DRV001');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom on new logs
  useEffect(() => {
    if (isSerialMonitorOpen && terminalEndRef.current) {
      // Use 'auto' instead of 'smooth' to prevent jitter/vibration when logs arrive frequently
      terminalEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [logs, isSerialMonitorOpen]);

  // Helper to append log
  const addLog = (type: RfidScanLogEntry['type'], message: string) => {
    const entry: RfidScanLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs((prev) => [...prev.slice(-200), entry]); // keep last 200 logs
  };

  // Process incoming RFID UID line (from real serial OR simulation)
  const processRfidLine = (rawLine: string, isSimulated = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const cleanLine = rawLine.trim();

    // SILENTLY IGNORE raw IMU/Telemetry packets to prevent terminal flooding & vibration
    // These are handled by the imuSpeedController in App.tsx
    if (
      cleanLine.startsWith('ACCEL,') ||
      cleanLine.startsWith('GYRO,') ||
      cleanLine.startsWith('TILT,') ||
      cleanLine.startsWith('DEBUG,')
    ) {
      return;
    }

    // Log the line if it's not a telemetry packet
    addLog('raw', `← ${cleanLine}${isSimulated ? ' (SIMULATED)' : ''}`);

    // Verify format: "RFID,<UID>"
    const match = cleanLine.match(/^RFID\s*,\s*(.+)$/i);
    if (!match) {
      // Only warn if it's clearly not a known system message
      if (!cleanLine.startsWith('SYSTEM') && !cleanLine.startsWith('READY')) {
        addLog('warning', `Invalid RFID serial message format: "${cleanLine}". Expected "RFID,<UID>"`);
      }
      return;
    }

    const rawUid = match[1].trim();
    if (!rawUid) {
      addLog('warning', 'RFID UID was empty in message.');
      return;
    }

    // Normalize UID (uppercase, trimmed, keep both formatted and compact versions)
    const normalizedUid = rawUid.toUpperCase().trim();
    const compactUid = normalizedUid.replace(/\s+/g, '');

    addLog('info', `✓ RFID UID detected: ${normalizedUid}`);

    // Search Driver Database
    // Match against id, driverId, rfidId, rfidUid, or rfidUidAliases
    const matchedDriver = drivers.find((d) => {
      const dRfid = (d.rfidUid || d.rfidId || '').toUpperCase().trim();
      const dCompact = dRfid.replace(/\s+/g, '');
      const dAliases = (d.rfidUidAliases || []).map((a) => a.toUpperCase().trim());
      const dAliasesCompact = dAliases.map((a) => a.replace(/\s+/g, ''));
      return (
        dRfid === normalizedUid ||
        dCompact === compactUid ||
        dAliases.includes(normalizedUid) ||
        dAliasesCompact.includes(compactUid)
      );
    });

    if (matchedDriver) {
      // Find assigned vehicle
      const assignedVeh = vehicles.find(
        (v) =>
          v.id === matchedDriver.assignedVehicleId ||
          v.plateNumber.toUpperCase() === (matchedDriver.assignedVehicle || '').toUpperCase() ||
          v.assignedDriverId === matchedDriver.id
      ) || vehicles[0];

      const vehiclePlate = assignedVeh ? assignedVeh.plateNumber : (matchedDriver.assignedVehicle || 'TN-01-AB-4821');

      // Check if driver is already ACTIVE
      if (matchedDriver.status === 'Active') {
        addLog('warning', `⚠ Driver ${matchedDriver.name} (${matchedDriver.id}) is ALREADY ACTIVE on ${vehiclePlate}`);
        addLog('info', `Session maintained without duplicate records.`);

        setLastScanResult({
          uid: normalizedUid,
          driverName: matchedDriver.name,
          driverId: matchedDriver.id,
          vehiclePlate,
          vehicleId: assignedVeh?.id,
          authentication: 'ALREADY_ACTIVE',
          timestamp,
          mode: isSimulated ? 'SIMULATION' : 'LIVE'
        });

        if (onNotifyToast) {
          onNotifyToast(
            'warning',
            'RFID ALREADY ACTIVE',
            `Driver ${matchedDriver.name} is already logged in on vehicle ${vehiclePlate}.`
          );
        }
        return;
      }

      // Valid RFID Authentication & Activation
      addLog('success', `✓ Driver identified: ${matchedDriver.name} (${matchedDriver.id})`);
      addLog('success', `✓ RFID authentication successful`);
      addLog('success', `✓ Vehicle identified: ${vehiclePlate}`);
      addLog('success', `✓ Vehicle state changed to ACTIVE (Dashboard telemetry updated)`);

      // Update Driver status to ACTIVE immediately
      const updatedDriver: Driver = {
        ...matchedDriver,
        status: 'Active',
        loginTime: timestamp,
        lastRfidScan: timestamp,
        assignedVehicleId: assignedVeh?.id || matchedDriver.assignedVehicleId,
        assignedVehicle: vehiclePlate
      };
      onUpdateDriver(updatedDriver);

      // Update Assigned Vehicle state to ACTIVE (Moving / Ignition ON in dashboard)
      if (assignedVeh) {
        const updatedVeh: Vehicle = {
          ...assignedVeh,
          status: 'Moving',
          ignition: true,
          currentSpeed: assignedVeh.currentSpeed > 0 ? assignedVeh.currentSpeed : 45,
          assignedDriverId: matchedDriver.id,
          assignedDriverName: matchedDriver.name,
          lastUpdated: 'Just now',
          statusDuration: '00:00:01'
        };
        onUpdateVehicle(updatedVeh);
      }

      // Set Last Scan Result
      setLastScanResult({
        uid: normalizedUid,
        driverName: matchedDriver.name,
        driverId: matchedDriver.id,
        vehiclePlate,
        vehicleId: assignedVeh?.id,
        authentication: 'VERIFIED',
        timestamp,
        mode: isSimulated ? 'SIMULATION' : 'LIVE'
      });

      // Notification / Toast
      if (onNotifyToast) {
        onNotifyToast(
          'success',
          '✓ RFID AUTHENTICATION SUCCESSFUL',
          `${matchedDriver.name} authenticated successfully. Vehicle: ${vehiclePlate}, Vehicle Status: ACTIVE`
        );
      }

      // Add to System Alerts/Notifications
      const newAlert: AlertEvent = {
        id: `alt-rfid-${Date.now()}`,
        timestamp,
        vehicleId: assignedVeh?.id || 'ALL',
        vehiclePlate,
        alertType: 'Driver RFID Scan',
        message: `✓ RFID Authentication Verified: Driver ${matchedDriver.name} (${matchedDriver.id}) verified with tag ${normalizedUid}. Vehicle ${vehiclePlate} activated.`,
        severity: 'low',
        status: 'Acknowledged',
        location: 'SPDuino USB RFID In-Cabin Gate Reader'
      };
      onTriggerAlert(newAlert);
    } else {
      // UNKNOWN RFID CARD
      addLog('error', `✕ RFID NOT RECOGNIZED: UID "${normalizedUid}" not registered in driver roster.`);
      addLog('error', `✕ Authentication DENIED. Vehicle activation prevented.`);

      setLastScanResult({
        uid: normalizedUid,
        driverName: 'UNKNOWN',
        driverId: 'UNKNOWN',
        vehiclePlate: 'NOT ACTIVATED',
        authentication: 'DENIED',
        timestamp,
        mode: isSimulated ? 'SIMULATION' : 'LIVE',
        isUnknown: true
      });

      // Notification / Toast
      if (onNotifyToast) {
        onNotifyToast(
          'error',
          '✕ RFID AUTHENTICATION FAILED',
          `Unknown RFID card detected (UID: ${normalizedUid}). Vehicle activation denied.`
        );
      }

      // Security Alert
      const securityAlert: AlertEvent = {
        id: `alt-rfid-denied-${Date.now()}`,
        timestamp,
        vehicleId: 'ALL',
        vehiclePlate: 'UNAUTHORIZED',
        alertType: 'Security Alert' as any,
        message: `⚠ Unknown RFID card detected (UID: ${normalizedUid}). Authentication DENIED. Vehicle activation denied.`,
        severity: 'high',
        status: 'New',
        location: 'In-Cabin RC522 Reader'
      };
      onTriggerAlert(securityAlert);
    }
  };

  // Wire up local serial line listener for terminal logs
  useEffect(() => {
    const unsubLines = rfidSerialManager.addListener((line: string) => {
      processRfidLine(line, false);
    });
    
    return () => unsubLines();
  }, [drivers, vehicles]);

  // Deactivate Driver (Session Reset)
  const handleDeactivateDriver = (driverId: string) => {
    const target = drivers.find((d) => d.id === driverId);
    if (!target) return;

    const updated: Driver = {
      ...target,
      status: 'Inactive'
    };
    onUpdateDriver(updated);

    // Also change vehicle state to Ignition Off
    const veh = vehicles.find(
      (v) => v.id === target.assignedVehicleId || v.assignedDriverId === target.id
    );
    if (veh) {
      const updatedVeh: Vehicle = {
        ...veh,
        status: 'Ignition Off',
        ignition: false,
        currentSpeed: 0,
        statusDuration: '00:00:01'
      };
      onUpdateVehicle(updatedVeh);
    }

    addLog('info', `Driver ${target.name} (${target.id}) DEACTIVATED. Vehicle state set to INACTIVE / OFF.`);
    setLastScanResult(null);

    if (onNotifyToast) {
      onNotifyToast('warning', 'Driver Deactivated', `${target.name} has been set to INACTIVE.`);
    }
  };

  // Handle Simulation
  const handleExecuteSimulateScan = (uid: string) => {
    setIsSimulateModalOpen(false);
    addLog('info', `[SIMULATION] Injecting serial line: "RFID,${uid}"`);
    processRfidLine(`RFID,${uid}`, true);
  };

  // Copy serial logs to clipboard
  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Quick-assign an unrecognized scanned RFID card to a selected driver
  const handleQuickAssignCard = (scannedUid: string, targetDriverId: string) => {
    const targetDriver = drivers.find((d) => d.id === targetDriverId);
    if (!targetDriver) return;

    const normalized = scannedUid.toUpperCase().trim();
    const compact = normalized.replace(/\s+/g, '');
    const currentAliases = targetDriver.rfidUidAliases || [];
    const updatedAliases = Array.from(new Set([...currentAliases, scannedUid, normalized, compact]));

    const updatedDriver: Driver = {
      ...targetDriver,
      rfidId: scannedUid,
      rfidUid: scannedUid,
      rfidUidAliases: updatedAliases
    };

    onUpdateDriver(updatedDriver);
    addLog('success', `✓ Card "${scannedUid}" registered and assigned to ${targetDriver.name} (${targetDriver.id})`);

    // Immediately trigger authentication for this newly assigned card
    setTimeout(() => {
      processRfidLine(`RFID,${scannedUid}`, false);
    }, 150);

    if (onNotifyToast) {
      onNotifyToast(
        'success',
        'RFID Card Registered',
        `Linked UID ${scannedUid} to ${targetDriver.name}. Authenticating driver...`
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>RFID HARDWARE TEST</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  SPDuino + RC522
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct USB Serial communication via Web Serial API. Reads RC522 RFID card UIDs at 9600 baud and executes real-time driver authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Hardware Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <label htmlFor="baud-rate-select" className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Baud Rate:</label>
            <select
              id="baud-rate-select"
              disabled={rfidGlobalState.spduinoConnected}
              value={selectedBaudRate}
              onChange={(e) => setSelectedBaudRate(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            >
              <option value="4800">4800</option>
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="115200">115200</option>
            </select>
          </div>

          {!rfidGlobalState.spduinoConnected ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg border bg-slate-900 border-slate-700 text-slate-500">
              <Usb className="w-4 h-4 text-slate-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                Reader Status: Disconnected
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg border bg-emerald-950/30 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Usb className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                  Reader Status: Connected
                </span>
                <span className="text-[9px] font-mono mt-1 opacity-70">
                  {rfidGlobalState.portName}
                </span>
              </div>
            </div>
          )}

          {/* Simulate RFID Scan Button */}
          <button
            id="simulate-rfid-scan-modal-btn"
            type="button"
            onClick={() => setIsSimulateModalOpen(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 text-indigo-400" />
            <span>SIMULATE RFID SCAN</span>
          </button>
        </div>
      </div>

      {/* Browser Compatibility Notice if Web Serial is not supported */}
      {!isWebSerialSupported && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Web Serial API is not supported in this browser.
            </p>
            <p className="text-amber-300/80">
              To connect physical SPDuino hardware via USB, please open this dashboard in <strong>Google Chrome, Microsoft Edge, or Opera</strong> on a laptop/desktop. Simulation Mode remains fully available.
            </p>
          </div>
        </div>
      )}

      {/* Error message card */}
      {connectionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{connectionError}</span>
          </div>
          <button
            onClick={handleConnectHardware}
            className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-[11px] font-semibold whitespace-nowrap transition-colors"
          >
            RECONNECT
          </button>
        </div>
      )}

      {/* Hardware Diagnostics Dashboard per Requirement 22 & 23 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* SPDuino Connection State */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg group hover:border-emerald-500/50 transition-all">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center justify-between">
            <span>SPDuino Status</span>
            <Cpu className={`w-3.5 h-3.5 ${rfidGlobalState.spduinoConnected ? 'text-emerald-400' : 'text-slate-600'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)] ${
              rfidGlobalState.spduinoConnected ? 'bg-emerald-400 !shadow-[0_0_10px_#10b981]' : 
              rfidGlobalState.error ? 'bg-rose-500' : 'bg-slate-700'
            }`} />
            <span className={`text-xs font-mono font-bold ${
              rfidGlobalState.spduinoConnected ? 'text-emerald-400' : 
              rfidGlobalState.error ? 'text-rose-400' : 'text-slate-500'
            }`}>
              {rfidGlobalState.spduinoConnected ? 'CONNECTED' : rfidGlobalState.error ? 'ERROR' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Real-time IMU Sample Rate */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center justify-between">
            <span>IMU Rate</span>
            <Zap className={`w-3.5 h-3.5 ${(rfidGlobalState.diagnostics?.imuSampleRate || 0) > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-slate-100">
              {rfidGlobalState.diagnostics?.imuSampleRate || 0}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">Hz</span>
          </div>
        </div>

        {/* Total Packets Received */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center justify-between">
            <span>Total Packets</span>
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-mono font-bold text-blue-400">
            {(rfidGlobalState.diagnostics?.packetCount || 0).toLocaleString()}
          </div>
        </div>

        {/* RFID Scan Count */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center justify-between">
            <span>RFID Scans</span>
            <Radio className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-mono font-bold text-purple-400">
            {rfidGlobalState.diagnostics?.rfidCount || 0}
          </div>
        </div>

        {/* Error Count tracking */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center justify-between">
            <span>Serial Errors</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${(rfidGlobalState.diagnostics?.errorCount || 0) > 0 ? 'text-rose-400' : 'text-slate-600'}`} />
          </div>
          <div className={`text-lg font-mono font-bold ${
            (rfidGlobalState.diagnostics?.errorCount || 0) > 0 ? 'text-rose-400' : 'text-slate-600'
          }`}>
            {rfidGlobalState.diagnostics?.errorCount || 0}
          </div>
        </div>

        {/* Active Baud Rate */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            Baud Rate
          </div>
          <div className="text-lg font-mono font-bold text-slate-300">
            {rfidGlobalState.baudRate}
          </div>
        </div>

        {/* Device Uptime */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            Uptime
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 mt-1">
            {Math.floor((rfidGlobalState.diagnostics?.uptimeSeconds || 0) / 60)}m {(rfidGlobalState.diagnostics?.uptimeSeconds || 0) % 60}s
          </div>
        </div>

        {/* Last Message Monitor */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            Last Packet
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate leading-tight" title={rfidGlobalState.diagnostics?.lastMessage}>
            {rfidGlobalState.diagnostics?.lastMessage || '---'}
          </div>
        </div>
      </div>

      {/* Live Scan Results & Authentication Panel (Requirement 5, 8, 10, 15) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Last RFID Scan Result Card */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                LAST RFID SCAN
              </h3>
            </div>
            {lastScanResult && (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{lastScanResult.timestamp}</span>
              </span>
            )}
          </div>

          {lastScanResult ? (
            <div
              className={`p-4 rounded-xl border transition-all ${
                lastScanResult.authentication === 'VERIFIED'
                  ? 'bg-emerald-950/30 border-emerald-700/60'
                  : lastScanResult.authentication === 'ALREADY_ACTIVE'
                  ? 'bg-amber-950/30 border-amber-700/60'
                  : 'bg-rose-950/30 border-rose-700/60'
              }`}
            >
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {lastScanResult.authentication === 'VERIFIED' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>✓ RFID VERIFIED</span>
                    </div>
                  ) : lastScanResult.authentication === 'ALREADY_ACTIVE' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>RFID ALREADY ACTIVE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>✕ RFID NOT RECOGNIZED</span>
                    </div>
                  )}

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      lastScanResult.mode === 'LIVE'
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60'
                        : 'bg-indigo-900/40 text-indigo-300 border-indigo-700/60'
                    }`}
                  >
                    {lastScanResult.mode === 'LIVE' ? 'LIVE HARDWARE' : 'SIMULATED RFID EVENT'}
                  </span>
                </div>

                {lastScanResult.authentication === 'VERIFIED' && (
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>VEHICLE: ACTIVE</span>
                  </span>
                )}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    RFID UID
                  </div>
                  <div className="font-mono font-bold text-blue-300 text-sm">
                    {lastScanResult.uid}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    Driver Name & ID
                  </div>
                  <div className="font-bold text-white truncate">
                    {lastScanResult.driverName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {lastScanResult.driverId}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    Assigned Vehicle
                  </div>
                  <div className="font-mono font-bold text-emerald-300 truncate">
                    {lastScanResult.vehiclePlate}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {lastScanResult.authentication === 'VERIFIED' || lastScanResult.authentication === 'ALREADY_ACTIVE'
                      ? 'Status: ACTIVE'
                      : 'NOT ACTIVATED'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                    Authentication
                  </div>
                  <div
                    className={`font-mono font-bold text-sm ${
                      lastScanResult.authentication === 'VERIFIED'
                        ? 'text-emerald-400'
                        : lastScanResult.authentication === 'ALREADY_ACTIVE'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {lastScanResult.authentication}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Time: {lastScanResult.timestamp}
                  </div>
                </div>
              </div>

              {/* Action buttons if Active / Already Active */}
              {(lastScanResult.authentication === 'VERIFIED' ||
                lastScanResult.authentication === 'ALREADY_ACTIVE') &&
                lastScanResult.driverId !== 'UNKNOWN' && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <p className="text-[11px] text-slate-400 italic">
                      Software prototype demonstration: Simulated dashboard telemetry state only.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeactivateDriver(lastScanResult.driverId)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                      <span>DEACTIVATE DRIVER</span>
                    </button>
                  </div>
                )}

              {/* Action bar for UNREGISTERED / DENIED card */}
              {lastScanResult.authentication === 'DENIED' && (
                <div className="pt-3 mt-1 border-t border-rose-900/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Unregistered Hardware RFID Card: UID <code className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-200 font-mono font-bold">{lastScanResult.uid}</code></span>
                    </div>
                    <span className="text-[10px] text-slate-400">1-Click Fast Register</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs text-white font-medium">
                        Assign this physical card to a driver
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Choose which driver to link to tag <strong className="text-blue-300 font-mono">{lastScanResult.uid}</strong> and activate immediately:
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        id="quick-assign-driver-select"
                        value={quickAssignDriverId}
                        onChange={(e) => setQuickAssignDriverId(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-medium focus:ring-1 focus:ring-emerald-500"
                      >
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.id}) — {d.assignedVehicle || 'No Vehicle'}
                          </option>
                        ))}
                      </select>

                      <button
                        id="quick-assign-activate-btn"
                        type="button"
                        onClick={() => handleQuickAssignCard(lastScanResult.uid, quickAssignDriverId)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>REGISTER & ACTIVATE</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
              <Radio className="w-6 h-6 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400 font-medium">
                No RFID scan recorded in current session.
              </div>
              <p className="text-[11px] text-slate-500">
                Tap a registered card on the RC522 reader or click <strong>Simulate RFID Scan</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Registered Test Keys & Quick Tap buttons */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TEST RFID CREDENTIALS</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Demo Roster</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Click any demo card below to instantly test authentication without plugging in hardware:
          </p>

          <div className="space-y-2">
            {/* Driver 1: Ahmed Khan (Physical Hardware Card: 22 9D 30 00) */}
            <div
              onClick={() => handleExecuteSimulateScan('22 9D 30 00')}
              className="p-2.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/60 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  <span>Ahmed Khan (DRV001)</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-900 text-cyan-200 border border-cyan-700">
                    PHYSICAL CARD
                  </span>
                </div>
                <div className="text-[10px] font-mono text-cyan-300">
                  UID: 22 9D 30 00 (RFID102934) • TN-01-AB-4821
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                TAP KEY
              </span>
            </div>

            {/* Driver 2: Rajesh Kumar */}
            <div
              onClick={() => handleExecuteSimulateScan('RFID204812')}
              className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Rajesh Kumar (DRV002)
                </div>
                <div className="text-[10px] font-mono text-blue-300">
                  UID: RFID204812 • TN-04-E-9022
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                TAP KEY
              </span>
            </div>

            {/* Driver 3: Suresh Mani */}
            <div
              onClick={() => handleExecuteSimulateScan('RFID309124')}
              className="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Suresh Mani (DRV003)
                </div>
                <div className="text-[10px] font-mono text-blue-300">
                  UID: RFID309124 • TN-09-BK-3310
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                TAP KEY
              </span>
            </div>

            {/* Unknown Card: FF AA 11 22 */}
            <div
              onClick={() => handleExecuteSimulateScan('FF AA 11 22')}
              className="p-2.5 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 transition-colors">
                  Unknown Card (Unauthorized)
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  UID: FF AA 11 22 • Denied
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                TEST UNKNOWN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RFID Serial Monitor Terminal (Requirement 11) */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              RFID SERIAL MONITOR
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              9600 BAUD • UTF-8
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors flex items-center gap-1"
              title="Copy terminal logs"
            >
              {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => setLogs([])}
              className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors flex items-center gap-1"
              title="Clear terminal log"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>CLEAR LOG</span>
            </button>

            <button
              onClick={() => setIsSerialMonitorOpen(!isSerialMonitorOpen)}
              className="text-slate-400 hover:text-white p-1"
            >
              {isSerialMonitorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isSerialMonitorOpen && (
          <div className="h-60 bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-300 border border-slate-800/80 overflow-y-auto space-y-1 select-text">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic py-2">Terminal buffer empty. Awaiting incoming serial data...</div>
            ) : (
              logs.map((log) => {
                let colorClass = 'text-slate-300';
                if (log.type === 'raw') colorClass = 'text-cyan-300 font-bold';
                else if (log.type === 'success') colorClass = 'text-emerald-400';
                else if (log.type === 'error') colorClass = 'text-rose-400';
                else if (log.type === 'warning') colorClass = 'text-amber-400';
                else if (log.type === 'info') colorClass = 'text-blue-300';

                return (
                  <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={colorClass}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>

      {/* Modal: Simulate RFID Scan (Requirement 16, 17) */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Simulate RFID Hardware Scan
                </h3>
              </div>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select a driver RFID credential to simulate the USB serial payload (<code className="text-blue-300">RFID,&lt;UID&gt;</code>) as if transmitted from the SPDuino:
            </p>

            {/* Quick Driver Selection */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Select Registered Driver:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {drivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleExecuteSimulateScan(d.rfidUid || d.rfidId)}
                    className="w-full p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{d.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ID: {d.id} • Assigned: {d.assignedVehicle || vehicles.find((v) => v.id === d.assignedVehicleId)?.plateNumber || 'None'}
                      </div>
                    </div>
                    <span className="font-mono text-blue-300 text-xs px-2 py-0.5 rounded bg-blue-950 border border-blue-800">
                      {d.rfidUid || d.rfidId}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom UID Input */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Or Enter Custom / Unknown RFID UID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSimUid}
                  onChange={(e) => setCustomSimUid(e.target.value)}
                  placeholder="e.g. FF AA 11 22"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleExecuteSimulateScan(customSimUid)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30 whitespace-nowrap"
                >
                  Send Serial
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSimulateModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
