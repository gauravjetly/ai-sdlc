# AI-SDLC Platform - Test Suite Documentation

## Overview

Comprehensive test suite for the AI-SDLC multi-cloud platform covering integration tests, E2E workflows, API tests, and performance/load tests.

## Test Structure

```
tests/
├── integration/              # Integration tests (service-level)
│   ├── deployment.service.test.ts
│   ├── cloud-resource.service.test.ts
│   ├── agent-orchestration.service.test.ts
│   ├── cost-analysis.service.test.ts
│   └── security-scan.service.test.ts
├── e2e/                      # End-to-end workflow tests
│   ├── deployment-workflow.test.ts
│   ├── environment-promotion.test.ts
│   ├── disaster-recovery.test.ts
│   └── self-healing.test.ts
├── api/                      # API endpoint tests
│   ├── deployments.api.test.ts
│   ├── infrastructure.api.test.ts
│   ├── security.api.test.ts
│   ├── costs.api.test.ts
│   ├── observability.api.test.ts
│   ├── testing.api.test.ts
│   ├── releases.api.test.ts
│   └── architecture.api.test.ts
├── load/                     # Performance & load tests
│   ├── deployment-performance.test.ts
│   ├── api-load.test.ts
│   └── queue-performance.test.ts
├── unit/                     # Unit tests (if needed)
│   └── utils/
└── README.md                 # This file
```

## Test Categories

### 1. Integration Tests (20% of test pyramid)

Tests that verify service interactions with mocked external dependencies (K8s, AWS, Redis).

**Coverage:**
- DeploymentService with mocked K8s client
- CloudResourceService with mocked AWS SDK
- AgentOrchestrationService with test Redis/BullMQ
- CostAnalysisService with mocked AWS Cost Explorer
- SecurityScanService with test containers

**Run:**
```bash
npm run test:integration
```

### 2. End-to-End Tests (10% of test pyramid)

Tests that verify complete user journeys from start to finish.

**Scenarios:**
- Complete deployment workflow (infrastructure → deployment)
- Environment promotion (dev → uat → prod)
- Scaling under load
- Disaster recovery
- Multi-cloud deployment
- Self-healing scenarios

**Run:**
```bash
npm run test:e2e
```

### 3. API Tests (All 102 endpoints)

Tests for all REST API endpoints organized by domain.

**Endpoints Tested:**
- Deployments (15 endpoints)
- Infrastructure (15 endpoints)
- Security (15 endpoints)
- Costs (12 endpoints)
- Observability (15 endpoints)
- Testing (10 endpoints)
- Releases (10 endpoints)
- Architecture (10 endpoints)

**Coverage:**
- Request validation
- Response format
- Error handling
- Authentication/Authorization
- Rate limiting
- CORS

**Run:**
```bash
npm run test:api
```

### 4. Load/Performance Tests

Tests system performance under various load conditions.

**Scenarios:**
- Concurrent deployments (100 simultaneous)
- Sustained load (5 minutes at 10 req/s)
- Burst traffic (200 requests instantly)
- Database read throughput (1000 reads)
- Queue operations (500 tasks)
- Resource-constrained performance

**Metrics Measured:**
- Response times (avg, p50, p95, p99)
- Throughput (requests per second)
- Error rates
- Resource utilization

**Run:**
```bash
npm run test:load
```

## Performance Targets

### API Response Times

| Metric | Target | Description |
|--------|--------|-------------|
| p50 | <50ms | 50% of requests |
| p95 | <200ms | 95% of requests |
| p99 | <500ms | 99% of requests |
| Throughput | >1000 rps | Requests per second |

### Service Operations

| Operation | Target | Description |
|-----------|--------|-------------|
| Queue Task | <100ms | Add task to BullMQ |
| Database Read | <50ms | Simple queries |
| Database Write | <100ms | Insert/Update |
| K8s API Call | <200ms | Kubernetes operations |
| AWS API Call | <1000ms | Cloud provider operations |

### Load Handling

| Test | Target | Description |
|------|--------|-------------|
| Concurrent Deployments | 100 | Simultaneous deployments |
| Sustained Load | 10 req/s for 5 min | Consistent traffic |
| Burst Traffic | 200 requests | Spike handling |
| Error Rate | <1% | Under normal load |
| Error Rate (Burst) | <5% | Under burst load |

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# API tests
npm run test:api

# Load tests
npm run test:load

# Unit tests
npm run test:unit
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Configuration

### Jest Configuration
See `jest.config.js` for:
- Test environment (Node.js)
- Test patterns
- Coverage thresholds
- Module mappings
- TypeScript support

