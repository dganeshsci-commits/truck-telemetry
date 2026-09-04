import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Bell,
  Cpu,
  RefreshCcw,
  CheckCircle2,
  Database,
  Radio,
  Save,
  Globe
} from 'lucide-react';

interface SettingsViewProps {
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onResetData }) => {
  const [speedUnit, setSpeedUnit] = useState<'kmh' | 'mph'>('kmh');
  const [fuelUnit, setFuelUnit] = useState<'liters' | 'gallons'>('liters');
  const [pollingInterval, setPollingInterval] = useState('5');
  const [idleThresholdMin, setIdleThresholdMin] = useState('15');
  const [fuelAlertThresholdPct, setFuelAlertThresholdPct] = useState('20');
  const [refuelThresholdLiters, setRefuelThresholdLiters] = useState('5');
  const [notificationEmail, setNotificationEmail] = useState('fleet-ops@example.com');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Fleet Operations & Telemetry Settings</span>
        </h2>
        <p className="text-xs text-slate-400">
          Configure IoT sensor sampling rates, notification dispatch rules, and system units.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Fleet telemetry settings updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Telemetry & Units */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Telemetry & Measurement Units</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Speed & Distance Units</label>
              <select
                value={speedUnit}
                onChange={(e) => setSpeedUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="kmh">Metric (Kilometers / km/h)</option>
                <option value="mph">Imperial (Miles / mph)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Fuel Volume Units</label>
              <select
                value={fuelUnit}
                onChange={(e) => setFuelUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="liters">Metric Liters (L)</option>
                <option value="gallons">US Gallons (gal)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">GPS Telemetry Polling Rate</label>
              <select
                value={pollingInterval}
                onChange={(e) => setPollingInterval(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="5">Every 5 seconds (Real-time)</option>
                <option value="15">Every 15 seconds</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every 60 seconds (Battery saving)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">IoT Gateway Protocol</label>
              <input
                type="text"
                disabled
                value="MQTT / WebSockets TLS (Port 8883)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Fleet Threshold Defaults */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Fleet Alert Threshold Presets</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">
                Low Fuel Trigger Threshold (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={fuelAlertThresholdPct}
                  onChange={(e) => setFuelAlertThresholdPct(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
                <span className="text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Default: 20%</p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">
                Refuel Detection Delta (L)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={refuelThresholdLiters}
                  onChange={(e) => setRefuelThresholdLiters(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
                <span className="text-slate-400">Liters</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Difference of 5L or more</p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">
                Idling Duration Threshold (min)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={idleThresholdMin}
                  onChange={(e) => setIdleThresholdMin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
                <span className="text-slate-400">min</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Ignition ON & stationary</p>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium text-xs">
              Primary Dispatch Email Address
            </label>
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all demo fleet data and alerts to factory defaults?')) {
                onResetData();
              }
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
