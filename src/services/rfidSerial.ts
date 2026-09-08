// Web Serial API implementation for SPDuino ATmega328 + RC522 RFID Reader

export type SerialLineCallback = (line: string) => void;
export type DisconnectCallback = (reason: string) => void;

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialDiagnostics {
  baudRate: number;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  imuSampleRate: number;
  packetCount: number;
  rfidCount: number;
  errorCount: number;
  lastMessage: string;
  uptimeSeconds: number;
}

export class RfidSerialManager {
  private port: any | null = null;
  private reader: any | null = null;
  private isReading = false;
  private keepReading = false;
  private onLineReceived: SerialLineCallback | null = null;
  private onDisconnect: DisconnectCallback | null = null;
  private lineListeners: Set<SerialLineCallback> = new Set();
  private disconnectListeners: Set<DisconnectCallback> = new Set();
  private portLabel = 'Not Selected';

  // Diagnostics
  private diagnostics: SerialDiagnostics = {
    baudRate: 115200,
    status: 'DISCONNECTED',
    imuSampleRate: 0,
    packetCount: 0,
    rfidCount: 0,
    errorCount: 0,
    lastMessage: 'No messages received',
    uptimeSeconds: 0
  };

  private connectTime: number = 0;
  private lastImuTimestamp: number = 0;
  private imuSamplesInWindow: number = 0;
  private freqCalcInterval: any = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public getPortLabel(): string {
    return this.portLabel;
  }

  public isConnected(): boolean {
    return this.port !== null && this.isReading;
  }

  public getDiagnostics(): SerialDiagnostics {
    if (this.connectTime > 0 && this.diagnostics.status === 'CONNECTED') {
      this.diagnostics.uptimeSeconds = Math.floor((Date.now() - this.connectTime) / 1000);
    }
    return { ...this.diagnostics };
  }

  public setCallbacks(onLine: SerialLineCallback, onDisconnect: DisconnectCallback) {
    this.onLineReceived = onLine;
    this.onDisconnect = onDisconnect;
  }

  public addListener(listener: SerialLineCallback): () => void {
    this.lineListeners.add(listener);
    return () => {
      this.lineListeners.delete(listener);
    };
  }

  public addDisconnectListener(listener: DisconnectCallback): () => void {
    this.disconnectListeners.add(listener);
    return () => {
      this.disconnectListeners.delete(listener);
    };
  }

