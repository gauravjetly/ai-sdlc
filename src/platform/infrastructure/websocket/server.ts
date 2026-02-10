/**
 * WebSocket Server for Real-Time Updates
 * Real-time communication - NO MOCK DATA
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('WebSocket');

export class WebSocketServer {
  private io: Server;
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Subscribe to channel
      socket.on('subscribe', (channel: string) => {
        socket.join(channel);
        this.addSubscription(channel, socket.id);
        logger.debug('Client subscribed', { socketId: socket.id, channel });
      });

      // Unsubscribe from channel
      socket.on('unsubscribe', (channel: string) => {
        socket.leave(channel);
        this.removeSubscription(channel, socket.id);
        logger.debug('Client unsubscribed', { socketId: socket.id, channel });
      });

      // Ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected', { socketId: socket.id, reason });
        this.cleanupSubscriptions(socket.id);
      });
    });
  }

  /**
   * Emit event to a specific channel
   */
  public emit(channel: string, event: string, data: any): void {
    this.io.to(channel).emit(event, data);
    logger.debug('Event emitted', { channel, event, dataKeys: Object.keys(data) });
  }

  /**
   * Emit to all connected clients
   */
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    logger.debug('Event broadcasted', { event, dataKeys: Object.keys(data) });
  }

  /**
   * Get active subscriptions for a channel
   */
  public getSubscriptionCount(channel: string): number {
    return this.subscriptions.get(channel)?.size || 0;
  }

  private addSubscription(channel: string, socketId: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(socketId);
  }

  private removeSubscription(channel: string, socketId: string): void {
    this.subscriptions.get(channel)?.delete(socketId);
    if (this.subscriptions.get(channel)?.size === 0) {
      this.subscriptions.delete(channel);
    }
  }

  private cleanupSubscriptions(socketId: string): void {
    this.subscriptions.forEach((sockets, channel) => {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.subscriptions.delete(channel);
      }
    });
  }

  /**
   * Close the WebSocket server
   */
  public async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

export default WebSocketServer;
