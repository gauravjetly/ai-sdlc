#!/usr/bin/env node

/**
 * Platform MCP HTTP Server
 *
 * HTTP/SSE transport for Model Context Protocol
 */

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './tool-registry.js';

const PORT = process.env.MCP_HTTP_PORT || 3001;

class PlatformMCPHTTPServer {
  private app: express.Application;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.app = express();
    this.toolRegistry = new ToolRegistry();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Logging middleware
    this.app.use((req, res, next) => {
      console.error(`[HTTP] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      const stats = this.toolRegistry.getStatistics();
      res.json({
        status: 'healthy',
        server: 'ai-platform-mcp-http',
        version: '1.0.0',
        tools: stats
      });
    });

    // List tools (REST endpoint)
    this.app.get('/tools', (req, res) => {
      try {
        const tools = this.toolRegistry.listTools();
        res.json({
          tools,
          count: tools.length
        });
      } catch (error: any) {
        res.status(500).json({
          error: error.message
        });
      }
    });

    // Search tools
    this.app.get('/tools/search', (req, res) => {
      const keyword = req.query.q as string;
      if (!keyword) {
        return res.status(400).json({
          error: 'Query parameter "q" is required'
        });
      }

      const tools = this.toolRegistry.searchTools(keyword);
      res.json({
        tools,
        count: tools.length,
        query: keyword
      });
    });

    // Execute tool (REST endpoint)
    this.app.post('/tools/:toolName/execute', async (req, res) => {
      const { toolName } = req.params;
      const args = req.body;

      try {
        const result = await this.toolRegistry.executeTool(toolName, args);
        res.json({
          success: true,
          result
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error.message,
            tool: toolName
          }
        });
      }
    });

    // MCP SSE endpoint
    this.app.post('/sse', async (req, res) => {
      console.error('[HTTP] SSE connection established');

      const server = new Server(
        {
          name: 'ai-platform-mcp-http',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );

      // Setup handlers for this connection
      server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = this.toolRegistry.listTools();
        return {
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }))
        };
      });

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
          const result = await this.toolRegistry.executeTool(name, args || {});
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: {
                    code: 'TOOL_EXECUTION_ERROR',
                    message: error.message,
                    tool: name
                  }
                }, null, 2)
              }
            ],
            isError: true
          };
        }
      });

      const transport = new SSEServerTransport('/messages', res);
      await server.connect(transport);

      req.on('close', () => {
        console.error('[HTTP] SSE connection closed');
        server.close();
      });
    });

    // Tool statistics
    this.app.get('/stats', (req, res) => {
      const stats = this.toolRegistry.getStatistics();
      res.json(stats);
    });

    // Tool categories
    this.app.get('/categories', (req, res) => {
      const categories = [
        'deployment',
        'infrastructure',
        'security',
        'cost',
        'observability',
        'testing',
        'release',
        'architecture'
      ];

      res.json({
        categories: categories.map(category => ({
          name: category,
          tools: this.toolRegistry.getToolsByCategory(category).map(t => t.name)
        }))
      });
    });
  }

  start(): void {
    this.app.listen(PORT, () => {
      console.error('\n========================================');
      console.error('  AI Platform MCP HTTP Server');
      console.error('========================================');
      console.error(`Port: ${PORT}`);
      console.error(`Health: http://localhost:${PORT}/health`);
      console.error(`Tools: http://localhost:${PORT}/tools`);
      console.error(`SSE: http://localhost:${PORT}/sse`);
      console.error('========================================\n');
    });
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PlatformMCPHTTPServer();
  server.start();
}

export default PlatformMCPHTTPServer;
