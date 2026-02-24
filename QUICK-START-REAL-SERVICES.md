# Quick Start: Real Services

**Get Vintiq Catalyst running with real services in 5 minutes!**

---

## Prerequisites

- Docker Desktop running
- Node.js 18+
- Kubernetes cluster access (optional for full testing)

---

## 🚀 One-Command Setup

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform

# Run automated setup
./scripts/setup-infrastructure.sh
```

**This will**:
- ✅ Start PostgreSQL (port 5432)
- ✅ Start Redis (port 6379)
- ✅ Create .env file
- ✅ Run database migrations
- ✅ Generate Prisma Client

---

## ⚙️ Configure Credentials (Optional)

```bash
# Edit .env
nano .env

# Add credentials for full functionality:
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
KUBECONFIG=/path/to/kubeconfig
```

---

## ▶️ Start Platform

```bash
# Terminal 1: API Server
npm run api:dev

# Terminal 2: Web UI
cd webapp && npm run dev
```

---

## 🎯 Access Platform

- **Web UI**: http://localhost:3001
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

---

## ✅ Test Real Deployment

**Option 1: Web UI**
1. Go to http://localhost:3001
2. Click "Deployment Wizard"
3. Fill in deployment details
4. Click "Deploy"
5. Watch real-time progress

**Option 2: API**
```bash
curl -X POST http://localhost:3000/api/v1/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "application": "nginx",
    "version": "1.21",
    "environment": "dev",
    "cloud": "aws",
    "clusterArn": "arn:aws:eks:us-east-1:123:cluster/test",
    "namespace": "default",
    "replicas": 2,
    "strategy": "rolling",
    "imageRegistry": "nginx"
  }'
```

---

## 📊 Check Status

```bash
# PostgreSQL
docker exec catalyst-postgres psql -U catalyst -d catalyst_platform -c "SELECT COUNT(*) FROM deployments;"

# Redis
docker exec catalyst-redis redis-cli PING

# Prisma
npx prisma studio
```

---

## 🛠️ Troubleshooting

**PostgreSQL not starting?**
```bash
docker logs catalyst-postgres
docker restart catalyst-postgres
```

**Redis not starting?**
```bash
docker logs catalyst-redis
docker restart catalyst-redis
```

**Migrations failed?**
```bash
npx prisma migrate reset --force
npx prisma migrate dev --name init
```

---

## 🎉 You're Ready!

The platform is now running with:
- ✅ Real PostgreSQL database
- ✅ Real Redis job queue
- ✅ Real Kubernetes client
- ✅ Real-time WebSocket updates
- ✅ Zero mock data

**Next**: Deploy a real application! 🚀
