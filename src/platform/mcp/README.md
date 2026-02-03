# AI Platform MCP Server

Model Context Protocol (MCP) server exposing 100+ DevOps automation tools to AI agents.

## Overview

This MCP server provides comprehensive platform capabilities including:

- **Deployment Management** (15 tools) - Deploy, scale, monitor applications
- **Infrastructure Provisioning** (15 tools) - Multi-cloud infrastructure automation
- **Security & Compliance** (15 tools) - Security scanning, compliance checking
- **Cost Management** (12 tools) - Cost tracking, optimization, forecasting
- **Observability** (15 tools) - Metrics, logs, traces, alerting
- **Testing** (10 tools) - Automated testing, coverage, load testing
- **Release Management** (10 tools) - Release orchestration, approvals
- **Architecture Validation** (10 tools) - Architecture analysis, validation

**Total: 100+ tools**

## Quick Start

### 1. Build

```bash
npm install
npm run build
```

### 2. Start Server

```bash
# stdio transport (for Claude Desktop)
npm run mcp:start

# HTTP transport (for web integrations)
npm run mcp:http
```

### 3. Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-platform": {
      "command": "node",
      "args": [
        "/absolute/path/to/dist/mcp/server/mcp-server.js"
      ]
    }
  }
}
```

## Directory Structure

```
mcp/
├── server/
│   ├── mcp-server.ts          # Main stdio server
│   ├── http-server.ts         # HTTP/SSE server
│   └── tool-registry.ts       # Tool registration
├── tools/
│   ├── deployment-tools.ts    # 15 deployment tools
│   ├── infrastructure-tools.ts # 15 infrastructure tools
│   ├── security-tools.ts      # 15 security tools
│   ├── cost-tools.ts          # 12 cost tools
│   ├── observability-tools.ts # 15 observability tools
│   ├── testing-tools.ts       # 10 testing tools
│   ├── release-tools.ts       # 10 release tools
│   └── architecture-tools.ts  # 10 architecture tools
├── schemas/
│   └── tool-schemas.ts        # Zod validation schemas
├── types/
│   └── mcp-types.ts           # TypeScript type definitions
└── client/
    └── mcp-client.ts          # Client library

tests/mcp/
└── mcp-server.test.ts         # Integration tests
```

## Usage Examples

### TypeScript Client

```typescript
import { createMCPClient } from './mcp/client/mcp-client';

const client = await createMCPClient();

// Deploy application
const deployment = await client.deployApplication({
  application: 'web-app',
  version: '1.2.0',
  environment: 'prod',
  strategy: 'blue-green',
  replicas: 5
});

// Get status
const status = await client.getDeploymentStatus(deployment.deployment_id);

await client.disconnect();
```

### HTTP REST API

```bash
# List tools
curl http://localhost:3001/tools

# Execute tool
curl -X POST http://localhost:3001/tools/deploy_application/execute \
  -H "Content-Type: application/json" \
  -d '{
    "application": "web-app",
    "version": "1.2.0",
    "environment": "prod"
  }'
```

### Claude Desktop

Once configured, simply ask Claude:

```
"Deploy web-app version 1.2.0 to production using blue-green deployment"
"Check the cost report for AWS this month"
"Run security scan on the production infrastructure"
"Get metrics for web-app service"
```

## Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| Deployment | 15 | Application deployment and management |
| Infrastructure | 15 | Cloud infrastructure provisioning |
| Security | 15 | Security scanning and compliance |
| Cost | 12 | Cost tracking and optimization |
| Observability | 15 | Monitoring and alerting |
| Testing | 10 | Automated testing |
| Release | 10 | Release management |
| Architecture | 10 | Architecture validation |

## Testing

```bash
# Run MCP tests
npm run mcp:test

# Run all tests
npm test

# Test with coverage
npm run test:coverage
```

## Development

```bash
# Watch mode (stdio)
npm run mcp:dev

# Watch mode (HTTP)
npm run mcp:http:dev

# List all tools
npm run mcp:tools

# Type check
npm run type-check
```

## Documentation

- [MCP Integration Guide](../docs/MCP-INTEGRATION.md) - Complete integration guide
- [Tool Reference](../docs/TOOL-REFERENCE.md) - Detailed tool documentation
- [Examples](../examples/mcp-client-examples.ts) - Code examples

## Architecture

### MCP Protocol

The server implements the Anthropic Model Context Protocol:

- **Protocol**: JSON-RPC 2.0
- **Transport**: stdio (primary), HTTP/SSE (secondary)
- **Discovery**: `tools/list` method
- **Execution**: `tools/call` method
- **Validation**: Zod schemas for all inputs

### Tool Registration

Tools are registered in the `ToolRegistry`:

1. Import tool definitions from `tools/` directory
2. Register all tools in the constructor
3. Validate tool names are unique
4. Convert Zod schemas to JSON Schema for MCP

### Request Flow

```
Client Request
    ↓
MCP Server (stdio/HTTP)
    ↓
Tool Registry
    ↓
Zod Validation
    ↓
Tool Handler
    ↓
Response
```

### Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "TOOL_EXECUTION_ERROR",
    "message": "Error description",
    "tool": "tool_name"
  }
}
```

## Performance

- Tool listing: <10ms
- Tool execution: Varies (5s - 5min)
- stdio overhead: ~1ms per request
- HTTP overhead: ~2-5ms per request

## Security

- No authentication on stdio (local only)
- HTTP server requires authentication (implement as needed)
- All inputs validated with Zod
- Destructive operations require confirmation
- Secrets never logged

## Production Deployment

### stdio (Local Use)

```bash
node dist/mcp/server/mcp-server.js
```

### HTTP (Web Use)

```bash
# Set port
export MCP_HTTP_PORT=3001

# Start server
node dist/mcp/server/http-server.js

# Or use process manager
pm2 start dist/mcp/server/http-server.js --name mcp-http
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/mcp/server/http-server.js"]
```

## Troubleshooting

### Connection Issues

```bash
# Check server status
curl http://localhost:3001/health

# View server logs
npm run mcp:dev
```

### Tool Not Found

```bash
# List all tools
npm run mcp:tools

# Search for tool
curl http://localhost:3001/tools/search?q=deploy
```

### Validation Errors

Check the Zod schema in `schemas/tool-schemas.ts` for input requirements.

## Contributing

1. Add tool to appropriate `tools/*.ts` file
2. Define Zod schema in `schemas/tool-schemas.ts`
3. Update this README
4. Add tests to `tests/mcp/mcp-server.test.ts`
5. Update documentation

## License

ISC

## Support

- Documentation: `/docs`
- Examples: `/examples`
- Issues: GitHub Issues
