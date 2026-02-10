# ADR-015: Real-time Updates (Polling vs WebSocket)

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Communication Protocol

---

## Context

The Deltek Catalyst platform requires real-time updates for:

- Deployment progress tracking (0-100%)
- Agent execution status
- Security scan progress
- Cloud resource provisioning status
- Cost analysis updates
- Multi-user collaboration notifications
- System alerts and notifications

The current implementation uses HTTP polling with 3-second intervals.

## Decision

**We will implement WebSocket as primary with Server-Sent Events (SSE) as fallback**.

### 1. Primary Protocol: WebSocket

**Chosen**: Native WebSocket with socket.io-style message framing

```typescript
// WebSocket connection
const ws = new WebSocket('wss://acme.catalyst.deltek.com/ws');

// Message format
interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'ack' | 'ping' | 'pong';
  channel: string;
  payload: any;
  id?: string;  // For acknowledgments
  timestamp: number;
}

// Example subscription
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'deployments:deploy-123:progress',
  id: 'sub-1'
}));

// Receive events
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // { type: 'event', channel: 'deployments:...', payload: { progress: 45 } }
};
```

### 2. Fallback Protocol: Server-Sent Events (SSE)

**Chosen**: SSE for environments blocking WebSocket

```typescript
// SSE connection
const eventSource = new EventSource(
  'https://acme.catalyst.deltek.com/api/v1/events?channels=deployments:deploy-123:progress',
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle event
};
```

### 3. Channel Architecture

**Chosen**: Hierarchical channel naming with wildcard support

```
Channel Patterns:
  tenant:{tenant_id}:announcements        # Tenant-wide announcements
  tenant:{tenant_id}:users:{user_id}      # User-specific notifications

  deployments:{deployment_id}:progress    # Single deployment progress
  deployments:{deployment_id}:logs        # Live log streaming
  deployments:*                           # All deployments (admin)

  agents:{agent_id}:status                # Agent status
  agents:{agent_id}:output                # Agent output stream

  security:scans:{scan_id}:progress       # Security scan progress

  costs:analysis:{analysis_id}:progress   # Cost analysis progress
```

### 4. Server Architecture

**Chosen**: Dedicated WebSocket service with Redis pub/sub

```
                    WEBSOCKET ARCHITECTURE

+-------------+     +-------------+     +-------------+
|   Client 1  |     |   Client 2  |     |   Client 3  |
+------+------+     +------+------+     +------+------+
       |                   |                   |
       v                   v                   v
+--------------------------------------------------+
|              Load Balancer (Sticky Sessions)      |
+--------------------------------------------------+
       |                   |                   |
       v                   v                   v
+-------------+     +-------------+     +-------------+
|  WS Server  |     |  WS Server  |     |  WS Server  |
|   Pod 1     |     |   Pod 2     |     |   Pod 3     |
+------+------+     +------+------+     +------+------+
       |                   |                   |
       +-------------------+-------------------+
                           |
                           v
               +------------------------+
               |    Redis Pub/Sub       |
               |    (Message Broker)    |
               +------------------------+
                           ^
                           |
       +-------------------+-------------------+
       |                   |                   |
+------+------+     +------+------+     +------+------+
|  API Server |     |  Worker     |     |  Agent      |
|  (Publish)  |     |  (Publish)  |     |  (Publish)  |
+-------------+     +-------------+     +-------------+
```

## Alternatives Considered

### Communication Protocols

| Protocol | Pros | Cons | Decision |
|----------|------|------|----------|
| **WebSocket** | Bidirectional, low latency | Connection management | **Primary** |
| **SSE** | Simple, auto-reconnect | Unidirectional | **Fallback** |
| Long Polling | Wide compatibility | High latency, overhead | Rejected |
| Short Polling (current) | Simple | High latency, server load | Replace |
| gRPC Streaming | Efficient | Browser support limited | Future consideration |

### Message Brokers

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Redis Pub/Sub** | Low latency, simple | No persistence | **Selected** |
| Kafka | Persistence, replay | Overkill for real-time | Used for events |
| RabbitMQ | Feature-rich | Complexity | Rejected |
| AWS IoT | Managed | Vendor lock-in | Rejected |

### WebSocket Libraries

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **ws (Node.js)** | Lightweight, performant | Basic features | **Selected** |
| Socket.IO | Auto-reconnect, rooms | Overhead | Considered |
| Primus | Multi-transport | Less maintained | Rejected |

