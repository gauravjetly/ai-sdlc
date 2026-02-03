import axios from 'axios';
import type { DeploymentRequest, DeploymentStatus, CloudResource, Agent, CostAnalysis } from '../types';

const API_BASE = 'http://localhost:3000/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('catalyst_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Deployments
  async createDeployment(data: DeploymentRequest): Promise<DeploymentStatus> {
    const response = await apiClient.post('/deployments', data);
    return response.data.data;
  },

  async getDeploymentStatus(id: string): Promise<DeploymentStatus> {
    const response = await apiClient.get(`/deployments/${id}/status`);
    return response.data.data;
  },

  async rollbackDeployment(id: string): Promise<void> {
    await apiClient.post(`/deployments/${id}/rollback`);
  },

  // Cloud Resources
  async createVPC(data: any): Promise<CloudResource> {
    const response = await apiClient.post('/infrastructure/networks', data);
    return response.data.data;
  },

  async createCluster(data: any): Promise<CloudResource> {
    const response = await apiClient.post('/infrastructure/clusters', data);
    return response.data.data;
  },

  async createDatabase(data: any): Promise<CloudResource> {
    const response = await apiClient.post('/infrastructure/databases', data);
    return response.data.data;
  },

  async listResources(): Promise<CloudResource[]> {
    const response = await apiClient.get('/infrastructure/resources');
    return response.data.data;
  },

  // AI Agents
  async listAgents(): Promise<Agent[]> {
    const response = await apiClient.get('/agents');
    return response.data.data;
  },

  async executeAgent(agentId: string, task: any): Promise<any> {
    const response = await apiClient.post(`/agents/${agentId}/execute`, task);
    return response.data.data;
  },

  async getAgentStatus(agentId: string): Promise<any> {
    const response = await apiClient.get(`/agents/${agentId}/status`);
    return response.data.data;
  },

  // Cost Analysis
  async analyzeCosts(workload: any): Promise<CostAnalysis> {
    const response = await apiClient.post('/clouds/compare-costs', workload);
    return response.data.data;
  },

  // Security
  async runSecurityScan(target: string): Promise<any> {
    const response = await apiClient.post('/agents/security-agent/execute', {
      task: 'scan_vulnerabilities',
      target,
    });
    return response.data.data;
  },

  // Health Check
  async getHealth(): Promise<any> {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
