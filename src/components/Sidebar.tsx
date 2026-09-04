import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  MapPin,
  Fuel,
  Bell,
  Settings,
  Radio,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ActiveNavTab, Vehicle } from '../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  vehicles: Vehicle[];
  unreadAlertsCount: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  vehicles,
  unreadAlertsCount,
  isMobileOpen,
  onCloseMobile
}) => {
  const movingCount = vehicles.filter((v) => v.status === 'Moving').length;

  const navItems = [
    {
      id: 'dashboard' as ActiveNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'fleet' as ActiveNavTab,
      label: 'Fleet Management',
      icon: Truck,
      badge: `${vehicles.length}`
    },
    {
      id: 'drivers' as ActiveNavTab,
      label: 'Drivers',
      icon: Users,
      badge: null
    },
    {
      id: 'geofencing' as ActiveNavTab,
      label: 'Geofencing',
      icon: MapPin,
      badge: null
    },
    {
      id: 'fuel' as ActiveNavTab,
      label: 'Fuel Analytics',
      icon: Fuel,
      badge: null
    },
    {
      id: 'notifications' as ActiveNavTab,
      label: 'Notifications',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'settings' as ActiveNavTab,
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">FleetLogix</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">Enterprise Fleet Ops</p>
            </div>
          </div>

          <button
            id="sidebar-close-btn"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>

        {/* Live Fleet Ticker */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Telemetry Link: Online</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
              {movingCount}/{vehicles.length} Moving
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                id={`nav-item-${item.id}`}
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4.5 h-4.5 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.badgeColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Fleet health status card in footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span className="font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Fleet Health
              </span>
              <span className="text-emerald-400 font-bold">98.4%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[98.4%]" />
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
              <span>12/12 Devices Polled</span>
              <span>Delay: &lt; 1.2s</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
