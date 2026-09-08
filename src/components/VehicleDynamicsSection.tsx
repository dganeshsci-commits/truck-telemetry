import React, { useEffect, useState } from 'react';
import {
  Activity,
  Compass,
  Rotate3d,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Cpu
} from 'lucide-react';
import { ImuData } from '../types';
import { imuSpeedController } from '../services/imuSpeedController';

interface VehicleDynamicsSectionProps {
  vehiclePlate: string;
  isLinkedToImu: boolean;
}

export const VehicleDynamicsSection: React.FC<VehicleDynamicsSectionProps> = ({
  vehiclePlate,
  isLinkedToImu
}) => {
  const [imuData, setImuData] = useState<ImuData>(imuSpeedController.getImuData());

  useEffect(() => {
    const unsubscribe = imuSpeedController.subscribe((data) => {
      setImuData(data);
    });
    return () => unsubscribe();
  }, []);

  const formatVal = (val: number, decimals: number = 2) => {
    const formatted = Math.abs(val).toFixed(decimals);
    return val >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const isOnline = imuData.status === 'ONLINE';
  const isSignalLost = imuData.status === 'SIGNAL_LOST';

  return (
    <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-4 space-y-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Vehicle Dynamics
          </h4>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            GY-521 MPU6050
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          ) : isSignalLost ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-700/80 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              IMU SIGNAL LOST
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              GY-521: OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Grid of Dynamics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Acceleration */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Acceleration
            </span>
            <span className="text-[10px] text-slate-500 font-mono">m/s²</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">X:</span>
              <span className="font-bold text-cyan-300">{formatVal(imuData.accel.x, 2)} m/s²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Y:</span>
              <span className="font-bold text-cyan-300">{formatVal(imuData.accel.y, 2)} m/s²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Z:</span>
              <span className="font-bold text-cyan-300">{formatVal(imuData.accel.z, 2)} m/s²</span>
            </div>
          </div>
        </div>

        {/* 2. Angular Velocity */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Angular Velocity
            </span>
            <span className="text-[10px] text-slate-500 font-mono">°/s</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">X:</span>
              <span className="font-bold text-indigo-300">{formatVal(imuData.gyro.x, 2)} °/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Y:</span>
              <span className="font-bold text-indigo-300">{formatVal(imuData.gyro.y, 2)} °/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Z:</span>
              <span className="font-bold text-indigo-300">{formatVal(imuData.gyro.z, 2)} °/s</span>
            </div>
          </div>
        </div>

        {/* 3. Tilt */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Tilt
            </span>
            <span className="text-[10px] text-slate-500 font-mono">deg</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Roll:</span>
              <span className="font-bold text-emerald-300">{formatVal(imuData.tilt.roll, 1)}°</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Pitch:</span>
              <span className="font-bold text-emerald-300">{formatVal(imuData.tilt.pitch, 1)}°</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/60 text-[10px]">
              <span className="text-slate-500">Direction:</span>
              <span className="font-semibold text-slate-300">
                {imuData.tilt.pitch > 1.5
                  ? 'Forward Tilt (Accel)'
                  : imuData.tilt.pitch < -1.5
                  ? 'Backward Tilt (Brake)'
                  : 'Level (Stable)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Telemetry metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last update:</span>
          <span className="font-mono text-slate-200">{imuData.lastUpdate}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLinkedToImu ? (
            <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Target Vehicle Active
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">
              Viewing {vehiclePlate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
