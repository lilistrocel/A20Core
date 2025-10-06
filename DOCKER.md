# Docker Setup Guide - A20Core

Complete Docker setup for the A20Core microservices hub architecture.

## Quick Start

```bash
# 1. Copy environment file
cp .env.docker .env

# 2. Edit .env and change JWT_SECRET
# Generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Start all services
docker-compose up -d

# 4. Check service health
docker-compose ps

# 5. View logs
docker-compose logs -f hub
```

## Services

The Docker setup includes:

- **postgres** - PostgreSQL 15 with schemas pre-loaded
- **hub** - A20Core Hub API Gateway (Node.js)
- **dashboard** - React frontend (Vite + Nginx)
- **pgadmin** - Database management UI (optional)

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:8080 | Via Hub authentication |
| Hub API | http://localhost:3000 | API Key or JWT |
| pgAdmin | http://localhost:5050 | See `.env` |
| PostgreSQL | localhost:5432 | See `.env` |

## Development Mode

For development with hot reload:

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Features:
# - Hub: Source code mounted, nodemon watches for changes
# - Dashboard: Vite dev server with hot reload
# - Debug port exposed on 9229 (Hub)
# - Dashboard runs on port 5173 in dev mode
# - More verbose logging
```

## Production Deployment

```bash
# 1. Update .env with production values
# IMPORTANT: Change JWT_SECRET, DB_PASSWORD, PGADMIN_PASSWORD

# 2. Build production images
docker-compose build --no-cache

# 3. Start services
docker-compose up -d

# 4. Verify health
docker-compose ps
curl http://localhost:3000/health
```

## Database Initialization

The PostgreSQL container automatically runs these scripts on **first startup**:

1. `database/init-scripts/00_create_extensions.sql` - PostgreSQL extensions
2. `database/schemas/01_core_tables.sql` - Core tables (apps, users, events)
3. `database/schemas/02_flexible_data_storage.sql` - JSONB data storage

**Note**: Schemas only run if the database is empty. To reset:

```bash
# WARNING: This deletes all data
docker-compose down -v
docker-compose up -d
```

## Networking

All services communicate via the `a20core-network` bridge network.

**Container-to-container**: Use service names as hostnames
```javascript
// Inside Hub container
DB_HOST=postgres  // NOT localhost
```

**Host-to-container**: Use localhost with mapped ports
```bash
# From your machine
psql -h localhost -p 5432 -U postgres -d a20core_hub
curl http://localhost:3000/api/v1/apps
```

## Volumes

Persistent data is stored in named volumes:

- `a20core-postgres-data` - Database files
- `a20core-hub-logs` - Application logs
- `a20core-pgadmin-data` - pgAdmin configuration

```bash
# List volumes
docker volume ls | grep a20core

# Inspect volume
docker volume inspect a20core-postgres-data

# Backup database volume
docker run --rm -v a20core-postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Health Checks

All services have built-in health checks:

```bash
# Check all service health
docker-compose ps

# Inspect specific service
docker inspect a20core-hub | grep -A 10 Health

# Manual health check
curl http://localhost:3000/health
```

## Logs & Debugging

```bash
# Follow all logs
docker-compose logs -f

# Specific service
docker-compose logs -f hub

# Last 100 lines
docker-compose logs --tail=100 postgres

# Shell access
docker-compose exec hub sh
docker-compose exec postgres psql -U postgres -d a20core_hub
```

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything including volumes (DESTRUCTIVE)
docker-compose down -v

# Rebuild specific service
docker-compose build hub
docker-compose up -d hub

# Restart service
docker-compose restart hub

# View resource usage
docker stats

# Prune unused resources
docker system prune -a
```

## Adding Micro-Apps

To add a new micro-app to Docker:

1. **Create micro-app Dockerfile**:
```dockerfile
# micro-apps/production-manager/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

2. **Add to docker-compose.yml**:
```yaml
services:
  production-manager:
    build:
      context: ./micro-apps/production-manager
    container_name: a20core-production-manager
    environment:
      HUB_URL: http://hub:3000
      API_KEY: ${PRODUCTION_MANAGER_API_KEY}
    networks:
      - a20core-network
    depends_on:
      hub:
        condition: service_healthy
```

3. **Update .env**:
```bash
PRODUCTION_MANAGER_API_KEY=your-api-key-here
```

## Environment Variables

Required variables (set in `.env`):

```bash
# Database
DB_NAME=a20core_hub
DB_USER=postgres
DB_PASSWORD=<secure-password>

# Hub
JWT_SECRET=<64-char-hex-string>
PORT=3000

# Dashboard
DASHBOARD_PORT=8080
VITE_API_URL=http://localhost:3000

# Optional
EVENT_PROCESSING_INTERVAL=5000
MATERIALIZED_VIEW_REFRESH=300000
LOG_LEVEL=info
```

Generate secure secrets:
```bash
# JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Database password
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

## Troubleshooting

### Database connection failed
```bash
# Check postgres is healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify network
docker network inspect a20core-network
```

### Hub won't start
```bash
# Check hub logs
docker-compose logs hub

# Verify database is accessible from hub
docker-compose exec hub ping postgres

# Check environment variables
docker-compose exec hub env | grep DB_
```

### Port already in use
```bash
# Change ports in .env
PORT=3001
DASHBOARD_PORT=8081
DB_PORT=5433
PGADMIN_PORT=5051

# Restart
docker-compose down
docker-compose up -d
```

### Dashboard can't connect to API
```bash
# Check Hub is running
docker-compose ps hub

# Check dashboard logs
docker-compose logs dashboard

# In production mode, API requests are proxied through nginx
# Dashboard → nginx → hub:3000

# In dev mode, check VITE_API_URL in .env
# Should be: http://localhost:3000
```

### Slow performance on Windows
```bash
# Use development compose for better I/O
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or adjust Docker Desktop settings:
# Settings → Resources → Increase CPU/Memory
```

## Security Checklist

Before production deployment:

- [ ] Changed `JWT_SECRET` to secure random value
- [ ] Changed `DB_PASSWORD` from default
- [ ] Changed `PGADMIN_PASSWORD` from default
- [ ] Removed or secured pgAdmin (comment out in docker-compose.yml)
- [ ] Set `NODE_ENV=production`
- [ ] Configured firewall rules for ports
- [ ] Enabled Docker content trust
- [ ] Set up TLS/SSL certificates (use nginx reverse proxy)
- [ ] Configured backup strategy for volumes
- [ ] Set up monitoring and alerting

## Backup & Restore

### Backup
```bash
# Database dump
docker-compose exec postgres pg_dump -U postgres a20core_hub > backup.sql

# Volume backup
docker run --rm -v a20core-postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db-$(date +%Y%m%d).tar.gz /data
```

### Restore
```bash
# From SQL dump
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d a20core_hub

# From volume backup
docker run --rm -v a20core-postgres-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/db-20240101.tar.gz -C /
docker-compose restart postgres
```

## Next Steps

1. ✅ Docker setup complete
2. Start services: `docker-compose up -d`
3. Create admin user via Hub API
4. Register your first micro-app
5. Add micro-app containers to docker-compose.yml
6. Set up CI/CD pipeline
7. Configure production secrets management (e.g., Docker Secrets, Vault)

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
