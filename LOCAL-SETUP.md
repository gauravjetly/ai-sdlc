# AI-SDLC Local Setup Guide

Run the AI-SDLC Multi-Project Scheduling Platform locally.

## 🎯 What You Get

- **Multi-Project Scheduling Dashboard** at `http://localhost:5173/scheduling`
- **Tool Adoption Analytics** at `http://localhost:5173/analytics`
- **Main Control Center** at `http://localhost:5173/`

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL (for database)
- Redis (for distributed locking)
- npm or yarn

## 🚀 Quick Start

### 1. Start Backend Services

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform

# Install dependencies (first time only)
npm install

# Set up environment variables
cp .env.example .env

# Edit .env and configure:
# - DATABASE_URL=postgresql://user:pass@localhost:5432/aisdlc
# - REDIS_URL=redis://localhost:6379
# - JWT_PUBLIC_KEY_PATH=./keys/jwt-public.key

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the API server
npm run dev
```

**Backend runs at**: `http://localhost:3000`

### 2. Start Frontend (New Terminal)

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform/webapp

# Install dependencies (first time only)
npm install

# Start the webapp
npm run dev
```

**Frontend runs at**: `http://localhost:5173`

### 3. Access the Dashboards

Open your browser:

- **Multi-Project Scheduling**: http://localhost:5173/scheduling
- **Tool Adoption Analytics**: http://localhost:5173/analytics
- **Main Dashboard**: http://localhost:5173/

## 🎯 Using the Scheduling System

### Create Your First Project

1. Go to: http://localhost:5173/scheduling
2. Click **"Add New Project"**
3. Fill in:
   - **Name**: "My First AI-Built Project"
   - **Priority**: HIGH
   - **Delivery Date**: (pick a date 2 weeks from now)
   - **Description**: "Build a REST API with authentication"
4. Click **Create**

### What Happens Next

The AI-SDLC agents will automatically:
1. **BA Agent** → Gathers requirements
2. **Architect Agent** → Designs the system
3. **Software Engineer** → Writes the code
4. **Security Agent** → Reviews security
5. **QA Agent** → Tests everything
6. **DevOps Agent** → Deploys the system
7. **Customer Agent** → Validates acceptance

### Monitor Progress

Watch the dashboard:
- **7 dots** show phase progress (gray → blue → green)
- **Metrics strip** shows active projects, at-risk count, agent utilization
- **Analytics tabs** show agent pool status, phase durations, throughput

## 🛠️ Troubleshooting

### Database Not Found
```bash
# Create the database
createdb aisdlc

# Run migrations
cd src/platform
npx prisma migrate dev
```

### Redis Not Running
```bash
# Mac (with Homebrew)
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### Port Already in Use
```bash
# Backend (port 3000)
lsof -ti:3000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

## 📊 Features Available

### Multi-Project Dashboard (`/scheduling`)
- ✅ Schedule multiple projects with delivery dates
- ✅ Priority-based agent allocation (CRITICAL > HIGH > NORMAL > LOW)
- ✅ Real-time progress tracking with 7-phase pipeline
- ✅ Delivery health indicators (on track / at risk / behind)
- ✅ Agent pool analytics (busy/idle agents)
- ✅ Phase duration analytics (avg time per phase)
- ✅ Weekly throughput metrics

### Tool Adoption Analytics (`/analytics`)
- ✅ Compact metrics strip (5 key KPIs)
- ✅ Modern progress bars (vs old bar charts)
- ✅ 4-week trend sparklines
- ✅ AI-generated insights
- ✅ 70% space reduction!

### API Endpoints Available

All endpoints at `http://localhost:3000/api/v1/scheduling/`:

**Projects**:
- `POST /projects` - Create new project
- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `POST /projects/:id/cancel` - Cancel project (admin only)

**Dashboard**:
- `GET /projects/dashboard` - Get dashboard data

**Scheduler**:
- `POST /scheduler/process` - Trigger agent allocation (admin only)

**Analytics**:
- `GET /analytics/pool` - Agent pool status
- `GET /analytics/phases` - Phase duration stats
- `GET /analytics/throughput` - Weekly throughput

## 🧪 Run Tests

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform

# Run all tests
npm test

# Run specific test suites
npm test -- scheduling
npm test -- --coverage
```

**Test Coverage**: 296 passing tests, 88-100% coverage

## 🔒 Security Features

- ✅ JWT authentication (RS256)
- ✅ Role-based access control (admin, operator, developer, viewer)
- ✅ Permission-based authorization
- ✅ Redis distributed locking (prevents race conditions)
- ✅ Typed error classes (23 domain errors)
- ✅ Input validation with Zod schemas

## 📚 Documentation

- **Requirements**: `docs/sdlc/requirements/REQ-20260210-0011-v2.md`
- **Architecture**: `docs/sdlc/architecture/ARCH-20260210-0011-v2.md`
- **UX Design**: `docs/sdlc/ux/UX-HANDOFF-20260210-1430.md`
- **API Reference**: See code in `src/platform/scheduling/presentation/routes/`

## 💡 Development Tips

### Hot Reload
Both backend and frontend support hot reload:
- Backend: Uses `nodemon` (watches TypeScript files)
- Frontend: Uses Vite HMR (instant updates)

### Database UI
```bash
cd src/platform
npx prisma studio
```
Opens at: http://localhost:5555

### API Testing
```bash
# Health check
curl http://localhost:3000/health

# Get dashboard data (requires auth)
curl http://localhost:3000/api/v1/scheduling/projects/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎉 You're Ready!

Start building multiple projects simultaneously with AI-SDLC agents! 🚀
