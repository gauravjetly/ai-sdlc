# MCP Server - Quick Start Guide

## What Is This?

An MCP (Model Context Protocol) server that exposes **102 DevOps automation tools** to AI agents like Claude.

## Instant Setup (3 Steps)

### 1. Install & Build

```bash
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform
npm install
npm run build
```

### 2. Start Server

```bash
# For Claude Desktop (recommended)
npm run mcp:start

# For HTTP/web integrations
npm run mcp:http
```

### 3. Configure Claude Desktop

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-platform": {
      "command": "node",
      "args": [
        "/Users/gauravjetly/aisdlc-2.1.0/src/platform/dist/mcp/server/mcp-server.js"
      ]
    }
  }
}
```

Restart Claude Desktop. Done! 🎉

## What Can Claude Do Now?

With these 102 tools, you can tell Claude:

### Deployments
- "Deploy web-app version 1.2.0 to production using blue-green strategy"
- "Scale the prod deployment to 10 replicas"
- "Rollback the last deployment"
- "Show me the logs from the deployment"

### Infrastructure
- "Provision a Kubernetes cluster on AWS in us-east-1"
- "Validate this infrastructure workflow before deploying"
- "Show me the topology of my production infrastructure"
- "Get cost breakdown for my infrastructure"

### Security
- "Run a security scan on the production image"
- "Check compliance against SOC2 and GDPR"
- "Scan this Docker image for vulnerabilities"
- "Apply security patches to the application"

### Cost Management
- "Show me this month's AWS costs"
- "Forecast costs for the next 6 months"
- "Find unused resources wasting money"
- "Optimize costs using a moderate strategy"

### Observability
- "Get CPU and memory metrics for web-app"
- "Show me the error rate for the last hour"
- "Analyze performance bottlenecks"
- "Create an alert if CPU exceeds 80%"

### Testing
- "Run all end-to-end tests"
- "Check code coverage"
- "Run a load test with 1000 users for 60 seconds"
- "Run security tests on the API"

### Releases
- "Create a release for version 2.0.0 with approval"
- "Approve release-123 as release-manager"
- "Show me the release history for web-app"
- "Rollback release-456"

### Architecture
- "Validate the architecture in ./src"
- "Check for circular dependencies"
- "Analyze code complexity"
- "Generate an architecture diagram"

## Test It

```bash
# List all 102 tools
npm run mcp:tools

# Run MCP tests
npm run mcp:test

# Start HTTP server for testing
npm run mcp:http
curl http://localhost:3001/health
```

## Use Programmatically

```typescript
import { createMCPClient } from './mcp/client/mcp-client';

const client = await createMCPClient();

// Deploy
const deployment = await client.deployApplication({
  application: 'web-app',
  version: '1.2.0',
  environment: 'prod'
});

console.log(`Deployed: ${deployment.deployment_id}`);

await client.disconnect();
```

## Tool Categories (102 Total)

- **Deployment**: 15 tools
- **Infrastructure**: 15 tools
- **Security**: 15 tools
- **Cost**: 12 tools
- **Observability**: 15 tools
- **Testing**: 10 tools
- **Release**: 10 tools
- **Architecture**: 10 tools

## Files

```
mcp/
├── server/
│   ├── mcp-server.ts          ← Main server (stdio)
│   ├── http-server.ts         ← HTTP server
│   └── tool-registry.ts       ← 102 tools registered here
├── tools/
│   ├── deployment-tools.ts    ← 15 deployment tools
│   ├── infrastructure-tools.ts ← 15 infrastructure tools
│   ├── security-tools.ts      ← 15 security tools
│   ├── cost-tools.ts          ← 12 cost tools
│   ├── observability-tools.ts ← 15 observability tools
│   ├── testing-tools.ts       ← 10 testing tools
│   ├── release-tools.ts       ← 10 release tools
│   └── architecture-tools.ts  ← 10 architecture tools
├── schemas/
│   └── tool-schemas.ts        ← Zod validation
├── client/
│   └── mcp-client.ts          ← TypeScript client
└── README.md                  ← Full documentation
```

## Documentation

- **Full Guide**: `/Users/gauravjetly/aisdlc-2.1.0/src/platform/docs/MCP-INTEGRATION.md`
- **Tool Reference**: `/Users/gauravjetly/aisdlc-2.1.0/src/platform/docs/TOOL-REFERENCE.md`
- **Examples**: `/Users/gauravjetly/aisdlc-2.1.0/src/platform/examples/mcp-client-examples.ts`

## Troubleshooting

**Claude doesn't see the tools?**
1. Check config path is absolute (not relative)
2. Restart Claude Desktop completely
3. Check server builds: `npm run build`

**Type errors during build?**
- Ignore existing API errors (unrelated)
- MCP code compiles correctly with `skipLibCheck`

**Server won't start?**
```bash
# Check logs
npm run mcp:dev

# Verify port 3001 is free (for HTTP)
lsof -i :3001
```

## Next Steps

1. ✅ Build and start server
2. ✅ Configure Claude Desktop
3. ✅ Test with simple command
4. ✅ Try complex workflows
5. ✅ Integrate into your agents

---

**Status**: ✅ READY TO USE
**Tools**: 102
**Protocol**: MCP (Anthropic)
**Transports**: stdio, HTTP/SSE

Questions? See the full documentation in `/docs`.
