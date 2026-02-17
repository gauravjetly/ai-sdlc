/**
 * @aisdlc/health - Health Check System
 *
 * Provides comprehensive health diagnostics for the AI-SDLC platform.
 * Runs 8 independent checks in parallel and produces a unified report.
 */

export { HealthChecker } from './health-checker';
export type { HealthCheck, HealthReport, HealthStatus } from './types';
