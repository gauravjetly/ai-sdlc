/**
 * aisdlc logs - View audit logs from SQLite
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AISDLC_HOME = path.join(os.homedir(), '.aisdlc');

export const logsCommand = new Command('logs')
  .description('View AI-SDLC audit logs')
  .option('-n, --lines <count>', 'Number of log entries', '20')
  .option('--agent <agent>', 'Filter by agent')
  .option('--type <type>', 'Filter by event type')
  .option('--errors', 'Show only errors')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const dbPath = path.join(AISDLC_HOME, 'data', 'platform.db');

    if (!fs.existsSync(dbPath)) {
      console.log("  No database found. Run 'aisdlc init' first.");
      return;
    }

    try {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath, { readonly: true });

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.agent) {
        conditions.push('agent_id = ?');
        params.push(options.agent);
      }

      if (options.type) {
        conditions.push('event_type = ?');
        params.push(options.type);
      }

      if (options.errors) {
        conditions.push('success = 0');
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const limit = parseInt(options.lines, 10) || 20;
      params.push(limit);

      const rows = db.prepare(
        `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT ?`
      ).all(...params) as Record<string, unknown>[];

      db.close();

      if (options.json) {
        console.log(JSON.stringify(rows, null, 2));
        return;
      }

      if (rows.length === 0) {
        console.log('');
        console.log('  No audit events found.');
        console.log('');
        return;
      }

      console.log('');
      console.log(`  Audit Log (last ${rows.length} entries)`);
      console.log('  ' + '='.repeat(70));

      for (const row of rows) {
        const time = (row.created_at as string).replace('T', ' ').replace('Z', '');
        const status = row.success ? 'OK' : 'FAIL';
        const agent = (row.agent_id as string) || '-';

        console.log(`  ${time}  [${status.padEnd(4)}]  ${(row.event_type as string).padEnd(25)}  ${agent}`);

        if (row.error) {
          console.log(`                          Error: ${row.error}`);
        }
      }

      console.log('');
    } catch (error) {
      console.log(`  Error reading logs: ${(error as Error).message}`);
    }
  });
