import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveNavTab,
  Vehicle,
  Driver,
  AreaGeofence,
  RouteGeofence,
  AlertRule,
  AlertEvent,
  RefuelEvent,
  FuelDrainEvent
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

  // Selected vehicle for modal inspection
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Unread alerts count
  const unreadAlertsCount = alertHistory.filter((a) => a.status === 'New').length;

  // Manual or automatic IoT telemetry simulation ping
  const handleSimulatePing = useCallback(() => {
    setIsSimulating(true);
    setVehicles((prevVehicles) => {
      const updated = simulateTelemetryTick(prevVehicles);

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
      setVehicles((prev) => simulateTelemetryTick(prev));
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // Update selected vehicle reference if its telemetry updates
  useEffect(() => {
    if (selectedVehicle) {
      const fresh = vehicles.find((v) => v.id === selectedVehicle.id);
      if (fresh) setSelectedVehicle(fresh);
    }
  }, [vehicles, selectedVehicle]);

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
        />
      )}
    </div>
  );
}
