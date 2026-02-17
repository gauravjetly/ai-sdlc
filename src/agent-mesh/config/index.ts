/**
 * Agent Mesh Configuration
 *
 * Centralized configuration for the Agent Mesh system.
 * Supports environment-variable-based provider selection:
 *
 *   STORAGE=file|postgres     (default: file)
 *   EVENT_BUS=file|bullmq     (default: file)
 *
 * Database and Redis connection settings are also configurable
 * via environment variables.
 */

export type StorageProvider = 'file' | 'postgres';
export type EventBusProvider = 'file' | 'bullmq';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayMs: number;
}

export interface EmbeddingConfig {
  provider: 'openai';
  model: 'text-embedding-3-large' | 'text-embedding-3-small';
  dimensions: number;
  apiKey: string | undefined;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface PlatformConfig {
  storage: StorageProvider;
  eventBus: EventBusProvider;
  database: DatabaseConfig;
  redis: RedisConfig;
  embedding: EmbeddingConfig;
}

/**
 * Load configuration from environment variables with sensible defaults.
 */
export function loadPlatformConfig(): PlatformConfig {
  return {
    storage: (process.env.STORAGE as StorageProvider) || 'file',
    eventBus: (process.env.EVENT_BUS as EventBusProvider) || 'file',
    database: {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'agent_mesh',
      user: process.env.PGUSER || 'agent_mesh',
      password: process.env.PGPASSWORD || 'agent_mesh_dev',
      maxConnections: parseInt(process.env.PG_MAX_CONNECTIONS || '20', 10),
      idleTimeoutMs: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMs: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
      ssl: process.env.PG_SSL === 'true',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
      retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS || '1000', 10),
    },
    embedding: {
      provider: 'openai',
      model: (process.env.EMBEDDING_MODEL as EmbeddingConfig['model']) || 'text-embedding-3-large',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '3072', 10),
      apiKey: process.env.OPENAI_API_KEY || undefined,
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10),
      maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES || '3', 10),
      retryDelayMs: parseInt(process.env.EMBEDDING_RETRY_DELAY_MS || '1000', 10),
    },
  };
}

/**
 * Validate that required configuration is present for the selected providers.
 * Returns an array of validation error messages (empty if valid).
 */
export function validateConfig(config: PlatformConfig): string[] {
  const errors: string[] = [];

  if (config.storage === 'postgres') {
    if (!config.database.password) {
      errors.push('PGPASSWORD is required when STORAGE=postgres');
    }
  }

  if (config.eventBus === 'bullmq') {
    // Redis password is optional for development
  }

  if (config.storage === 'postgres' && !config.embedding.apiKey) {
    errors.push(
      'OPENAI_API_KEY is required for embedding generation when STORAGE=postgres. ' +
      'Set the environment variable or embeddings will be skipped.'
    );
  }

  return errors;
}
