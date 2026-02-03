/**
 * Platform MCP Client
 *
 * Client library for connecting to MCP server and executing tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPClientConfig {
  serverCommand?: string;
  serverUrl?: string;
  transport?: 'stdio' | 'http';
}

export class PlatformMCPClient {
  private client: Client;
  private connected: boolean = false;

  constructor() {
    this.client = new Client(
      {
        name: 'platform-agent',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );
  }

  /**
   * Connect to MCP server
   */
  async connect(config: MCPClientConfig = {}): Promise<void> {
    const {
      serverCommand = 'node dist/mcp/server/mcp-server.js',
      transport = 'stdio'
    } = config;

    if (transport === 'stdio') {
      const stdiTransport = new StdioClientTransport({
        command: serverCommand
      });

      await this.client.connect(stdiTransport);
    } else {
      throw new Error('HTTP transport not yet implemented in client');
    }

    this.connected = true;
    console.log('[MCP Client] Connected to server');
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('[MCP Client] Disconnected from server');
    }
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<any[]> {
    this.ensureConnected();

    const response = await this.client.request(
      {
        method: 'tools/list'
      },
      {} as any
    );

    return response.tools;
  }

  /**
   * Call a tool with arguments
   */
  async callTool(name: string, args: any = {}): Promise<any> {
    this.ensureConnected();

    const response = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      },
      {} as any
    );

    if (response.isError) {
      const errorData = JSON.parse(response.content[0].text);
      throw new Error(errorData.error.message);
    }

    return JSON.parse(response.content[0].text);
  }

  /**
   * Deployment operations
   */
  async deployApplication(params: {
    application: string;
    version: string;
    environment: 'dev' | 'uat' | 'prod' | 'dr';
    strategy?: 'rolling' | 'blue-green' | 'canary';
    replicas?: number;
  }): Promise<any> {
    return this.callTool('deploy_application', params);
  }

  async getDeploymentStatus(deploymentId: string): Promise<any> {
    return this.callTool('get_deployment_status', { deployment_id: deploymentId });
  }

  async rollbackDeployment(deploymentId: string): Promise<any> {
    return this.callTool('rollback_deployment', { deployment_id: deploymentId });
  }

  /**
   * Infrastructure operations
   */
  async provisionInfrastructure(params: {
    workflow: string;
    cloud: 'aws' | 'oci' | 'azure' | 'gcp';
    environment: 'dev' | 'uat' | 'prod' | 'dr';
  }): Promise<any> {
    return this.callTool('provision_infrastructure', params);
  }

  async getInfrastructureStatus(workflowId: string): Promise<any> {
    return this.callTool('get_infrastructure_status', { workflow_id: workflowId });
  }

  async destroyInfrastructure(workflowId: string, confirm: boolean = true): Promise<any> {
    return this.callTool('destroy_infrastructure', { workflow_id: workflowId, confirm });
  }

  /**
   * Security operations
   */
  async runSecurityScan(params: {
    target: string;
    scan_type: 'vulnerabilities' | 'compliance' | 'secrets' | 'all';
  }): Promise<any> {
    return this.callTool('run_security_scan', params);
  }

  async checkCompliance(params: {
    target: string;
    standards: Array<'CIS' | 'SOC2' | 'GDPR' | 'PCI-DSS'>;
  }): Promise<any> {
    return this.callTool('check_compliance', params);
  }

  /**
   * Cost operations
   */
  async getCostReport(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    cloud?: 'aws' | 'oci' | 'azure' | 'gcp';
  }): Promise<any> {
    return this.callTool('get_cost_report', params);
  }

  async forecastCosts(params: {
    cloud: 'aws' | 'oci' | 'azure' | 'gcp';
    months: number;
  }): Promise<any> {
    return this.callTool('forecast_costs', params);
  }

  /**
   * Observability operations
   */
  async getMetrics(params: {
    service: string;
    metrics: Array<'cpu' | 'memory' | 'requests' | 'errors' | 'latency'>;
    start_time?: string;
    end_time?: string;
  }): Promise<any> {
    return this.callTool('get_metrics', params);
  }

  async getLogs(params: {
    service: string;
    level?: 'error' | 'warn' | 'info' | 'debug';
    lines?: number;
    since?: string;
  }): Promise<any> {
    return this.callTool('get_logs', params);
  }

  async getServiceHealth(service: string): Promise<any> {
    return this.callTool('get_service_health', { service });
  }

  /**
   * Testing operations
   */
  async runTests(params: {
    type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
    target?: string;
    parallel?: boolean;
  }): Promise<any> {
    return this.callTool('run_tests', params);
  }

  async getCodeCoverage(params?: {
    target?: string;
    threshold?: number;
  }): Promise<any> {
    return this.callTool('get_code_coverage', params || {});
  }

  /**
   * Release operations
   */
  async createRelease(params: {
    application: string;
    version: string;
    environment: 'dev' | 'uat' | 'prod' | 'dr';
    strategy: 'rolling' | 'blue-green' | 'canary';
    approval_required?: boolean;
  }): Promise<any> {
    return this.callTool('create_release', params);
  }

  async getReleaseStatus(releaseId: string): Promise<any> {
    return this.callTool('get_release_status', { release_id: releaseId });
  }

  async approveRelease(params: {
    release_id: string;
    approver: string;
  }): Promise<any> {
    return this.callTool('approve_release', params);
  }

  /**
   * Architecture operations
   */
  async validateArchitecture(params: {
    target: string;
    rules?: string[];
  }): Promise<any> {
    return this.callTool('validate_architecture', params);
  }

  async analyzeDependencies(params: {
    target: string;
    depth?: number;
  }): Promise<any> {
    return this.callTool('analyze_dependencies', params);
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client not connected. Call connect() first.');
    }
  }
}

/**
 * Create and connect a new MCP client
 */
export async function createMCPClient(config?: MCPClientConfig): Promise<PlatformMCPClient> {
  const client = new PlatformMCPClient();
  await client.connect(config);
  return client;
}

export default PlatformMCPClient;
