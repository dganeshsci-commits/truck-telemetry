import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, Zap, AlertCircle } from 'lucide-react';
import { DriverMonitoringData, Driver, Vehicle } from '../../types';
import { driverMonitoringService } from '../../services/driverMonitoring';

interface CompactSafetyCardProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onNavigateToMonitoring: () => void;
}

export const CompactSafetyCard: React.FC<CompactSafetyCardProps> = ({ 
  drivers, 
  vehicles, 
  onNavigateToMonitoring 
}) => {
  const [data, setData] = useState<DriverMonitoringData>(driverMonitoringService['data']);

  useEffect(() => {
    return driverMonitoringService.subscribe(setData);
  }, []);

  const currentDriver = drivers.find(d => d.id === data.driverId);
  const currentVehicle = vehicles.find(v => v.id === data.vehicleId);

  return (
    <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Driver Safety Status</span>
        </h4>
        <button
          onClick={onNavigateToMonitoring}
          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
        >
          Monitor <Eye className="w-3 h-3" />
        </button>
      </div>

      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Driver</p>
            <p className="text-xs font-bold text-white">{currentDriver?.name || 'Ganesh'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vehicle</p>
            <p className="text-xs font-mono font-bold text-blue-400">{currentVehicle?.plateNumber || 'TN-01-AB-4821'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
             <p className="text-[9px] text-slate-500 uppercase font-bold">Fatigue Level</p>
             <div className="flex items-center gap-1.5">
               <div className={`w-2 h-2 rounded-full ${
                 data.fatigueState === 'NORMAL' ? 'bg-emerald-500' :
                 data.fatigueState === 'ATTENTION' ? 'bg-amber-500' :
                 'bg-rose-500 animate-pulse'
               }`} />
               <span className={`text-[11px] font-black tracking-tight ${
                 data.fatigueState === 'NORMAL' ? 'text-emerald-400' :
                 data.fatigueState === 'ATTENTION' ? 'text-amber-400' :
                 'text-rose-400'
               }`}>
                 {data.fatigueState}
               </span>
             </div>
          </div>
          <div className="space-y-1 text-right">
             <p className="text-[9px] text-slate-500 uppercase font-bold">PERCLOS</p>
             <span className="text-[11px] font-bold text-white font-mono">{data.perclos.toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
           <div className="flex items-center gap-1.5">
             <Zap className="w-3 h-3 text-blue-400" />
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               Score: <span className="text-white">{data.fatigueScore}/100</span>
             </span>
           </div>
           <div className="flex items-center gap-1.5">
             <AlertCircle className="w-3 h-3 text-amber-400" />
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               Yawns: <span className="text-white">{data.yawnCount}</span>
             </span>
           </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${data.cameraStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             {data.cameraStatus === 'CONNECTED' ? 'Cam Active' : 'Cam Off'}
           </span>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border ${
          data.inferenceMode === 'DEMO' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
          'text-amber-500 bg-amber-500/10 border-amber-500/20'
        }`}>
          {data.inferenceMode.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
};
