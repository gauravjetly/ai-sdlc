/**
 * Database Seed Orchestrator
 * Main entry point for all database seeding operations
 */

import { PrismaClient } from '@prisma/client';
import { seedTemplates, getTemplateStats } from './templates.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('\n======================================================');
  console.log('  Deltek Catalyst Platform - Database Seeding');
  console.log('======================================================\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost'}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Seed infrastructure templates
    await seedTemplates(prisma);

    // Display statistics
    await getTemplateStats(prisma);

    console.log('======================================================');
    console.log('  Database seeding completed successfully!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n======================================================');
    console.error('  Database seeding FAILED');
    console.error('======================================================\n');
    console.error('Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