  public async connect(baudRate: number = 115200): Promise<{ success: boolean; portLabel: string; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        portLabel: 'Unavailable',
        error: 'Web Serial is not supported. Please use Google Chrome or Microsoft Edge.'
      };
    }

    // Prevent duplicate connections
    if (this.port || this.isReading) {
      console.warn('[RfidSerial] Already connected or connecting. Use disconnect() first.');
      return {
        success: true,
        portLabel: this.portLabel
      };
    }

    this.diagnostics.status = 'CONNECTING';
    this.diagnostics.baudRate = baudRate;

    try {
      const nav = navigator as any;
      const port = await nav.serial.requestPort({});

      // Open at specified baud rate
      await port.open({ baudRate });
      this.port = port;

      // Extract port info
      try {
        const info: SerialPortInfo = port.getInfo();
        if (info.usbVendorId) {
          const vidHex = info.usbVendorId.toString(16).padStart(4, '0').toUpperCase();
          const pidHex = info.usbProductId ? info.usbProductId.toString(16).padStart(4, '0').toUpperCase() : '';
          this.portLabel = `SPDuino (VID: ${vidHex}${pidHex ? ` PID: ${pidHex}` : ''})`;
        } else {
          this.portLabel = `SPDuino ATmega328P (${baudRate} baud)`;
        }
      } catch {
        this.portLabel = `SPDuino USB Serial (${baudRate} baud)`;
      }

      // Listen for hardware disconnect events
      if (nav.serial.addEventListener) {
        nav.serial.addEventListener('disconnect', (event: any) => {
          if (event.port === this.port) {
            this.handleUnexpectedDisconnect('Hardware unplugged.');
          }
        });
      }

      this.connectTime = Date.now();
      this.diagnostics.status = 'CONNECTED';
      this.diagnostics.packetCount = 0;
      this.diagnostics.rfidCount = 0;
      this.diagnostics.errorCount = 0;
      this.diagnostics.imuSampleRate = 0;
      
      // Start frequency calculator
      this.startFrequencyCalculator();

      // Start asynchronous read loop
      this.startReadLoop();

      return {
        success: true,
        portLabel: this.portLabel
      };
    } catch (err: any) {
      this.diagnostics.status = 'ERROR';
      this.diagnostics.errorCount++;
      this.port = null;
      this.isReading = false;
      
      const rawMsg = err?.message || '';
      let errMsg = 'Failed to open serial port';
      
      if (err.name === 'NotFoundError') {
        errMsg = 'No SPDuino detected.';
      } else if (
        rawMsg.toLowerCase().includes('failed to open') ||
        rawMsg.toLowerCase().includes('access denied') ||
        rawMsg.toLowerCase().includes('already open') ||
        rawMsg.toLowerCase().includes('resource busy') ||
        err.name === 'InvalidStateError' ||
        err.name === 'NetworkError'
      ) {
        errMsg = 'Serial port busy. Close other monitors first.';
      } else {
        errMsg = rawMsg || errMsg;
      }
      
      return { success: false, portLabel: 'Error', error: errMsg };
    }
  }

  private startFrequencyCalculator() {
    if (this.freqCalcInterval) clearInterval(this.freqCalcInterval);
    this.freqCalcInterval = setInterval(() => {
      if (this.diagnostics.status === 'CONNECTED') {
        this.diagnostics.imuSampleRate = this.imuSamplesInWindow;
        this.imuSamplesInWindow = 0;
      }
    }, 1000);
  }

  private async startReadLoop() {
    if (!this.port || !this.port.readable) return;
    
    // Safety check to ensure only one loop
    if (this.isReading) return;
    
    this.keepReading = true;
    this.isReading = true;

    try {
      while (this.port && this.port.readable && this.keepReading) {
        // Use TextDecoderStream for cleaner line handling
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        this.reader = reader;

        let lineBuffer = '';

        try {
          while (this.keepReading) {
            const { value, done } = await reader.read();
            if (done) break;
            
            if (value) {
              lineBuffer += value;
              const lines = lineBuffer.split(/\r?\n/);
              lineBuffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                  this.processLine(trimmed);
                }
              }
            }
          }
        } catch (readError: any) {
          if (this.keepReading) {
            this.diagnostics.errorCount++;
            console.warn('[RfidSerial] Read error:', readError);
            this.handleUnexpectedDisconnect(`Serial error: ${readError?.message || 'Connection lost'}`);
          }
        } finally {
          reader.releaseLock();
          await readableStreamClosed.catch(() => {}); // handle potential pipe close error
        }
        
        if (!this.keepReading) break;
      }
    } catch (outerError) {
      console.warn('[RfidSerial] Loop error:', outerError);
    } finally {
      this.isReading = false;
      this.reader = null;
    }
  }

  private processLine(line: string) {
    this.diagnostics.packetCount++;
    this.diagnostics.lastMessage = line;

    // IMU frequency tracking
    if (line.startsWith('ACCEL,') || line.startsWith('TILT,')) {
      this.imuSamplesInWindow++;
    }

    // RFID tracking
    if (line.startsWith('RFID,')) {
      this.diagnostics.rfidCount++;
    }

    // Trigger callbacks/listeners
    if (this.onLineReceived) {
      this.onLineReceived(line);
    }
    for (const listener of this.lineListeners) {
      try {
        listener(line);
      } catch (e) {
        // listener error shouldn't crash the loop
      }
    }
  }

  private handleUnexpectedDisconnect(reason: string) {
    this.diagnostics.status = 'ERROR';
    this.keepReading = false;
    this.isReading = false;
    this.port = null;
    this.reader = null;
    this.portLabel = 'Disconnected';
    
    if (this.freqCalcInterval) clearInterval(this.freqCalcInterval);
    
    if (this.onDisconnect) {
      this.onDisconnect(reason);
    }
    for (const listener of this.disconnectListeners) {
      try {
        listener(reason);
      } catch (e) {
        // ignore
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;
    this.diagnostics.status = 'DISCONNECTED';
    
    if (this.freqCalcInterval) {
      clearInterval(this.freqCalcInterval);
      this.freqCalcInterval = null;
    }

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      try {
        this.reader.releaseLock();
      } catch {}
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }

    this.isReading = false;
    this.portLabel = 'Not Connected';
    this.connectTime = 0;
  }
}

export const rfidSerialManager = new RfidSerialManager();
