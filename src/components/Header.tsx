import React from 'react';
import {
  Menu,
  Bell,
  RefreshCw,
  Search,
  Wifi,
  Radio,
  Sparkles,
  Usb
} from 'lucide-react';
import { ActiveNavTab } from '../types';

interface HeaderProps {
  activeTab: ActiveNavTab;
  onOpenMobileMenu: () => void;
  onSimulatePing: () => void;
  isSimulating: boolean;
  unreadAlertsCount: number;
  onNavigateToNotifications: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  rfidStatus?: 'LIVE_HARDWARE' | 'SIMULATION' | 'DISCONNECTED';
  onNavigateToDrivers?: () => void;
  onToggleHardware?: () => void;
  isHardwareConnected?: boolean;
  isHardwareConnecting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onSimulatePing,
  isSimulating,
  unreadAlertsCount,
  onNavigateToNotifications,
  searchQuery,
  onSearchChange,
  rfidStatus = 'DISCONNECTED',
  onNavigateToDrivers,
  onToggleHardware,
  isHardwareConnected = false,
  isHardwareConnecting = false
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Fleet Overview', subtitle: 'Live logistics operations & fleet telemetry' };
      case 'fleet':
        return { title: 'Fleet Management', subtitle: 'Real-time vehicle tracking, status & telemetry' };
      case 'drivers':
        return { title: 'Driver Management', subtitle: 'Personnel, RFID identification & vehicle assignments' };
      case 'geofencing':
        return { title: 'Geofencing Zones & Routes', subtitle: 'Area perimeter control and assigned route corridors' };
      case 'fuel':
        return { title: 'Fuel Analytics & Refueling', subtitle: 'IoT capacitive sensor telemetry, theft diagnostics & refuel audit ledger' };
      case 'notifications':
        return { title: 'Alerts & Notifications', subtitle: 'Configured triggers, fuel alerts, and audit logs' };
      case 'settings':
        return { title: 'Fleet Configuration', subtitle: 'Telemetry intervals, unit parameters, and destinations' };
      default:
        return { title: 'Fleet Dashboard', subtitle: 'Logistics management' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Search */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="header-global-search"
            type="text"
            placeholder="Search vehicle, driver, RFID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Global Hardware Connection Toggle */}
        <button
          id="global-hardware-connect-btn"
          onClick={onToggleHardware}
          disabled={isHardwareConnecting}
          title={isHardwareConnected ? "Disconnect SPDuino Hardware" : "Connect SPDuino Hardware (RFID + IMU)"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-lg active:scale-95 ${
            isHardwareConnected
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50 shadow-emerald-500/10'
              : isHardwareConnecting
              ? 'bg-slate-800 text-slate-400 border-slate-700 animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-500/20'
          }`}
        >
          <Usb className={`w-3.5 h-3.5 ${isHardwareConnected ? 'text-emerald-400' : 'text-white'}`} />
          <span>
            {isHardwareConnecting ? 'Connecting...' : isHardwareConnected ? 'SPDuino Active' : 'Connect Hardware'}
          </span>
        </button>

        {/* Simulate GPS / Telemetry Ping */}
        <button
          id="simulate-ping-btn"
          onClick={onSimulatePing}
          title="Simulate incoming IoT GPS/Fuel telemetry ping"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isSimulating
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSimulating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Simulate IoT Ping</span>
          <span className="sm:hidden">Ping</span>
        </button>

        {/* Alert Notifications Bell */}
        <button
          id="header-notification-bell"
          onClick={onNavigateToNotifications}
          className="relative p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
          aria-label="View alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Live status badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-mono">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>MQTT: CONNECTED</span>
        </div>

        {/* RFID Hardware status badge */}
        <button
          type="button"
          onClick={() => onNavigateToDrivers?.()}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
            rfidStatus === 'LIVE_HARDWARE'
              ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
              : rfidStatus === 'SIMULATION'
              ? 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300'
              : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-300'
          }`}
          title="Click to open Drivers & RFID Hardware Test"
        >
          <Radio
            className={`w-3 h-3 ${
              rfidStatus === 'LIVE_HARDWARE'
                ? 'text-emerald-400 animate-pulse'
                : rfidStatus === 'SIMULATION'
                ? 'text-indigo-400'
                : 'text-slate-500'
            }`}
          />
          <span>
            {rfidStatus === 'LIVE_HARDWARE'
              ? 'RFID: LIVE CONNECTED'
              : rfidStatus === 'SIMULATION'
              ? 'RFID: SIMULATION'
              : 'RFID: STANDBY'}
          </span>
        </button>
      </div>
    </header>
  );
};
