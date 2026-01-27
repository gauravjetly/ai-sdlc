#!/usr/bin/env node
/**
 * Governance Engine CLI
 * @module @deltek/governance-engine/cli
 */

import { Command } from 'commander';
import { GovernanceService } from '../../application/services/GovernanceService';
import { validateCommand } from './commands/validate';
import { checkCommand } from './commands/check';
import { reportCommand } from './commands/report';

const program = new Command();

program
  .name('governance')
  .description('Deltek Governance Policy Engine - Enforce engineering standards automatically')
  .version('1.0.0');

// Add commands
program.addCommand(validateCommand);
program.addCommand(checkCommand);
program.addCommand(reportCommand);

// Parse and execute
program.parse();
