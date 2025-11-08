/**
 * WebSocket client for real-time detection service
 */

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  timestamp: number;
  location?: Location;
}

export interface DetectionResponse {
  type: 'detection' | 'connected' | 'error' | 'pong';
  frame_id?: string;
  detections?: Detection[];
  detection_count?: number;
  processing_time_ms?: number;
  timestamp?: number;
  annotated_image?: string;
  message?: string;
  client_id?: string;
  model_info?: any;
  encrypted_metadata?: string; // Encrypted detection metadata
  privacy_protected?: boolean; // Indicates privacy filters were applied
}

export interface DetectionServiceConfig {
  url: string;
  clientId: string;
  onConnected?: (data: any) => void;
  onDetection?: (response: DetectionResponse) => void;
  onError?: (error: string) => void;
  onDisconnected?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export class DetectionWebSocketClient {
  private ws: WebSocket | null = null;
  private config: DetectionServiceConfig;
  private isConnected: boolean = false;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private frameQueue: Array<{ data: string; frameId: string; timestamp: number }> = [];
  private isProcessing: boolean = false;

  constructor(config: DetectionServiceConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}/ws/detect/${this.config.clientId}`;
        console.log(`[DetectionWS] Connecting to: ${wsUrl}`);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[DetectionWS] Connected');
          this.isConnected = true;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            console.log('[DetectionWS] 📬 Raw message received, parsing...');
            const data: DetectionResponse = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[DetectionWS] ❌ Parse error:', error);
            console.error('[DetectionWS] Raw data:', event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[DetectionWS] Error:', error);
          this.config.onError?.('WebSocket error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[DetectionWS] Disconnected');
          this.isConnected = false;
          this.stopHeartbeat();
          this.config.onDisconnected?.();

          if (this.config.autoReconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        console.error('[DetectionWS] Connection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.config.autoReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      // Send disconnect message
      this.send({ type: 'disconnect' });
      
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.frameQueue = [];
  }

  /**
   * Send frame for detection
   */
  async detectFrame(
    base64Image: string,
    frameId?: string,
    includeAnnotated: boolean = false,
    location?: Location
  ): Promise<void> {
    if (!this.isConnected || !this.ws) {
      console.error('[DetectionWS] ❌ Cannot send frame: Not connected');
      throw new Error('Not connected to detection service');
    }

    const actualFrameId = frameId || `frame_${Date.now()}`;
    const timestamp = Date.now() / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📤 SENDING FRAME TO BACKEND');
    console.log('='.repeat(60));
    console.log('📋 Frame Info:');
    console.log(`   Frame ID: ${actualFrameId}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Base64 length: ${base64Image.length} chars`);
    console.log(`   Include annotated: ${includeAnnotated}`);
    if (location) {
      console.log(`   📍 GPS Location: (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`);
      if (location.accuracy) {
        console.log(`      Accuracy: ±${location.accuracy.toFixed(2)}m`);
      }
    }
    console.log(`   WebSocket state: ${this.ws.readyState} (1=OPEN)`);

    const message = {
      type: 'frame',
      data: base64Image,
      frame_id: actualFrameId,
      timestamp: timestamp,
      include_annotated: includeAnnotated,
      location: location,
    };

    console.log('📦 Message structure:', {
      type: message.type,
      frame_id: message.frame_id,
      timestamp: message.timestamp,
      include_annotated: message.include_annotated,
      data_length: message.data.length,
      has_location: !!location,
    });

    this.send(message);
    console.log('✅ Frame sent to server');
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Send ping to keep connection alive
   */
  ping(): void {
    if (this.isConnected && this.ws) {
      this.send({ type: 'ping' });
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: DetectionResponse): void {
    console.log('\n' + '='.repeat(60));
    console.log('📨 RECEIVED MESSAGE FROM BACKEND');
    console.log('='.repeat(60));
    console.log('Message type:', data.type);

    switch (data.type) {
      case 'connected':
        console.log('✅ Connection confirmed!');
        console.log('   Client ID:', data.client_id);
        console.log('   Model info:', data.model_info);
        this.config.onConnected?.(data);
        break;

      case 'detection':
        console.log('🎯 DETECTION RESULT:');
        console.log(`   Frame ID: ${data.frame_id}`);
        console.log(`   Detection count: ${data.detection_count}`);
        console.log(`   Processing time: ${data.processing_time_ms}ms`);
        console.log(`   Timestamp: ${data.timestamp}`);
        
        if (data.detections && data.detections.length > 0) {
          console.log('   Detections:');
          data.detections.forEach((det, idx) => {
            console.log(`      ${idx + 1}. ${det.class_name}: ${(det.confidence * 100).toFixed(1)}%`);
            console.log(`         BBox: [${det.bbox.map(b => b.toFixed(1)).join(', ')}]`);
          });
        } else {
          console.log('   ⚪ No detections in this frame');
        }
        
        this.config.onDetection?.(data);
        this.isProcessing = false;
        this.processNextFrame();
        break;

      case 'error':
        console.error('❌ Server error:', data.message);
        this.config.onError?.(data.message || 'Unknown error');
        this.isProcessing = false;
        break;

      case 'pong':
        console.log('🏓 Pong received (heartbeat)');
        break;

      default:
        console.warn('❓ Unknown message type:', data.type);
    }
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Send message to server
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[DetectionWS] Cannot send, not connected');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.ping();
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    console.log(
      `[DetectionWS] Reconnecting in ${this.config.reconnectInterval}ms...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((error) => {
        console.error('[DetectionWS] Reconnect failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  /**
   * Process next frame in queue
   */
  private processNextFrame(): void {
    if (this.isProcessing || this.frameQueue.length === 0) {
      return;
    }

    const frame = this.frameQueue.shift();
    if (frame) {
      this.isProcessing = true;
      this.detectFrame(frame.data, frame.frameId, false).catch((error) => {
        console.error('[DetectionWS] Frame detection error:', error);
        this.isProcessing = false;
      });
    }
  }
}
