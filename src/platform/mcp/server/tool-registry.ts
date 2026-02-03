/**
 * Tool Registry
 *
 * Central registry for all MCP tools
 */

import { Tool, ToolDefinition } from '../types/mcp-types.js';
import { deploymentTools } from '../tools/deployment-tools.js';
import { infrastructureTools } from '../tools/infrastructure-tools.js';
import { securityTools } from '../tools/security-tools.js';
import { costTools } from '../tools/cost-tools.js';
import { observabilityTools } from '../tools/observability-tools.js';
import { testingTools } from '../tools/testing-tools.js';
import { releaseTools } from '../tools/release-tools.js';
import { architectureTools } from '../tools/architecture-tools.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTools([
      ...deploymentTools,
      ...infrastructureTools,
      ...securityTools,
      ...costTools,
      ...observabilityTools,
      ...testingTools,
      ...releaseTools,
      ...architectureTools
    ]);

    console.error(`[MCP] Registered ${this.tools.size} tools`);
  }

  /**
   * Register multiple tools
   */
  private registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        throw new Error(`Tool already registered: ${tool.name}`);
      }
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * List all available tools
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.zodSchemaToJsonSchema(tool.inputSchema)
    }));
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool with validated arguments
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      // Validate arguments using Zod schema
      const validated = tool.inputSchema.parse(args);

      // Execute tool handler
      const result = await tool.handler(validated);

      return result;
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        throw new Error(`Invalid arguments for tool ${name}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): Tool[] {
    const categoryPrefixes: Record<string, string> = {
      deployment: 'deploy_',
      infrastructure: 'provision_|get_infrastructure|destroy_|scale_infrastructure|list_infrastructure|get_resource|update_infrastructure|validate_infrastructure|tag_infrastructure|backup_|restore_|optimize_',
      security: 'run_security|apply_patches|check_compliance|generate_security|rotate_|audit_|configure_firewall|enable_encryption|scan_docker|check_certificates|detect_malware|enable_waf|generate_security_keys|review_iam|enable_audit',
      cost: 'get_cost|forecast_|optimize_costs|set_budget|compare_cloud|estimate_|export_cost',
      observability: 'get_metrics|get_logs|get_traces|create_alert|get_service_health|get_dashboard|analyze_performance|get_error|get_latency|get_service_dependencies|get_slo|create_dashboard|get_apdex|analyze_anomalies|get_capacity',
      testing: 'run_tests|get_test|get_code_coverage|run_load|run_security_tests|validate_api|generate_test|run_smoke|run_regression|run_accessibility',
      release: 'create_release|get_release|approve_|rollback_release|promote_|schedule_|cancel_|validate_release',
      architecture: 'validate_architecture|analyze_dependencies|check_coupling|generate_architecture|detect_architecture|validate_layer|analyze_code|check_solid|detect_circular|generate_documentation'
    };

    const prefix = categoryPrefixes[category];
    if (!prefix) {
      return [];
    }

    const regex = new RegExp(`^(${prefix})`);
    return Array.from(this.tools.values()).filter(tool => regex.test(tool.name));
  }

  /**
   * Get tool statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<string, number>;
  } {
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

    const byCategory = categories.reduce((acc, category) => ({
      ...acc,
      [category]: this.getToolsByCategory(category).length
    }), {});

    return {
      total: this.tools.size,
      byCategory
    };
  }

  /**
   * Convert Zod schema to JSON Schema format for MCP
   */
  private zodSchemaToJsonSchema(zodSchema: any): any {
    // Simple conversion - in production, use a library like zod-to-json-schema
    try {
      // For now, return a basic schema structure
      // MCP SDK will handle the actual Zod schema validation
      return {
        type: 'object',
        properties: {},
        required: []
      };
    } catch (error) {
      console.error('[MCP] Failed to convert Zod schema to JSON Schema:', error);
      return { type: 'object' };
    }
  }

  /**
   * Search tools by keyword
   */
  searchTools(keyword: string): Tool[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.tools.values()).filter(tool =>
      tool.name.toLowerCase().includes(lowerKeyword) ||
      tool.description.toLowerCase().includes(lowerKeyword)
    );
  }
}
