import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from './env.js';
import { redis } from './redis.js';

// Plugins
import correlationIdPlugin from './plugins/correlationId.js';
import authPlugin from './plugins/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import orgRoutes from './routes/orgs.js';
import projectRoutes from './routes/projects.js';
import issueRoutes from './routes/issues.js';
import sprintRoutes from './routes/sprints.js';
import epicRoutes from './routes/epics.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';
import healthRoutes from './routes/health.js';
import attachmentRoutes from './routes/attachments.js';
import docRoutes from './routes/docs.js';

export async function buildApp() {
  const app = Fastify({
    trustProxy: true,
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.secret'],
        censor: '[REDACTED]',
      },
      transport: env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
    },
    genReqId: () => `req_${Math.random().toString(36).slice(2, 11)}`,
  });

  // Security headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // CORS
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Request-Id'],
    exposedHeaders: ['X-Correlation-Id', 'X-Request-Id'],
  });

  // Cookies
  await app.register(fastifyCookie, {
    secret: env.JWT_PRIVATE_KEY.slice(0, 32),
    hook: 'onRequest',
  });

  // Rate limiting
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) =>
      (req as any).jwtPayload?.sub || req.ip,
  });

  // Swagger
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Project Manager API',
        description: 'Multi-tenant agile project management API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Organizations', description: 'Organization management' },
        { name: 'Projects', description: 'Project management' },
        { name: 'Issues', description: 'Issue tracking' },
        { name: 'Sprints', description: 'Sprint management' },
        { name: 'Epics', description: 'Epic management' },
        { name: 'Notifications', description: 'Notifications' },
        { name: 'Search', description: 'Global search' },
        { name: 'Admin', description: 'Platform administration' },
        { name: 'Health', description: 'Health checks' },
      ],
    },
  });

  if (env.NODE_ENV !== 'production') {
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });
  }

  // App plugins
  await app.register(correlationIdPlugin);
  await app.register(authPlugin);
  await app.register((await import('./plugins/rls.js')).default);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(orgRoutes, { prefix: '/api/v1/orgs' });
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(issueRoutes, { prefix: '/api/v1' });
  await app.register(sprintRoutes, { prefix: '/api/v1' });
  await app.register(epicRoutes, { prefix: '/api/v1' });
  await app.register(notificationRoutes, { prefix: '/api/v1' });
  await app.register(searchRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });
  await app.register(attachmentRoutes, { prefix: '/api/v1' });
  await app.register(docRoutes, { prefix: '/api/v1' });

  // Additional routes
  const { default: milestoneRoutes } = await import('./routes/milestones.js');
  const { default: labelRoutes } = await import('./routes/labels.js');
  const { default: timeLogRoutes } = await import('./routes/timeLogs.js');
  const { default: issueLinkRoutes } = await import('./routes/issueLinks.js');
  const { default: apiKeyRoutes } = await import('./routes/apiKeys.js');
  const { default: inviteRoutes } = await import('./routes/invites.js');

  await app.register(milestoneRoutes, { prefix: '/api/v1' });
  await app.register(labelRoutes, { prefix: '/api/v1' });
  await app.register(timeLogRoutes, { prefix: '/api/v1' });
  await app.register(issueLinkRoutes, { prefix: '/api/v1' });
  await app.register(apiKeyRoutes, { prefix: '/api/v1' });
  await app.register(inviteRoutes, { prefix: '/api/v1' });

  // Org dashboard analytics
  const { default: orgDashboardRoutes } = await import('./routes/orgDashboard.js');
  await app.register(orgDashboardRoutes, { prefix: '/api/v1' });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    const log = request.log ?? app.log;

    if (error.validation) {
      reply.status(400).send({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
      return;
    }

    if ((error as any).code === 'FORBIDDEN' || error.statusCode === 403) {
      reply.status(403).send({
        data: null,
        error: { code: 'FORBIDDEN', message: error.message },
      });
      return;
    }

    if (error.statusCode === 401) {
      reply.status(401).send({
        data: null,
        error: { code: 'UNAUTHORIZED', message: error.message },
      });
      return;
    }

    if (error.statusCode === 404) {
      reply.status(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: error.message },
      });
      return;
    }

    if (error.statusCode === 429) {
      reply.status(429).send({
        data: null,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
      return;
    }

    log.error({ err: error }, 'Unhandled error');
    reply.status(500).send({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
    });
  });

  return app;
}
