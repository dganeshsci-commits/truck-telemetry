import React, { useState } from 'react';
import {
  Bell,
  Sliders,
  AlertTriangle,
  Fuel,
  TrendingUp,
  Clock,
  Mail,
  CheckCircle2,
  Filter,
  Plus,
  Trash2,
  Check,
  Radio,
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { AlertRule, AlertEvent, Vehicle, AlertType } from '../types';

interface NotificationsViewProps {
  alertRules: AlertRule[];
  alertHistory: AlertEvent[];
  vehicles: Vehicle[];
  onAddRule: (rule: AlertRule) => void;
  onUpdateRule: (rule: AlertRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onUpdateAlertStatus: (alertId: string, status: AlertEvent['status']) => void;
  onTriggerAlert: (event: AlertEvent) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  alertRules,
  alertHistory,
  vehicles,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onUpdateAlertStatus,
  onTriggerAlert
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
  const [typeFilter, setTypeFilter] = useState<'All' | AlertType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | AlertEvent['status']>('All');
  const [search, setSearch] = useState('');
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  // New rule form state
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    alertType: 'Fuel Alert',
    enabled: true,
    vehicleId: 'ALL',
    threshold: 'Fuel below 20%',
    destination: 'fleet@example.com',
    frequency: '15 minutes',
    description: 'Trigger notification when fuel drops below 20%'
  });

  const filteredAlerts = alertHistory.filter((alert) => {
    if (typeFilter !== 'All' && alert.alertType !== typeFilter) return false;
    if (statusFilter !== 'All' && alert.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      alert.message.toLowerCase().includes(q) ||
      alert.vehiclePlate.toLowerCase().includes(q) ||
      alert.alertType.toLowerCase().includes(q)
    );
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const created: AlertRule = {
      id: `rule-${Date.now()}`,
      alertType: (newRule.alertType as AlertType) || 'Fuel Alert',
      enabled: newRule.enabled ?? true,
      vehicleId: newRule.vehicleId || 'ALL',
      threshold: newRule.threshold || 'Custom Threshold',
      destination: newRule.destination || 'fleet@example.com',
      frequency: newRule.frequency || '15 minutes',
      description: newRule.description || 'Configured fleet telemetry alert'
    };

    onAddRule(created);
    setIsAddRuleOpen(false);
  };

  const handleSimulateRuleTrigger = (rule: AlertRule) => {
    const targetVeh =
      rule.vehicleId === 'ALL'
        ? vehicles[0]
        : vehicles.find((v) => v.id === rule.vehicleId) || vehicles[0];

    let message = '';
    let severity: AlertEvent['severity'] = 'medium';

    if (rule.alertType === 'Fuel Alert') {
      message = `Low Fuel Alert for ${targetVeh.plateNumber}: Current fuel is at 18% (Below configured threshold: ${rule.threshold}).`;
      severity = 'high';
    } else if (rule.alertType === 'Refuel Alert') {
      message = `Refuel Alert for ${targetVeh.plateNumber}: Significant fuel level increase detected (+50 L added). Verified above difference of 5L.`;
      severity = 'low';
    } else if (rule.alertType === 'Idle Alert') {
      message = `Idle Alert for ${targetVeh.plateNumber}: Ignition is ON and vehicle has not moved for 18 minutes (Threshold: 15 min).`;
      severity = 'medium';
    } else {
      message = `${rule.alertType} triggered for ${targetVeh.plateNumber}: ${rule.threshold}.`;
      severity = 'high';
    }

    const newEvent: AlertEvent = {
      id: `alt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      vehicleId: targetVeh.id,
      vehiclePlate: targetVeh.plateNumber,
      alertType: rule.alertType,
      message,
      severity,
      status: 'New',
      location: targetVeh.lastKnownLocation
    };

    onTriggerAlert(newEvent);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-400" />
            <span>Alerts & Telemetry Notification Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time audit history and rule configurations for low fuel, refuel spikes, and idle durations.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'history'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alert History ({alertHistory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'settings'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Notification Settings ({alertRules.length})</span>
            </button>
          </div>

          {activeTab === 'settings' && (
            <button
              onClick={() => setIsAddRuleOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Rule</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search alerts by message, vehicle, or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
              >
                <option value="All">All Alert Types</option>
                <option value="Fuel Alert">Fuel Alert</option>
                <option value="Refuel Alert">Refuel Alert</option>
                <option value="Idle Alert">Idle Alert</option>
                <option value="Route Deviation">Route Deviation</option>
                <option value="Geofence Enter">Geofence Enter</option>
                <option value="Geofence Exit">Geofence Exit</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* ALERT HISTORY SECTION (Per Prompt: Time, Vehicle, Alert type, Message, Status) */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Alert Type</th>
                    <th className="py-3.5 px-4">Message</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {alert.timestamp}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-white text-xs">
                          {alert.vehiclePlate}
                        </span>
                        {alert.location && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                            {alert.location}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            alert.alertType === 'Fuel Alert'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : alert.alertType === 'Refuel Alert'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : alert.alertType === 'Idle Alert'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          }`}
                        >
                          {alert.alertType}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-200">
                        <p className="text-xs leading-relaxed max-w-md">{alert.message}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            alert.status === 'New'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : alert.status === 'Acknowledged'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {alert.status === 'New' && (
                            <button
                              onClick={() => onUpdateAlertStatus(alert.id, 'Acknowledged')}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[11px] font-medium"
                              title="Acknowledge"
                            >
                              Ack
                            </button>
                          )}
                          {alert.status !== 'Resolved' && (
                            <button
                              onClick={() => onUpdateAlertStatus(alert.id, 'Resolved')}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-[11px] font-medium"
                              title="Mark Resolved"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAlerts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No alerts found matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* NOTIFICATION SETTINGS (Per Prompt Requirements:
           Alert Type, Enabled/Disabled, Vehicle, Threshold, Notification destination, Notification frequency
           Example:
           Fuel Alert | Vehicle: TN-XX-XXXX | Trigger: Fuel below 20% | Send to: fleet@example.com | Frequency: 15 minutes
           Refuel Alert | Trigger when significant increase in fuel level detected (difference of 5L)
           Idle alert | if the ignition is on and does not move for 15 min) */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertRules.map((rule) => {
              const targetVehicle = vehicles.find((v) => v.id === rule.vehicleId);
              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    rule.enabled
                      ? 'bg-slate-900/90 border-slate-800 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          rule.alertType === 'Fuel Alert'
                            ? 'bg-rose-500/20 text-rose-400'
                            : rule.alertType === 'Refuel Alert'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : rule.alertType === 'Idle Alert'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {rule.alertType === 'Fuel Alert' ? (
                          <Fuel className="w-4 h-4" />
                        ) : rule.alertType === 'Refuel Alert' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{rule.alertType}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Target: {rule.vehicleId === 'ALL' ? 'All Registered Fleet' : targetVehicle?.plateNumber}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Enabled / Disabled Toggle */}
                      <button
                        onClick={() => onUpdateRule({ ...rule, enabled: !rule.enabled })}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                          rule.enabled
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {rule.enabled ? 'ENABLED' : 'DISABLED'}
                      </button>

                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trigger Threshold:</span>
                      <span className="font-mono font-bold text-white">{rule.threshold}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Notification Destination:</span>
                      <span className="font-mono text-blue-400">{rule.destination}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Dispatch Frequency:</span>
                      <span className="font-mono text-amber-400">{rule.frequency}</span>
                    </div>
                  </div>

                  {/* Quick test trigger button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 italic">
                      {rule.description || 'Monitors real-time IoT gateway telemetry'}
                    </span>
                    <button
                      onClick={() => handleSimulateRuleTrigger(rule)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Radio className="w-3 h-3 text-rose-400" />
                      <span>Test Trigger Alert</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Configure New Alert Rule</span>
              </h3>
              <button
                onClick={() => setIsAddRuleOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Alert Type *</label>
                <select
                  value={newRule.alertType}
                  onChange={(e) => setNewRule({ ...newRule, alertType: e.target.value as AlertType })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                >
                  <option value="Fuel Alert">Fuel Alert (e.g. Fuel below 20%)</option>
                  <option value="Refuel Alert">Refuel Alert (Significant increase &ge; 5L)</option>
                  <option value="Idle Alert">Idle Alert (Ignition ON &amp; stationary &gt; 15 min)</option>
                  <option value="Route Deviation">Route Deviation (Deviated from corridor)</option>
                  <option value="Geofence Enter">Geofence Enter (Zone entry)</option>
                  <option value="Geofence Exit">Geofence Exit (Zone boundary exit)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Vehicle *</label>
                <select
                  value={newRule.vehicleId}
                  onChange={(e) => setNewRule({ ...newRule, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none"
                >
                  <option value="ALL">ALL Registered Vehicles</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Trigger Threshold Expression *</label>
                <input
                  type="text"
                  required
                  value={newRule.threshold}
                  onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })}
                  placeholder="e.g. Fuel below 20% or Difference >= 5L"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notification Destination (Email / SMS) *</label>
                <input
                  type="text"
                  required
                  value={newRule.destination}
                  onChange={(e) => setNewRule({ ...newRule, destination: e.target.value })}
                  placeholder="e.g. fleet@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notification Frequency *</label>
                <select
                  value={newRule.frequency}
                  onChange={(e) => setNewRule({ ...newRule, frequency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="15 minutes">15 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                  <option value="1 hour">1 hour</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Save Alert Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
