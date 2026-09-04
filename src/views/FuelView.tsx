import React, { useState, useMemo, useEffect } from 'react';
import {
  Fuel,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Gauge,
  Activity,
  Droplet,
  Truck,
  ArrowUpRight,
  ShieldAlert,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Vehicle, RefuelEvent, FuelDrainEvent } from '../types';
import { generateFuelHistory } from '../mockData';
import { RefuelView } from './RefuelView';

interface FuelViewProps {
  vehicles: Vehicle[];
  refuelEvents: RefuelEvent[];
  drainEvents: FuelDrainEvent[];
  initialVehicleId?: string;
  initialSubTab?: 'telemetry' | 'refuels';
  onAddRefuelEvent?: (event: RefuelEvent) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onNavigateToRefuel?: () => void;
}

export const FuelView: React.FC<FuelViewProps> = ({
  vehicles,
  refuelEvents,
  drainEvents,
  initialVehicleId,
  initialSubTab,
  onAddRefuelEvent,
  onSelectVehicle,
  onNavigateToRefuel
}) => {
  const [fuelSubTab, setFuelSubTab] = useState<'telemetry' | 'refuels'>(
    initialSubTab || 'telemetry'
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicleId || vehicles[0]?.id || ''
  );
  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days' | 'Custom'>('Today');
  const [customStartDate, setCustomStartDate] = useState('2026-08-25');
  const [customEndDate, setCustomEndDate] = useState('2026-09-03');
  const [appliedCustomKey, setAppliedCustomKey] = useState(0);

  useEffect(() => {
    if (initialSubTab) {
      setFuelSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialVehicleId) {
      setSelectedVehicleId(initialVehicleId);
    }
  }, [initialVehicleId]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  }, [vehicles, selectedVehicleId]);

  // Generate dynamic time-series data for the selected vehicle & range
  const chartData = useMemo(() => {
    if (!selectedVehicle) return [];
    return generateFuelHistory(timeRange, selectedVehicle.fuelCapacity, selectedVehicle.fuelLevel);
  }, [selectedVehicle, timeRange, appliedCustomKey]);

  // Vehicle-specific refuel events
  const vehicleRefuels = useMemo(() => {
    return refuelEvents.filter((r) => r.vehicleId === selectedVehicle?.id);
  }, [refuelEvents, selectedVehicle]);

  // Vehicle-specific drain events
  const vehicleDrains = useMemo(() => {
    return drainEvents.filter((d) => d.vehicleId === selectedVehicle?.id);
  }, [drainEvents, selectedVehicle]);

  // Fleet-wide fuel metrics
  const avgFleetFuel = useMemo(() => {
    if (!vehicles.length) return 0;
    const sum = vehicles.reduce((acc, v) => acc + (v.fuelLevel || 0), 0);
    return Math.round(sum / vehicles.length);
  }, [vehicles]);

  const lowFuelCount = useMemo(() => {
    return vehicles.filter((v) => v.fuelLevel < 25).length;
  }, [vehicles]);

  return (
    <div className="space-y-6">
      {/* Fuel Sub-Navigation: Sensor Telemetry vs Refueling Ledger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            id="fuel-subtab-telemetry-btn"
            type="button"
            onClick={() => setFuelSubTab('telemetry')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              fuelSubTab === 'telemetry'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Probe Telemetry & Diagnostics</span>
          </button>

          <button
            id="fuel-subtab-refuels-btn"
            type="button"
            onClick={() => setFuelSubTab('refuels')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
              fuelSubTab === 'refuels'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Refueling Ledger & Audit</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                fuelSubTab === 'refuels' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-emerald-400'
              }`}
            >
              {refuelEvents.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          {fuelSubTab === 'telemetry' ? (
            <button
              onClick={() => setFuelSubTab('refuels')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Open Refueling Ledger ({refuelEvents.length})</span>
            </button>
          ) : (
            <button
              onClick={() => setFuelSubTab('telemetry')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Back to Sensor Telemetry</span>
            </button>
          )}
        </div>
      </div>

      {fuelSubTab === 'refuels' ? (
        <RefuelView
          refuelEvents={refuelEvents}
          vehicles={vehicles}
          onAddRefuelEvent={onAddRefuelEvent || (() => {})}
          onSelectVehicle={onSelectVehicle || (() => {})}
        />
      ) : (
        <>
          {/* Header & Vehicle Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Fuel className="w-5 h-5 text-emerald-400" />
            <span>Fuel Telemetry & Sensor Diagnostics</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time IoT capacitive fuel probe readings, consumption patterns, and anti-theft drain detection.
          </p>
        </div>

        {/* Vehicle Selector Dropdown */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-400 whitespace-nowrap">Select Vehicle:</label>
          <select
            id="fuel-vehicle-select"
            value={selectedVehicle?.id}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:ring-1 focus:ring-emerald-500"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNumber} • {v.fuelLevel}% ({v.currentFuelLiters}L) • {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Vehicle Key Metrics Cards per User Prompt:
          - Current fuel level
          - Mileage
          - Refuel events/history and drain history */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Fuel Level */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-emerald-400" />
              Current Fuel Level
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Capacity: {selectedVehicle?.fuelCapacity} L
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold font-mono ${selectedVehicle?.fuelLevel < 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {selectedVehicle?.fuelLevel}%
              </span>
              <span className="text-sm font-mono text-slate-300">
                ({selectedVehicle?.currentFuelLiters} L)
              </span>
            </div>
            {selectedVehicle?.fuelLevel < 25 && (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50 animate-pulse">
                Low Fuel Alert
              </span>
            )}
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                selectedVehicle?.fuelLevel < 25 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${selectedVehicle?.fuelLevel}%` }}
            />
          </div>
        </div>

        {/* Total Mileage (km) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-400" />
              Odometer Mileage
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Verified CAN-Bus</span>
          </div>
          <div className="text-3xl font-bold font-mono text-white mb-1">
            {selectedVehicle?.mileage.toLocaleString()} <span className="text-sm font-normal text-slate-400">km</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Est. range remaining: ~{Math.round((selectedVehicle?.currentFuelLiters || 0) * 3.4)} km
          </p>
        </div>

        {/* Refuel Events */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Refuel Events Logged
            </span>
            <button
              onClick={() => setFuelSubTab('refuels')}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              View Ledger <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="text-3xl font-bold font-mono text-white mb-1">
            {vehicleRefuels.length}{' '}
            <span className="text-sm font-normal text-slate-400">fills</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Total volume added: {vehicleRefuels.reduce((acc, r) => acc + r.fuelAdded, 0)} L
          </p>
        </div>

        {/* Drain / Theft Audit */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Fuel Drain Audit
            </span>
            <span className="text-[11px] font-mono text-slate-400">Anti-Siphon</span>
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400 mb-1">
            {vehicleDrains.length}{' '}
            <span className="text-sm font-normal text-slate-400">anomalies</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {vehicleDrains.some((d) => d.suspectedTheft)
              ? '⚠️ Potential unauthorized fuel drop detected'
              : 'No abnormal fuel drain events logged'}
          </p>
        </div>
      </div>

      {/* INTERACTIVE FUEL LEVEL GRAPH (per user prompt) */}
      <div className="p-5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Interactive Fuel Level Time-Series Telemetry</span>
            </h3>
            <p className="text-xs text-slate-400">
              Sensor data stream for {selectedVehicle?.plateNumber} ({selectedVehicle?.name})
            </p>
          </div>

          {/* Time range selector per prompt: Today, 7 Days, 30 Days, Custom */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
            {(['Today', '7 Days', '30 Days', 'Custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  timeRange === r
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers when 'Custom' selected */}
        {timeRange === 'Custom' && (
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Custom Range:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
              />
            </div>
            <button
              onClick={() => setAppliedCustomKey((k) => k + 1)}
              className="px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-500"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Recharts Fuel Area Chart */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="timestamp"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs font-sans space-y-1">
                        <div className="font-bold text-white border-b border-slate-800 pb-1">
                          ⏱ {label}
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300">
                          <span>Fuel Level:</span>
                          <span className="font-bold text-emerald-400">{data.fuelLevelPercent}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300">
                          <span>Fuel Volume:</span>
                          <span className="font-mono text-white">{data.fuelLiters} Liters</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400">
                          <span>Vehicle Speed:</span>
                          <span>{data.speed} km/h</span>
                        </div>
                        {data.isRefuel && (
                          <div className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 mt-1">
                            ⛽ Refuel Event Detected
                          </div>
                        )}
                        {data.isDrain && (
                          <div className="text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60 mt-1">
                            ⚠️ Sudden Drain Detected
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Low Fuel Threshold Line at 20% */}
              <ReferenceLine
                y={20}
                label={{
                  value: 'Low Fuel Threshold (20%)',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideBottomRight'
                }}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />

              <Area
                type="monotone"
                dataKey="fuelLevelPercent"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#fuelGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fleet Overview Fuel Status Table */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            All Fleet Vehicles Fuel Status Audit
          </h4>
          <span className="text-xs text-slate-400">
            Average Fleet Fuel: <strong className="text-emerald-400">{avgFleetFuel}%</strong> • Low Fuel Warnings: <strong className="text-rose-400">{lowFuelCount}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Fuel Level</th>
                <th className="py-3 px-4">Liters / Capacity</th>
                <th className="py-3 px-4">Odometer</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {vehicles.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${
                    selectedVehicle?.id === v.id ? 'bg-slate-800/60' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-white">{v.plateNumber}</span>
                    <span className="text-slate-400 block text-[11px]">{v.name}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {v.status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${v.fuelLevel < 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {v.fuelLevel}%
                      </span>
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${v.fuelLevel < 25 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${v.fuelLevel}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-300">
                    {v.currentFuelLiters} L / {v.fuelCapacity} L
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-300">
                    {v.mileage.toLocaleString()} km
                  </td>

                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        selectedVehicle?.id === v.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {selectedVehicle?.id === v.id ? 'Graph Active' : 'Inspect Graph'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
