# Data Standards & Conventions

## Overview
This document defines data standards, formats, and conventions for the A20 Core ecosystem.

## 1. Data Type Standards

### Dates and Times
- **Format**: ISO 8601 (RFC 3339)
- **Timezone**: Always UTC
- **Storage**: TIMESTAMP WITH TIME ZONE in PostgreSQL
- **API Format**: `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples**:
```json
{
  "created_at": "2024-01-15T14:30:00.000Z",
  "scheduled_date": "2024-01-20T00:00:00.000Z"
}
```

### Currencies
- **Amount**: Decimal with 2+ decimal places
- **Currency Code**: ISO 4217 (3-letter codes)
- **Always include both** amount and currency

**Examples**:
```json
{
  "price": {
    "amount": 1299.99,
    "currency": "USD"
  },
  "exchange_rate": {
    "from": "USD",
    "to": "EUR",
    "rate": 0.85
  }
}
```

### Units of Measurement
- **Always specify units** with measurements
- **Use standard abbreviations**
- **Support conversion** between common units

**Standard Units**:
- **Weight**: kg, g, lb, oz
- **Length**: m, cm, mm, ft, in
- **Volume**: L, mL, gal, qt
- **Temperature**: C, F, K

**Examples**:
```json
{
  "weight": 15.5,
  "weight_unit": "kg",
  "dimensions": {
    "length": 100,
    "width": 50,
    "height": 30,
    "unit": "cm"
  }
}
```

### Identifiers
- **Primary Keys**: UUID v4 format
- **External IDs**: String, max 255 characters
- **Codes/SKUs**: Alphanumeric, uppercase preferred

**Examples**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": "EXT-12345",
  "sku": "PROD-ABC-001"
}
```

### Contact Information
- **Email**: RFC 5322 compliant, lowercase
- **Phone**: E.164 format `+{country_code}{number}`
- **URL**: RFC 3986 compliant, include protocol

**Examples**:
```json
{
  "email": "user@example.com",
  "phone": "+12125551234",
  "website": "https://example.com"
}
```

### Addresses
- **Standard Structure**:
```json
{
  "address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  }
}
```

### Percentages
- **Store as decimal**: 0.15 for 15%
- **Include unit in field name**: `discount_percentage`

**Examples**:
```json
{
  "tax_rate": 0.08,
  "discount_percentage": 0.15
}
```

## 2. Enumeration Standards

### Status Fields
- Use **past tense** for completed states
- Use **present continuous** for active states
- Use **lowercase with underscores**

**Standard Status Values**:
```json
{
  "status": "pending",     // Waiting to start
  "status": "processing",  // In progress
  "status": "completed",   // Successfully finished
  "status": "failed",      // Failed
  "status": "cancelled",   // Cancelled
  "status": "archived"     // Archived/Soft deleted
}
```

### Priority Levels
```json
{
  "priority": "low",
  "priority": "normal",
  "priority": "high",
  "priority": "urgent",
  "priority": "critical"
}
```

## 3. Null vs Empty Values

### Guidelines
- **null**: Value is unknown or not applicable
- **Empty string ("")**: Value exists but is empty
- **Empty array ([])**: No items in collection
- **0**: Zero is a valid value, not "empty"

### Required vs Optional Fields
- **Required**: Must always have a value (never null)
- **Optional**: Can be null or omitted

## 4. Soft Delete Standard

### Implementation
- Use `is_deleted` boolean flag
- Include `deleted_at` timestamp
- Optionally include `deleted_by` user reference

**Schema**:
```sql
is_deleted BOOLEAN DEFAULT false,
deleted_at TIMESTAMP,
deleted_by UUID REFERENCES users(user_id)
```

**API Behavior**:
- Default queries exclude deleted records
- Include `?include_deleted=true` to show all

## 5. Audit Trail Standard

### Standard Audit Fields
Every entity should include:
```json
{
  "created_at": "2024-01-15T14:30:00.000Z",
  "created_by": "user_uuid",
  "updated_at": "2024-01-20T10:15:00.000Z",
  "updated_by": "user_uuid"
}
```

### Change History
For critical entities, maintain change history:
```sql
CREATE TABLE entity_history (
  history_id UUID PRIMARY KEY,
  entity_id UUID,
  changed_at TIMESTAMP,
  changed_by UUID,
  change_type VARCHAR(20), -- insert, update, delete
  before_state JSONB,
  after_state JSONB
);
```

## 6. Validation Rules

### String Validation
- **Trim whitespace** before saving
- **Validate length** (min/max)
- **Pattern matching** for codes/SKUs
- **Case normalization** where appropriate

### Numeric Validation
- **Range validation** (min/max)
- **Precision validation** for decimals
- **Positive/negative** constraints

