# CRUD API Template

## Overview
RESTful API with standard Create, Read, Update, Delete operations following best practices.

## Quick Start
```bash
/sdlc-start Build CRUD API for [entity] using template: templates/crud-api
```

## Features Included

### Core CRUD Operations
- Create with validation
- Read (single and list with pagination)
- Update (full and partial)
- Delete (soft delete option)

### API Features
- RESTful endpoint design
- Request validation
- Error handling
- Pagination and filtering
- Sorting
- Search/filtering

### Quality Features
- OpenAPI documentation
- Input sanitization
- Audit logging
- Response caching

---

## Pre-defined Requirements

### Functional Requirements

```markdown
## FR-CRUD-001: Create Entity
The API shall create new entities with validated data.

**Acceptance Criteria:**
- Given valid entity data
- When POST /entities is called
- Then entity is created and 201 returned with entity data

## FR-CRUD-002: Read Single Entity
The API shall retrieve a single entity by ID.

**Acceptance Criteria:**
- Given an existing entity ID
- When GET /entities/{id} is called
- Then entity data is returned with 200

## FR-CRUD-003: List Entities
The API shall list entities with pagination.

**Acceptance Criteria:**
- Given entities exist
- When GET /entities is called
- Then paginated list returned with metadata

## FR-CRUD-004: Update Entity
The API shall update existing entities.

**Acceptance Criteria:**
- Given valid update data and existing entity
- When PUT/PATCH /entities/{id} is called
- Then entity is updated and returned

## FR-CRUD-005: Delete Entity
The API shall soft-delete entities.

**Acceptance Criteria:**
- Given an existing entity ID
- When DELETE /entities/{id} is called
- Then entity is marked deleted and 204 returned

## FR-CRUD-006: Search and Filter
The API shall support filtering and search.

**Acceptance Criteria:**
- Given filter parameters
- When GET /entities?filter=value is called
- Then filtered results are returned
```

### Non-Functional Requirements

```markdown
## NFR-CRUD-001: Performance
- List endpoint < 200ms for 100 items
- Single entity < 50ms
- Support 100 concurrent requests

## NFR-CRUD-002: Reliability
- Idempotent operations where applicable
- Proper error responses
- Transaction support for writes
```

---

## Suggested Architecture

### Project Structure
```
src/
├── entities/
│   ├── controllers/
│   │   └── entity.controller.ts
│   ├── services/
│   │   └── entity.service.ts
│   ├── repositories/
│   │   └── entity.repository.ts
│   ├── dto/
│   │   ├── create-entity.dto.ts
│   │   ├── update-entity.dto.ts
│   │   └── entity-query.dto.ts
│   ├── entities/
│   │   └── entity.entity.ts
│   └── entity.module.ts
├── common/
│   ├── dto/
│   │   └── pagination.dto.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interceptors/
│       └── transform.interceptor.ts
└── app.module.ts
```

### API Endpoints
```
POST   /entities           - Create entity
GET    /entities           - List entities (paginated)
GET    /entities/:id       - Get single entity
PUT    /entities/:id       - Full update
PATCH  /entities/:id       - Partial update
DELETE /entities/:id       - Soft delete
```

### Request/Response Formats

**Create Request:**
```json
POST /entities
{
  "name": "Entity Name",
  "description": "Description",
  "status": "active"
}
```

**List Response:**
```json
GET /entities?page=1&limit=20
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERR_VALIDATION_FAILED",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "Name is required" }
    ],
    "traceId": "abc123",
    "timestamp": "2026-01-20T10:00:00Z"
  }
}
```

### Database Schema
```sql
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_entities_status ON entities(status);
CREATE INDEX idx_entities_deleted ON entities(deleted_at);
```

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Entity doesn't exist |
| 409 | Conflict | Duplicate/version conflict |
| 422 | Unprocessable | Validation failed |
| 500 | Server Error | Unexpected error |

---

## Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| page | Page number | ?page=2 |
| limit | Items per page | ?limit=50 |
| sort | Sort field | ?sort=name |
| order | Sort direction | ?order=desc |
| search | Text search | ?search=keyword |
| filter[field] | Field filter | ?filter[status]=active |

---

## Validation Rules

```typescript
// Example DTO with validation
class CreateEntityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: string;
}
```

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Requirements | 30 min |
| Architecture | 1 hour |
| Development | 4-6 hours |
| Security Review | 1 hour |
| Testing | 2-3 hours |
| Deployment | 30 min |
| **Total** | **9-12 hours** |

---

## Usage

```bash
/sdlc-start Build CRUD API for products with categories, following templates/crud-api
```
