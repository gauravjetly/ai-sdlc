/**
 * Logging Utility
 * Structured logging using Winston
 */

import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, component, ...metadata }) => {
    let msg = `${timestamp} [${level}] [${component || 'App'}] ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.metadata) {
      const meta = JSON.stringify(metadata.metadata, null, 2);
      if (meta !== '{}') {
        msg += `\n${meta}`;
      }
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

/**
 * Create a child logger with a specific component name
 */
export const createLogger = (component: string) => {
  return logger.child({ component });
};

export default logger;
