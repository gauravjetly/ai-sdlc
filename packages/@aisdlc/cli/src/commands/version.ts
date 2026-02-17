/**
 * aisdlc version - Show detailed version information
 */

import { Command } from 'commander';
import * as os from 'os';

const AISDLC_VERSION = '4.0.0';

export const versionCommand = new Command('version')
  .description('Show AI-SDLC version and environment details')
  .action(async () => {
    console.log('');
    console.log('  AI-SDLC Platform');
    console.log('  ================');
    console.log(`  Version:  ${AISDLC_VERSION}`);
    console.log(`  Phase:    4 (Local Production Package)`);
    console.log(`  Node.js:  ${process.version}`);
    console.log(`  Platform: ${os.platform()} ${os.arch()}`);
    console.log(`  OS:       ${os.type()} ${os.release()}`);
    console.log(`  Home:     ${os.homedir()}`);
    console.log('');
  });
