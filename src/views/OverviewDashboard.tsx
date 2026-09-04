import React from 'react';
import {
  Truck,
  Gauge,
  Fuel,
  Users,
  Bell,
  MapPin,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Radio,
  Clock,
  Key
} from 'lucide-react';
import { Vehicle, Driver, AlertEvent, RefuelEvent, AreaGeofence, RouteGeofence, ActiveNavTab } from '../types';
import { LeafletMap } from '../components/LeafletMap';

interface OverviewDashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  alerts: AlertEvent[];
  refuelEvents: RefuelEvent[];
  areaGeofences: AreaGeofence[];
  routeGeofences: RouteGeofence[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  onNavigateToRefuel?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  vehicles,
  drivers,
  alerts,
  refuelEvents,
  areaGeofences,
  routeGeofences,
  onSelectVehicle,
  onNavigateTab,
  onNavigateToRefuel
}) => {
  const movingCount = vehicles.filter((v) => v.status === 'Moving').length;
  const idlingCount = vehicles.filter((v) => v.status === 'Idling').length;
  const ignitionOnCount = vehicles.filter((v) => v.status === 'Ignition On').length;
  const ignitionOffCount = vehicles.filter((v) => v.status === 'Ignition Off').length;
  const offlineCount = vehicles.filter((v) => v.status === 'No Signal').length;

  const activeDriversCount = drivers.filter((d) => d.status === 'Active' || d.status === 'On Duty').length;
  const unacknowledgedAlerts = alerts.filter((a) => a.status === 'New');

  const avgFuelPct = vehicles.length
    ? Math.round(vehicles.reduce((acc, v) => acc + (v.fuelLevel || 0), 0) / vehicles.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome / Fleet Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Fleet */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold">All Vehicles</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{vehicles.length}</div>
          <p className="text-[10px] text-slate-400 mt-1">100% telemetry online</p>
        </div>

        {/* Moving */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-700/50 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold">Moving</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{movingCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">On highway routes</p>
        </div>

        {/* Idling */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-700/50 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold">Idling</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{idlingCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Engine on / idle &gt; 15m</p>
        </div>

        {/* Ignition On */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-sky-700/50 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold">Ignition On</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">{ignitionOnCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Staging / pre-trip</p>
        </div>

        {/* Ignition Off */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-600 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold">Ignition Off</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300">{ignitionOffCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Parked at depot</p>
        </div>

        {/* No Signal */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-700/50 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold">No Signal</span>
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{offlineCount}</div>
          <p className="text-[10px] text-slate-400 mt-1">Signal loss &gt; 120m</p>
        </div>
      </div>

      {/* Main Center Grid: Live Map Snapshot + Right Side Operations Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Fleet Map Section */}
        <div className="lg:col-span-8 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Live Fleet GPS Telemetry Map</h3>
                <p className="text-[11px] text-slate-400">
                  Real-time positions, heading vectors, and active geofence boundaries
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('fleet')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Full Fleet View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full h-[460px] rounded-xl overflow-hidden">
            <LeafletMap
              vehicles={vehicles}
              selectedVehicle={null}
              onSelectVehicle={onSelectVehicle}
              areaGeofences={areaGeofences}
              routeGeofences={routeGeofences}
              showGeofences={true}
              height="100%"
            />
          </div>
        </div>

        {/* Right Column: Fleet Health & Active Alerts */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Fleet Health Cards */}
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Operational Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                  Average Fleet Fuel
                </span>
                <span className="font-bold text-emerald-400 font-mono">{avgFuelPct}%</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Active Drivers On Duty
                </span>
                <span className="font-bold text-white font-mono">{activeDriversCount} / {drivers.length}</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-400" />
                  Unresolved Alerts
                </span>
                <span className="font-bold text-rose-400 font-mono">{unacknowledgedAlerts.length}</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts Feed */}
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>Recent Alert Feed</span>
              </h4>
              <button
                onClick={() => onNavigateTab('notifications')}
                className="text-[11px] text-blue-400 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => onNavigateTab('notifications')}
                  className="p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-[11px]">
                      {alert.vehiclePlate}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        alert.alertType === 'Fuel Alert'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : alert.alertType === 'Refuel Alert'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {alert.alertType}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] line-clamp-2">{alert.message}</p>
                  <div className="text-[10px] text-slate-500">{alert.timestamp}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Refuel Snapshot */}
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recent Refuels</span>
              </h4>
              <button
                onClick={() => (onNavigateToRefuel ? onNavigateToRefuel() : onNavigateTab('fuel'))}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Refuel Log →
              </button>
            </div>

            <div className="space-y-2">
              {refuelEvents.slice(0, 2).map((ref) => (
                <div
                  key={ref.id}
                  onClick={() => (onNavigateToRefuel ? onNavigateToRefuel() : onNavigateTab('fuel'))}
                  className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-white">{ref.vehiclePlate}</span>
                    <div className="text-[11px] text-slate-400">
                      📍 {ref.location} • {ref.timestamp}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-xs">
                    +{ref.fuelAdded} L
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
