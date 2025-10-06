# PostgreSQL with A20Core schemas pre-loaded

FROM postgres:15-alpine

# Copy schema files
COPY schemas/*.sql /docker-entrypoint-initdb.d/

# These files will be executed in alphabetical order:
# 1. 01_core_tables.sql
# 2. 02_flexible_data_storage.sql

# Set default database name
ENV POSTGRES_DB=a20core_hub

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-a20core_hub} || exit 1
