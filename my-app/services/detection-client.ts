/**
 * WebSocket client for real-time detection service
 */

export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  timestamp: number;
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
            const data: DetectionResponse = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[DetectionWS] Parse error:', error);
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
    includeAnnotated: boolean = false
  ): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to detection service');
    }

    const message = {
      type: 'frame',
      data: base64Image,
      frame_id: frameId || `frame_${Date.now()}`,
      timestamp: Date.now() / 1000,
      include_annotated: includeAnnotated,
    };

    this.send(message);
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
    switch (data.type) {
      case 'connected':
        console.log('[DetectionWS] Connection confirmed:', data.client_id);
        this.config.onConnected?.(data);
        break;

      case 'detection':
        // console.log(
        //   `[DetectionWS] Detections: ${data.detection_count} in ${data.processing_time_ms}ms`
        // );
        this.config.onDetection?.(data);
        this.isProcessing = false;
        this.processNextFrame();
        break;

      case 'error':
        console.error('[DetectionWS] Server error:', data.message);
        this.config.onError?.(data.message || 'Unknown error');
        this.isProcessing = false;
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.warn('[DetectionWS] Unknown message type:', data.type);
    }
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
