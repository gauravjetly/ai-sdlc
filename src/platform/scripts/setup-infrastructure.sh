#!/bin/bash

# Vintiq Catalyst - Infrastructure Setup Script
# Sets up PostgreSQL, Redis, and runs database migrations

set -e

echo "🚀 Vintiq Catalyst - Infrastructure Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# ==================================
# PostgreSQL Setup
# ==================================
echo "📦 Setting up PostgreSQL..."

if docker ps -a --format '{{.Names}}' | grep -q "^catalyst-postgres$"; then
    echo -e "${YELLOW}⚠️  PostgreSQL container already exists${NC}"
    docker start catalyst-postgres > /dev/null 2>&1 || true
else
    docker run -d --name catalyst-postgres \
        -e POSTGRES_USER=catalyst \
        -e POSTGRES_PASSWORD=catalyst_password \
        -e POSTGRES_DB=catalyst_platform \
        -p 5432:5432 \
        postgres:15-alpine

    echo -e "${GREEN}✅ PostgreSQL container created and started${NC}"

    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Check if PostgreSQL is accessible
if docker exec catalyst-postgres pg_isready -U catalyst > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not ready. Please check the container.${NC}"
    exit 1
fi

echo ""

# ==================================
# Redis Setup
# ==================================
echo "📦 Setting up Redis..."

if docker ps -a --format '{{.Names}}' | grep -q "^catalyst-redis$"; then
    echo -e "${YELLOW}⚠️  Redis container already exists${NC}"
    docker start catalyst-redis > /dev/null 2>&1 || true
else
    docker run -d --name catalyst-redis \
        -p 6379:6379 \
        redis:7-alpine

    echo -e "${GREEN}✅ Redis container created and started${NC}"
    sleep 2
fi

# Check if Redis is accessible
if docker exec catalyst-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis is not ready. Please check the container.${NC}"
    exit 1
fi

echo ""

# ==================================
# Environment File
# ==================================
echo "⚙️  Setting up environment file..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with your AWS/OCI credentials${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists (not overwriting)${NC}"
fi

echo ""

# ==================================
# Database Migrations
# ==================================
echo "🗄️  Running database migrations..."

# Set DATABASE_URL for migrations
export DATABASE_URL="postgresql://catalyst:catalyst_password@localhost:5432/catalyst_platform?schema=public"

if npx prisma migrate dev --name init; then
    echo -e "${GREEN}✅ Database migrations completed${NC}"
else
    echo -e "${RED}❌ Database migrations failed${NC}"
    exit 1
fi

echo ""

# ==================================
# Prisma Client Generation
# ==================================
echo "🔧 Generating Prisma Client..."

if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client generated${NC}"
else
    echo -e "${RED}❌ Prisma Client generation failed${NC}"
    exit 1
fi

echo ""

# ==================================
# Summary
# ==================================
echo "=========================================="
echo -e "${GREEN}✅ Infrastructure Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📊 Services Status:"
echo "  ✅ PostgreSQL: running on localhost:5432"
echo "  ✅ Redis: running on localhost:6379"
echo "  ✅ Database: migrated and ready"
echo "  ✅ Prisma Client: generated"
echo ""
echo "📝 Next Steps:"
echo "  1. Update .env with your credentials:"
echo "     - AWS_ACCESS_KEY_ID"
echo "     - AWS_SECRET_ACCESS_KEY"
echo "     - OCI credentials (if using OCI)"
echo "     - KUBECONFIG path"
echo ""
echo "  2. Start the API server:"
echo "     npm run api:dev"
echo ""
echo "  3. Start the webapp:"
echo "     cd webapp && npm run dev"
echo ""
echo "  4. Access the platform:"
echo "     - API: http://localhost:3000"
echo "     - Web UI: http://localhost:3001"
echo "     - API Docs: http://localhost:3000/api-docs"
echo ""
echo "🎉 You're ready to deploy real applications!"
echo ""
