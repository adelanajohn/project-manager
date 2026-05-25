# WebSockets

## Socket.IO Setup

Socket.IO is mounted on the same HTTP server as Fastify in `apps/api/src/index.ts`. The server is created using the Node.js `http` module and passed to both Fastify and Socket.IO so they share one port.

The Redis adapter (`@socket.io/redis-adapter`) is used so that events emitted on one API instance are broadcast to clients connected to other instances. Two separate Redis connections are created for pub and sub — this is a requirement of the Redis adapter:

```typescript
// apps/api/src/socket.ts
const pubClient = new Redis(env.REDIS_URL);
const subClient = pubClient.duplicate();

const io = new SocketIOServer(app.server, {
  cors: {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

io.adapter(createAdapter(pubClient, subClient));
```

`polling` is listed as a fallback transport for environments that block WebSocket upgrades (e.g., some corporate proxies).

## Authentication on Handshake

JWT authentication happens in a Socket.IO middleware before the `connection` event fires. The client passes the access token in `socket.handshake.auth.token`:

```typescript
// Server
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    next(new Error('Authentication required'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    (socket as any).userId = payload.sub;
    (socket as any).orgId = payload.orgId;
    (socket as any).role = payload.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
```

```typescript
// Client (useProjectSocket.ts)
const socket = io(wsUrl, {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});
```

If the token is missing or invalid, the handshake is rejected with an error and the connection never opens.

## Rooms

### Org Room (auto-joined)

Every authenticated client is automatically joined to an org room upon connection:

```typescript
io.on('connection', (socket) => {
  const orgId = (socket as any).orgId;
  socket.join(`org:${orgId}`);
});
```

Org-level events (billing changes, member invites, org-wide announcements) are emitted to `org:<orgId>`.

### Project Room (on-demand)

Clients join a project room by emitting `join:project`:

```typescript
// Client
socket.emit('join:project', projectId);

// Server
socket.on('join:project', (projectId: string) => {
  socket.join(`project:${projectId}`);
  socket.to(`project:${projectId}`).emit('presence:join', { userId, projectId });
});
```

When leaving (component unmount or navigation), the client emits `leave:project`:

```typescript
socket.on('leave:project', (projectId: string) => {
  socket.leave(`project:${projectId}`);
  socket.to(`project:${projectId}`).emit('presence:leave', { userId, projectId });
});
```

## Event Catalog

### Issue Events

Emitted to the project room (`project:<projectId>`) from API services after DB writes.

| Event | Payload | When emitted |
|-------|---------|--------------|
| `issue.created` | `{ issueId, projectId, orgId }` | After `issueService.create` |
| `issue.updated` | `{ issueId, projectId, orgId, changes }` | After `issueService.update` |
| `issue.deleted` | `{ issueId, projectId, orgId }` | After `issueService.delete` |

### Comment Events

| Event | Payload | When emitted |
|-------|---------|--------------|
| `comment.created` | `{ commentId, issueId, projectId }` | After `issueService.createComment` |

### Sprint Events

| Event | Payload | When emitted |
|-------|---------|--------------|
| `sprint.updated` | `{ sprintId, projectId, status }` | After sprint start or completion |

### Presence Events

| Event | Payload | Direction |
|-------|---------|-----------|
| `presence:join` | `{ userId, projectId, fullName?, avatarUrl? }` | Server → all room members |
| `presence:leave` | `{ userId, projectId }` | Server → all room members |

Presence events are emitted by the server when another client calls `join:project` or `leave:project`. They are **not** emitted back to the joining client itself (uses `socket.to(room).emit(...)` not `io.to(room).emit(...)`).

### Emitting from API Services

Use the helper functions in `apps/api/src/socket.ts`:

```typescript
import { emitToProject, emitToOrg } from '../socket.js';

// After creating an issue
emitToProject(projectId, 'issue.created', { issueId: issue.id, projectId, orgId });

// After a billing change
emitToOrg(orgId, 'billing.updated', { plan: newPlan });
```

These helpers are null-safe — they check that the Socket.IO instance is initialised before emitting.

## `useProjectSocket` Hook

The React hook `apps/web/src/hooks/useProjectSocket.ts` manages the full socket lifecycle for a project view:

```typescript
export function useProjectSocket(projectId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const { setUserPresent, setUserGone, clearProject } = usePresenceStore();

  useEffect(() => {
    if (!projectId || !accessToken) return;

    const socket = io(wsUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });

    socket.on('connect', () => socket.emit('join:project', projectId));

    // Issue events → invalidate TanStack Query caches
    socket.on('issue.created', () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.board(projectId) });
    });

    socket.on('issue.updated', (data: { issueId: string }) => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      if (data?.issueId) qc.invalidateQueries({ queryKey: queryKeys.issues.detail(data.issueId) });
    });

    // Presence events → update Zustand presence store
    socket.on('presence:join', (data) => setUserPresent({ ...data, projectId, joinedAt: Date.now() }));
    socket.on('presence:leave', (data) => setUserGone(data.userId, projectId));

    return () => {
      socket.emit('leave:project', projectId);
      socket.disconnect();
      clearProject(projectId);
    };
  }, [projectId, accessToken]);

  return socketRef.current;
}
```

Call this hook once at the project layout level. It auto-connects when `projectId` is available and disconnects on unmount or project switch.

## Reconnection

Socket.IO's built-in reconnection is configured with exponential backoff:

```typescript
reconnectionAttempts: 5,     // give up after 5 failed reconnects
reconnectionDelay: 1000,     // start with 1s delay
reconnectionDelayMax: 10_000, // cap at 10s
```

The actual delay sequence is approximately: 1s, 2s, 4s, 8s, 10s (capped).

After reconnection, the `connect` event fires again, which re-emits `join:project`. This re-joins the room and refreshes presence — no extra logic needed.

If all 5 reconnection attempts fail, the socket transitions to a disconnected state. The UI should detect this with a `connect_error` listener and show an "offline" indicator:

```typescript
socket.on('connect_error', (err) => {
  console.warn('[Socket] connect error:', err.message);
  // show toast / banner
});
```
