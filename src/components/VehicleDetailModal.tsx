import React, { useState } from 'react';
import {
  X,
  Truck,
  Gauge,
  MapPin,
  Fuel,
  Clock,
  Key,
  User,
  Activity,
  Zap,
  Thermometer,
  Shield,
  Navigation,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { Vehicle, Driver, AreaGeofence, RouteGeofence } from '../types';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  drivers?: Driver[];
  driver?: Driver;
  areaGeofences?: AreaGeofence[];
  routeGeofences?: RouteGeofence[];
  onClose: () => void;
  onUpdateVehicle?: (updated: Vehicle) => void;
  onToggleIgnition?: (vehicleId: string) => void;
  onNavigateToFuel?: (vehicleId: string) => void;
  onNavigateToDriver?: () => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  drivers = [],
  driver,
  areaGeofences = [],
  routeGeofences = [],
  onClose,
  onUpdateVehicle,
  onToggleIgnition,
  onNavigateToFuel,
  onNavigateToDriver
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'telemetry' | 'geofence'>('overview');

  if (!vehicle) return null;

  const assignedDriver = driver || drivers.find((d) => d.id === vehicle.assignedDriverId || d.id === vehicle.driverId || d.assignedVehicleId === vehicle.id);
  const assignedGeos = (areaGeofences || []).filter((g) => vehicle.assignedGeofenceIds?.includes(g.id));
  const assignedRoute = (routeGeofences || []).find((r) => r.id === vehicle.assignedRouteId);

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'Moving':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Idling':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'Ignition On':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'Ignition Off':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
      case 'No Signal':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  const handleToggleIgnition = () => {
    if (onToggleIgnition) {
      onToggleIgnition(vehicle.id);
    } else if (onUpdateVehicle) {
      const newIgnition = !vehicle.ignition;
      const newStatus = newIgnition
        ? vehicle.currentSpeed > 0
          ? 'Moving'
          : 'Ignition On'
        : 'Ignition Off';

      onUpdateVehicle({
        ...vehicle,
        ignition: newIgnition,
        status: newStatus,
        statusDuration: '00:00:01',
        lastUpdated: 'Just now'
      });
    }
  };

  return (
    <div
      id="vehicle-detail-drawer"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
    >
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono text-white tracking-wide">
                {vehicle.plateNumber}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(vehicle.status)}`}>
                {vehicle.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{vehicle.name} • {vehicle.type}</p>
          </div>
        </div>

        <button
          id="close-detail-panel-btn"
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close detail panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeSubTab === 'overview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Status
        </button>
        <button
          onClick={() => setActiveSubTab('telemetry')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeSubTab === 'telemetry'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Expanded Telemetry
        </button>
        <button
          onClick={() => setActiveSubTab('geofence')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            activeSubTab === 'geofence'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Zones & Routes
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeSubTab === 'overview' && (
          <>
            {/* Required Primary Metrics Cards per User Prompt */}
            <div className="grid grid-cols-2 gap-3">
              {/* Speed Card */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                    Current Speed
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-white">
                    {vehicle.currentSpeed}
                  </span>
                  <span className="text-xs text-slate-400">km/h</span>
                </div>
                <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      vehicle.currentSpeed > 80
                        ? 'bg-rose-500'
                        : vehicle.currentSpeed > 0
                        ? 'bg-emerald-500'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: `${Math.min(100, (vehicle.currentSpeed / 100) * 100)}%` }}
                  />
                </div>
              </div>

              {/* State Duration Card */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    State Duration
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-white tracking-wide">
                  {vehicle.statusDuration}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 truncate">
                  State: {vehicle.status}
                </p>
              </div>

              {/* Fuel Level Card */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 col-span-2">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                    Fuel Level
                  </span>
                  <span className="font-mono text-xs text-slate-300">
                    {vehicle.currentFuelLiters} L / {vehicle.fuelCapacity} L
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className={`text-2xl font-bold font-mono ${vehicle.fuelLevel < 20 ? 'text-rose-400' : 'text-white'}`}>
                    {vehicle.fuelLevel}%
                  </span>
                  {vehicle.fuelLevel < 20 && (
                    <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 animate-pulse">
                      Low Fuel Warning
                    </span>
                  )}
                </div>
                <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      vehicle.fuelLevel < 20
                        ? 'bg-rose-500'
                        : vehicle.fuelLevel < 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${vehicle.fuelLevel}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Location per prompt */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Current Location
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  GPS: {vehicle.coordinates.lat.toFixed(4)}, {vehicle.coordinates.lng.toFixed(4)}
                </span>
              </div>
              <div className="text-sm font-semibold text-white">
                {vehicle.lastKnownLocation}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                <span>Heading: {vehicle.heading}°</span>
                <span>Last updated: {vehicle.lastUpdated}</span>
              </div>
            </div>

            {/* Ignition and Power State */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${vehicle.ignition ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Ignition Status</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{vehicle.ignition ? 'Ignition IS ON' : 'Ignition IS OFF'}</span>
                    <span className={`w-2 h-2 rounded-full ${vehicle.ignition ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  </div>
                </div>
              </div>

              {(onToggleIgnition || onUpdateVehicle) && (
                <button
                  id="toggle-ignition-modal-btn"
                  onClick={handleToggleIgnition}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    vehicle.ignition
                      ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800/60'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/60'
                  }`}
                >
                  {vehicle.ignition ? 'Turn Ignition Off' : 'Turn Ignition On'}
                </button>
              )}
            </div>

            {/* Assigned Driver Section */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Assigned Driver
                </span>
                <div className="flex items-center gap-2">
                  {assignedDriver && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/50">
                      RFID: {assignedDriver.rfidId}
                    </span>
                  )}
                  {onNavigateToDriver && (
                    <button
                      onClick={onNavigateToDriver}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      {assignedDriver ? 'Edit' : 'Assign'}
                    </button>
                  )}
                </div>
              </div>

              {assignedDriver ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{assignedDriver.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">{assignedDriver.phone}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                      ID: {assignedDriver.id} • {assignedDriver.status}
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400">Safety Score</span>
                    <div className="text-base font-bold text-emerald-400">{assignedDriver.safetyScore}/100</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-2 text-center bg-slate-900/40 rounded-lg border border-dashed border-slate-700">
                  No driver assigned. Assign from Drivers tab or tap RFID card.
                </div>
              )}
            </div>

            {/* Action to Jump to Fuel Graph */}
            {onNavigateToFuel && (
              <button
                id="jump-to-fuel-btn"
                onClick={() => {
                  onNavigateToFuel(vehicle.id);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Fuel className="w-4 h-4" />
                <span>View Full Fuel Sensor Time-Series Graph</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {activeSubTab === 'telemetry' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">
              Real-time CAN-bus and IoT gateway telemetry streamed via MQTT broker:
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  <span>Engine Temp</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {vehicle.engineTemp || 86} °C
                </div>
                <span className="text-[10px] text-emerald-400">Normal operating range</span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Alternator / Batt</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {vehicle.batteryVoltage || 24.2} V
                </div>
                <span className="text-[10px] text-emerald-400">System charging</span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Odometer Mileage</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {vehicle.mileage.toLocaleString()} km
                </div>
                <span className="text-[10px] text-slate-400">Total lifetime km</span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span>Heading Angle</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {vehicle.heading}°
                </div>
                <span className="text-[10px] text-slate-400">Directional vector</span>
              </div>
            </div>

            {/* IoT Gateway Diagnostic */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-300">IoT Sensor Health</div>
              <div className="flex justify-between text-slate-400">
                <span>GPS Satellites Locked:</span>
                <span className="font-mono text-emerald-400">14 (HDOP 0.8)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fuel Level Sensor:</span>
                <span className="font-mono text-emerald-400">Capacitive probe 0-5V (OK)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>CAN Bus Gateway:</span>
                <span className="font-mono text-emerald-400">J1939 Active</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Firmware:</span>
                <span className="font-mono text-slate-300">v4.1.2-telemetry</span>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'geofence' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Assigned Area Geofences
              </h4>
              {assignedGeos.length > 0 ? (
                <div className="space-y-2">
                  {assignedGeos.map((geo) => (
                    <div key={geo.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{geo.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400">
                          {geo.shapeType}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1">
                        Alerts on: {geo.alertOnEnter ? 'Enter' : ''} {geo.alertOnExit ? '• Exit' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                  No specific area zones bound to this vehicle.
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                Assigned Route Geofence
              </h4>
              {assignedRoute ? (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5">
                  <div className="font-bold text-white">{assignedRoute.name}</div>
                  <div className="text-slate-400 text-[11px]">
                    From: <span className="text-slate-200">{assignedRoute.startLocation.name}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    To: <span className="text-slate-200">{assignedRoute.endLocation.name}</span>
                  </div>
                  <div className="text-[11px] text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-900/50 mt-1">
                    Route deviation corridor: ±{assignedRoute.corridorWidthMeters} meters
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
                  No assigned route corridor.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
        <span>Hardware Serial: #IoT-{vehicle.id.toUpperCase()}</span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
