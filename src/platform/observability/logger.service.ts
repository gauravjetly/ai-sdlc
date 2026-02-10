/**
 * Enhanced Logging Service
 * Structured logging with correlation IDs, tracing, and log aggregation
 * Production-ready with proper error handling
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  StructuredLog,
  LogLevel,
  TraceContext,
} from './types.js';

/**
 * Correlation ID storage using AsyncLocalStorage
 */
class CorrelationContext {
  private context: Map<string, string> = new Map();

  set(key: string, value: string): void {
    this.context.set(key, value);
  }

  get(key: string): string | undefined {
    return this.context.get(key);
  }

  getCorrelationId(): string {
    let correlationId = this.context.get('correlation_id');
    if (!correlationId) {
      correlationId = uuidv4();
      this.context.set('correlation_id', correlationId);
    }
    return correlationId;
  }

  getTraceContext(): TraceContext | undefined {
    const traceId = this.context.get('trace_id');
    const spanId = this.context.get('span_id');
    const parentSpanId = this.context.get('parent_span_id');

    if (traceId && spanId) {
      return {
        trace_id: traceId,
        span_id: spanId,
        parent_span_id: parentSpanId,
        trace_flags: 1,
      };
    }

    return undefined;
  }

  setTraceContext(context: TraceContext): void {
    this.context.set('trace_id', context.trace_id);
    this.context.set('span_id', context.span_id);
    if (context.parent_span_id) {
      this.context.set('parent_span_id', context.parent_span_id);
    }
  }

  clear(): void {
    this.context.clear();
  }
}

/**
 * Enhanced Logger with correlation IDs and structured logging
 */
export class EnhancedLogger {
  private logger: winston.Logger;
  private component: string;
  private correlationContext: CorrelationContext;

  constructor(component: string) {
    this.component = component;
    this.correlationContext = new CorrelationContext();
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with enhanced formatting
   */
  private createLogger(): winston.Logger {
    // Custom format for structured logs
    const structuredFormat = winston.format((info) => {
      const structuredLog: StructuredLog = {
        level: info.level as LogLevel,
        message: info.message,
        timestamp: new Date(),
        correlation_id: this.correlationContext.getCorrelationId(),
        component: this.component,
        metadata: info.metadata,
      };

      // Add trace context if available
      const traceContext = this.correlationContext.getTraceContext();
      if (traceContext) {
        structuredLog.trace_id = traceContext.trace_id;
        structuredLog.span_id = traceContext.span_id;
      }

      // Add error details if present
      if (info.error) {
        structuredLog.error = {
          message: info.error.message,
          stack: info.error.stack,
          code: info.error.code,
        };
      }

      return structuredLog as any;
    });

    // JSON format for log aggregation (e.g., ELK, Splunk)
    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      structuredFormat(),
      winston.format.json()
    );

    // Human-readable format for console
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf((info) => {
        const correlationId = this.correlationContext.getCorrelationId().substring(0, 8);
        const traceContext = this.correlationContext.getTraceContext();
        const traceId = traceContext ? traceContext.trace_id.substring(0, 8) : '';

        let msg = `${info.timestamp} [${info.level}] [${this.component}] [${correlationId}]`;
        if (traceId) {
          msg += ` [trace:${traceId}]`;
        }
        msg += ` ${info.message}`;

        // Add metadata
        if (info.metadata && Object.keys(info.metadata).length > 0) {
          msg += `\n  ${JSON.stringify(info.metadata, null, 2)}`;
        }

        // Add error stack
        if (info.error?.stack) {
          msg += `\n${info.error.stack}`;
        }

        return msg;
      })
    );

    const logLevel = process.env.LOG_LEVEL || 'info';

