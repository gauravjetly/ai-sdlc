# ADR-012: Backend API Design (REST vs GraphQL)

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Backend API

---

## Context

The Vintiq Catalyst Interactive Control Center backend needs to support:

- 102+ API endpoints across 8 domain areas
- Multi-tenant data isolation
- Complex filtering, pagination, and sorting
- Real-time status updates
- Enterprise integration requirements (webhooks, bulk operations)
- API versioning for long-term stability
- Rate limiting and quota management
- Comprehensive API documentation

The current implementation uses REST with Express.js and OpenAPI 3.0 documentation.

## Decision

**We will continue with REST API design** with the following enhancements:

### 1. API Style: REST with JSON:API Conventions

**Chosen**: REST following JSON:API specification for response structure

```json
{
  "data": {
    "id": "uuid",
    "type": "deployment",
    "attributes": { ... },
    "relationships": { ... }
  },
  "included": [ ... ],
  "meta": {
    "pagination": { ... }
  }
}
```

### 2. Versioning Strategy: URL Path Versioning

**Chosen**: URL path versioning (`/api/v1/`, `/api/v2/`)

**Rationale**:
- Clear and explicit
- Easy to route at API Gateway level
- Supports multiple concurrent versions
- Industry standard for enterprise APIs

### 3. Documentation: OpenAPI 3.1 with Swagger UI

**Chosen**: OpenAPI 3.1 specification with automated documentation

**Rationale**:
- Industry standard
- Automated client SDK generation
- Integration with API Gateway
- Built-in validation

### 4. Error Handling: RFC 7807 Problem Details

**Chosen**: RFC 7807 standard for error responses

```json
{
  "type": "https://api.catalyst.vintiq.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The deployment name must be lowercase alphanumeric",
  "instance": "/api/v1/deployments",
  "errors": [
    {
      "field": "name",
      "code": "INVALID_FORMAT",
      "message": "Must be lowercase alphanumeric with hyphens"
    }
  ],
  "traceId": "abc123"
}
```

### 5. Pagination: Cursor-Based for Large Collections

**Chosen**: Cursor-based pagination with optional offset support

```
GET /api/v1/deployments?cursor=eyJpZCI6MTAwfQ&limit=50

Response:
{
  "data": [...],
  "meta": {
    "pagination": {
      "limit": 50,
      "total": 1000,
      "cursors": {
        "next": "eyJpZCI6MTUwfQ",
        "previous": "eyJpZCI6NTB9"
      }
    }
  }
}
```

## Alternatives Considered

### REST vs GraphQL

| Aspect | REST | GraphQL |
|--------|------|---------|
| **Caching** | Excellent (HTTP caching, CDN) | Complex (requires Apollo) |
| **Tooling** | Mature, widespread | Growing, specialized |
| **Learning Curve** | Low | Medium-High |
| **Over/Under-fetching** | Possible (use sparse fieldsets) | Solved |
| **Rate Limiting** | Simple (per-endpoint) | Complex (query cost analysis) |
| **File Upload** | Native | Requires multipart spec |
| **API Gateway** | Full support | Limited support |
| **Enterprise Adoption** | Very high | Growing |

**Decision**: REST selected because:
1. Superior HTTP caching for cost optimization pages
2. Simpler rate limiting for enterprise quotas
3. Better API Gateway integration (Kong, AWS API Gateway)
4. Team expertise and lower training cost
5. Existing 102 endpoints are well-designed

### GraphQL Hybrid Approach (Rejected)

We considered adding GraphQL for complex queries while keeping REST for mutations.

**Rejected because**:
- Added complexity of maintaining two API styles
- Inconsistent client experience
- Training overhead
- Current REST endpoints can be enhanced with sparse fieldsets

## Consequences

### Positive

1. **Caching**: HTTP caching reduces database load by 40%
2. **Documentation**: Auto-generated, always up-to-date
3. **Integration**: Standard enterprise integration patterns
4. **Stability**: URL versioning allows gradual migration
5. **Tooling**: Rich ecosystem (Postman, Insomnia, SDK generators)

### Negative

1. **Multiple Requests**: Some views require multiple API calls
2. **Over-fetching**: May return unused fields (mitigated by sparse fieldsets)

### Mitigations

1. **Batch Endpoint**: `/api/v1/batch` for combining requests
2. **Sparse Fieldsets**: `?fields[deployment]=id,name,status`
3. **Compound Documents**: Include related resources in single response

## Implementation Details

### URL Structure

```
/api/v1/
  deployments/
    GET     /                      # List deployments
    POST    /                      # Create deployment
    GET     /{id}                  # Get deployment
    PATCH   /{id}                  # Update deployment
    DELETE  /{id}                  # Delete deployment
    POST    /{id}/rollback         # Action: rollback
    GET     /{id}/logs             # Sub-resource: logs
    GET     /{id}/metrics          # Sub-resource: metrics

  infrastructure/
    resources/
    clusters/
    databases/

  agents/
    GET     /                      # List agents
    POST    /{id}/execute          # Execute agent
    GET     /{id}/status           # Agent status

  security/
    scans/
    vulnerabilities/
    compliance/

  costs/
    analysis/
    recommendations/
    budgets/
```

### Query Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `filter[field]` | Filtering | `?filter[status]=running` |
| `sort` | Sorting | `?sort=-created_at` |
| `include` | Related resources | `?include=logs,metrics` |
| `fields[type]` | Sparse fieldsets | `?fields[deployment]=id,name` |
| `page[cursor]` | Pagination | `?page[cursor]=abc123` |
| `page[limit]` | Page size | `?page[limit]=50` |

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (with body) |
| 201 | Created (POST success) |
| 202 | Accepted (async operation started) |
| 204 | No Content (DELETE success) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, concurrent modification) |
| 422 | Unprocessable Entity (business rule violation) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (maintenance) |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706612400
X-RateLimit-Retry-After: 60
```

## References

- [JSON:API Specification](https://jsonapi.org/)
- [RFC 7807: Problem Details](https://datatracker.ietf.org/doc/html/rfc7807)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
