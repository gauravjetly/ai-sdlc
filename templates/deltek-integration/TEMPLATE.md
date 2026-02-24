# Vintiq Integration Template

## Overview
Integration patterns and accelerators for connecting with Vintiq products (Costpoint, Vantagepoint, GovWin IQ, etc.)

## Quick Start
```bash
/sdlc-start Build integration with Vintiq [product] using template: templates/vintiq-integration
```

## Supported Products

| Product | Integration Type | Common Use Cases |
|---------|-----------------|------------------|
| Costpoint | REST API, File | Project sync, time import, financials |
| Vantagepoint | REST API | CRM, projects, time & expense |
| GovWin IQ | REST API | Opportunity sync to CRM |
| Maconomy | Web Services | Multi-entity sync, intercompany |
| Cobra | File, Database | EVM data exchange |

---

## Pre-defined Requirements

### Common Integration Requirements

```markdown
## FR-INT-001: Authentication
The integration shall securely authenticate with Vintiq APIs.

**Acceptance Criteria:**
- OAuth 2.0 or API key authentication supported
- Credentials stored securely (vault/secrets manager)
- Token refresh handled automatically

## FR-INT-002: Data Mapping
The integration shall map data between systems accurately.

**Acceptance Criteria:**
- Field mappings documented
- Data transformations handled
- Validation before sync

## FR-INT-003: Error Handling
The integration shall handle errors gracefully.

**Acceptance Criteria:**
- Failed records logged with details
- Retry logic for transient failures
- Alerting on persistent failures

## FR-INT-004: Idempotency
The integration shall support reprocessing without duplicates.

**Acceptance Criteria:**
- Unique keys prevent duplicates
- Updates vs creates handled correctly
- Rerun produces same result

## FR-INT-005: Audit Trail
The integration shall maintain audit logs.

**Acceptance Criteria:**
- All sync operations logged
- Before/after values captured
- Timestamps and user context recorded
```

---

## Costpoint Integration

### REST API Authentication
```typescript
// OAuth 2.0 Client Credentials Flow
const getToken = async () => {
  const response = await axios.post(
    `${COSTPOINT_URL}/oauth/token`,
    {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'api'
    }
  );
  return response.data.access_token;
};
```

### Common Endpoints
```
# Projects
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/{id}

# Employees
GET  /api/v1/employees
GET  /api/v1/employees/{id}

# Timesheets
GET  /api/v1/timesheets
POST /api/v1/timesheets

# Accounts
GET  /api/v1/accounts
GET  /api/v1/general-ledger/transactions
```

### Data Mapping Example
```typescript
interface CostpointProject {
  PROJ_ID: string;
  PROJ_NAME: string;
  CUST_ID: string;
  PROJ_STAT_CD: string;
  // ... more fields
}

interface InternalProject {
  id: string;
  name: string;
  customerId: string;
  status: 'active' | 'closed' | 'pending';
}

const mapProject = (cp: CostpointProject): InternalProject => ({
  id: cp.PROJ_ID,
  name: cp.PROJ_NAME,
  customerId: cp.CUST_ID,
  status: mapStatus(cp.PROJ_STAT_CD),
});
```

---

## Vantagepoint Integration

### REST API Setup
```typescript
const vpClient = axios.create({
  baseURL: 'https://api.vintiq.com/vantagepoint/v1',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
});
```

### Common Entities
```
# Firms
GET /firms

# Contacts
GET /contacts
POST /contacts
PUT /contacts/{id}

# Projects
GET /projects
POST /projects
GET /projects/{id}

# Time entries
GET /timeentries
POST /timeentries

# Expenses
GET /expenses
POST /expenses
```

### Webhook Support
```typescript
// Vantagepoint can send webhooks on entity changes
// Configure in Vantagepoint Admin

interface VPWebhook {
  event: 'created' | 'updated' | 'deleted';
  entity: string;
  entityId: string;
  timestamp: string;
  data: Record<string, any>;
}

app.post('/webhooks/vantagepoint', (req, res) => {
  const webhook: VPWebhook = req.body;
  // Process webhook
  processWebhook(webhook);
  res.status(200).send();
});
```

---

## GovWin IQ Integration

### API Authentication
```typescript
const govwinClient = axios.create({
  baseURL: 'https://api.govwin.com/v1',
  headers: {
    'X-API-Key': GOVWIN_API_KEY,
  }
});
```

