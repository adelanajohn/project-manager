import './env.js'; // validate env first
import { buildApp } from './app.js';
import logger from './logger.js';
import { env } from './env.js';
import { redis } from './redis.js';
import { prisma } from '@pm/db';
import { setupSocketIO, setIO } from './socket.js';

async function start() {
  const app = await buildApp();

  try {
    // Test DB connection
    await prisma.$connect();
    app.log.info('Database connected');

    // Test Redis connection
    await redis.connect();
    app.log.info('Redis connected');

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info({ port: env.PORT }, 'API server started');

    // Set up Socket.IO after server is listening
    const io = setupSocketIO(app);
    setIO(io);
    app.log.info('Socket.IO initialized');
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

start();
