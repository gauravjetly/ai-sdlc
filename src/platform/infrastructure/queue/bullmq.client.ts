/**
 * BullMQ Queue Client
 * Real job queue for agent task execution - NO MOCK DATA
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('BullMQ');

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

connection.on('connect', () => {
  logger.info('Redis connected successfully');
});

// Create agent task queue
export const agentTaskQueue = new Queue('agent-tasks', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const agentTaskQueueEvents = new QueueEvents('agent-tasks', { connection });

agentTaskQueueEvents.on('completed', ({ jobId }) => {
  logger.info('Job completed', { jobId });
});

agentTaskQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Job failed', { jobId, reason: failedReason });
});

// Export connection for workers
export { connection as redisConnection };

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await agentTaskQueue.close();
  await agentTaskQueueEvents.close();
  await connection.quit();
  logger.info('BullMQ connections closed');
});