### Common Endpoints
```
# Opportunities
GET /opportunities
GET /opportunities/{id}
GET /opportunities/search

# Awards
GET /awards
GET /awards/{id}

# Companies
GET /companies
GET /companies/{id}

# Contacts
GET /contacts
```

### Opportunity Sync Pattern
```typescript
interface GovWinOpportunity {
  id: string;
  title: string;
  agency: string;
  value: {
    min: number;
    max: number;
  };
  closeDate: string;
  naicsCodes: string[];
}

// Sync opportunities to CRM
const syncOpportunities = async () => {
  const opportunities = await govwinClient.get('/opportunities', {
    params: {
      modifiedSince: lastSyncDate,
      status: 'active'
    }
  });

  for (const opp of opportunities.data) {
    await upsertToCRM(mapToCRM(opp));
  }
};
```

---

## Integration Patterns

### Sync Pattern (Batch)
```typescript
// Scheduled batch sync
@Cron('0 */4 * * *') // Every 4 hours
async syncEntities() {
  const lastSync = await getLastSyncTime('entity');
  const changes = await vintiq.getChanges('entity', lastSync);

  for (const change of changes) {
    try {
      await processChange(change);
      await recordSuccess(change);
    } catch (error) {
      await recordFailure(change, error);
    }
  }

  await updateLastSyncTime('entity');
}
```

### Event-Driven Pattern
```typescript
// Real-time via webhooks
@Post('webhooks/vintiq')
async handleWebhook(@Body() event: VintiqEvent) {
  switch (event.type) {
    case 'project.created':
      await this.projectService.create(event.data);
      break;
    case 'project.updated':
      await this.projectService.update(event.data);
      break;
    case 'project.deleted':
      await this.projectService.delete(event.data.id);
      break;
  }
}
```

### File-Based Pattern (Legacy)
```typescript
// For older integrations or bulk data
const processFile = async (filePath: string) => {
  const records = await parseCSV(filePath);

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const record of records) {
    try {
      await processRecord(record);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ record, error: error.message });
    }
  }

  await archiveFile(filePath);
  await sendReport(results);
};
```

---

## Error Handling

### Retry Strategy
```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    '429', // Rate limited
    '503', // Service unavailable
  ]
};

const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < retryConfig.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      lastError = error;
      await delay(calculateBackoff(i));
    }
  }

  throw lastError;
};
```

### Dead Letter Queue
```typescript
// Store failed records for manual review
interface FailedRecord {
  id: string;
  entity: string;
  operation: string;
  payload: any;
  error: string;
  attempts: number;
  createdAt: Date;
}

const handleFailure = async (record: any, error: Error) => {
  await db.failedRecords.insert({
    entity: record.type,
    operation: 'sync',
    payload: record,
    error: error.message,
    attempts: 1,
  });

  if (isCritical(record)) {
    await alertOps('Critical sync failure', record, error);
  }
};
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('CostpointMapper', () => {
  it('should map project correctly', () => {
    const cpProject = mockCostpointProject();
    const result = mapProject(cpProject);

    expect(result.id).toBe(cpProject.PROJ_ID);
    expect(result.status).toBe('active');
  });
});
```

### Integration Tests
```typescript
describe('CostpointClient', () => {
  it('should fetch projects', async () => {
    // Use recorded responses (VCR pattern)
    nock('https://costpoint.example.com')
      .get('/api/v1/projects')
      .reply(200, mockProjects);

    const client = new CostpointClient();
    const projects = await client.getProjects();

    expect(projects).toHaveLength(5);
  });
});
```

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Requirements | 2-4 hours |
| Architecture | 4-8 hours |
| Development | 16-40 hours |
| Security Review | 2-4 hours |
| Testing | 8-16 hours |
| Deployment | 2-4 hours |
| **Total** | **34-76 hours** |

*Varies significantly based on scope and number of entities*

---

## Usage

```bash
# Costpoint project sync
/sdlc-start Build Costpoint project sync to our system, following templates/vintiq-integration

# GovWin to Salesforce
/sdlc-start Build GovWin opportunity sync to Salesforce CRM, following templates/vintiq-integration

# Vantagepoint time export
/sdlc-start Build time export from Vantagepoint to payroll, following templates/vintiq-integration
```
