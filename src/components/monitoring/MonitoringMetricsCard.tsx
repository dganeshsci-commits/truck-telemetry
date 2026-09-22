import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  subValue?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, unit, color = 'text-white', subValue }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
    <span className="text-xs text-slate-400 font-medium">{label}</span>
    <div className="text-right">
      <span className={`text-sm font-bold font-mono ${color}`}>
        {value}{unit}
      </span>
      {subValue && <p className="text-[10px] text-slate-500 font-medium">{subValue}</p>}
    </div>
  </div>
);

interface MonitoringMetricsCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  children: React.ReactNode;
}

export const MonitoringMetricsCard: React.FC<MonitoringMetricsCardProps> = ({ 
  title, 
  icon: Icon, 
  iconColor, 
  children 
}) => {
  return (
    <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconColor.replace('text-', 'bg-').replace('-400', '-500/20')} ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span>{title}</span>
        </h4>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

export { MetricRow };
