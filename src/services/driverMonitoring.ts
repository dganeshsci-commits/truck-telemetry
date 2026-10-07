import { DriverMonitoringData, DriverMonitoringSettings } from '../types';
import { clientVisionEngine } from './clientVisionEngine';

class DriverMonitoringService {
  private data: DriverMonitoringData;
  private settings: DriverMonitoringSettings;
  private subscribers: ((data: DriverMonitoringData) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private useClientVisionFallback = false;
  
  // PERCLOS calculation history
  private eyeStatusHistory: { timestamp: number; isOpen: boolean }[] = [];

  constructor() {
    this.settings = {
      perclosWindow: 60,
      eyeClosureThreshold: 0.8,
      longEyeClosureDuration: 2000,
      yawnDurationThreshold: 3000,
      lookingAwayDurationThreshold: 3000,
      fatigueScoreThresholds: {
        attention: 30,
        drowsy: 50,
        critical: 70
      },
      cameraFps: 30,
      inferenceFps: 10,
      mode: 'DEMO',
      backendUrl: 'http://localhost:8000'
    };

    this.data = this.getInitialData();
  }

  private getInitialData(): DriverMonitoringData {
    return {
      driverId: 'DRV001',
      vehicleId: 'TN-01-AB-4821',
      faceDetected: false,
      leftEye: 'unknown',
      rightEye: 'unknown',
      perclos: 0,
      blinkRate: 0,
      mouthState: 'normal',
      yawnDetected: false,
      yawnDuration: 0,
      yawnCount: 0,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      lookingAway: false,
      fatigueScore: 0,
      fatigueState: 'NORMAL',
      inferenceMode: 'DEMO',
      cameraStatus: 'DISCONNECTED',
      aiBackendStatus: 'CONNECTED',
      isModelOnline: true,
      modelEngine: 'PYTHON_ONNX_NEURAL',
      timestamp: new Date().toISOString()
    };
  }

  public subscribe(callback: (data: DriverMonitoringData) => void) {
    this.subscribers.push(callback);
    callback(this.data);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(s => s({ ...this.data }));
  }

  public async syncModelStatus(): Promise<void> {
    try {
      const resp = await fetch('/api/model/status');
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const json = await resp.json();
        this.data.isModelOnline = !!json.online;
        this.data.aiBackendStatus = json.status || (json.online ? 'CONNECTED' : 'DISCONNECTED');
        if (json.engine) {
          this.data.modelEngine = json.engine;
        }
        this.notify();
        return;
      }
    } catch {
      // In Vercel or without local server, fallback to client-native edge AI
    }

    // Default Vercel / Client-Native state
    this.data.isModelOnline = this.data.isModelOnline !== false;
    this.data.aiBackendStatus = 'CONNECTED';
    if (!this.data.modelEngine || this.data.modelEngine === 'OFFLINE') {
      this.data.modelEngine = 'BROWSER_EDGE_AI (Vercel Native)';
    }
    this.notify();
  }

  public async toggleModel(enable?: boolean): Promise<boolean> {
    const nextState = enable !== undefined ? enable : !this.data.isModelOnline;
    this.data.isModelOnline = nextState;
    this.data.aiBackendStatus = nextState ? 'CONNECTED' : 'DISCONNECTED';
    this.notify();

    try {
      const resp = await fetch('/api/model/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const json = await resp.json();
        this.data.isModelOnline = !!json.online;
        this.data.aiBackendStatus = json.status;
        if (json.engine) {
          this.data.modelEngine = json.engine;
        }
      }
    } catch {
      // If Vercel or offline, keep local state
    }

    this.notify();
    return this.data.isModelOnline;
  }

