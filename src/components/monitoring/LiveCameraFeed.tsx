import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, ShieldCheck, Zap, Activity, Play, Square, AlertCircle, ExternalLink, RefreshCw, Video, Power } from 'lucide-react';
import { DriverMonitoringData } from '../../types';
import { driverMonitoringService } from '../../services/driverMonitoring';

interface LiveCameraFeedProps {
  data: DriverMonitoringData;
}

export const LiveCameraFeed: React.FC<LiveCameraFeedProps> = ({ data }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const processingRef = useRef<number | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Enumerate video devices on mount or after permission is requested
  const refreshDevices = useCallback(async () => {
    if (navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(vDevs);
        if (vDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(vDevs[0].deviceId);
        }
      } catch (e) {
        console.warn("Device enumeration error:", e);
      }
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const startCamera = useCallback(async (deviceIdOverride?: string) => {
    try {
      setError(null);
      const targetDevice = deviceIdOverride || selectedDeviceId;
      let s: MediaStream;

      const constraints: MediaStreamConstraints = {
        video: targetDevice ? { deviceId: { exact: targetDevice } } : { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      try {
        s = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to basic video constraint if ideal device constraints fail
        console.warn("Primary camera constraint failed, attempting fallback:", firstErr);
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(s);
      driverMonitoringService.setCameraStatus('CONNECTED');
      refreshDevices();
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(
          isInIframe
            ? "Camera permission was granted, but the embedded preview iframe is blocking hardware access. Click 'Open in New Tab' to grant direct top-level access."
            : "Camera permission denied. If you already allowed it, check if another app (like Zoom or Teams) is locking your webcam, or check your OS Privacy & Security settings."
        );
        driverMonitoringService.setCameraStatus('PERMISSION_DENIED');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Your webcam is currently in use by another app or browser tab. Please close other camera apps and click Retry.");
        driverMonitoringService.setCameraStatus('DISCONNECTED');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No webcam device detected on this system.");
        driverMonitoringService.setCameraStatus('NOT_DETECTED');
      } else {
        setError(err.message ? `Camera access error: ${err.message}` : "Failed to access camera.");
        driverMonitoringService.setCameraStatus('DISCONNECTED');
      }
    }
  }, [selectedDeviceId, isInIframe, refreshDevices]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (processingRef.current) {
      cancelAnimationFrame(processingRef.current);
      processingRef.current = null;
    }
    driverMonitoringService.setCameraStatus('DISCONNECTED');
  }, [stream]);

  const resetCamera = useCallback(() => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 400);
  }, [stopCamera, startCamera]);

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (stream) {
        video.srcObject = stream;
        video.play().catch(e => console.warn("Video play notice:", e));
      } else {
        video.srcObject = null;
      }
    }
  }, [stream]);

  // Frame processing loop
  useEffect(() => {
    if (stream && data.inferenceMode === 'LAPTOP_WEBCAM') {
      const process = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0 && canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            driverMonitoringService.processFrame(canvas);
          }
        }
        processingRef.current = requestAnimationFrame(process);
      };
      processingRef.current = requestAnimationFrame(process);
    }
    return () => {
      if (processingRef.current) {
        cancelAnimationFrame(processingRef.current);
        processingRef.current = null;
      }
    };
  }, [stream, data.inferenceMode]);

  useEffect(() => {
    // If we switch away from a live mode, stop the camera
    if (data.inferenceMode === 'DEMO') {
      stopCamera();
    }
  }, [data.inferenceMode, stopCamera]);

  const isLiveMode = data.inferenceMode === 'LAPTOP_WEBCAM' || data.inferenceMode === 'RASPBERRY_PI_LIVE';
  const isWebcam = data.inferenceMode === 'LAPTOP_WEBCAM';

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl group">
      {/* Offscreen processing canvas (320x240 matches AI model native input) */}
      <canvas 
        ref={canvasRef} 
        width="320" 
        height="240" 
        className="absolute -top-[9999px] -left-[9999px] pointer-events-none opacity-0" 
      />

      {/* Persistent Video Element to avoid black flashes / unmount issues */}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        onLoadedMetadata={(e) => {
          (e.currentTarget as HTMLVideoElement).play().catch(() => {});
        }}
        onCanPlay={(e) => {
          (e.currentTarget as HTMLVideoElement).play().catch(() => {});
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isWebcam ? '-scale-x-100' : ''
        } ${isLiveMode && stream ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'}`}
      />

      {/* Live Mode Inactive Placeholder */}
      {isLiveMode && !stream && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-900/95 overflow-y-auto">
          {error ? (
            <div className="text-center max-w-lg space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto border border-rose-500/20">
                <CameraOff className="w-7 h-7 text-rose-400" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  {data.cameraStatus === 'PERMISSION_DENIED' ? 'Camera Permission Blocked' : 'Camera Unavailable'}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {error}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {isInIframe && (
                  <a 
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </a>
                )}
                
                <button 
                  onClick={() => startCamera()}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Camera
                </button>
              </div>

              {/* Video Device Picker if multiple exist */}
              {videoDevices.length > 1 && (
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Select Available Camera:
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-normal max-w-sm mx-auto">
                Tip: If you are using Chrome on macOS or Windows, ensure Chrome is allowed to access Camera in your computer's OS System Settings.
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto border border-blue-500/20 animate-pulse">
                <Camera className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-widest">
                  {isWebcam ? 'Laptop Webcam Mode' : 'Raspberry Pi Live Mode'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                  {isWebcam ? 'Click below to start live monitoring feed' : 'Awaiting edge device signal'}
                </p>
              </div>

              {/* Device selector before starting */}
              {videoDevices.length > 1 && (
                <div>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 w-full focus:outline-hidden focus:border-blue-500"
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button 
                  onClick={() => startCamera()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Camera
                </button>

                {isInIframe && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    title="Open in new window for direct camera access"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    New Tab
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demo Mode Placeholder */}
      {!isLiveMode && (
        <div className="w-full h-full flex flex-col items-center justify-center space-y-4 z-10 relative">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
            <img 
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=640" 
              alt="Demo Driver" 
              className="w-48 h-48 rounded-full object-cover border-4 border-blue-500/30 shadow-2xl relative z-10 grayscale-[0.2]"
            />
          </div>
          <div className="text-center z-10">
            <p className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 justify-center">
              <Zap className="w-4 h-4" />
              Demo Inference Mode
            </p>
            <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Simulated AI Processing Pipeline</p>
          </div>
        </div>
      )}

      {/* AI Overlays (Only active when stream is running and face detected) */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {data.faceDetected && data.cameraStatus === 'CONNECTED' && data.faceBox && (
          <>
            {/* Face Bounding Box */}
            <div 
              className="absolute border-2 border-emerald-500/60 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-100"
              style={{ 
                top: `${(data.faceBox[1] / 240) * 100}%`, 
                left: isWebcam 
                  ? `${(1 - (data.faceBox[0] + data.faceBox[2]) / 320) * 100}%` 
                  : `${(data.faceBox[0] / 320) * 100}%`, 
                width: `${(data.faceBox[2] / 320) * 100}%`, 
                height: `${(data.faceBox[3] / 240) * 100}%` 
              }}
            >
              <div className="absolute -top-6 left-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Face Tracked
              </div>
            </div>

            {/* Landmarks Overlay */}
            {data.faceLandmarks && Array.isArray(data.faceLandmarks) && data.faceLandmarks.length >= 10 && (
              <svg 
                className="absolute inset-0 w-full h-full opacity-80" 
                viewBox="0 0 320 240" 
                preserveAspectRatio="none"
              >
                {Array.from({ length: Math.floor(data.faceLandmarks.length / 2) }).map((_, i) => {
                  const x = data.faceLandmarks![i * 2];
                  const y = data.faceLandmarks![i * 2 + 1];
                  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) return null;
                  return (
                    <circle 
                      key={i}
                      cx={isWebcam ? 320 - x : x} 
                      cy={y} 
                      r="1.2" 
                      fill={i >= 60 && i <= 75 ? (data.leftEye === 'closed' || data.rightEye === 'closed' ? '#ef4444' : '#10b981') : '#38bdf8'} 
                    />
                  );
                })}
              </svg>
            )}
          </>
        )}

        {/* Face Scanning & Targeting Guide */}
        {!data.faceDetected && isLiveMode && stream && data.isModelOnline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-44 h-52 rounded-3xl border-2 border-dashed border-blue-400/40 flex items-center justify-center animate-pulse">
              <div className="text-center px-3.5 py-2 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl">
                <Activity className="w-4 h-4 text-blue-400 mx-auto animate-spin [animation-duration:4s]" />
                <p className="text-[11px] font-bold text-white mt-1 tracking-wide">Scanning for Driver Face</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Position face inside camera frame</p>
              </div>
            </div>
          </div>
        )}

        {/* Offline notification banner if model is powered off while camera runs */}
        {!data.isModelOnline && isLiveMode && stream && (
          <div className="absolute top-16 left-4 right-4 z-20 pointer-events-auto flex justify-center">
            <div className="px-4 py-2.5 bg-rose-950/90 backdrop-blur-md border border-rose-500/50 rounded-xl shadow-2xl flex items-center gap-3">
              <Power className="w-4 h-4 text-rose-400 animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">AI Fatigue Model is Offline</p>
                <p className="text-[10px] text-rose-300/80">Camera stream is active, but neural inference is paused</p>
              </div>
              <button
                onClick={() => driverMonitoringService.toggleModel(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Power className="w-3 h-3" />
                Turn ON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons (Visible only when streaming) */}
      {stream && isLiveMode && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20 pointer-events-auto">
          <button 
            onClick={resetCamera}
            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg transition-all shadow-lg border border-slate-700"
            title="Refresh Stream"
          >
            <Activity className="w-4 h-4 animate-spin [animation-duration:3s]" />
          </button>
          <button 
            onClick={stopCamera}
            className="p-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg transition-all shadow-lg border border-rose-500/50"
            title="Stop Camera"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}

      {/* Status Badges Overlay */}
      <div className="absolute top-4 left-4 right-28 flex flex-wrap items-center gap-2 z-20">
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.cameraStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            {data.cameraStatus}
          </span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source:</span>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            {data.inferenceMode.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Model Power Toggle Badge */}
        <button
          onClick={() => driverMonitoringService.toggleModel()}
          className={`pointer-events-auto px-3 py-1.5 rounded-lg backdrop-blur-md border flex items-center gap-2 transition-all cursor-pointer ${
            data.isModelOnline && data.aiBackendStatus === 'CONNECTED'
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/90 shadow-md shadow-emerald-950/50'
              : 'bg-rose-950/85 border-rose-500/50 text-rose-300 hover:bg-rose-900/90 ring-1 ring-rose-500/40'
          }`}
          title={data.isModelOnline ? 'Model is ONLINE. Click to turn OFF (Standby)' : 'Model is OFFLINE. Click to turn ON'}
        >
          <Power className={`w-3 h-3 ${data.isModelOnline && data.aiBackendStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {data.isModelOnline && data.aiBackendStatus === 'CONNECTED' ? 'MODEL: ONLINE' : 'MODEL: OFFLINE (TURN ON)'}
          </span>
        </button>
      </div>

      {/* Real-time Detections Overlay Bottom */}
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3 pointer-events-none">
        <div className="p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] space-y-1">
          <p className="text-white font-bold uppercase tracking-widest opacity-60">Eye Status</p>
          <div className="flex justify-between">
             <span className="text-slate-400">L: <strong className={data.leftEye === 'closed' ? 'text-rose-400' : 'text-emerald-400'}>{data.leftEye.toUpperCase()}</strong></span>
             <span className="text-slate-400">R: <strong className={data.rightEye === 'closed' ? 'text-rose-400' : 'text-emerald-400'}>{data.rightEye.toUpperCase()}</strong></span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] space-y-1 text-center">
          <p className="text-white font-bold uppercase tracking-widest opacity-60">Mouth</p>
          <p className={`font-black uppercase ${data.mouthState === 'yawn' ? 'text-rose-400' : 'text-slate-200'}`}>
            {data.mouthState}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] space-y-1 text-right">
          <p className="text-white font-bold uppercase tracking-widest opacity-60">Pose</p>
          <p className="text-blue-400 font-mono">
            Y:{data.headPose.yaw.toFixed(1)}° P:{data.headPose.pitch.toFixed(1)}°
          </p>
        </div>
      </div>
    </div>
  );
};
