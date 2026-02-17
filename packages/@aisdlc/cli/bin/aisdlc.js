#!/usr/bin/env node

/**
 * AI-SDLC Platform CLI
 *
 * Entry point for the `aisdlc` command.
 * This file bootstraps the CLI from the compiled TypeScript.
 */

'use strict';

// Check Node.js version
const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (nodeVersion < 20) {
  console.error(
    `Error: AI-SDLC requires Node.js >= 20. You have ${process.version}.`
  );
  console.error('Please upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

try {
  require('../dist/index.js');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error('Error: AI-SDLC CLI not built. Run: npm run build');
    console.error('If you installed via npm, this is a packaging error.');
  } else {
    console.error('Error starting AI-SDLC CLI:', err.message);
  }
  process.exit(1);
}
