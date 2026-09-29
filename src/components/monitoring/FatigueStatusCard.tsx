import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldX, Activity, Power } from 'lucide-react';
import { DriverMonitoringData } from '../../types';

interface FatigueStatusCardProps {
  data: DriverMonitoringData;
}

export const FatigueStatusCard: React.FC<FatigueStatusCardProps> = ({ data }) => {
  const getStatusConfig = () => {
    if (!data.isModelOnline) {
      return {
        label: 'MODEL OFFLINE',
        color: 'text-slate-400',
        bg: 'bg-slate-800/40',
        border: 'border-slate-700/60',
        icon: Power,
        description: 'Neural model inference is paused in standby. Click "Turn ON Model" to resume monitoring.'
      };
    }

    switch (data.fatigueState) {
      case 'NORMAL':
        return {
          label: 'NORMAL',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/30',
          icon: ShieldCheck,
          description: 'Driver is alert and focused. All vital signs within safety parameters.'
        };
      case 'ATTENTION':
        return {
          label: 'ATTENTION',
          color: 'text-amber-400',
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/30',
          icon: AlertTriangle,
          description: 'Early signs of reduced focus detected. Minor eye closure persistence.'
        };
      case 'DROWSY':
        return {
          label: 'DROWSY',
          color: 'text-orange-500',
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/30',
          icon: ShieldAlert,
          description: 'Moderate fatigue detected. High PERCLOS score recorded.'
        };
      case 'CRITICAL':
        return {
          label: 'CRITICAL',
          color: 'text-rose-500',
          bg: 'bg-rose-500/20',
          border: 'border-rose-500/40',
          icon: ShieldX,
          description: 'Severe fatigue or long eye closure detected. Immediate intervention required!'
        };
      default:
        return {
          label: 'UNKNOWN',
          color: 'text-slate-400',
          bg: 'bg-slate-500/20',
          border: 'border-slate-500/30',
          icon: Activity,
          description: 'Waiting for sensor input...'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className={`p-6 rounded-2xl border ${config.border} ${config.bg} backdrop-blur-md shadow-xl transition-all duration-500 flex flex-col items-center text-center space-y-4 h-full justify-center`}>
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${config.bg} border-4 ${config.border} animate-pulse shadow-lg`}>
        <StatusIcon className={`w-10 h-10 ${config.color}`} />
      </div>
      
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Driver Fatigue Status</p>
        <h2 className={`text-4xl font-black tracking-tighter ${config.color}`}>
          {config.label}
        </h2>
      </div>

      <div className="flex items-center gap-6 w-full pt-2">
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Fatigue Score</p>
          <div className="text-2xl font-mono font-bold text-white">
            {data.fatigueScore} <span className="text-xs text-slate-500 font-normal">/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Risk Level</p>
          <div className={`text-2xl font-bold ${config.color}`}>
            {data.fatigueState === 'NORMAL' ? 'LOW' : data.fatigueState === 'ATTENTION' ? 'MEDIUM' : data.fatigueState === 'DROWSY' ? 'HIGH' : 'EXTREME'}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-300/80 max-w-xs leading-relaxed italic">
        {config.description}
      </p>

      {data.inferenceMode === 'DEMO' && (
        <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
          Simulated AI Data
        </div>
      )}
    </div>
  );
};
