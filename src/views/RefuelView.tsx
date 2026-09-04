import React, { useState } from 'react';
import {
  History,
  TrendingUp,
  MapPin,
  Clock,
  Plus,
  Search,
  Receipt,
  Truck,
  User,
  Gauge,
  X,
  Sparkles,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { RefuelEvent, Vehicle } from '../types';

interface RefuelViewProps {
  refuelEvents: RefuelEvent[];
  vehicles: Vehicle[];
  onAddRefuelEvent: (event: RefuelEvent) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const RefuelView: React.FC<RefuelViewProps> = ({
  refuelEvents,
  vehicles,
  onAddRefuelEvent,
  onSelectVehicle
}) => {
  const [selectedEvent, setSelectedEvent] = useState<RefuelEvent | null>(null);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New refuel form state
  const [newRefuel, setNewRefuel] = useState<Partial<RefuelEvent>>({
    vehicleId: vehicles[0]?.id || '',
    fuelBefore: 20,
    fuelAfter: 75,
    fuelAdded: 55,
    location: 'Chennai Port Fuel Depot',
    stationName: 'Indian Oil Fleet Terminal #4',
    driverName: 'Rajesh Kumar',
    odometer: 148250,
    receiptNumber: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
    cost: 5120
  });

  const filteredEvents = refuelEvents.filter((ev) => {
    const q = search.toLowerCase();
    return (
      ev.vehiclePlate.toLowerCase().includes(q) ||
      ev.location.toLowerCase().includes(q) ||
      (ev.driverName && ev.driverName.toLowerCase().includes(q)) ||
      (ev.stationName && ev.stationName.toLowerCase().includes(q))
    );
  });

  const handleCreateRefuel = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.id === newRefuel.vehicleId) || vehicles[0];
    const before = Number(newRefuel.fuelBefore) || 20;
    const after = Number(newRefuel.fuelAfter) || 70;
    const added = after - before > 0 ? after - before : Number(newRefuel.fuelAdded) || 50;

    const event: RefuelEvent = {
      id: `ref-${Date.now()}`,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plateNumber,
      timestamp: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      fuelBefore: before,
      fuelAfter: after,
      fuelAdded: added,
      location: newRefuel.location || 'Ajman',
      stationName: newRefuel.stationName || 'Fleet Depot Terminal',
      driverName: newRefuel.driverName || 'Ahmed Khan',
      odometer: Number(newRefuel.odometer) || vehicle.mileage,
      receiptNumber: newRefuel.receiptNumber || `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
      cost: Number(newRefuel.cost) || Math.round(added * 3.2)
    };

    onAddRefuelEvent(event);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Refueling Events & Fuel Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit trail of verified fuel refills, volume variance, and station dispensing records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="log-refuel-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Refuel Event</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search refuel logs by vehicle, location (e.g. Ajman), station, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <span className="text-xs text-slate-400">
          Total Refuel Records: <strong className="text-white">{filteredEvents.length}</strong>
        </span>
      </div>

      {/* REFUEL TABLE / LIST (Per Prompt Requirements)
          Fields:
          - Vehicle
          - Date/time
          - Fuel before refuel
          - Fuel after refuel
          - Fuel added
          - Location
          Example:
          TN-XX-XXXX
          04 Sep 2026, 09:20
          Before: 22 L
          After: 72 L
          Added: 50 L
          Location: Ajman
          Allow clicking a refuel event for more details. */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">Date / Time</th>
                <th className="py-3.5 px-4">Fuel Before</th>
                <th className="py-3.5 px-4">Fuel After</th>
                <th className="py-3.5 px-4">Fuel Added</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                      {event.vehiclePlate}
                    </span>
                    <span className="text-slate-400 block text-[11px]">
                      {event.driverName || 'Fleet Driver'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.timestamp}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-slate-300">
                      Before: <strong className="text-amber-400">{event.fuelBefore} L</strong>
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-slate-300">
                      After: <strong className="text-emerald-400">{event.fuelAfter} L</strong>
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50 text-xs">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{event.fuelAdded} L
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="font-semibold">{event.location}</span>
                    </div>
                    {event.stationName && (
                      <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                        {event.stationName}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="px-3 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      Inspect Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refuel Event Detail Modal (when clicked per prompt) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-white">
                    {selectedEvent.vehiclePlate} Refuel Audit
                  </h3>
                  <p className="text-xs text-slate-400">Receipt ID: {selectedEvent.receiptNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fuel Volume Comparison Box */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Volume Added:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  +{selectedEvent.fuelAdded} Liters
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Fuel Before:</span>
                  <span className="text-base font-bold font-mono text-amber-400">
                    {selectedEvent.fuelBefore} L
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Fuel After:</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {selectedEvent.fuelAfter} L
                  </span>
                </div>
              </div>

              {/* Visual fill delta bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Tank Before: {selectedEvent.fuelBefore}L</span>
                  <span>Filled to: {selectedEvent.fuelAfter}L</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${(selectedEvent.fuelBefore / 100) * 100}%` }}
                  />
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(selectedEvent.fuelAdded / 100) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Location</span>
                </div>
                <div className="font-bold text-white text-sm">{selectedEvent.location}</div>
                <span className="text-[11px] text-slate-400 block truncate">
                  {selectedEvent.stationName}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Timestamp</span>
                </div>
                <div className="font-bold text-white font-mono">{selectedEvent.timestamp}</div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Dispensing Driver</span>
                </div>
                <div className="font-bold text-white">{selectedEvent.driverName || 'Fleet Operator'}</div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Odometer at Refuel</span>
                </div>
                <div className="font-bold font-mono text-white">
                  {selectedEvent.odometer?.toLocaleString()} km
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Refuel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Log New Refuel Event</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRefuel} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Vehicle *</label>
                <select
                  value={newRefuel.vehicleId}
                  onChange={(e) => setNewRefuel({ ...newRefuel, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Fuel Before Refuel (L) *</label>
                  <input
                    type="number"
                    required
                    value={newRefuel.fuelBefore}
                    onChange={(e) => setNewRefuel({ ...newRefuel, fuelBefore: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Fuel After Refuel (L) *</label>
                  <input
                    type="number"
                    required
                    value={newRefuel.fuelAfter}
                    onChange={(e) => setNewRefuel({ ...newRefuel, fuelAfter: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ajman"
                    value={newRefuel.location}
                    onChange={(e) => setNewRefuel({ ...newRefuel, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Station Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Emirates National Fuel"
                    value={newRefuel.stationName}
                    onChange={(e) => setNewRefuel({ ...newRefuel, stationName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmed Khan"
                    value={newRefuel.driverName}
                    onChange={(e) => setNewRefuel({ ...newRefuel, driverName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={newRefuel.odometer}
                    onChange={(e) => setNewRefuel({ ...newRefuel, odometer: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Save Refuel Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