  public start() {
    // Initial sync with backend
    this.syncModelStatus();

    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      if (this.settings.mode === 'DEMO') {
        this.updateDemoData();
      }
      this.calculatePerclos();
      this.notify();
    }, 1000 / this.settings.inferenceFps);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setMode(mode: "DEMO" | "LAPTOP_WEBCAM" | "RASPBERRY_PI_LIVE") {
    this.settings.mode = mode;
    this.data.inferenceMode = mode;
    
    // Reset data when switching modes
    if (mode === 'DEMO') {
      this.data.cameraStatus = 'CONNECTED';
      this.data.faceDetected = true;
      this.data.aiBackendStatus = this.data.isModelOnline ? 'CONNECTED' : 'DISCONNECTED';
      this.data.fatigueScore = 18;
      this.data.fatigueState = 'NORMAL';
    } else {
      this.data.cameraStatus = 'DISCONNECTED';
      this.data.faceDetected = false;
      this.data.aiBackendStatus = this.data.isModelOnline ? 'CONNECTED' : 'DISCONNECTED';
      this.data.leftEye = 'unknown';
      this.data.rightEye = 'unknown';
      this.data.mouthState = 'normal';
      this.data.lookingAway = false;
      this.data.headPose = { yaw: 0, pitch: 0, roll: 0 };
      this.data.fatigueScore = 0;
      this.data.fatigueState = 'NORMAL';
      this.data.perclos = 0;
    }
    
    this.notify();
  }

  public setCameraStatus(status: DriverMonitoringData['cameraStatus']) {
    this.data.cameraStatus = status;
    this.notify();
  }

  private isProcessing = false;
  private lastProcessTime = 0;

  public async processFrame(canvas: HTMLCanvasElement) {
    if (this.settings.mode === 'DEMO') return;
    if (!this.data.isModelOnline) return;

    // Throttle inference
    const now = Date.now();
    if (this.isProcessing || now - this.lastProcessTime < 90) return;

    this.isProcessing = true;
    this.lastProcessTime = now;

    // Detect if running on Vercel cloud or if client fallback is active
    const isVercelHost = typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('.run.app')
    );

    if (this.useClientVisionFallback || isVercelHost) {
      await this.applyClientVision(canvas);
      this.isProcessing = false;
      return;
    }
    
    try {
      const imageData = canvas.toDataURL('image/jpeg', 0.6);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('/api/inference/frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageData,
          driverId: this.data.driverId,
          vehicleId: this.data.vehicleId
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error('Backend not returning JSON');
      }
      
      const result = await response.json();

      if (result.modelOnline === false) {
        this.data.isModelOnline = false;
        this.data.aiBackendStatus = 'DISCONNECTED';
        this.notify();
        return;
      }

      // If backend did not detect face or eyes are unknown, fall back to high-speed client vision engine
      if (!result.faceDetected || result.leftEye === 'unknown' || result.rightEye === 'unknown') {
        await this.applyClientVision(canvas);
        return;
      }
      
      // Update data with real inference results
      this.data.faceDetected = true;
      this.data.faceBox = result.faceBox;
      this.data.faceLandmarks = result.faceLandmarks;
      this.data.leftEye = result.leftEye === 'closed' ? 'closed' : 'open';
      this.data.rightEye = result.rightEye === 'closed' ? 'closed' : 'open';
      
      let mouthState: 'normal' | 'open' | 'yawn' = 'normal';
      if (result.mouthState === 'yawn' || result.mouthState === 'yawning') {
        mouthState = 'yawn';
      } else if (result.mouthState === 'open') {
        mouthState = 'open';
      }
      this.data.mouthState = mouthState;
      this.data.yawnDetected = mouthState === 'yawn';
      this.data.headPose = result.headPose || { yaw: 0, pitch: 0, roll: 0 };
      this.data.fatigueScore = typeof result.fatigueScore === 'number' ? result.fatigueScore : 0;
      this.data.fatigueState = result.fatigueState || 'NORMAL';
      this.data.aiBackendStatus = 'CONNECTED';
      this.data.isModelOnline = true;
      if (result.modelEngine) {
        this.data.modelEngine = result.modelEngine;
      }
      
      if (this.data.yawnDetected) {
        this.data.yawnCount++;
      }

      this.data.lookingAway = Math.abs(this.data.headPose.yaw) > 30 || Math.abs(this.data.headPose.pitch) > 25;

    } catch {
      // Backend unavailable or running on Vercel: Switch immediately to client vision engine!
      this.useClientVisionFallback = true;
      await this.applyClientVision(canvas);
    } finally {
      this.isProcessing = false;
      this.data.timestamp = new Date().toISOString();
      this.notify();
    }
  }

  private async applyClientVision(canvas: HTMLCanvasElement) {
    const res = await clientVisionEngine.analyze(canvas);
    this.data.faceDetected = res.faceDetected;
    this.data.faceBox = res.faceBox;
    this.data.faceLandmarks = res.faceLandmarks;
    this.data.leftEye = res.leftEye;
    this.data.rightEye = res.rightEye;
    this.data.mouthState = res.mouthState;
    this.data.yawnDetected = res.mouthState === 'yawn';
    this.data.headPose = res.headPose;
    this.data.fatigueScore = res.fatigueScore;
    this.data.fatigueState = res.fatigueState;
    this.data.aiBackendStatus = 'CONNECTED';
    this.data.isModelOnline = true;
    this.data.modelEngine = res.modelEngine;

    if (this.data.yawnDetected) {
      this.data.yawnCount++;
    }

    if (res.headPose) {
      this.data.lookingAway = Math.abs(res.headPose.yaw) > 30 || Math.abs(res.headPose.pitch) > 25;
    }
    this.data.timestamp = new Date().toISOString();
    this.notify();
  }

  private calculatePerclos() {
    const now = Date.now();
    const windowMs = this.settings.perclosWindow * 1000;
    
    // Add current eye status if we have detection
    if (this.data.faceDetected && (this.data.leftEye !== 'unknown')) {
      const isOpen = this.data.leftEye === 'open' && this.data.rightEye === 'open';
      this.eyeStatusHistory.push({ timestamp: now, isOpen });
    }

    // Clean old history
    this.eyeStatusHistory = this.eyeStatusHistory.filter(h => now - h.timestamp < windowMs);

    if (this.eyeStatusHistory.length > 10) {
      const closedCount = this.eyeStatusHistory.filter(h => !h.isOpen).length;
      this.data.perclos = (closedCount / this.eyeStatusHistory.length) * 100;
    }
  }

  public updateSettings(settings: Partial<DriverMonitoringSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.notify();
  }

  public getSettings() {
    return this.settings;
  }

  public setDriverInfo(driverId: string, vehicleId: string) {
    this.data.driverId = driverId;
    this.data.vehicleId = vehicleId;
    this.notify();
  }

  private updateDemoData() {
    this.data.faceDetected = true;
    this.data.aiBackendStatus = 'CONNECTED';

    // Basic jitter for realism
    if (this.data.fatigueState === 'NORMAL') {
      this.data.headPose.yaw = 2.4 + (Math.random() - 0.5) * 2;
      this.data.headPose.pitch = -1.2 + (Math.random() - 0.5) * 1;
      this.data.headPose.roll = 0.8 + (Math.random() - 0.5) * 0.5;
      
      // Random blinks
      if (Math.random() > 0.98) {
        this.data.leftEye = 'closed';
        this.data.rightEye = 'closed';
        setTimeout(() => {
          this.data.leftEye = 'open';
          this.data.rightEye = 'open';
        }, 150);
      } else {
        this.data.leftEye = 'open';
        this.data.rightEye = 'open';
      }
    }
    
    this.data.timestamp = new Date().toISOString();
  }

  public simulateEvent(event: 'blink' | 'yawn' | 'longEyeClosure' | 'lookingAway' | 'drowsy' | 'critical' | 'normal') {
    if (this.settings.mode !== 'DEMO') return;

    switch (event) {
      case 'normal':
        this.data.fatigueScore = 18;
        this.data.fatigueState = 'NORMAL';
        this.data.leftEye = 'open';
        this.data.rightEye = 'open';
        this.data.mouthState = 'normal';
        this.data.lookingAway = false;
        this.data.perclos = 4.2;
        this.data.headPose = { yaw: 2.4, pitch: -1.2, roll: 0.8 };
        break;
      case 'blink':
        this.data.leftEye = 'closed';
        this.data.rightEye = 'closed';
        setTimeout(() => {
          this.data.leftEye = 'open';
          this.data.rightEye = 'open';
          this.notify();
        }, 200);
        break;
      case 'yawn':
        this.data.mouthState = 'yawn';
        this.data.yawnDetected = true;
        this.data.yawnCount++;
        this.data.yawnDuration = 4.2;
        this.data.fatigueScore = Math.max(this.data.fatigueScore, 35);
        this.data.fatigueState = 'ATTENTION';
        setTimeout(() => {
          this.data.mouthState = 'normal';
          this.data.yawnDetected = false;
          this.notify();
        }, 4000);
        break;
      case 'longEyeClosure':
        this.data.leftEye = 'closed';
        this.data.rightEye = 'closed';
        this.data.fatigueScore = 48;
        this.data.fatigueState = 'ATTENTION';
        setTimeout(() => {
          this.data.leftEye = 'open';
          this.data.rightEye = 'open';
          this.notify();
        }, 2500);
        break;
      case 'lookingAway':
        this.data.lookingAway = true;
        this.data.headPose.yaw = 42.5;
        this.data.fatigueScore = Math.max(this.data.fatigueScore, 32);
        this.data.fatigueState = 'ATTENTION';
        setTimeout(() => {
            this.data.lookingAway = false;
            this.data.headPose.yaw = 2.4;
            this.notify();
        }, 4000);
        break;
      case 'drowsy':
        this.data.fatigueScore = 62;
        this.data.fatigueState = 'DROWSY';
        this.data.perclos = 18.4;
        this.data.leftEye = 'closed';
        this.data.rightEye = 'closed';
        setTimeout(() => {
            this.data.leftEye = 'open';
            this.data.rightEye = 'open';
        }, 1000);
        break;
      case 'critical':
        this.data.fatigueScore = 88;
        this.data.fatigueState = 'CRITICAL';
        this.data.perclos = 32.1;
        this.data.leftEye = 'closed';
        this.data.rightEye = 'closed';
        break;
    }
    this.notify();
  }
}

export const driverMonitoringService = new DriverMonitoringService();
