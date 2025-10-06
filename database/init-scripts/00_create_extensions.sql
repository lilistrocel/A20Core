-- Create necessary PostgreSQL extensions
-- This runs before schema creation

-- UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search support
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for password hashing';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching for fuzzy text search';
