#!/usr/bin/env node

/**
 * Platform MCP Server
 *
 * Model Context Protocol server exposing 100+ platform tools to AI agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './tool-registry.js';

export class PlatformMCPServer {
  private server: Server;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-platform-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.toolRegistry = new ToolRegistry();
    this.setupHandlers();
    this.logServerInfo();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = this.toolRegistry.listTools();
        console.error(`[MCP] Listed ${tools.length} tools`);

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
      } catch (error: any) {
        console.error('[MCP] Error listing tools:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error.message}`
        );
      }
    });

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.error(`[MCP] Executing tool: ${name}`);
      console.error(`[MCP] Arguments:`, JSON.stringify(args, null, 2));

      try {
        const result = await this.toolRegistry.executeTool(name, args || {});

        console.error(`[MCP] Tool ${name} executed successfully`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error(`[MCP] Tool ${name} execution failed:`, error);

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
  }

  /**
   * Log server information
   */
  private logServerInfo(): void {
    const stats = this.toolRegistry.getStatistics();

    console.error('\n========================================');
    console.error('  AI Platform MCP Server');
    console.error('========================================');
    console.error(`Total Tools: ${stats.total}`);
    console.error('\nTools by Category:');

    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.error(`  ${category.padEnd(20)} ${count} tools`);
    });

    console.error('========================================\n');
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[MCP] Server running on stdio transport');
    console.error('[MCP] Waiting for requests...\n');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.error('\n[MCP] Shutting down server...');
    await this.server.close();
    console.error('[MCP] Server stopped');
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PlatformMCPServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  // Start server
  server.start().catch((error) => {
    console.error('[MCP] Fatal error:', error);
    process.exit(1);
  });
}

export default PlatformMCPServer;
