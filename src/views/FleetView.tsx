import React, { useState, useMemo } from 'react';
import {
  Truck,
  Gauge,
  MapPin,
  Fuel,
  Key,
  Radio,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Columns2,
  Table as TableIcon,
  Clock,
  Cpu
} from 'lucide-react';
import { Vehicle, VehicleStatus, Driver, AreaGeofence, RouteGeofence, RfidHardwareState } from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { SpduinoImuToolbar } from '../components/SpduinoImuToolbar';

interface FleetViewProps {
  vehicles: Vehicle[];
  drivers?: Driver[];
  areaGeofences?: AreaGeofence[];
  routeGeofences?: RouteGeofence[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onToggleIgnition?: (vehicleId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeImuVehicleId?: string;
  setActiveImuVehicleId?: (id: string) => void;
  onNotifyToast?: (type: 'success' | 'error' | 'warning', title: string, message: string) => void;
  rfidGlobalState: RfidHardwareState;
}

export const FleetView: React.FC<FleetViewProps> = ({
  vehicles = [],
  drivers = [],
  areaGeofences = [],
  routeGeofences = [],
  selectedVehicle,
  onSelectVehicle,
  onToggleIgnition,
  searchQuery = '',
  activeImuVehicleId = 'veh-1',
  setActiveImuVehicleId,
  onNotifyToast,
  rfidGlobalState
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | VehicleStatus>('All');
  const [layoutMode, setLayoutMode] = useState<'split' | 'map' | 'list'>('split');
  const [localSearch, setLocalSearch] = useState('');

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: vehicles.length,
      moving: vehicles.filter((v) => v.status === 'Moving').length,
      idling: vehicles.filter((v) => v.status === 'Idling').length,
      ignitionOn: vehicles.filter((v) => v.status === 'Ignition On').length,
      ignitionOff: vehicles.filter((v) => v.status === 'Ignition Off').length,
      noSignal: vehicles.filter((v) => v.status === 'No Signal').length
    };
  }, [vehicles]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Status filter
      if (statusFilter !== 'All' && v.status !== statusFilter) {
        return false;
      }

      // Search query filter (from header or local)
      const query = (localSearch || searchQuery).trim().toLowerCase();
      if (!query) return true;

      const driver = drivers.find((d) => d.id === v.driverId || d.assignedVehicleId === v.id);
      return (
        v.plateNumber.toLowerCase().includes(query) ||
        v.name.toLowerCase().includes(query) ||
        v.lastKnownLocation.toLowerCase().includes(query) ||
        (driver && driver.name.toLowerCase().includes(query)) ||
        (driver && driver.rfidId.toLowerCase().includes(query))
      );
    });
  }, [vehicles, statusFilter, localSearch, searchQuery, drivers]);

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case 'Moving':
        return {
          pill: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dot: 'bg-emerald-500',
          pulse: true
        };
      case 'Idling':
        return {
          pill: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          dot: 'bg-amber-500',
          pulse: false
        };
      case 'Ignition On':
        return {
          pill: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
          dot: 'bg-sky-500',
          pulse: false
        };
      case 'Ignition Off':
        return {
          pill: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
          dot: 'bg-slate-500',
          pulse: false
        };
      case 'No Signal':
        return {
          pill: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          dot: 'bg-rose-500',
          pulse: false
        };
      default:
        return {
          pill: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          dot: 'bg-blue-500',
          pulse: false
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* SPDuino & GY-521 IMU Real-Time Hardware Control Bar */}
      <SpduinoImuToolbar
        selectedVehicle={selectedVehicle}
        vehicles={vehicles}
        drivers={drivers}
        activeVehicleId={activeImuVehicleId}
        setActiveVehicleId={setActiveImuVehicleId || (() => {})}
        onNotifyToast={onNotifyToast}
        rfidGlobalState={rfidGlobalState}
      />

      {/* STATUS FILTER CARDS / BUTTONS AT THE TOP (per user prompt) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* All Vehicles */}
        <button
          id="filter-all-vehicles"
          onClick={() => setStatusFilter('All')}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            statusFilter === 'All'
              ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-xs font-semibold">All Vehicles</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{counts.all}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total registered fleet</div>
        </button>

        {/* Moving */}
        <button
          id="filter-moving-vehicles"
          onClick={() => setStatusFilter('Moving')}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            statusFilter === 'Moving'
              ? 'bg-emerald-600/20 border-emerald-500 shadow-md shadow-emerald-500/10'
              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-xs font-semibold">Moving</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{counts.moving}</div>
          <div className="text-[10px] text-slate-400 mt-1">On road in-transit</div>
        </button>

        {/* Idling */}
        <button
          id="filter-idling-vehicles"
          onClick={() => setStatusFilter('Idling')}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            statusFilter === 'Idling'
              ? 'bg-amber-600/20 border-amber-500 shadow-md shadow-amber-500/10'
              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-xs font-semibold">Idling</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{counts.idling}</div>
          <div className="text-[10px] text-slate-400 mt-1">Stationary w/ engine</div>
        </button>

        {/* Ignition On */}
        <button
          id="filter-ignition-on-vehicles"
          onClick={() => setStatusFilter('Ignition On')}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            statusFilter === 'Ignition On'
              ? 'bg-sky-600/20 border-sky-500 shadow-md shadow-sky-500/10'
              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-xs font-semibold">Ignition On</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">{counts.ignitionOn}</div>
          <div className="text-[10px] text-slate-400 mt-1">Pre-trip / staging</div>
        </button>

        {/* Ignition Off */}
        <button
          id="filter-ignition-off-vehicles"
          onClick={() => setStatusFilter('Ignition Off')}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            statusFilter === 'Ignition Off'
              ? 'bg-slate-600/30 border-slate-400 shadow-md'
              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-xs font-semibold">Ignition Off</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300">{counts.ignitionOff}</div>
          <div className="text-[10px] text-slate-400 mt-1">Parked in depot / rest</div>
        </button>

        {/* No Signal */}
        <button
          id="filter-no-signal-vehicles"
          onClick={() => setStatusFilter('No Signal')}
          className={`p-3.5 rounded-xl text-left transition-all border ${
            statusFilter === 'No Signal'
              ? 'bg-rose-600/20 border-rose-500 shadow-md shadow-rose-500/10'
              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-xs font-semibold">No Signal</span>
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{counts.noSignal}</div>
          <div className="text-[10px] text-slate-400 mt-1">Offline / blind zone</div>
        </button>
      </div>

      {/* Controls Bar: Search & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle plate, location, or driver..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <span className="text-xs text-slate-400 whitespace-nowrap">
            Showing <strong className="text-white">{filteredVehicles.length}</strong> of {vehicles.length}
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 self-end sm:self-auto">
          <button
            onClick={() => setLayoutMode('split')}
            title="Split view (List & Map)"
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              layoutMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Split</span>
          </button>
          <button
            onClick={() => setLayoutMode('map')}
            title="Full Map View"
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              layoutMode === 'map' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Map Only</span>
          </button>
          <button
            onClick={() => setLayoutMode('list')}
            title="Full Vehicle List / Table"
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              layoutMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Table Only</span>
          </button>
        </div>
      </div>

      {/* Main Display: Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Vehicles List / Cards Column */}
        {layoutMode !== 'map' && (
          <div
            className={`space-y-3 ${
              layoutMode === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-12'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
              <span>REGISTERED VEHICLES & CURRENT TELEMETRY</span>
              <span>Click card for detail telemetry</span>
            </div>

            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredVehicles.map((vehicle) => {
                const isSelected = selectedVehicle?.id === vehicle.id;
                const statusTheme = getStatusColor(vehicle.status);
                const assignedDriver = drivers.find(
                  (d) => d.id === vehicle.driverId || d.assignedVehicleId === vehicle.id
                );

                return (
                  <div
                    id={`vehicle-card-${vehicle.id}`}
                    key={vehicle.id}
                    onClick={() => onSelectVehicle(vehicle)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-slate-800/95 border-blue-500 ring-2 ring-blue-500/30 shadow-xl'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 shadow-sm'
                    }`}
                  >
                    {/* Top line: Plate + Status + Ignition */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-white tracking-wide">
                          {vehicle.plateNumber}
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">• {vehicle.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${statusTheme.pill}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusTheme.dot} ${
                              statusTheme.pulse ? 'animate-pulse' : ''
                            }`}
                          />
                          {vehicle.status}
                        </span>

                        {/* State Duration */}
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700/60 hidden sm:flex items-center gap-1"
                          title="State Duration"
                        >
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>{vehicle.statusDuration}</span>
                        </span>

                        {/* Ignition Indicator */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleIgnition) {
                              onToggleIgnition(vehicle.id);
                            }
                          }}
                          title={vehicle.ignition ? 'Ignition is ON (click to switch OFF)' : 'Ignition is OFF (click to switch ON)'}
                          className={`p-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors hover:brightness-125 ${
                            vehicle.ignition
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <Key className="w-3 h-3" />
                          <span className="hidden sm:inline">{vehicle.ignition ? 'IGN ON' : 'IGN OFF'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Middle: Metrics Grid required by Prompt:
                        - Vehicle number/name
                        - Current speed
                        - Current status
                        - Fuel level
                        - Last known location
                        - whether ignition is on or off */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-700/50 text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] block">Current Speed</span>
                          {vehicle.id === activeImuVehicleId && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-800">
                              IMU SIMULATED
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={`font-mono font-bold text-sm ${
                              vehicle.currentSpeed > 0 ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {vehicle.currentSpeed} km/h
                          </span>
                          {vehicle.id === activeImuVehicleId && (
                            <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">(GY-521)</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block">Fuel Level</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-sm ${
                              vehicle.fuelLevel < 20 ? 'text-rose-400' : 'text-slate-200'
                            }`}
                          >
                            {vehicle.fuelLevel}%
                          </span>
                          <span className="text-[10px] text-slate-400">({vehicle.currentFuelLiters}L)</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block">Driver</span>
                        <span className="font-semibold text-slate-200 truncate block text-xs">
                          {assignedDriver ? assignedDriver.name : 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Location & Telemetry Timestamp */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate">{vehicle.lastKnownLocation}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                    </div>
                  </div>
                );
              })}

              {filteredVehicles.length === 0 && (
                <div className="p-8 text-center bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-slate-400">
                  <Truck className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                  <p className="text-sm font-semibold">No vehicles match the selected filter.</p>
                  <p className="text-xs mt-1">Try resetting the status filter or clearing search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Map Column */}
        {layoutMode !== 'list' && (
          <div
            className={`${
              layoutMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'
            }`}
          >
            <div className="sticky top-20">
              <LeafletMap
                vehicles={filteredVehicles}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={onSelectVehicle}
                areaGeofences={areaGeofences}
                routeGeofences={routeGeofences}
                showGeofences={true}
                height={layoutMode === 'map' ? '720px' : '640px'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
