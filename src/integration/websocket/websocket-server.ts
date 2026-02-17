/**
 * WebSocket Server
 *
 * Broadcasts integration events to connected dashboard clients
 * in real-time. Uses the IntegrationEventEmitter as the event source.
 *
 * Note: This module uses a simple WebSocket implementation that does
 * not require the external 'ws' package. In production, replace with
 * the 'ws' library for better performance and features.
 *
 * For Phase 3, the server logic is implemented as a client-manager
 * pattern that can be used with any WebSocket library.
 *
 * Part of Phase 3: Advanced Dashboard Features.
 *
 * @module websocket/websocket-server
 */

import {
  IntegrationEventEmitter,
  IntegrationEvent,
  EventListener,
} from './event-emitter';

/**
 * Represents a connected WebSocket client.
 */
export interface WebSocketClient {
  /** Unique client identifier */
  id: string;
  /** Send a message to the client */
  send(data: string): void;
  /** Whether the client is still connected */
  isConnected(): boolean;
  /** Close the connection */
  close(): void;
  /** When the client connected */
  connectedAt: string;
  /** Event types the client is subscribed to (empty = all) */
  subscriptions: string[];
}

/**
 * WebSocket server statistics.
 */
export interface WebSocketServerStats {
  /** Number of connected clients */
  connectedClients: number;
  /** Total messages broadcast */
  totalBroadcasts: number;
  /** Total messages sent (across all clients) */
  totalMessagesSent: number;
  /** Server uptime in ms */
  uptimeMs: number;
  /** Whether the server is running */
  running: boolean;
}

/**
 * Configuration for the WebSocket server.
 */
export interface WebSocketServerConfig {
  /** Send recent events to new clients on connect. Default: true */
  sendRecentOnConnect?: boolean;
  /** Number of recent events to send on connect. Default: 50 */
  recentEventCount?: number;
  /** Heartbeat interval in ms. Default: 30000 */
  heartbeatIntervalMs?: number;
}

/**
 * IntegrationWebSocketServer manages connected clients and broadcasts
 * integration events to them in real-time.
 *
 * This is a transport-agnostic implementation. Actual WebSocket
 * protocol handling is delegated to the WebSocket library in use.
 */
export class IntegrationWebSocketServer {
  private readonly clients: Map<string, WebSocketClient> = new Map();
  private readonly emitter: IntegrationEventEmitter;
  private readonly config: Required<WebSocketServerConfig>;
  private readonly eventListener: EventListener;

  private running: boolean = false;
  private totalBroadcasts: number = 0;
  private totalMessagesSent: number = 0;
  private startTime: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    emitter: IntegrationEventEmitter,
    config: WebSocketServerConfig = {},
  ) {
    this.emitter = emitter;
    this.config = {
      sendRecentOnConnect: config.sendRecentOnConnect ?? true,
      recentEventCount: config.recentEventCount ?? 50,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
    };

    // Create event listener for broadcasting
    this.eventListener = (event: IntegrationEvent) => {
      this.broadcast(event);
    };
  }

  /**
   * Start the WebSocket server (begin listening for events).
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.startTime = Date.now();

    // Subscribe to all integration events
    this.emitter.onAll(this.eventListener);

    // Start heartbeat
    if (this.config.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, this.config.heartbeatIntervalMs);
    }
  }

  /**
   * Stop the WebSocket server.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.emitter.offAll(this.eventListener);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.close();
      } catch {
        // Ignore close errors
      }
    }
    this.clients.clear();
  }

  /**
   * Register a new client connection.
   *
   * @param client - The WebSocket client
   */
  addClient(client: WebSocketClient): void {
    this.clients.set(client.id, client);

    // Send recent events to help the client catch up
    if (this.config.sendRecentOnConnect) {
      const recentEvents = this.emitter.getRecentEvents(
        this.config.recentEventCount,
      );
      for (const event of recentEvents) {
        this.sendToClient(client, event);
      }
    }
  }

  /**
   * Remove a client connection.
   *
   * @param clientId - The client ID to remove
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Broadcast an event to all connected clients.
   *
   * @param event - The event to broadcast
   */
  broadcast(event: IntegrationEvent): void {
    this.totalBroadcasts++;

    const disconnected: string[] = [];

    for (const [id, client] of this.clients.entries()) {
      if (!client.isConnected()) {
        disconnected.push(id);
        continue;
      }

      // Check subscriptions filter
      if (
        client.subscriptions.length > 0 &&
        !client.subscriptions.includes(event.type)
      ) {
        continue;
      }

      this.sendToClient(client, event);
    }

    // Clean up disconnected clients
    for (const id of disconnected) {
      this.clients.delete(id);
    }
  }

  /**
   * Send an event to a specific client.
   */
  private sendToClient(client: WebSocketClient, event: IntegrationEvent): void {
    try {
      const message = JSON.stringify({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
        sequence: event.sequence,
      });
      client.send(message);
      this.totalMessagesSent++;
    } catch {
      // Failed to send -- client may be disconnected
    }
  }

  /**
   * Send heartbeat to all connected clients.
   */
  private sendHeartbeat(): void {
    const heartbeat: IntegrationEvent = {
      type: 'system_health',
      data: {
        connectedClients: this.clients.size,
        uptimeMs: Date.now() - this.startTime,
      },
      timestamp: new Date().toISOString(),
      sequence: -1,
    };

    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        this.sendToClient(client, heartbeat);
      }
    }
  }

  /**
   * Get connected client count.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get server statistics.
   */
  getStats(): WebSocketServerStats {
    return {
      connectedClients: this.clients.size,
      totalBroadcasts: this.totalBroadcasts,
      totalMessagesSent: this.totalMessagesSent,
      uptimeMs: this.running ? Date.now() - this.startTime : 0,
      running: this.running,
    };
  }

  /**
   * Check if the server is running.
   */
  isRunning(): boolean {
    return this.running;
  }
}