    return winston.createLogger({
      level: logLevel,
      format: jsonFormat,
      defaultMeta: { component: this.component },
      transports: [
        // Console output (human-readable)
        new winston.transports.Console({
          format: consoleFormat,
        }),

        // Error log file
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          format: jsonFormat,
        }),

        // Combined log file
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          format: jsonFormat,
        }),

        // Audit log file (info and above)
        new winston.transports.File({
          filename: 'logs/audit.log',
          level: 'info',
          maxsize: 10485760, // 10MB
          maxFiles: 20,
          format: jsonFormat,
        }),
      ],
    });
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(correlationId: string): void {
    this.correlationContext.set('correlation_id', correlationId);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationContext.getCorrelationId();
  }

  /**
   * Set trace context for distributed tracing
   */
  setTraceContext(context: TraceContext): void {
    this.correlationContext.setTraceContext(context);
  }

  /**
   * Get current trace context
   */
  getTraceContext(): TraceContext | undefined {
    return this.correlationContext.getTraceContext();
  }

  /**
   * Clear correlation context
   */
  clearContext(): void {
    this.correlationContext.clear();
  }

  /**
   * Debug level log
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug(message, { metadata });
  }

  /**
   * Info level log
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.logger.info(message, { metadata });
  }

  /**
   * Warning level log
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(message, { metadata });
  }

  /**
   * Error level log
   */
  error(message: string, error?: Error | any, metadata?: Record<string, any>): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.logger.error(message, {
      metadata,
      error: {
        message: errorObj.message,
        stack: errorObj.stack,
        code: (errorObj as any).code,
      },
    });
  }

  /**
   * Fatal level log (critical errors)
   */
  fatal(message: string, error?: Error | any, metadata?: Record<string, any>): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.logger.error(message, {
      metadata: { ...metadata, fatal: true },
      error: {
        message: errorObj.message,
        stack: errorObj.stack,
        code: (errorObj as any).code,
      },
    });
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    this.logger.log(level, message, { metadata });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: Record<string, any>): EnhancedLogger {
    const childLogger = new EnhancedLogger(`${this.component}:${additionalContext.subComponent || 'child'}`);
    childLogger.correlationContext = this.correlationContext;
    return childLogger;
  }

  /**
   * Time an operation and log duration
   */
  async timeAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.debug(`Starting: ${operationName}`, metadata);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.info(`Completed: ${operationName}`, {
        ...metadata,
        duration_ms: duration,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.error(`Failed: ${operationName}`, error, {
        ...metadata,
        duration_ms: duration,
      });

      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  time<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = Date.now();
    this.debug(`Starting: ${operationName}`, metadata);

    try {
      const result = operation();
      const duration = Date.now() - startTime;

      this.info(`Completed: ${operationName}`, {
        ...metadata,
        duration_ms: duration,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.error(`Failed: ${operationName}`, error, {
        ...metadata,
        duration_ms: duration,
      });

      throw error;
    }
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.log(level, `HTTP ${method} ${path}`, {
      ...metadata,
      http: {
        method,
        path,
        status_code: statusCode,
        duration_ms: duration,
      },
    });
  }

  /**
   * Log database query
   */
  logDatabaseQuery(
    query: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.debug('Database query', {
      ...metadata,
      query,
      duration_ms: duration,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): void {
    const level: LogLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this.log(level, `Security Event: ${event}`, {
      ...metadata,
      security: {
        event,
        severity,
      },
    });
  }

  /**
   * Log audit event
   */
  logAudit(
    action: string,
    user: string,
    resource: string,
    result: 'success' | 'failure',
    metadata?: Record<string, any>
  ): void {
    this.info(`Audit: ${action}`, {
      ...metadata,
      audit: {
        action,
        user,
        resource,
        result,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Create enhanced logger for a component
 */
export function createEnhancedLogger(component: string): EnhancedLogger {
  return new EnhancedLogger(component);
}

/**
 * Express middleware for correlation ID injection
 */
export function correlationIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Attach logger to request
    const logger = new EnhancedLogger('HTTPRequest');
    logger.setCorrelationId(correlationId);
    req.logger = logger;

    next();
  };
}

/**
 * Express middleware for request logging
 */
export function requestLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const logger = req.logger as EnhancedLogger || new EnhancedLogger('HTTPRequest');

    // Log request start
    logger.info('HTTP Request Started', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.logHttpRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );
    });

    next();
  };
}
