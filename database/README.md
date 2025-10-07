# A20 Core Database Scripts

## Schema Files

### Core Tables
- `01_core_tables.sql` - Fixed schema tables (apps, users, auth, events)
- `02_flexible_data_storage.sql` - JSONB-based flexible storage
- `03_organizations_and_auth.sql` - Multi-tenant organization system

## Test Data

### Test Admin User
Run `create-test-admin.sql` to create a test admin account:

```bash
docker-compose exec -T postgres psql -U postgres -d a64core_hub < database/create-test-admin.sql
```

**Credentials:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@a64core.local`
- Organization: `admin-org`
- Role: `owner`

**Use this account for:**
- API testing
- Development
- Admin UI testing
- Organization management testing

⚠️ **Security Warning:** Never use these credentials in production!

## Database Initialization

The database is automatically initialized when you start Docker Compose:

```bash
docker-compose up -d
```

The PostgreSQL container will:
1. Create the `a64core_hub` database
2. Run all `.sql` files in `database/schemas/` in alphabetical order
3. Enable required PostgreSQL extensions

## Manual Database Setup (Without Docker)

```bash
# Create database
createdb a64core_hub

# Run schema files in order
psql -d a64core_hub -f database/schemas/01_core_tables.sql
psql -d a64core_hub -f database/schemas/02_flexible_data_storage.sql
psql -d a64core_hub -f database/schemas/03_organizations_and_auth.sql

# Create test admin
psql -d a64core_hub -f database/create-test-admin.sql
```

## Database Access

### Via Docker
```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d a64core_hub

# Run SQL file
docker-compose exec -T postgres psql -U postgres -d a64core_hub < your-file.sql

# Dump database
docker-compose exec postgres pg_dump -U postgres a64core_hub > backup.sql
```

### Via Local psql
```bash
# Connect to database
psql -h localhost -p 5432 -U postgres -d a64core_hub

# Run SQL file
psql -h localhost -p 5432 -U postgres -d a64core_hub -f your-file.sql
```

### Via pgAdmin
Access pgAdmin at http://localhost:5050

**Default credentials (Docker):**
- Email: `admin@a64core.local`
- Password: `admin`

## Common Database Operations

### Reset Database
```bash
# Stop containers
docker-compose down

# Remove volumes (DESTRUCTIVE - deletes all data!)
docker-compose down -v

# Start fresh
docker-compose up -d
```

### View Tables
```sql
-- List all tables
\dt

-- Describe a table
\d users

-- View table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check User Accounts
```sql
SELECT
    u.username,
    u.email,
    u.status,
    o.org_name,
    om.role,
    om.status as membership_status
FROM users u
LEFT JOIN organization_members om ON u.user_id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.org_id
ORDER BY u.created_at DESC;
```
