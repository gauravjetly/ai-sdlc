/**
 * Load Tests - Deployment Service Performance
 * Tests performance under load and stress conditions
 */

import { DeploymentService } from '../../services/deployment/deployment.service';
import { CloudResourceService } from '../../services/cloud/cloud-resource.service';
import { AgentOrchestrationService } from '../../services/agent/agent-orchestration.service';
import { prisma } from '../../infrastructure/database/prisma.client';
import { KubernetesClient } from '../../services/deployment/k8s.client';
import { AWSProvider } from '../../services/cloud/providers/aws.provider';

// Mock external services
jest.mock('../../services/deployment/k8s.client');
jest.mock('../../services/cloud/providers/aws.provider');

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  minResponseTime: number;
  maxResponseTime: number;
}

describe('Load Tests: Deployment Service Performance', () => {
  let deploymentService: DeploymentService;
  let cloudService: CloudResourceService;
  let orchestrationService: AgentOrchestrationService;

  beforeAll(async () => {
    await prisma.$connect();

    deploymentService = new DeploymentService();
    cloudService = new CloudResourceService();
    orchestrationService = new AgentOrchestrationService();

    setupMocks();
  });

  afterAll(async () => {
    await orchestrationService.shutdown();
    await cleanupTestData();
    await prisma.$disconnect();
  });

  function setupMocks() {
    // Fast K8s mock responses
    (KubernetesClient as jest.Mock).mockImplementation(() => ({
      ensureNamespace: jest.fn().mockResolvedValue(undefined),
      createDeployment: jest.fn().mockResolvedValue({
        metadata: { uid: `perf-uid-${Date.now()}`, name: 'perf-app' }
      }),
      getDeployment: jest.fn().mockResolvedValue({
        spec: { replicas: 3 },
        status: {
          replicas: 3,
          readyReplicas: 3,
          availableReplicas: 3,
          conditions: [{ type: 'Available', status: 'True' }]
        }
      }),
      scaleDeployment: jest.fn().mockResolvedValue(undefined),
      deleteDeployment: jest.fn().mockResolvedValue(undefined)
    }));

    // Fast AWS mock responses
    (AWSProvider as jest.Mock).mockImplementation(() => ({
      createVPC: jest.fn().mockResolvedValue({
        vpcId: `vpc-perf-${Date.now()}`,
        subnets: [],
        internetGatewayId: 'igw-perf',
        routeTableId: 'rtb-perf'
      }),
      createCluster: jest.fn().mockResolvedValue({
        clusterArn: `arn:aws:eks:us-east-1:123:cluster/perf-${Date.now()}`,
        name: 'perf-cluster'
      })
    }));
  }

  async function cleanupTestData() {
    await prisma.deployment.deleteMany({
      where: { application: { contains: 'perf-' } }
    });
    await prisma.cloudResource.deleteMany({
      where: { name: { contains: 'perf-' } }
    });
  }

  function calculateMetrics(responseTimes: number[], totalDuration: number, failures: number): PerformanceMetrics {
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const total = responseTimes.length;
    const successful = total - failures;

    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    const average = sum / total;

    const p50Index = Math.floor(total * 0.50);
    const p95Index = Math.floor(total * 0.95);
    const p99Index = Math.floor(total * 0.99);

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failures,
      totalDuration,
      averageResponseTime: Math.round(average),
      p50ResponseTime: Math.round(sorted[p50Index] || 0),
      p95ResponseTime: Math.round(sorted[p95Index] || 0),
      p99ResponseTime: Math.round(sorted[p99Index] || 0),
      requestsPerSecond: Math.round((total / totalDuration) * 1000),
      minResponseTime: Math.round(Math.min(...responseTimes)),
      maxResponseTime: Math.round(Math.max(...responseTimes))
    };
  }

  function printMetrics(testName: string, metrics: PerformanceMetrics, targets?: Partial<PerformanceMetrics>) {
    console.log(`\n=== ${testName} Performance Metrics ===`);
    console.log(`Total Requests: ${metrics.totalRequests}`);
    console.log(`Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed: ${metrics.failedRequests}`);
    console.log(`Total Duration: ${metrics.totalDuration}ms`);
    console.log(`Throughput: ${metrics.requestsPerSecond} req/s`);
    console.log(`\nResponse Times:`);
    console.log(`  Min: ${metrics.minResponseTime}ms`);
    console.log(`  Avg: ${metrics.averageResponseTime}ms ${targets?.averageResponseTime ? `(target: <${targets.averageResponseTime}ms)` : ''}`);
    console.log(`  p50: ${metrics.p50ResponseTime}ms ${targets?.p50ResponseTime ? `(target: <${targets.p50ResponseTime}ms)` : ''}`);
    console.log(`  p95: ${metrics.p95ResponseTime}ms ${targets?.p95ResponseTime ? `(target: <${targets.p95ResponseTime}ms)` : ''}`);
    console.log(`  p99: ${metrics.p99ResponseTime}ms ${targets?.p99ResponseTime ? `(target: <${targets.p99ResponseTime}ms)` : ''}`);
    console.log(`  Max: ${metrics.maxResponseTime}ms`);

    // Check against targets
    if (targets) {
      console.log(`\nTarget Validation:`);
      if (targets.averageResponseTime) {
        const avgPass = metrics.averageResponseTime < targets.averageResponseTime;
        console.log(`  Avg Response Time: ${avgPass ? '✓ PASS' : '✗ FAIL'}`);
      }
      if (targets.p95ResponseTime) {
        const p95Pass = metrics.p95ResponseTime < targets.p95ResponseTime;
        console.log(`  p95 Response Time: ${p95Pass ? '✓ PASS' : '✗ FAIL'}`);
      }
      if (targets.p99ResponseTime) {
        const p99Pass = metrics.p99ResponseTime < targets.p99ResponseTime;
        console.log(`  p99 Response Time: ${p99Pass ? '✓ PASS' : '✗ FAIL'}`);
      }
      if (targets.requestsPerSecond) {
        const rpsPass = metrics.requestsPerSecond >= targets.requestsPerSecond;
        console.log(`  Throughput: ${rpsPass ? '✓ PASS' : '✗ FAIL'}`);
      }
    }
  }

  describe('Deployment Service - Load Testing', () => {
    it('should handle 100 concurrent deployments', async () => {
      const concurrentDeployments = 100;
      const responseTimes: number[] = [];
      let failures = 0;

      const startTime = Date.now();

      // Create deployment requests
      const deploymentPromises = Array(concurrentDeployments).fill(null).map(async (_, index) => {
        const requestStart = Date.now();

        try {
          await deploymentService.deployApplication({
            application: `perf-app-${index}`,
            version: '1.0.0',
            environment: 'dev',
            cloud: 'aws',
            clusterArn: 'arn:aws:eks:us-east-1:123:cluster/perf',
            namespace: 'performance-test',
            imageRegistry: 'test-image:1.0.0',
            containerPort: 8080,
            replicas: 3,
            strategy: 'rolling',
            createdBy: 'perf-test'
          });

          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          failures++;
          responseTimes.push(Date.now() - requestStart);
        }
      });

      // Execute all requests
      await Promise.all(deploymentPromises);

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      // Performance targets
      const targets = {
        averageResponseTime: 500,  // <500ms average
        p95ResponseTime: 1000,     // <1s for 95th percentile
        p99ResponseTime: 2000,     // <2s for 99th percentile
        requestsPerSecond: 50      // >50 req/s
      };

      printMetrics('100 Concurrent Deployments', metrics, targets);

      // Assertions
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(targets.averageResponseTime);
      expect(metrics.p95ResponseTime).toBeLessThan(targets.p95ResponseTime);
      expect(metrics.p99ResponseTime).toBeLessThan(targets.p99ResponseTime);
    }, 60000); // 60 second timeout

    it('should maintain performance under sustained load (5 minutes)', async () => {
      const durationMs = 5 * 60 * 1000; // 5 minutes
      const requestsPerSecond = 10;
      const intervalMs = 1000 / requestsPerSecond;

      const responseTimes: number[] = [];
      let failures = 0;
      let requestCount = 0;

      const startTime = Date.now();
      let running = true;

      // Stop after duration
      setTimeout(() => {
        running = false;
      }, durationMs);

      // Send requests at constant rate
      while (running) {
        const requestStart = Date.now();

        try {
          await deploymentService.deployApplication({
            application: `perf-sustained-${requestCount}`,
            version: '1.0.0',
            environment: 'dev',
            cloud: 'aws',
            clusterArn: 'arn:aws:eks:us-east-1:123:cluster/sustained',
            namespace: 'sustained-test',
            imageRegistry: 'test-image:1.0.0',
            containerPort: 8080,
            replicas: 3,
            strategy: 'rolling',
            createdBy: 'sustained-test'
          });

          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          failures++;
          responseTimes.push(Date.now() - requestStart);
        }

        requestCount++;

        // Wait for next interval
        const elapsed = Date.now() - requestStart;
        const waitTime = Math.max(0, intervalMs - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      const targets = {
        averageResponseTime: 300,
        p95ResponseTime: 800,
        p99ResponseTime: 1500,
        requestsPerSecond: 9 // Allow for some overhead
      };

      printMetrics('Sustained Load (5 min)', metrics, targets);

      // Assertions
      expect(metrics.failedRequests / metrics.totalRequests).toBeLessThan(0.01); // <1% error rate
      expect(metrics.averageResponseTime).toBeLessThan(targets.averageResponseTime);
      expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(targets.requestsPerSecond);
    }, 310000); // 5 minutes + buffer

    it('should handle burst traffic', async () => {
      const burstSize = 200;
      const responseTimes: number[] = [];
      let failures = 0;

      const startTime = Date.now();

      // Send burst of requests
      const promises = Array(burstSize).fill(null).map(async (_, index) => {
        const requestStart = Date.now();

        try {
          await deploymentService.deployApplication({
            application: `perf-burst-${index}`,
            version: '1.0.0',
            environment: 'dev',
            cloud: 'aws',
            clusterArn: 'arn:aws:eks:us-east-1:123:cluster/burst',
            namespace: 'burst-test',
            imageRegistry: 'test-image:1.0.0',
            containerPort: 8080,
            replicas: 3,
            strategy: 'rolling',
            createdBy: 'burst-test'
          });

          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          failures++;
          responseTimes.push(Date.now() - requestStart);
        }
      });

      await Promise.all(promises);

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      const targets = {
        averageResponseTime: 1000,
        p95ResponseTime: 2000,
        p99ResponseTime: 3000
      };

      printMetrics('Burst Traffic (200 requests)', metrics, targets);

      // Should handle burst with acceptable degradation
      expect(metrics.failedRequests / metrics.totalRequests).toBeLessThan(0.05); // <5% error rate
      expect(metrics.p99ResponseTime).toBeLessThan(targets.p99ResponseTime);
    }, 60000);
  });

  describe('Cloud Resource Service - Load Testing', () => {
    it('should handle 50 concurrent VPC creations', async () => {
      const concurrentRequests = 50;
      const responseTimes: number[] = [];
      let failures = 0;

      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(null).map(async (_, index) => {
        const requestStart = Date.now();

        try {
          await cloudService.createVPC({
            name: `perf-vpc-${index}`,
            cloud: 'aws',
            region: 'us-east-1',
            environment: 'dev',
            cidrBlock: `10.${index}.0.0/16`,
            createdBy: 'perf-test'
          });

          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          failures++;
          responseTimes.push(Date.now() - requestStart);
        }
      });

      await Promise.all(promises);

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      const targets = {
        averageResponseTime: 1000,
        p95ResponseTime: 2000,
        p99ResponseTime: 3000
      };

      printMetrics('50 Concurrent VPC Creations', metrics, targets);

      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(targets.averageResponseTime);
    }, 60000);
  });

  describe('Agent Orchestration - Load Testing', () => {
    it('should queue 500 tasks efficiently', async () => {
      const taskCount = 500;
      const responseTimes: number[] = [];
      let failures = 0;

      const startTime = Date.now();

      const promises = Array(taskCount).fill(null).map(async (_, index) => {
        const requestStart = Date.now();

        try {
          await orchestrationService.queueTask({
            agentId: 'security_agent',
            taskType: `perf-scan-${index}`,
            taskParams: { target: `app-${index}` },
            priority: 'NORMAL'
          });

          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          failures++;
          responseTimes.push(Date.now() - requestStart);
        }
      });

      await Promise.all(promises);

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      const targets = {
        averageResponseTime: 100,  // Queue operations should be very fast
        p95ResponseTime: 200,
        p99ResponseTime: 500,
        requestsPerSecond: 100
      };

      printMetrics('500 Task Queue Operations', metrics, targets);

      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(targets.averageResponseTime);
      expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(targets.requestsPerSecond);
    }, 60000);
  });

  describe('Database Performance', () => {
    it('should handle high read throughput', async () => {
      // First, create some test data
      await deploymentService.deployApplication({
        application: 'perf-read-test',
        version: '1.0.0',
        environment: 'dev',
        cloud: 'aws',
        clusterArn: 'arn:aws:eks:us-east-1:123:cluster/read',
        namespace: 'test',
        imageRegistry: 'test-image:1.0.0',
        containerPort: 8080,
        replicas: 3,
        strategy: 'rolling',
        createdBy: 'perf-test'
      });

      const readCount = 1000;
      const responseTimes: number[] = [];
      let failures = 0;

      const startTime = Date.now();

      const promises = Array(readCount).fill(null).map(async () => {
        const requestStart = Date.now();

        try {
          await deploymentService.listDeployments();
          responseTimes.push(Date.now() - requestStart);
        } catch (error) {
          failures++;
          responseTimes.push(Date.now() - requestStart);
        }
      });

      await Promise.all(promises);

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      const targets = {
        averageResponseTime: 50,   // Database reads should be very fast
        p95ResponseTime: 100,
        p99ResponseTime: 200,
        requestsPerSecond: 200
      };

      printMetrics('1000 Database Reads', metrics, targets);

      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(targets.averageResponseTime);
    }, 60000);
  });

  describe('Performance Under Resource Constraints', () => {
    it('should maintain acceptable performance with limited resources', async () => {
      // Simulate resource constraints by running multiple services simultaneously
      const deploymentRequests = 50;
      const vpcRequests = 20;
      const taskRequests = 100;

      const responseTimes: number[] = [];
      let failures = 0;

      const startTime = Date.now();

      const allPromises = [
        ...Array(deploymentRequests).fill(null).map(async (_, i) => {
          const requestStart = Date.now();
          try {
            await deploymentService.deployApplication({
              application: `perf-constrained-${i}`,
              version: '1.0.0',
              environment: 'dev',
              cloud: 'aws',
              clusterArn: 'arn:aws:eks:us-east-1:123:cluster/test',
              namespace: 'test',
              imageRegistry: 'test:1.0.0',
              containerPort: 8080,
              replicas: 3,
              strategy: 'rolling',
              createdBy: 'perf-test'
            });
            responseTimes.push(Date.now() - requestStart);
          } catch {
            failures++;
            responseTimes.push(Date.now() - requestStart);
          }
        }),
        ...Array(vpcRequests).fill(null).map(async (_, i) => {
          const requestStart = Date.now();
          try {
            await cloudService.createVPC({
              name: `perf-constrained-vpc-${i}`,
              cloud: 'aws',
              region: 'us-east-1',
              environment: 'dev',
              cidrBlock: `10.${i}.0.0/16`,
              createdBy: 'perf-test'
            });
            responseTimes.push(Date.now() - requestStart);
          } catch {
            failures++;
            responseTimes.push(Date.now() - requestStart);
          }
        }),
        ...Array(taskRequests).fill(null).map(async (_, i) => {
          const requestStart = Date.now();
          try {
            await orchestrationService.queueTask({
              agentId: 'developer_agent',
              taskType: `perf-constrained-task-${i}`,
              taskParams: {},
              priority: 'NORMAL'
            });
            responseTimes.push(Date.now() - requestStart);
          } catch {
            failures++;
            responseTimes.push(Date.now() - requestStart);
          }
        })
      ];

      await Promise.all(allPromises);

      const totalDuration = Date.now() - startTime;
      const metrics = calculateMetrics(responseTimes, totalDuration, failures);

      const targets = {
        averageResponseTime: 1500,
        p95ResponseTime: 3000,
        p99ResponseTime: 5000
      };

      printMetrics('Mixed Load (Resource Constrained)', metrics, targets);

      // Under constraints, allow higher error rate
      expect(metrics.failedRequests / metrics.totalRequests).toBeLessThan(0.10); // <10% error rate
      expect(metrics.p99ResponseTime).toBeLessThan(targets.p99ResponseTime);
    }, 120000); // 2 minute timeout
  });
});