### Environment Variables
Required for tests:
```env
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost:5432/platform_test
REDIS_URL=redis://localhost:6379
AWS_REGION=us-east-1
```

### Test Database Setup
```bash
# Create test database
createdb platform_test

# Run migrations
npx prisma migrate deploy

# Seed test data (optional)
npm run seed:test
```

## Writing Tests

### Test Structure (AAA Pattern)

```typescript
describe('Feature', () => {
  it('should do something when condition', async () => {
    // Arrange - Setup test data and mocks
    const input = { /* test data */ };
    mockService.method.mockResolvedValue(expectedOutput);

    // Act - Execute the code under test
    const result = await serviceUnderTest.method(input);

    // Assert - Verify expected outcomes
    expect(result).toHaveProperty('id');
    expect(result.status).toBe('success');
    expect(mockService.method).toHaveBeenCalledWith(input);
  });
});
```

### Integration Test Template

```typescript
describe('ServiceName - Integration Tests', () => {
  let service: ServiceType;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    service = new ServiceType();
    setupMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // Tests here
});
```

### E2E Test Template

```typescript
describe('E2E: User Journey Name', () => {
  it('should complete full workflow', async () => {
    /**
     * USER STORY: As a [role], I want to [goal]
     * so that [benefit]
     */

    // STEP 1: Initial action
    console.log('Step 1: Doing something...');
    const result1 = await service.action1();
    expect(result1).toBeTruthy();

    // STEP 2: Dependent action
    console.log('Step 2: Doing next thing...');
    const result2 = await service.action2(result1.id);
    expect(result2.status).toBe('success');

    // STEP 3: Verification
    console.log('Step 3: Verifying...');
    const verification = await service.verify();
    expect(verification).toMatchObject(expected);

    console.log('✓ Workflow complete');
  });
});
```

### API Test Template

```typescript
describe('API: /api/v1/resource', () => {
  let app: Express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/v1/resource', () => {
    it('should create resource with valid request', async () => {
      const response = await request(app)
        .post('/api/v1/resource')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should reject invalid request', async () => {
      const response = await request(app)
        .post('/api/v1/resource')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

## Test Data Management

### Using Factories
```typescript
// test-helpers/factories.ts
export const DeploymentFactory = {
  create: (overrides = {}) => ({
    application: 'test-app',
    version: '1.0.0',
    environment: 'dev',
    replicas: 3,
    ...overrides
  })
};

// In tests
const deployment = DeploymentFactory.create({
  environment: 'prod',
  replicas: 5
});
```

### Cleanup Strategy
```typescript
afterEach(async () => {
  // Clean up test data
  await prisma.deployment.deleteMany({
    where: { application: { contains: 'test-' } }
  });
});
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- tests/integration/deployment.service.test.ts
```

### Run Specific Test
```bash
npm test -- -t "should create deployment"
```

### Debug with VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

### Enable Verbose Logging
```bash
LOG_LEVEL=debug npm test
```

## Test Coverage Requirements

### Coverage Thresholds
```javascript
{
  global: {
    branches: 70,
    functions: 75,
    lines: 80,
    statements: 80
  }
}
```

### Generating Coverage Report
```bash
npm run test:coverage
```

View HTML report:
```bash
open coverage/lcov-report/index.html
```

## Best Practices

### DO
- ✓ Write descriptive test names
- ✓ Use AAA pattern (Arrange, Act, Assert)
- ✓ Clean up test data after each test
- ✓ Mock external dependencies
- ✓ Test error scenarios
- ✓ Use meaningful assertions
- ✓ Keep tests fast (<100ms per test)
- ✓ Make tests deterministic

### DON'T
- ✗ Test implementation details
- ✗ Create interdependent tests
- ✗ Use production data
- ✗ Skip cleanup
- ✗ Use real external APIs
- ✗ Hardcode test data
- ✗ Write flaky tests
- ✗ Test multiple things in one test

## Common Issues

### Issue: Tests fail intermittently
**Solution:** Check for race conditions, use proper async/await, add explicit waits

### Issue: Database conflicts
**Solution:** Use unique test data identifiers, clean up properly

### Issue: Memory leaks
**Solution:** Close connections, clear intervals/timeouts, cleanup resources

### Issue: Slow tests
**Solution:** Mock external services, use test database, parallelize where possible

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

## Support

For issues or questions:
- Check existing test examples
- Review error messages carefully
- Check test logs: `npm test -- --verbose`
- Open issue on GitHub

---

**Last Updated:** 2026-01-30
**Test Coverage:** Target 80%+
**Total Tests:** 150+ tests covering 102 API endpoints
