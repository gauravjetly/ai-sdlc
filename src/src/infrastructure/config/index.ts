export interface Config {
  server: {
    port: number;
    host: string;
    nodeEnv: string;
  };
  database: {
    url: string;
  };
  jwt: {
    privateKey: string;
    publicKey: string;
    accessTokenExpiry: string;
    issuer: string;
    audience: string;
  };
  security: {
    bcryptCost: number;
    rateLimitWindowMs: number;
    rateLimitMax: number;
    corsOrigin: string | string[];
  };
  logging: {
    level: string;
  };
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Generate default keys for development (in production, use secure key management)
const defaultPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7J2XMgvOqcUKq
fMKJZ8WfZjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKz
KjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKzKjKz
-----END PRIVATE KEY-----`;

const defaultPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuyeVzILzqnFCqnzCiWfF
n2Yysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoy
syoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoysyoy
-----END PUBLIC KEY-----`;

export function loadConfig(): Config {
  const nodeEnv = getEnvOrDefault('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development' || nodeEnv === 'test';

  return {
    server: {
      port: parseInt(getEnvOrDefault('PORT', '3000'), 10),
      host: getEnvOrDefault('HOST', '0.0.0.0'),
      nodeEnv,
    },
    database: {
      url: isDevelopment
        ? getEnvOrDefault('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/taskapi')
        : getEnvOrThrow('DATABASE_URL'),
    },
    jwt: {
      privateKey: getEnvOrDefault('JWT_PRIVATE_KEY', defaultPrivateKey),
      publicKey: getEnvOrDefault('JWT_PUBLIC_KEY', defaultPublicKey),
      accessTokenExpiry: getEnvOrDefault('JWT_ACCESS_TOKEN_EXPIRY', '1h'),
      issuer: getEnvOrDefault('JWT_ISSUER', 'task-api'),
      audience: getEnvOrDefault('JWT_AUDIENCE', 'task-api-client'),
    },
    security: {
      bcryptCost: parseInt(getEnvOrDefault('BCRYPT_COST', '12'), 10),
      rateLimitWindowMs: parseInt(getEnvOrDefault('RATE_LIMIT_WINDOW_MS', '60000'), 10),
      rateLimitMax: parseInt(getEnvOrDefault('RATE_LIMIT_MAX', '100'), 10),
      corsOrigin: getEnvOrDefault('CORS_ORIGIN', '*'),
    },
    logging: {
      level: getEnvOrDefault('LOG_LEVEL', isDevelopment ? 'debug' : 'info'),
    },
  };
}
