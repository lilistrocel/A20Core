# API Standards & Conventions

## Overview
This document defines the API standards and conventions for all micro-apps in the A20 Core ecosystem.

## 1. API Versioning

### URL-Based Versioning
- All APIs must include version in the URL path
- Format: `/api/v{major}/resource`
- Example: `/api/v1/production-orders`

### Version Numbering
- **Major version (v1, v2)**: Breaking changes
- **Minor version**: Backward-compatible features (tracked in headers)
- **Patch version**: Bug fixes (tracked in headers)

### Version Headers
```
API-Version: 1.2.3
Deprecated-In-Version: 2.0.0
Sunset-Date: 2025-12-31
```

## 2. Request/Response Format

### Standard Response Structure
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "uuid",
    "version": "1.0.0"
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "uuid"
  }
}
```

### Standard HTTP Status Codes
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service down

## 3. Naming Conventions

### Resource Names
- Use **plural nouns** for collections: `/api/v1/orders`
- Use **kebab-case** for multi-word resources: `/api/v1/production-orders`
- Nested resources: `/api/v1/orders/{orderId}/items`

### Field Names
- Use **snake_case** for JSON fields: `created_at`, `user_id`
- Use consistent naming across all apps
- Boolean fields: prefix with `is_`, `has_`, `can_`: `is_active`, `has_permission`

### Query Parameters
- Use **snake_case**: `?sort_by=created_at&order=desc`
- Standard pagination: `?page=1&limit=50`
- Filtering: `?status=active&created_after=2024-01-01`
- Searching: `?search=keyword`
- Sorting: `?sort=name:asc,created_at:desc`

## 4. Authentication & Authorization

### Authentication Methods

#### API Key (App-to-Hub)
```
Authorization: ApiKey {your-api-key}
```

#### JWT Token (User)
```
Authorization: Bearer {jwt-token}
```

### Permission Format
- Format: `{resource}.{action}`
- Examples: `orders.read`, `orders.write`, `orders.admin`

## 5. Data Types & Formats

### Standard Data Types
- **Dates/Times**: ISO 8601 format `2024-01-01T12:00:00Z` (UTC)
- **UUIDs**: Standard UUID v4 format
- **Currency**: Decimal with 2 decimal places, include currency code
  ```json
  {
    "amount": 99.99,
    "currency": "USD"
  }
  ```
- **Phone Numbers**: E.164 format `+1234567890`
- **Email**: RFC 5322 compliant

### Measurement Units
Always include unit specification:
```json
{
  "weight": 10.5,
  "weight_unit": "kg",
  "length": 100,
  "length_unit": "cm"
}
```

## 6. Pagination

### Offset-Based Pagination (Default)
Request:
```
GET /api/v1/orders?page=2&limit=50
```

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 150,
    "total_pages": 3,
    "has_next": true,
    "has_prev": true
  }
}
```

### Cursor-Based Pagination (For large datasets)
Request:
```
GET /api/v1/orders?cursor=abc123&limit=50
```

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "next_cursor": "def456",
    "prev_cursor": "xyz789",
    "limit": 50
  }
}
```

## 7. Filtering & Sorting

### Filtering
```
GET /api/v1/orders?status=active&created_after=2024-01-01&amount_gt=100
```

Standard operators:
- `{field}` - Exact match
- `{field}_gt` - Greater than
- `{field}_gte` - Greater than or equal
- `{field}_lt` - Less than
- `{field}_lte` - Less than or equal
- `{field}_in` - In array (comma-separated)
- `{field}_like` - Pattern matching

### Sorting
```
GET /api/v1/orders?sort=created_at:desc,amount:asc
```

## 8. Rate Limiting

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 60
  }
}
```

## 9. Idempotency

### Idempotent Operations
- All PUT, PATCH, DELETE operations must be idempotent
- POST operations should support idempotency keys

### Idempotency Key Header
```
Idempotency-Key: {unique-key}
```

## 10. Webhooks

### Webhook Event Format
```json
{
  "event_id": "uuid",
  "event_type": "order.created",
  "source_app": "production-manager",
  "timestamp": "2024-01-01T12:00:00Z",
  "payload": {
    "order_id": "uuid",
    "status": "created"
  }
}
```

### Webhook Headers
```
X-Hub-Event-ID: uuid
X-Hub-Event-Type: order.created
X-Hub-Signature: sha256=...
X-Hub-Delivery: uuid
```

## 11. CORS

### Allowed Headers
- `Content-Type`
- `Authorization`
- `X-Request-ID`
- `X-Idempotency-Key`

### Allowed Methods
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

## 12. Request Tracing

### Request ID Header
```
X-Request-ID: {uuid}
```
- Include in all requests for tracing
- Return in response headers and error responses

## 13. Health & Status Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "external_api": "healthy"
  }
}
```

### Communication Sheet
```
GET /api/communication-sheet
```

Returns the app's communication sheet (schema definition).

## 14. Deprecation Policy

### Deprecation Notice
- Minimum 90 days notice before deprecation
- Include deprecation headers
- Document in changelog

### Deprecation Headers
```
Deprecated: true
Sunset: Wed, 31 Dec 2025 23:59:59 GMT
Link: <https://docs.example.com/migration>; rel="deprecation"
```

## 15. Security Best Practices

- Always use HTTPS in production
- Implement rate limiting
- Validate all input data
- Sanitize output data
- Use parameterized queries
- Implement CSRF protection
- Set security headers (via Helmet.js)
- Log all authentication events
- Encrypt sensitive data at rest

## 16. Performance Guidelines

- Implement caching headers: `Cache-Control`, `ETag`
- Support compression: `Accept-Encoding: gzip`
- Use pagination for large datasets
- Implement field selection: `?fields=id,name,email`
- Support partial responses
- Optimize database queries
- Use connection pooling
