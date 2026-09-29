import React, { useState, useEffect, useCallback } from 'react';
import { 
  Eye, 
  Smile, 
  Compass, 
  Activity, 
  Settings as SettingsIcon,
  Zap,
  Play,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  User,
  Truck,
  CreditCard,
  Video,
  ExternalLink,
  Info,
  Power,
  CheckCircle2
} from 'lucide-react';
import { 
  Driver, 
  Vehicle, 
  DriverMonitoringData, 
  DriverSafetyEvent, 
  AlertEvent 
} from '../types';
import { driverMonitoringService } from '../services/driverMonitoring';
import { LiveCameraFeed } from '../components/monitoring/LiveCameraFeed';
import { FatigueStatusCard } from '../components/monitoring/FatigueStatusCard';
import { MonitoringMetricsCard, MetricRow } from '../components/monitoring/MonitoringMetricsCard';
import { FatigueTrendChart } from '../components/monitoring/FatigueTrendChart';
import { SafetyEventsTable } from '../components/monitoring/SafetyEventsTable';

interface DriverMonitoringViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onTriggerAlert: (alert: AlertEvent) => void;
}

export const DriverMonitoringView: React.FC<DriverMonitoringViewProps> = ({
  drivers,
  vehicles,
  onTriggerAlert
}) => {
  const [monitoringData, setMonitoringData] = useState<DriverMonitoringData>(
    driverMonitoringService['data']
  );
  const [history, setHistory] = useState<Array<{ time: string; score: number; perclos: number }>>([]);
  const [safetyEvents, setSafetyEvents] = useState<DriverSafetyEvent[]>([]);
  const [isTogglingModel, setIsTogglingModel] = useState(false);
  const [modelToast, setModelToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Subscribe to monitoring data
  useEffect(() => {
    const unsubscribe = driverMonitoringService.subscribe((data) => {
      setMonitoringData(data);
      
      // Update history
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          score: data.fatigueScore,
          perclos: data.perclos
        }].slice(-60); // Keep last 60 seconds
        return newHistory;
      });

      // Check for alert triggers (simplification)
      if (data.fatigueState === 'CRITICAL' && !safetyEvents.some(e => e.eventType === 'Critical Drowsiness' && e.status === 'Active')) {
          const newEvent: DriverSafetyEvent = {
            id: `event-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            driverName: drivers.find(d => d.id === data.driverId)?.name || 'Unknown',
            vehiclePlate: vehicles.find(v => v.id === data.vehicleId)?.plateNumber || 'Unknown',
            eventType: 'Critical Drowsiness',
            severity: 'critical',
            duration: 'Active',
            status: 'Active'
          };
          setSafetyEvents(prev => [newEvent, ...prev]);
          
          onTriggerAlert({
            id: `alert-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            vehicleId: data.vehicleId,
            vehiclePlate: newEvent.vehiclePlate,
            alertType: 'Drowsiness Detected',
            message: `Critical fatigue detected for driver ${newEvent.driverName}. Immediate attention required.`,
            severity: 'critical',
            status: 'New'
          });
      }
    });

    driverMonitoringService.start();

    return () => {
      unsubscribe();
      driverMonitoringService.stop();
    };
  }, [drivers, vehicles, onTriggerAlert]);

  const currentDriver = drivers.find(d => d.id === monitoringData.driverId);
  const currentVehicle = vehicles.find(v => v.id === monitoringData.vehicleId);

  const handleSimulate = useCallback((event: any) => {
    driverMonitoringService.simulateEvent(event);
  }, []);

  const handleModeChange = (mode: DriverMonitoringData['inferenceMode']) => {
    driverMonitoringService.setMode(mode);
  };

  const handleToggleModel = async () => {
    setIsTogglingModel(true);
    const newState = await driverMonitoringService.toggleModel();
    setIsTogglingModel(false);
    setModelToast({
      message: newState 
        ? 'AI Model is now ONLINE and monitoring driver fatigue.' 
        : 'AI Model turned OFFLINE (Standby mode).',
      type: newState ? 'success' : 'info'
    });
    setTimeout(() => setModelToast(null), 4000);
  };

  const isModelOnline = monitoringData.isModelOnline && monitoringData.aiBackendStatus === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {modelToast && (
        <div className={`p-4 rounded-xl flex items-center justify-between border transition-all duration-300 shadow-xl ${
          modelToast.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
            : 'bg-slate-900/90 border-slate-700 text-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            {modelToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Power className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{modelToast.message}</span>
          </div>
          <button 
            onClick={() => setModelToast(null)}
            className="text-xs opacity-60 hover:opacity-100 uppercase tracking-wider font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
            <Eye className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Driver Monitoring & Fatigue Detection
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                monitoringData.cameraStatus === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                monitoringData.cameraStatus === 'PERMISSION_DENIED' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                'bg-slate-500/20 text-slate-400 border-slate-500/30'
              }`}>
                {monitoringData.cameraStatus.replace(/_/g, ' ')}
              </span>
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <User className="w-3.5 h-3.5" />
                Driver: <span className={currentDriver ? "text-white font-bold" : "text-amber-500 font-bold uppercase text-[10px] tracking-tighter"}>
                  {currentDriver?.name || 'Driver not authenticated'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Truck className="w-3.5 h-3.5" />
                Vehicle: <span className="text-white font-bold font-mono">{currentVehicle?.plateNumber || 'TN-01-AB-4821'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <CreditCard className="w-3.5 h-3.5" />
                RFID: <span className="text-white font-bold font-mono">{currentDriver?.rfidId || 'A3 7F 21 9C'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls: Inference Mode & Model Power Toggle Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-end gap-1">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inference Mode</span>
             <select 
               value={monitoringData.inferenceMode}
               onChange={(e) => handleModeChange(e.target.value as any)}
               className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
             >
               <option value="DEMO">DEMO MODE</option>
               <option value="LAPTOP_WEBCAM">LAPTOP WEBCAM</option>
               <option value="RASPBERRY_PI_LIVE">RASPBERRY PI LIVE</option>
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Model Toggle Switch / Button */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model Power</span>
            <button
              onClick={handleToggleModel}
              disabled={isTogglingModel}
              className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md group ${
                isModelOnline
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-emerald-950/30'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25 shadow-rose-950/30 ring-2 ring-rose-500/20'
              }`}
              title={isModelOnline ? 'Click to Turn Model OFF (Standby)' : 'Click to Turn Model ON'}
            >
              <div className="flex items-center gap-1.5">
                <Power className={`w-3.5 h-3.5 ${isModelOnline ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
                <span>{isModelOnline ? 'MODEL ONLINE' : 'TURN ON MODEL'}</span>
              </div>

              {/* Graphical Pill Switch */}
              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                isModelOnline ? 'bg-emerald-500' : 'bg-slate-700'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${
                  isModelOnline ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Offline Alert Banner with Turn On Button */}
      {!isModelOnline && (
        <div className="px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Power className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">AI Model is currently OFFLINE</p>
              <p className="text-[11px] text-rose-300/80">Inference processing is paused. Click the toggle button to activate the neural model and resume driver safety monitoring.</p>
            </div>
          </div>
          <button
            onClick={handleToggleModel}
            disabled={isTogglingModel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 shrink-0"
          >
            <Power className="w-3.5 h-3.5" />
            Turn ON Model
          </button>
        </div>
      )}

      {/* Mode Warning Bar */}
      {monitoringData.inferenceMode !== 'RASPBERRY_PI_LIVE' && (
        <div className={`px-4 py-2 rounded-xl flex items-center justify-between border ${
          monitoringData.inferenceMode === 'DEMO' 
          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {monitoringData.inferenceMode === 'DEMO' ? 'DEMO MODE: SIMULATED DATA' : 'DEVELOPMENT TEST: LIVE LAPTOP CAMERA'}
            </span>
          </div>
          <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">
            {monitoringData.inferenceMode === 'DEMO' ? 'Validating UI/UX' : 'Validating Pipeline & Real-time Integration'}
          </span>
        </div>
      )}

      {/* Iframe Camera Notice Banner */}
      {typeof window !== 'undefined' && window.self !== window.top && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
              <Info className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-300">
              <strong className="text-white">Already granted camera permission?</strong> Browsers isolate webcams from embedded iframes for security. Open the dashboard in a new tab for direct camera and AI inference access.
            </span>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0 transition-all shadow-md shadow-blue-600/25"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in New Tab
          </a>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Camera + Metrics */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Live Camera Feed */}
          <LiveCameraFeed data={monitoringData} />

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MonitoringMetricsCard 
              title="Eye Monitoring" 
              icon={Eye} 
              iconColor="text-blue-400"
            >
              <MetricRow label="Left Eye" value={monitoringData.leftEye.toUpperCase()} color={monitoringData.leftEye === 'closed' ? 'text-rose-400' : 'text-emerald-400'} />
              <MetricRow label="Right Eye" value={monitoringData.rightEye.toUpperCase()} color={monitoringData.rightEye === 'closed' ? 'text-rose-400' : 'text-emerald-400'} />
              <MetricRow label="PERCLOS" value={monitoringData.perclos.toFixed(1)} unit="%" subValue="Last 60s Window" />
              <MetricRow label="Blink Rate" value={monitoringData.blinkRate} unit=" blinks/min" />
            </MonitoringMetricsCard>

            <MonitoringMetricsCard 
              title="Mouth / Yawn" 
              icon={Smile} 
              iconColor="text-amber-400"
            >
              <MetricRow label="Mouth State" value={monitoringData.mouthState.toUpperCase()} color={monitoringData.mouthState === 'yawn' ? 'text-rose-400' : 'text-emerald-400'} />
              <MetricRow label="Yawn Detected" value={monitoringData.yawnDetected ? 'YES' : 'NO'} color={monitoringData.yawnDetected ? 'text-rose-400' : 'text-slate-400'} />
              <MetricRow label="Yawn Count" value={monitoringData.yawnCount} />
              <MetricRow label="Avg Duration" value={monitoringData.yawnDuration.toFixed(1)} unit=" s" />
            </MonitoringMetricsCard>

            <MonitoringMetricsCard 
              title="Head Pose & Attention" 
              icon={Compass} 
              iconColor="text-indigo-400"
            >
              <MetricRow label="Yaw (Rotation)" value={monitoringData.headPose.yaw.toFixed(1)} unit="°" />
              <MetricRow label="Pitch (Tilt)" value={monitoringData.headPose.pitch.toFixed(1)} unit="°" />
              <MetricRow label="Forward Attention" value={monitoringData.lookingAway ? 'NO' : 'YES'} color={monitoringData.lookingAway ? 'text-rose-400' : 'text-emerald-400'} />
              <MetricRow label="Looking Away" value={monitoringData.lookingAway ? 'YES' : 'NO'} color={monitoringData.lookingAway ? 'text-rose-400' : 'text-slate-400'} />
            </MonitoringMetricsCard>
          </div>

          {/* Alert History Table */}
          <SafetyEventsTable events={safetyEvents} />
        </div>

        {/* Right Column: Status + Simulations + Chart */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Fatigue Status Card */}
          <div className="h-[340px]">
            <FatigueStatusCard data={monitoringData} />
          </div>

          {/* Demo Simulation Controls */}
          <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span>Demo Simulation Control</span>
                </h4>
                <button 
                  onClick={() => handleSimulate('normal')}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
             </div>

             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleSimulate('blink')}
                  disabled={monitoringData.inferenceMode !== 'DEMO'}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3 text-blue-400" />
                  Simulate Blink
                </button>
                <button 
                  onClick={() => handleSimulate('yawn')}
                  disabled={monitoringData.inferenceMode !== 'DEMO'}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  Simulate Yawn
                </button>
                <button 
                  onClick={() => handleSimulate('longEyeClosure')}
                  disabled={monitoringData.inferenceMode !== 'DEMO'}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3 text-orange-400" />
                  Long Eye Closure
                </button>
                <button 
                  onClick={() => handleSimulate('lookingAway')}
                  disabled={monitoringData.inferenceMode !== 'DEMO'}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3 text-indigo-400" />
                  Looking Away
                </button>
             </div>

             <div className="space-y-2 pt-2 border-t border-slate-800">
                <button 
                  onClick={() => handleSimulate('drowsy')}
                  disabled={monitoringData.inferenceMode !== 'DEMO'}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4" />
                  Trigger Drowsiness Risk
                </button>
                <button 
                  onClick={() => handleSimulate('critical')}
                  disabled={monitoringData.inferenceMode !== 'DEMO'}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all shadow-[0_0_20px_rgba(244,63,94,0.1)] disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Simulate Critical Fatigue
                </button>
             </div>
          </div>

          {/* Live Graph */}
          <FatigueTrendChart history={history} />
        </div>
      </div>
    </div>
  );
};
