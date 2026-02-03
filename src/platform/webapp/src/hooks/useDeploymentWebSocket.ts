/**
 * useDeploymentWebSocket Hook
 * Provides WebSocket connection for real-time deployment updates
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { LogEntry, WebSocketMessage, LayerType } from '../types/layers';

interface DeploymentWebSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
}

interface DeploymentWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
}

interface DeploymentWebSocketCallbacks {
  onLog?: (log: LogEntry) => void;
  onProgress?: (progress: number, stage: string) => void;
  onComplete?: (outputs: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  onStart?: (layer: LayerType, deploymentId: string) => void;
}

/**
 * Hook for WebSocket connection to deployment updates
 */
export function useDeploymentWebSocket(
  workflowId: string | null,
  options: DeploymentWebSocketOptions = {},
  callbacks: DeploymentWebSocketCallbacks = {}
) {
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
  } = options;

  const [state, setState] = useState<DeploymentWebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callbacksRef = useRef(callbacks);

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  /**
   * Start heartbeat ping
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  /**
   * Stop heartbeat ping
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  /**
   * Handle incoming WebSocket message
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      setState((prev) => ({ ...prev, lastMessage: message }));

      switch (message.type) {
        case 'deployment:started':
          callbacksRef.current.onStart?.(
            message.payload.layer,
            message.payload.deploymentId
          );
          break;

        case 'deployment:log':
          callbacksRef.current.onLog?.(message.payload.log);
          break;

        case 'deployment:progress':
          callbacksRef.current.onProgress?.(
            message.payload.progress,
            message.payload.stage
          );
          break;

        case 'deployment:completed':
          callbacksRef.current.onComplete?.(message.payload.outputs);
          break;

        case 'deployment:failed':
          callbacksRef.current.onError?.(message.payload.error);
          break;

        case 'pong':
          // Heartbeat acknowledged
          break;
      }
    } catch {
      console.error('Failed to parse WebSocket message');
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!workflowId) {
      setState((prev) => ({
        ...prev,
        error: 'No workflow ID provided',
      }));
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/v1/deployments/${workflowId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
      };

      ws.onclose = () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        stopHeartbeat();

        // Attempt reconnection
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false,
        }));
      };

      ws.onmessage = handleMessage;

      wsRef.current = ws;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
        isConnecting: false,
      }));
    }
  }, [
    workflowId,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    startHeartbeat,
    stopHeartbeat,
    handleMessage,
  ]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
    });

    reconnectAttemptsRef.current = 0;
  }, [stopHeartbeat]);

  /**
   * Send a message through WebSocket
   */
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && workflowId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, workflowId, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}

export default useDeploymentWebSocket;
