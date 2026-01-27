/**
 * Context Injection System
 *
 * Main entry point for the AI-SDLC Context Injection system.
 * Provides context-aware prompts for all agents.
 */

// Core exports
export { ContextGatherer } from './core/context-gatherer';
export { ContextPrioritizer } from './core/context-prioritizer';
export { ContextInjector } from './core/context-injector';
export { CacheManager, CACHE_TTL } from './core/cache-manager';

// Source loaders
export { OrgContextLoader } from './sources/org-context-loader';
export { ProjectContextLoader } from './sources/project-context-loader';
export { HistoricalContextLoader } from './sources/historical-context-loader';
export { LiveContextLoader } from './sources/live-context-loader';

// Integration
export { AgentMiddleware } from './integration/agent-middleware';

// Types
export * from './types/context.types';

// Utils
export { TokenCounter } from './utils/token-counter';

/**
 * Factory function to create a fully configured context injection system
 */
import { ContextGatherer } from './core/context-gatherer';
import { ContextPrioritizer } from './core/context-prioritizer';
import { ContextInjector } from './core/context-injector';
import { CacheManager } from './core/cache-manager';
import { OrgContextLoader } from './sources/org-context-loader';
import { ProjectContextLoader } from './sources/project-context-loader';
import { HistoricalContextLoader } from './sources/historical-context-loader';
import { LiveContextLoader } from './sources/live-context-loader';
import { AgentMiddleware } from './integration/agent-middleware';

export interface ContextInjectionConfig {
  orgName?: string;
  enableCache?: boolean;
  autoCleanupInterval?: number;
}

export function createContextInjectionSystem(
  config: ContextInjectionConfig = {}
): AgentMiddleware {
  const {
    orgName = 'deltek',
    enableCache = true,
    autoCleanupInterval = 60000
  } = config;

  // Initialize loaders
  const orgLoader = new OrgContextLoader(orgName);
  const projectLoader = new ProjectContextLoader();
  const historicalLoader = new HistoricalContextLoader();
  const liveLoader = new LiveContextLoader();

  // Initialize core components
  const gatherer = new ContextGatherer(
    orgLoader,
    projectLoader,
    historicalLoader,
    liveLoader
  );
  const prioritizer = new ContextPrioritizer();
  const injector = new ContextInjector();

  // Initialize cache
  const cache = enableCache ? new CacheManager() : createNoOpCache();

  // Start auto cleanup if enabled
  if (enableCache && autoCleanupInterval > 0) {
    cache.startAutoCleanup(autoCleanupInterval);
  }

  // Create and return middleware
  return new AgentMiddleware(gatherer, prioritizer, injector, cache);
}

/**
 * No-op cache for when caching is disabled
 */
function createNoOpCache(): CacheManager {
  const cache = new CacheManager();
  const originalGet = cache.get.bind(cache);

  // Override get to always return null (cache miss)
  cache.get = () => null;

  return cache;
}

/**
 * Quick start function for testing
 */
export async function quickStart(
  agentName: string,
  prompt: string,
  projectPath: string
): Promise<string> {
  const middleware = createContextInjectionSystem();
  return middleware.execute(agentName as any, prompt, projectPath);
}
