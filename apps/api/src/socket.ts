import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyAccessToken } from './jwt.js';
import { env } from './env.js';
import logger from './logger.js';

export function setupSocketIO(app: FastifyInstance) {
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

  // Auth middleware
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

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    const orgId = (socket as any).orgId;

    logger.debug({ userId, orgId }, 'WebSocket client connected');

    // Join org room automatically
    socket.join(`org:${orgId}`);

    // Join project room on demand
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('presence:join', { userId, projectId });
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('presence:leave', { userId, projectId });
    });

    socket.on('disconnect', () => {
      logger.debug({ userId }, 'WebSocket client disconnected');
    });
  });

  return io;
}

// Helper to emit from API handlers/services
let _io: SocketIOServer | null = null;

export function setIO(io: SocketIOServer) {
  _io = io;
}

export function emitToOrg(orgId: string, event: string, data: unknown) {
  _io?.to(`org:${orgId}`).emit(event, data);
}

export function emitToProject(projectId: string, event: string, data: unknown) {
  _io?.to(`project:${projectId}`).emit(event, data);
}