## Consequences

### Positive

1. **Latency**: Reduced from 3 seconds to <100ms
2. **Server Load**: 90% reduction in HTTP requests
3. **User Experience**: Instant feedback on operations
4. **Scalability**: Efficient connection handling
5. **Battery**: Lower mobile battery consumption

### Negative

1. **Complexity**: Connection management, reconnection logic
2. **Infrastructure**: Need sticky sessions or shared state
3. **Debugging**: Harder to debug than REST

### Mitigations

1. **Auto-reconnection**: Exponential backoff with jitter
2. **Connection Pooling**: Redis Cluster for pub/sub
3. **Monitoring**: WebSocket metrics in Prometheus

## Implementation Details

### WebSocket Server

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';

class CatalystWebSocketServer {
  private wss: WebSocketServer;
  private redis: Redis;
  private subscriber: Redis;
  private connections: Map<string, Set<WebSocket>> = new Map();

  async initialize(server: http.Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.redis = new Redis(config.redis);
    this.subscriber = this.redis.duplicate();

    // Handle pattern subscriptions
    this.subscriber.psubscribe('catalyst:*');
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.broadcastToChannel(channel, JSON.parse(message));
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private async verifyClient(info: any): Promise<boolean> {
    // Verify JWT from query string or cookie
    const token = this.extractToken(info.req);
    if (!token) return false;

    try {
      const payload = await verifyAccessToken(token);
      info.req.user = payload;
      return true;
    } catch {
      return false;
    }
  }

  private handleConnection(ws: WebSocket, req: Request) {
    const user = req.user;
    const connectionId = generateId();

    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(ws, user, message.channel);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(ws, message.channel);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    });

    ws.on('close', () => {
      this.cleanupConnection(connectionId);
    });

    // Send connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connected',
      connectionId,
      timestamp: Date.now()
    }));
  }

  private async handleSubscribe(ws: WebSocket, user: User, channel: string) {
    // Validate user can subscribe to channel
    if (!await this.canSubscribe(user, channel)) {
      ws.send(JSON.stringify({
        type: 'error',
        code: 'FORBIDDEN',
        message: 'Not authorized to subscribe to this channel'
      }));
      return;
    }

    // Add to channel subscribers
    if (!this.connections.has(channel)) {
      this.connections.set(channel, new Set());
    }
    this.connections.get(channel)!.add(ws);

    ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
      timestamp: Date.now()
    }));
  }

  // Publish event to channel
  async publish(channel: string, payload: any) {
    await this.redis.publish(`catalyst:${channel}`, JSON.stringify({
      type: 'event',
      channel,
      payload,
      timestamp: Date.now()
    }));
  }
}
```

### Frontend Client

```typescript
class CatalystWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private subscriptions = new Map<string, Set<Function>>();

  connect() {
    const token = getAccessToken();
    this.ws = new WebSocket(`wss://${window.location.host}/ws?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.resubscribe();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      this.attemptReconnect();
    };

    // Heartbeat
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  subscribe(channel: string, callback: Function) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          channel
        }));
      }
    }

    this.subscriptions.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(channel);
      callbacks?.delete(callback);

      if (callbacks?.size === 0) {
        this.ws?.send(JSON.stringify({ type: 'unsubscribe', channel }));
        this.subscriptions.delete(channel);
      }
    };
  }

  private handleMessage(message: WSMessage) {
    if (message.type === 'event') {
      const callbacks = this.subscriptions.get(message.channel);
      callbacks?.forEach(cb => cb(message.payload));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.fallbackToSSE();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000;

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay + jitter);
  }

  private fallbackToSSE() {
    // Implement SSE fallback
    console.log('Falling back to SSE');
  }
}
```

### RTK Query Integration

```typescript
// WebSocket subscription in RTK Query
export const deploymentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDeploymentProgress: builder.query<DeploymentProgress, string>({
      query: (id) => `/deployments/${id}/progress`,

      // WebSocket subscription for real-time updates
      async onCacheEntryAdded(
        id,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        await cacheDataLoaded;

        const unsubscribe = catalystWS.subscribe(
          `deployments:${id}:progress`,
          (data: DeploymentProgress) => {
            updateCachedData((draft) => {
              Object.assign(draft, data);
            });
          }
        );

        await cacheEntryRemoved;
        unsubscribe();
      }
    })
  })
});
```

## References

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)
- [Scaling WebSocket in Go](https://centrifugal.dev/docs/getting-started/design)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