### Date Validation
- **Future/past** constraints
- **Date range** validation
- **Business day** validation where needed

## 7. Default Values

### Standard Defaults
```json
{
  "is_active": true,
  "is_deleted": false,
  "created_at": "CURRENT_TIMESTAMP",
  "status": "pending",
  "priority": "normal",
  "quantity": 1,
  "metadata": {}
}
```

## 8. Collection Standards

### Array Fields
- Use **plural names**: `items`, `tags`, `categories`
- **Empty array** for no items (not null)
- **Maintain order** if sequence matters

### Nested Objects
- **Limit nesting depth** to 3 levels
- **Use relationships** for complex structures
- **Denormalize** for read performance where needed

## 9. Metadata Pattern

### Standard Metadata Field
Every entity can have a flexible metadata field:
```json
{
  "metadata": {
    "custom_field_1": "value",
    "tags": ["tag1", "tag2"],
    "notes": "Additional information"
  }
}
```

### Guidelines
- Use for **app-specific** fields
- **Don't query** on metadata in production
- **Document** metadata structure in communication sheet

## 10. Relationship Standards

### Reference Format
```json
{
  "product_id": "uuid",
  "product": {
    "id": "uuid",
    "name": "Product Name",
    "sku": "PROD-001"
  }
}
```

### Guidelines
- **ID field**: Just the UUID
- **Nested object**: Include key fields for display
- **Separate endpoint**: For full object details

## 11. Error Data Standards

### Error Codes
- Use **UPPER_SNAKE_CASE**
- Be **specific** but not verbose
- Follow pattern: `{CATEGORY}_{DESCRIPTION}`

**Examples**:
```
VALIDATION_ERROR
NOT_FOUND
UNAUTHORIZED
PERMISSION_DENIED
RATE_LIMIT_EXCEEDED
EXTERNAL_SERVICE_ERROR
```

### Error Details
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email format is invalid"
      }
    ]
  }
}
```

## 12. Internationalization (i18n)

### Language Codes
- Use ISO 639-1 (2-letter codes): `en`, `es`, `fr`
- With region: ISO 3166-1 alpha-2: `en-US`, `en-GB`

### Translatable Fields
```json
{
  "name": {
    "en": "Product Name",
    "es": "Nombre del Producto",
    "fr": "Nom du Produit"
  }
}
```

### Guidelines
- **Default language**: English (en)
- **Fallback**: Return default language if translation missing
- **Header**: `Accept-Language: en-US,en;q=0.9`

## 13. Data Retention & Archiving

### Retention Policies
- **Audit logs**: 7 years
- **Transactional data**: 3 years
- **Analytical data**: 1 year
- **Temporary data**: 30 days

### Archive Strategy
```json
{
  "archived_at": "2024-01-15T00:00:00Z",
  "archive_reason": "retention_policy",
  "archive_location": "s3://archive-bucket/2024/01/"
}
```

## 14. Data Synchronization

### Sync Timestamps
```json
{
  "last_synced_at": "2024-01-15T14:30:00.000Z",
  "sync_status": "completed",
  "sync_version": 12345
}
```

### Conflict Resolution
- **Last Write Wins**: Use `updated_at` timestamp
- **Version Vector**: Use version numbers
- **Manual Resolution**: Flag conflicts for review

## 15. Privacy & Compliance

### PII (Personally Identifiable Information)
- **Mark PII fields** in schema
- **Encrypt at rest**
- **Mask in logs**
- **Audit access**

**Example Schema**:
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) ENCRYPTED, -- PII
  phone VARCHAR(20) ENCRYPTED,  -- PII
  name VARCHAR(255)             -- PII
);
```

### Data Classification
- **Public**: No restrictions
- **Internal**: Company-only
- **Confidential**: Restricted access
- **Restricted**: Highest security (PII, financial)

## 16. Data Quality Rules

### Validation Levels
1. **Format**: Correct data type and format
2. **Range**: Within acceptable bounds
3. **Consistency**: Related fields align
4. **Completeness**: Required fields present
5. **Uniqueness**: No duplicates where required

### Quality Metrics
```json
{
  "data_quality": {
    "completeness": 0.95,
    "accuracy": 0.98,
    "consistency": 0.99,
    "last_checked": "2024-01-15T14:30:00.000Z"
  }
}
```

## 17. Schema Evolution

### Version Tracking
```json
{
  "schema_version": "1.2.0",
  "migrated_from": "1.1.0",
  "migration_date": "2024-01-15T00:00:00Z"
}
```

### Backward Compatibility Rules
1. **Can add** new optional fields
2. **Cannot remove** existing fields (deprecate instead)
3. **Cannot change** field types
4. **Cannot change** field meaning
5. **Can add** new enum values
6. **Cannot remove** enum values (deprecate instead)
