#!/usr/bin/env node

/**
 * AI-SDLC Platform CLI
 *
 * Production-grade command-line interface for the AI-SDLC platform.
 * Provides 13+ commands for platform management.
 */

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';
import { statusCommand } from './commands/status';
import { dashboardCommand } from './commands/dashboard';
import { doctorCommand } from './commands/doctor';
import { configCommand } from './commands/config';
import { hooksInstallCommand, hooksRemoveCommand } from './commands/hooks';
import { mcpConfigureCommand } from './commands/mcp';
import { logsCommand } from './commands/logs';
import { resetCommand } from './commands/reset';
import { versionCommand } from './commands/version';
// Phase 5 commands
import { predictCommand as predict } from './commands/predict';
import { shellCommand as shell } from './commands/shell';
import { analyzeCommand as analyze } from './commands/analyze';
import { perfCommand as perf } from './commands/perf';
import { generateTestsCommand as generateTests } from './commands/generate-tests';
import { generateDocsCommand as generateDocs } from './commands/generate-docs';
import { workflowGenCommand as workflowGen } from './commands/workflow-gen';
import { depsCommand as deps } from './commands/deps';
import { searchCommand as search } from './commands/search';
import { graphCommand as graph } from './commands/graph';

const AISDLC_VERSION = '4.0.0';

const program = new Command();

program
  .name('aisdlc')
  .description('AI-SDLC Platform - Enterprise AI-powered Software Development Lifecycle')
  .version(AISDLC_VERSION, '-v, --version', 'Show version number');

// Core commands
program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(statusCommand);
program.addCommand(dashboardCommand);
program.addCommand(doctorCommand);
program.addCommand(configCommand);
program.addCommand(logsCommand);
program.addCommand(resetCommand);
program.addCommand(versionCommand);

// Hooks commands
program.addCommand(hooksInstallCommand);
program.addCommand(hooksRemoveCommand);

// MCP commands
program.addCommand(mcpConfigureCommand);

// Phase 5 - Intelligence & Productivity commands
program
  .command('predict')
  .description('Predict quality issues based on current changes')
  .action(async () => {
    await predict([]);
  });

program
  .command('shell')
  .description('Launch interactive shell')
  .action(async () => {
    await shell();
  });

program
  .command('analyze [path]')
  .description('Analyze code quality')
  .action(async (targetPath) => {
    await analyze([targetPath || 'src/']);
  });

program
  .command('perf [action]')
  .description('Performance profiler (report|profile|optimize)')
  .action(async (action) => {
    await perf([action || 'report']);
  });

program
  .command('generate-tests <file>')
  .description('Generate AI-powered tests for file')
  .action(async (file) => {
    await generateTests([file]);
  });

program
  .command('generate-docs [path]')
  .description('Generate documentation from code')
  .action(async (targetPath) => {
    await generateDocs([targetPath || 'src/']);
  });

program
  .command('workflow-gen <description...>')
  .description('Generate custom workflow from natural language')
  .action(async (description) => {
    await workflowGen(description);
  });

program
  .command('deps [action]')
  .description('Dependency analyzer (analyze|security|outdated|unused)')
  .action(async (action) => {
    await deps([action || 'analyze']);
  });

program
  .command('search <query...>')
  .description('Semantic code search')
  .action(async (query) => {
    await search(query);
  });

program
  .command('graph [type]')
  .description('Knowledge graph visualization (overview|agents|files|knowledge)')
  .action(async (type) => {
    await graph([type || 'overview']);
  });

program.parse(process.argv);
