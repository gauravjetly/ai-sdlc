#!/bin/bash

# Run database migrations for staging environment
# This script is executed during deployment to apply pending migrations

set -e

echo "================================================"
echo "Running Database Migrations - Staging"
echo "================================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "Database: $DATABASE_URL"
echo ""

# Navigate to platform directory
cd "$(dirname "$0")/.."

echo "Installing dependencies..."
npm install --production=false > /dev/null 2>&1

echo "Generating Prisma Client..."
npx prisma generate

echo "Applying pending migrations..."
npx prisma migrate deploy

echo ""
echo "================================================"
echo "Migrations completed successfully"
echo "================================================"

# Verify tables exist
echo "Verifying scheduling v2 tables..."
psql "$DATABASE_URL" -c "\dt scheduled_projects" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ scheduled_projects table exists"
else
  echo "✗ scheduled_projects table not found"
  exit 1
fi

psql "$DATABASE_URL" -c "\dt project_phases" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ project_phases table exists"
else
  echo "✗ project_phases table not found"
  exit 1
fi

echo ""
echo "All migrations verified successfully"
