/**
 * WebSocket Service
 * 
 * Real-time connection manager for agent and traveller notifications.
 * Connects to the backend WebSocket endpoints for live itinerary updates.
 */

type MessageHandler = (data: WebSocketMessage) => void;

export interface WebSocketMessage {
    type: string;
    trip_id?: string;
    iteration?: number;
    action?: string;
    explanations?: string[];
    cost_analysis?: Record<string, any>;
    message?: string;
    auto_approved?: boolean;
    [key: string]: any;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private globalHandlers: Set<MessageHandler> = new Set();
    private url: string = '';
    private shouldReconnect: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 3000;

    /**
     * Connect to the WebSocket server
     * @param role - 'agent' or 'traveller'
     * @param userId - Agent ID or User ID
     */
    connect(role: 'agent' | 'traveller', userId: string): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[WS] Already connected');
            return;
        }

        const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
        const path = role === 'agent' ? 'ws/agent' : 'ws/traveller';
        this.url = `${wsBase}/${path}/${userId}`;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;

        this._connect();
    }

    private _connect(): void {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('[WS] Connected to', this.url);
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    console.log('[WS] Received:', data.type, data);

                    // Dispatch to type-specific handlers
                    const typeHandlers = this.handlers.get(data.type);
                    if (typeHandlers) {
                        typeHandlers.forEach(handler => handler(data));
                    }

                    // Dispatch to global handlers
                    this.globalHandlers.forEach(handler => handler(data));
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WS] Disconnected:', event.code, event.reason);
                this.ws = null;

                if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
                    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
                    this.reconnectTimer = setTimeout(() => this._connect(), delay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
            };
        } catch (err) {
            console.error('[WS] Connection failed:', err);
        }
    }

    /**
     * Subscribe to a specific message type
     */
    on(type: string, handler: MessageHandler): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.handlers.get(type)?.delete(handler);
        };
    }

    /**
     * Subscribe to all messages
     */
    onAny(handler: MessageHandler): () => void {
        this.globalHandlers.add(handler);
        return () => {
            this.globalHandlers.delete(handler);
        };
    }

    /**
     * Send a message to the server
     */
    send(data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
            console.warn('[WS] Cannot send - not connected');
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect(): void {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.handlers.clear();
        this.globalHandlers.clear();
        console.log('[WS] Disconnected');
    }

    /**
     * Check if connected
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
export const wsService = new WebSocketService();
