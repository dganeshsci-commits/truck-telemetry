import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Radio,
  Truck,
  Phone,
  CreditCard,
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Driver, Vehicle, DriverStatus, RfidHardwareState, AlertEvent } from '../types';
import { RfidHardwareTestSection } from '../components/RfidHardwareTestSection';

interface DriversViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onAddDriver: (driver: Driver) => void;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver?: (driverId: string) => void;
  onAssignVehicle?: (driverId: string, vehicleId?: string) => void;
  onAssignRfid?: (driverId: string, vehicleId: string) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (vehicle: Vehicle) => void;
  onTriggerAlert?: (alert: AlertEvent) => void;
  onNotifyToast?: (type: 'success' | 'error' | 'warning', title: string, message: string) => void;
  rfidGlobalState: RfidHardwareState;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  vehicles,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onAssignVehicle,
  onAssignRfid,
  onSelectVehicle,
  onUpdateVehicle,
  onTriggerAlert,
  onNotifyToast,
  rfidGlobalState
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DriverStatus>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Add driver form state
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({
    id: `DRV00${drivers.length + 1}`,
    name: '',
    phone: '',
    rfidId: `RFID${Math.floor(100000 + Math.random() * 900000)}`,
    status: 'Inactive',
    licenseNumber: '',
    experienceYears: 5,
    assignedVehicleId: ''
  });

  const filteredDrivers = drivers.filter((d) => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    const q = search.toLowerCase();
    const dRfid = (d.rfidUid || d.rfidId || '').toLowerCase();
    const dName = (d.driverName || d.name || '').toLowerCase();
    const dId = (d.driverId || d.id || '').toLowerCase();
    const dVeh = (d.assignedVehicle || '').toLowerCase();
    return (
      dName.includes(q) ||
      dId.includes(q) ||
      dRfid.includes(q) ||
      d.phone.includes(q) ||
      dVeh.includes(q)
    );
  });

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.phone) return;

    const created: Driver = {
      id: newDriver.id || `DRV00${drivers.length + 1}`,
      driverId: newDriver.id || `DRV00${drivers.length + 1}`,
      name: newDriver.name,
      driverName: newDriver.name,
      phone: newDriver.phone,
      assignedVehicleId: newDriver.assignedVehicleId || undefined,
      assignedVehicle: vehicles.find((v) => v.id === newDriver.assignedVehicleId)?.plateNumber,
      rfidId: newDriver.rfidId || `RFID${Math.floor(100000 + Math.random() * 900000)}`,
      rfidUid: newDriver.rfidId || `RFID${Math.floor(100000 + Math.random() * 900000)}`,
      status: (newDriver.status as DriverStatus) || 'Inactive',
      licenseNumber: newDriver.licenseNumber || 'TN-NEW-LIC',
      experienceYears: Number(newDriver.experienceYears) || 3,
      joinedDate: 'Just now',
      totalTrips: 0,
      safetyScore: 98
    };

    onAddDriver(created);
    setIsAddModalOpen(false);
    setNewDriver({
      id: `DRV00${drivers.length + 2}`,
      name: '',
      phone: '',
      rfidId: `RFID${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Inactive',
      licenseNumber: '',
      experienceYears: 5,
      assignedVehicleId: ''
    });
  };

  const handleToggleStatus = (driver: Driver) => {
    const nextStatus: DriverStatus = driver.status === 'Active' ? 'Inactive' : 'Active';
    const timestamp = new Date().toLocaleTimeString();
    const updated: Driver = {
      ...driver,
      status: nextStatus,
      loginTime: nextStatus === 'Active' ? (driver.loginTime || timestamp) : driver.loginTime,
      lastRfidScan: timestamp
    };
    onUpdateDriver(updated);

    // Also toggle assigned vehicle status if deactivating
    if (nextStatus === 'Inactive' && onUpdateVehicle) {
      const assignedVeh = vehicles.find(
        (v) => v.id === driver.assignedVehicleId || v.assignedDriverId === driver.id
      );
      if (assignedVeh) {
        onUpdateVehicle({
          ...assignedVeh,
          status: 'Ignition Off',
          ignition: false,
          currentSpeed: 0
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. REAL-TIME RFID HARDWARE TESTING SECTION */}
      <RfidHardwareTestSection
        drivers={drivers}
        vehicles={vehicles}
        onUpdateDriver={onUpdateDriver}
        onUpdateVehicle={onUpdateVehicle || (() => {})}
        onTriggerAlert={onTriggerAlert || (() => {})}
        onNotifyToast={onNotifyToast}
        rfidGlobalState={rfidGlobalState}
      />

      {/* 2. Top Header Controls for Drivers Roster */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Driver Roster & Vehicle Assignments</span>
          </h2>
          <p className="text-xs text-slate-400">
            Commercial fleet personnel records, registered RFID contactless tags, and live login state.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Add Driver Button */}
          <button
            id="add-driver-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver by name, ID, phone, RFID UID, or vehicle plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'Active', 'On Duty', 'Resting', 'Inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-700/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Driver List Table with Exact 10 Required Columns (Req 13) */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-3">Driver ID</th>
                <th className="py-3.5 px-4">Driver Name</th>
                <th className="py-3.5 px-3">RFID UID</th>
                <th className="py-3.5 px-3">Phone</th>
                <th className="py-3.5 px-3">Assigned Vehicle</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Safety Score</th>
                <th className="py-3.5 px-3">Login Time</th>
                <th className="py-3.5 px-3">Last RFID Scan</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredDrivers.map((driver) => {
                const assignedVehicle = vehicles.find(
                  (v) =>
                    v.id === driver.assignedVehicleId ||
                    v.driverId === driver.id ||
                    v.plateNumber.toUpperCase() === (driver.assignedVehicle || '').toUpperCase()
                );

                const rfidToken = driver.rfidUid || driver.rfidId;
                const vehiclePlate = assignedVehicle ? assignedVehicle.plateNumber : (driver.assignedVehicle || 'Unassigned');

                return (
                  <tr
                    key={driver.id}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedDriver(driver)}
                  >
                    {/* 1. Driver ID */}
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-300">
                      {driver.id}
                    </td>

                    {/* 2. Driver Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{driver.name}</div>
                      <div className="text-[10px] text-slate-400">Lic: {driver.licenseNumber}</div>
                    </td>

                    {/* 3. RFID UID */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs text-blue-300 bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded inline-block">
                        {rfidToken}
                      </span>
                    </td>

                    {/* 4. Phone */}
                    <td className="py-3.5 px-3 text-slate-300 font-mono">
                      {driver.phone}
                    </td>

                    {/* 5. Assigned Vehicle */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={assignedVehicle?.id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (onAssignVehicle) {
                            onAssignVehicle(driver.id, val ? val : undefined);
                          } else if (onAssignRfid && val) {
                            onAssignRfid(driver.id, val);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-blue-500 font-mono"
                      >
                        <option value="">{driver.assignedVehicle || 'Unassigned'}</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plateNumber}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 6. Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          driver.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : driver.status === 'On Duty'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            : driver.status === 'Resting'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-slate-700/40 text-slate-400 border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            driver.status === 'Active'
                              ? 'bg-emerald-400 animate-pulse'
                              : driver.status === 'On Duty'
                              ? 'bg-blue-400'
                              : driver.status === 'Resting'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span>{driver.status}</span>
                      </span>
                    </td>

                    {/* 7. Safety Score */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-400">{driver.safetyScore}%</span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${driver.safetyScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 8. Login Time */}
                    <td className="py-3.5 px-3 font-mono text-slate-400">
                      {driver.loginTime || '--------'}
                    </td>

                    {/* 9. Last RFID Scan */}
                    <td className="py-3.5 px-3 font-mono text-slate-400">
                      {driver.lastRfidScan || '--------'}
                    </td>

                    {/* 10. Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(driver)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            driver.status === 'Active'
                              ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-slate-700'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                          }`}
                          title={driver.status === 'Active' ? 'Deactivate session' : 'Activate driver'}
                        >
                          {driver.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Register New Fleet Driver</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  placeholder="e.g. Ahmed Khan"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Driver ID</label>
                  <input
                    type="text"
                    value={newDriver.id}
                    onChange={(e) => setNewDriver({ ...newDriver, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">RFID Identification Tag *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.rfidId}
                    onChange={(e) => setNewDriver({ ...newDriver, rfidId: e.target.value })}
                    placeholder="RFID102934"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Commercial License #</label>
                  <input
                    type="text"
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                    placeholder="TN-01-2022-XXXX"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assign Initial Vehicle</label>
                <select
                  value={newDriver.assignedVehicleId}
                  onChange={(e) => setNewDriver({ ...newDriver, assignedVehicleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                >
                  <option value="">Leave Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} - {v.name}
                    </option>
                  ))}
                </select>
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Save Driver Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Detail Drawer / Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedDriver.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedDriver.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">RFID Token</span>
                <span className="font-mono font-bold text-blue-400 text-sm">
                  {selectedDriver.rfidUid || selectedDriver.rfidId}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Phone Number</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {selectedDriver.phone}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Login Time</span>
                <span className="font-mono text-emerald-400 text-xs font-bold">
                  {selectedDriver.loginTime || 'Not Logged In'}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Last RFID Scan</span>
                <span className="font-mono text-blue-300 text-xs">
                  {selectedDriver.lastRfidScan || 'No Scans Recorded'}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Commercial License</span>
                <span className="font-mono text-slate-200 text-xs">
                  {selectedDriver.licenseNumber}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Total Trips Completed</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {selectedDriver.totalTrips} Trips
                </span>
              </div>
            </div>

            {/* Driver Status Update & Historical Logs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-semibold block mb-1">Update Driver Status:</span>
                <select
                  value={selectedDriver.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as DriverStatus;
                    const updated = { ...selectedDriver, status: newStatus };
                    setSelectedDriver(updated);
                    onUpdateDriver(updated);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="Active">Active</option>
                  <option value="On Duty">On Duty</option>
                  <option value="Resting">Resting</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-semibold block mb-1">Safety Rating:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-emerald-400 text-base">{selectedDriver.safetyScore}%</span>
                  <span className="text-[10px] text-slate-400">Zero speeding violations</span>
                </div>
              </div>
            </div>

            {/* Vehicle Assignment within Driver View */}
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2">
              <span className="text-slate-400 font-semibold block">Change Assigned Vehicle:</span>
              <select
                value={selectedDriver.assignedVehicleId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onAssignVehicle) {
                    onAssignVehicle(selectedDriver.id, val ? val : undefined);
                  } else if (onAssignRfid && val) {
                    onAssignRfid(selectedDriver.id, val);
                  }
                  setSelectedDriver({ ...selectedDriver, assignedVehicleId: val || undefined });
                }}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-blue-500 font-mono"
              >
                <option value="">No Vehicle Assigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} - {v.name} ({v.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center pt-2">
              {onDeleteDriver && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove driver ${selectedDriver.name} from the active roster?`)) {
                      onDeleteDriver(selectedDriver.id);
                      setSelectedDriver(null);
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors"
                >
                  Delete Driver
                </button>
              )}

              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold ml-auto"
              >
                Close Driver Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
