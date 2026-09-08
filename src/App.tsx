import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  ActiveNavTab,
  Vehicle,
  VehicleStatus,
  Driver,
  AreaGeofence,
  RouteGeofence,
  AlertRule,
  AlertEvent,
  RefuelEvent,
  FuelDrainEvent,
  RfidHardwareState
} from './types';
import {
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_AREA_GEOFENCES,
  INITIAL_ROUTE_GEOFENCES,
  INITIAL_ALERT_RULES,
  INITIAL_ALERT_EVENTS,
  INITIAL_REFUEL_EVENTS,
  INITIAL_DRAIN_EVENTS,
  simulateTelemetryTick
} from './mockData';
import { rfidSerialManager } from './services/rfidSerial';
import { imuSpeedController } from './services/imuSpeedController';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { VehicleDetailModal } from './components/VehicleDetailModal';
import { OverviewDashboard } from './views/OverviewDashboard';
import { FleetView } from './views/FleetView';
import { DriversView } from './views/DriversView';
import { GeofencingView } from './views/GeofencingView';
import { FuelView } from './views/FuelView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [fuelSubTab, setFuelSubTab] = useState<'telemetry' | 'refuels'>('telemetry');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Core Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [areaGeofences, setAreaGeofences] = useState<AreaGeofence[]>(INITIAL_AREA_GEOFENCES);
  const [routeGeofences, setRouteGeofences] = useState<RouteGeofence[]>(INITIAL_ROUTE_GEOFENCES);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(INITIAL_ALERT_RULES);
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>(INITIAL_ALERT_EVENTS);
  const [refuelEvents, setRefuelEvents] = useState<RefuelEvent[]>(INITIAL_REFUEL_EVENTS);
  const [drainEvents, setDrainEvents] = useState<FuelDrainEvent[]>(INITIAL_DRAIN_EVENTS);

  // RFID Hardware State
  const [rfidGlobalState, setRfidGlobalState] = useState<RfidHardwareState>({
    spduinoConnected: false,
    rc522Ready: false,
    usbSerialConnected: false,
    portName: 'Not Connected',
    baudRate: 115200,
    lastRfidUid: '--------',
    lastScanTime: '--------',
    currentMode: 'DISCONNECTED',
    error: null,
    diagnostics: {
      imuSampleRate: 0,
      packetCount: 0,
      rfidCount: 0,
      errorCount: 0,
      lastMessage: 'No messages received',
      uptimeSeconds: 0
    }
  });

  // Periodically sync diagnostics from serial manager
  useEffect(() => {
    const timer = setInterval(() => {
      if (rfidSerialManager.isConnected()) {
        const diag = rfidSerialManager.getDiagnostics();
        setRfidGlobalState(prev => ({
          ...prev,
          spduinoConnected: diag.status === 'CONNECTED',
          usbSerialConnected: diag.status === 'CONNECTED',
          diagnostics: {
            imuSampleRate: diag.imuSampleRate,
            packetCount: diag.packetCount,
            rfidCount: diag.rfidCount,
            errorCount: diag.errorCount,
            lastMessage: diag.lastMessage,
            uptimeSeconds: diag.uptimeSeconds
          }
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Floating Toast Notification for RFID Authentication Feedback
  const [rfidToast, setRfidToast] = useState<{
    id: string;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const handleNotifyToast = useCallback((type: 'success' | 'error' | 'warning', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setRfidToast({ id, type, title, message });
    setTimeout(() => {
      setRfidToast((curr) => (curr?.id === id ? null : curr));
    }, 6000);
  }, []);

  const handleUpdateVehicle = useCallback((updated: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }, []);

  // Selected vehicle for modal inspection (derived to prevent infinite re-render loops)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );
  const setSelectedVehicle = useCallback((v: Vehicle | null) => {
    setSelectedVehicleId(v ? v.id : null);
  }, []);

  // Active vehicle currently bound to the GY-521 IMU & SPDuino controller (Default: veh-1 TN-01-AB-4821)
  const [activeImuVehicleId, setActiveImuVehicleId] = useState<string>('veh-1');

  // Stable references to prevent listener re-attaching on each render
  const driversRef = useRef(drivers);
  driversRef.current = drivers;
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const lastRfidScanRef = useRef<{ uid: string; timestamp: number }>({ uid: '', timestamp: 0 });

  // Listen to GY-521 IMU Speed Controller updates and drive the active vehicle's speed and status
  useEffect(() => {
    const unsubscribe = imuSpeedController.subscribe((_imuData, newSpeed) => {
      setVehicles((prev) => {
        const target = prev.find((v) => v.id === activeImuVehicleId);
        if (!target) return prev;

        const newStatus: VehicleStatus =
          newSpeed > 0
            ? 'Moving'
            : target.ignition
            ? 'Idling'
            : 'Ignition Off';

        // Strict bail out: if speed and status haven't changed, do NOT create a new array
        if (target.currentSpeed === newSpeed && target.status === newStatus) {
          return prev;
        }

        return prev.map((v) => {
          if (v.id === activeImuVehicleId) {
            return {
              ...v,
              currentSpeed: newSpeed,
              status: newStatus,
              statusDuration: v.status !== newStatus ? '00:00:01' : v.statusDuration,
              lastUpdated: 'Just now'
            };
          }
          return v;
        });
      });
    });

    return () => unsubscribe();
  }, [activeImuVehicleId]);

  // 2. Unified SPDuino Hardware Serial Listener for simultaneous RC522 RFID & GY-521 IMU streams
  useEffect(() => {
    const unsubLines = rfidSerialManager.addListener((rawLine) => {
      // a. Send all data packets to IMU Speed Controller (ACCEL, GYRO, TILT packets)
      imuSpeedController.handleSerialLine(rawLine);

      // b. Check for RFID UID scan packet
      const clean = rawLine.trim().toUpperCase();
      if (clean.startsWith('RFID,') || clean.startsWith('UID:') || clean.startsWith('CARD:')) {
        const parts = rawLine.split(/[,:]/);
        const scannedUid = parts.slice(1).join(' ').trim();
        const normalizedScan = scannedUid.toUpperCase().replace(/[\s:]/g, '');

        if (!normalizedScan) return;

        // Debounce repeated card reads within 3 seconds
        const now = Date.now();
        if (
          lastRfidScanRef.current.uid === normalizedScan &&
          now - lastRfidScanRef.current.timestamp < 3000
        ) {
          return;
        }
        lastRfidScanRef.current = { uid: normalizedScan, timestamp: now };

        const currentDrivers = driversRef.current;
        const currentVehicles = vehiclesRef.current;

        // Find matching driver in database
        const matchedDriver = currentDrivers.find(
          (d) => d.rfidId.toUpperCase().replace(/[\s:]/g, '') === normalizedScan
        );

        if (matchedDriver) {
          // Find driver's vehicle
          const targetVeh =
            currentVehicles.find(
              (v) => v.id === matchedDriver.assignedVehicleId || v.assignedDriverId === matchedDriver.id
            ) || currentVehicles[0];

          if (targetVeh) {
            setActiveImuVehicleId(targetVeh.id);
            setSelectedVehicleId(targetVeh.id);
            setVehicles((prev) =>
              prev.map((v) =>
                v.id === targetVeh.id
                  ? {
                      ...v,
                      ignition: true,
                      status: v.currentSpeed > 0 ? 'Moving' : 'Idling',
                      assignedDriverId: matchedDriver.id,
                      assignedDriverName: matchedDriver.name
                    }
                  : v
              )
            );

            handleNotifyToast(
              'success',
              'RFID AUTHENTICATION VERIFIED',
              `Driver ${matchedDriver.name} authenticated (UID: ${scannedUid}). Vehicle ${targetVeh.plateNumber} activated & linked to GY-521 IMU.`
            );
          }
        } else {
          handleNotifyToast(
            'error',
            'RFID AUTHENTICATION FAILED',
            `Unknown RFID card detected (UID: ${scannedUid}). Vehicle activation denied.`
          );
        }
      }
    });

    const unsubDisconnect = rfidSerialManager.addDisconnectListener((reason) => {
      setRfidGlobalState((prev) => ({
        ...prev,
        spduinoConnected: false,
        rc522Ready: false,
        usbSerialConnected: false,
        portName: 'Disconnected',
        currentMode: 'DISCONNECTED',
        error: reason
      }));
      handleNotifyToast('warning', 'SPDuino Disconnected', reason);
    });

    return () => {
      unsubLines();
      unsubDisconnect();
    };
  }, [handleNotifyToast]);

  // Global Connection Handlers
  const [isHardwareConnecting, setIsHardwareConnecting] = useState(false);

  const handleConnectHardware = useCallback(async (baudRate: number = 115200) => {
    setRfidGlobalState(prev => ({ ...prev, error: null, currentMode: 'DISCONNECTED' }));
    setIsHardwareConnecting(true);
    const res = await rfidSerialManager.connect(baudRate);
    setIsHardwareConnecting(false);
    
    if (res.success) {
      setRfidGlobalState((prev) => ({
        ...prev,
        spduinoConnected: true,
        rc522Ready: true,
        usbSerialConnected: true,
        portName: res.portLabel,
        baudRate,
        currentMode: 'LIVE_HARDWARE',
        error: null
      }));
      return true;
    } else {
      setRfidGlobalState((prev) => ({
        ...prev,
        spduinoConnected: false,
        rc522Ready: false,
        usbSerialConnected: false,
        portName: 'Not Connected',
        currentMode: 'DISCONNECTED',
        error: res.error || 'Connection failed'
      }));
      return false;
    }
  }, []);

  const handleDisconnectHardware = useCallback(async () => {
    await rfidSerialManager.disconnect();
    setRfidGlobalState((prev) => ({
      ...prev,
      spduinoConnected: false,
      rc522Ready: false,
      usbSerialConnected: false,
      portName: 'Not Connected',
      currentMode: 'DISCONNECTED',
      error: null
    }));
  }, []);

  const handleToggleHardware = useCallback(async () => {
    if (rfidGlobalState.spduinoConnected) {
      await handleDisconnectHardware();
    } else {
      await handleConnectHardware(rfidGlobalState.baudRate || 115200);
    }
  }, [rfidGlobalState.spduinoConnected, rfidGlobalState.baudRate, handleConnectHardware, handleDisconnectHardware]);

  // Unread alerts count
  const unreadAlertsCount = alertHistory.filter((a) => a.status === 'New').length;

  // Manual or automatic IoT telemetry simulation ping
  const handleSimulatePing = useCallback(() => {
    setIsSimulating(true);
    setVehicles((prevVehicles) => {
      const updated = simulateTelemetryTick(prevVehicles, activeImuVehicleId);

      // Check for fuel threshold triggers or idle triggers
      updated.forEach((v) => {
        // Low fuel alert check
        if (v.fuelLevel < 20) {
          const rule = alertRules.find(
            (r) => r.enabled && r.alertType === 'Fuel Alert' && (r.vehicleId === 'ALL' || r.vehicleId === v.id)
          );
          if (rule && !alertHistory.some((a) => a.vehicleId === v.id && a.alertType === 'Fuel Alert' && a.status === 'New')) {
            const newAlert: AlertEvent = {
              id: `alt-auto-${Date.now()}-${v.id}`,
              timestamp: new Date().toLocaleTimeString(),
              vehicleId: v.id,
              vehiclePlate: v.plateNumber,
              alertType: 'Fuel Alert',
              message: `Low Fuel Alert for ${v.plateNumber}: Fuel level is at ${v.fuelLevel}% (below 20% threshold).`,
              severity: 'high',
              status: 'New',
              location: v.lastKnownLocation
            };
            setAlertHistory((prev) => [newAlert, ...prev]);
          }
        }

        // Idle check: if ignition on & idle duration >= 15 min
        if (v.ignition && v.currentSpeed === 0 && (v.idleMinutes || 0) >= 15) {
          const rule = alertRules.find(
            (r) => r.enabled && r.alertType === 'Idle Alert' && (r.vehicleId === 'ALL' || r.vehicleId === v.id)
          );
          if (rule && !alertHistory.some((a) => a.vehicleId === v.id && a.alertType === 'Idle Alert' && a.status === 'New')) {
            const newAlert: AlertEvent = {
              id: `alt-idle-${Date.now()}-${v.id}`,
              timestamp: new Date().toLocaleTimeString(),
              vehicleId: v.id,
              vehiclePlate: v.plateNumber,
              alertType: 'Idle Alert',
              message: `Idle Alert: ${v.plateNumber} ignition ON and stationary for ${v.idleMinutes || 16} minutes (Threshold: 15 min).`,
              severity: 'medium',
              status: 'New',
              location: v.lastKnownLocation
            };
            setAlertHistory((prev) => [newAlert, ...prev]);
          }
        }
      });

      return updated;
    });

    setTimeout(() => setIsSimulating(false), 800);
  }, [alertRules, alertHistory]);

  // Periodic background telemetry updates
  useEffect(() => {
    const timer = setInterval(() => {
      setVehicles((prev) => simulateTelemetryTick(prev, activeImuVehicleId));
    }, 12000);
    return () => clearInterval(timer);
  }, [activeImuVehicleId]);

  // Vehicle Ignition Toggle (Requirement: "whether ignition is on or off")
  const handleToggleIgnition = (vehicleId: string) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          const newIgnition = !v.ignition;
          const newStatus = !newIgnition
            ? 'Ignition Off'
            : v.currentSpeed > 0
            ? 'Moving'
            : 'Idling';
          return {
            ...v,
            ignition: newIgnition,
            status: newStatus,
            currentSpeed: newIgnition ? v.currentSpeed : 0
          };
        }
        return v;
      })
    );
  };

  // Driver management handlers
  const handleAddDriver = (driver: Driver) => {
    setDrivers((prev) => [driver, ...prev]);
    // If assigned vehicle, link it
    if (driver.assignedVehicleId) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === driver.assignedVehicleId
            ? { ...v, assignedDriverId: driver.id, assignedDriverName: driver.name }
            : v
        )
      );
    }
  };

  const handleUpdateDriver = (driver: Driver) => {
    setDrivers((prev) => prev.map((d) => (d.id === driver.id ? driver : d)));
  };

  const handleDeleteDriver = (driverId: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    setVehicles((prev) =>
      prev.map((v) =>
        v.assignedDriverId === driverId
          ? { ...v, assignedDriverId: undefined, assignedDriverName: undefined }
          : v
      )
    );
  };

  const handleAssignRfid = (driverId: string, vehicleId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;

    // Update driver
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId ? { ...d, assignedVehicleId: vehicleId, status: 'Active' } : d
      )
    );

    // Update vehicle
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? { ...v, assignedDriverId: driver.id, assignedDriverName: driver.name }
          : v.assignedDriverId === driverId
          ? { ...v, assignedDriverId: undefined, assignedDriverName: undefined }
          : v
      )
    );

    // Trigger Notification for Driver Assignment
    const newAlert: AlertEvent = {
      id: `alt-rfid-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      vehicleId,
      vehiclePlate: vehicles.find((v) => v.id === vehicleId)?.plateNumber || 'Vehicle',
      alertType: 'Driver RFID Scan',
      message: `Driver ${driver.name} (RFID: ${driver.rfidId}) scanned and authenticated to vehicle.`,
      severity: 'low',
      status: 'Acknowledged',
      location: 'Depot RFID Terminal Gate 1'
    };
    setAlertHistory((prev) => [newAlert, ...prev]);
  };

  // Geofencing Handlers
  const handleAddAreaGeofence = (geo: AreaGeofence) => {
    setAreaGeofences((prev) => [...prev, geo]);
  };

  const handleUpdateAreaGeofence = (geo: AreaGeofence) => {
    setAreaGeofences((prev) => prev.map((g) => (g.id === geo.id ? geo : g)));
  };

  const handleDeleteAreaGeofence = (id: string) => {
    setAreaGeofences((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddRouteGeofence = (route: RouteGeofence) => {
    setRouteGeofences((prev) => [...prev, route]);
  };

  const handleUpdateRouteGeofence = (route: RouteGeofence) => {
    setRouteGeofences((prev) => prev.map((r) => (r.id === route.id ? route : r)));
  };

  const handleDeleteRouteGeofence = (id: string) => {
    setRouteGeofences((prev) => prev.filter((r) => r.id !== id));
  };

  // Refuel Handlers
  const handleAddRefuelEvent = (event: RefuelEvent) => {
    setRefuelEvents((prev) => [event, ...prev]);

    // Update vehicle's fuel level in state
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === event.vehicleId) {
          const newLiters = Math.min(v.fuelCapacity, event.fuelAfter);
          const newPct = Math.round((newLiters / v.fuelCapacity) * 100);
          return {
            ...v,
            currentFuelLiters: newLiters,
            fuelLevel: newPct,
            mileage: event.odometer || v.mileage
          };
        }
        return v;
      })
    );

    // Create Refuel Alert Notification
    const newAlert: AlertEvent = {
      id: `alt-refuel-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      vehicleId: event.vehicleId,
      vehiclePlate: event.vehiclePlate,
      alertType: 'Refuel Alert',
      message: `Refuel Alert: ${event.vehiclePlate} refueled +${event.fuelAdded}L (from ${event.fuelBefore}L to ${event.fuelAfter}L) at ${event.location}.`,
      severity: 'low',
      status: 'New',
      location: event.location
    };
    setAlertHistory((prev) => [newAlert, ...prev]);
  };

  // Alert Rules Handlers
  const handleAddRule = (rule: AlertRule) => {
    setAlertRules((prev) => [...prev, rule]);
  };

  const handleUpdateRule = (rule: AlertRule) => {
    setAlertRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
  };

  const handleDeleteRule = (ruleId: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleUpdateAlertStatus = (alertId: string, status: AlertEvent['status']) => {
    setAlertHistory((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status } : a))
    );
  };

  const handleTriggerAlert = (alert: AlertEvent) => {
    setAlertHistory((prev) => [alert, ...prev]);
  };

  // Reset demo data
  const handleResetData = () => {
    setVehicles(INITIAL_VEHICLES);
    setDrivers(INITIAL_DRIVERS);
    setAreaGeofences(INITIAL_AREA_GEOFENCES);
    setRouteGeofences(INITIAL_ROUTE_GEOFENCES);
    setAlertRules(INITIAL_ALERT_RULES);
    setAlertHistory(INITIAL_ALERT_EVENTS);
    setRefuelEvents(INITIAL_REFUEL_EVENTS);
    setDrainEvents(INITIAL_DRAIN_EVENTS);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        vehicles={vehicles}
        unreadAlertsCount={unreadAlertsCount}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onSimulatePing={handleSimulatePing}
          isSimulating={isSimulating}
          unreadAlertsCount={unreadAlertsCount}
          onNavigateToNotifications={() => setActiveTab('notifications')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          rfidStatus={rfidGlobalState.currentMode}
          onNavigateToDrivers={() => setActiveTab('drivers')}
          onToggleHardware={handleToggleHardware}
          isHardwareConnected={rfidGlobalState.spduinoConnected}
          isHardwareConnecting={isHardwareConnecting}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <OverviewDashboard
              vehicles={vehicles}
              drivers={drivers}
              alerts={alertHistory}
              refuelEvents={refuelEvents}
              areaGeofences={areaGeofences}
              routeGeofences={routeGeofences}
              onSelectVehicle={setSelectedVehicle}
              onNavigateTab={setActiveTab}
              onNavigateToRefuel={() => {
                setFuelSubTab('refuels');
                setActiveTab('fuel');
              }}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetView
              vehicles={vehicles}
              drivers={drivers}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              onToggleIgnition={handleToggleIgnition}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              areaGeofences={areaGeofences}
              routeGeofences={routeGeofences}
              activeImuVehicleId={activeImuVehicleId}
              setActiveImuVehicleId={setActiveImuVehicleId}
              onNotifyToast={handleNotifyToast}
              rfidGlobalState={rfidGlobalState}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversView
              drivers={drivers}
              vehicles={vehicles}
              onAddDriver={handleAddDriver}
              onUpdateDriver={handleUpdateDriver}
              onDeleteDriver={handleDeleteDriver}
              onAssignRfid={handleAssignRfid}
              onUpdateVehicle={handleUpdateVehicle}
              onTriggerAlert={handleTriggerAlert}
              onNotifyToast={handleNotifyToast}
              rfidGlobalState={rfidGlobalState}
            />
          )}

          {activeTab === 'geofencing' && (
            <GeofencingView
              areaGeofences={areaGeofences}
              routeGeofences={routeGeofences}
              vehicles={vehicles}
              onAddAreaGeofence={handleAddAreaGeofence}
              onUpdateAreaGeofence={handleUpdateAreaGeofence}
              onDeleteAreaGeofence={handleDeleteAreaGeofence}
              onAddRouteGeofence={handleAddRouteGeofence}
              onUpdateRouteGeofence={handleUpdateRouteGeofence}
              onDeleteRouteGeofence={handleDeleteRouteGeofence}
              onTriggerAlert={handleTriggerAlert}
            />
          )}

          {activeTab === 'fuel' && (
            <FuelView
              vehicles={vehicles}
              refuelEvents={refuelEvents}
              drainEvents={drainEvents}
              initialVehicleId={selectedVehicle?.id}
              initialSubTab={fuelSubTab}
              onAddRefuelEvent={handleAddRefuelEvent}
              onSelectVehicle={setSelectedVehicle}
              onNavigateToRefuel={() => setFuelSubTab('refuels')}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              alertRules={alertRules}
              alertHistory={alertHistory}
              vehicles={vehicles}
              onAddRule={handleAddRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
              onUpdateAlertStatus={handleUpdateAlertStatus}
              onTriggerAlert={handleTriggerAlert}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView onResetData={handleResetData} />
          )}
        </main>
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          driver={drivers.find((d) => d.id === selectedVehicle.assignedDriverId || d.assignedVehicleId === selectedVehicle.id)}
          drivers={drivers}
          areaGeofences={areaGeofences}
          routeGeofences={routeGeofences}
          onClose={() => setSelectedVehicle(null)}
          onToggleIgnition={handleToggleIgnition}
          onNavigateToFuel={() => {
            setActiveTab('fuel');
          }}
          onNavigateToDriver={() => {
            setSelectedVehicle(null);
            setActiveTab('drivers');
          }}
          isLinkedToImu={selectedVehicle.id === activeImuVehicleId}
        />
      )}

      {/* Real-Time RFID Toast Notification per Requirement 9 */}
      {rfidToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-fadeIn transition-all">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
              rfidToast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                : rfidToast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/80 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                : 'bg-amber-950/95 border-amber-500/80 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
            }`}
          >
            {rfidToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-xs font-bold font-mono uppercase tracking-wider mb-1">
                {rfidToast.title}
              </div>
              <div className="text-xs text-slate-200 leading-relaxed font-mono">
                {rfidToast.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRfidToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
