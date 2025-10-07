# A20 Core - System Architecture Overview

## Executive Summary

A20 Core is a modular, event-driven microservices architecture designed to support multiple business applications with a central hub for orchestration, data aggregation, and inter-app communication.

## Architecture Principles

### 1. Modularity
- Each micro-app is **independent** and **self-contained**
- Apps can be deployed, scaled, and updated independently
- New apps can be added without modifying existing ones

### 2. Standardization
- **Communication Sheet**: Every app declares its capabilities
- **Schema Registry**: Version-controlled entity schemas
- **Standard API**: Consistent REST API patterns across all apps

### 3. Event-Driven
- Apps communicate via **asynchronous events**
- **Loose coupling** between applications
- **Event sourcing** for audit and replay capabilities

### 4. Flexibility
- **Schema-less storage** for app-specific data
- **JSONB** for flexible data structures
- **Additive schema evolution** for backward compatibility

## System Components

### 1. Central Hub
**Purpose**: API Gateway, Orchestration, and Data Aggregation

**Responsibilities**:
- App registration and discovery
- Data aggregation and normalization
- Event routing and delivery
- Authentication and authorization
- Audit logging
- Cross-app orchestration

**Technology Stack**:
- Node.js 18+ + Express
- PostgreSQL 15+ (with JSONB)
- JWT & API Key authentication
- Docker + Docker Compose for containerization

### 2. Micro-Apps
**Purpose**: Specialized business functionality

**Examples**:
- Production Manager
- Finance Manager
- Inventory Manager
- Planning Manager
- Quality Control

**Characteristics**:
- Independent deployment
- Own data models
- Publish events to Hub
- Subscribe to events from other apps
- Declare capabilities via Communication Sheet

### 3. Communication Sheet
**Purpose**: API contract and capability declaration

**Contains**:
- App metadata (name, version, maintainer)
- Entity schemas (data structures)
- API endpoints (operations)
- Events (published and consumed)
- Dependencies (required/optional apps)
- Data sync configuration

### 4. Database Layer

#### Core Tables (Fixed Schema)
- `apps` - App registry
- `users` - User accounts
- `api_credentials` - Authentication
- `permissions` - Authorization
- `schema_versions` - Schema registry
- `audit_log` - Audit trail
- `event_queue` - Event processing
- `event_subscriptions` - Event routing
- `communication_sheets` - App contracts

#### Flexible Storage (JSONB)
- `app_data` - All micro-app data
- `data_relationships` - Cross-app references
- `data_sync_status` - Sync tracking
- `data_validation_errors` - Error logging

## Data Flow Architecture

### 1. Data Ingestion Flow
```
Micro-App → Hub API → Validation → app_data table → Event published
```

**Steps**:
1. Micro-app sends data to Hub API
2. Hub validates against registered schema
3. Data stored in `app_data` with JSONB
4. Change event published to event queue
5. Subscribed apps receive event

### 2. Event Flow
```
Source App → Hub Event Queue → Event Delivery → Target Apps (Webhooks)
```

**Steps**:
1. App publishes event via Hub API
2. Event added to `event_queue`
3. Hub identifies subscribers
4. Events delivered via webhooks
5. Delivery status logged
6. Retry on failure

### 3. Cross-App Query Flow
```
Request → Hub API → Join app_data + relationships → Response
```

**Capabilities**:
- Query data from multiple apps
- Follow relationships across apps
- Aggregate data for analytics
- Apply permissions and filters

## Communication Patterns

### 1. Synchronous (REST API)
**Use Cases**:
- Create/Update/Delete operations
- Real-time queries
- User-facing operations

**Pattern**:
```
Client → Hub API → Route to App → Response
```

### 2. Asynchronous (Events)
**Use Cases**:
- Data synchronization
- Workflow automation
- Notifications
- Analytics updates

**Pattern**:
```
Source App → Publish Event → Hub Queue → Deliver to Subscribers
```

### 3. Request-Reply (via Events)
**Use Cases**:
- Long-running processes
- External API calls
- Complex calculations

**Pattern**:
```
Request Event → Processing → Response Event
```

## Security Architecture

### 1. Authentication

#### App Authentication
- **API Keys** (SHA-256 hashed)
- Unique per app
- Expiration support
- Scope-based permissions

#### User Authentication
- **JWT tokens** (Bearer)
- 24-hour expiration
- Role-based access
- Refresh token support

### 2. Authorization

#### Permission Model
- Resource-based permissions
- Action-level control (read, write, delete, execute, admin)
- Role assignment
- App-to-app permissions

#### Permission Check Flow
```
Request → Authenticate → Check Permission → Allow/Deny
```

### 3. Audit & Compliance
- All API calls logged
- Before/after state tracking
- User/App attribution
- IP address logging
- Data mutation tracking

## Deployment Architecture

### Docker Container Structure
```
┌─────────────────────────────────────────────────┐
│             Docker Network (Bridge)              │
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │  PostgreSQL  │◄───│   Hub (Node.js)      │  │
│  │  Container   │    │   Container          │  │
│  │              │    │                      │  │
│  │ • Schemas    │    │ • API Gateway        │  │
│  │ • JSONB Data │    │ • Event Processor    │  │
│  │ • Auto-init  │    │ • Auth Middleware    │  │
│  └──────────────┘    └──────────────────────┘  │
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │   pgAdmin    │    │   Micro-App(s)       │  │
│  │  (Optional)  │    │   Containers         │  │
│  └──────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Benefits**:
- **Isolation**: Each service runs in its own container
- **Reproducibility**: Identical environments across dev/staging/prod
- **Easy setup**: One command to start entire stack
- **Network management**: Services communicate via Docker network
- **Volume persistence**: Data survives container restarts
- **Health monitoring**: Built-in health checks for all services

### Container Details

#### Hub Container
- **Base**: `node:18-alpine` (multi-stage build)
- **Ports**: 3000 (API), 9229 (debug in dev mode)
- **Volumes**: `/app/logs` for persistent logging
- **Health check**: HTTP GET `/health` endpoint
- **Security**: Non-root user, minimal dependencies

#### PostgreSQL Container
- **Base**: `postgres:15-alpine`
- **Ports**: 5432
- **Volumes**: Persistent data storage
- **Auto-initialization**: Schemas loaded on first start
- **Extensions**: uuid-ossp, pgcrypto, pg_trgm

#### Development vs Production
| Feature | Development | Production |
|---------|-------------|------------|
| Code mounting | Hot reload (nodemon) | Baked into image |
| Logging | DEBUG level | INFO level |
| Debug port | Exposed (9229) | Not exposed |
| Auth | Relaxed | Strict |
| pgAdmin | Included | Optional/Removed |

## Scalability Strategy

### 1. Horizontal Scaling
- **Hub**: Load-balanced Docker containers (behind nginx)
- **Apps**: Independent scaling per micro-app
- **Database**: Connection pooling (pg-pool)
- **Events**: Distributed queue (future: RabbitMQ/Kafka)
- **Docker Swarm/Kubernetes**: For orchestration at scale

### 2. Performance Optimization
- **Materialized Views**: Pre-aggregated stats (refreshed every 5 min)
- **JSONB Indexes**: GIN indexes for fast JSON queries
- **Multi-stage builds**: Smaller production images
- **Caching Layer**: Redis (future)
- **CDN**: Static content delivery

### 3. Data Partitioning
- **Time-based**: Partition audit logs by month
- **App-based**: Separate app_data by app_id
- **Archive**: Move old data to cold storage

## High Availability

### 1. Fault Tolerance
- **Database**: Primary-replica setup
- **Hub**: Multiple instances behind load balancer
- **Event Queue**: Persistent storage, retry logic
- **Apps**: Health checks, auto-restart

### 2. Disaster Recovery
- **Database Backups**: Daily full, hourly incremental
- **Point-in-Time Recovery**: 30-day retention
- **Communication Sheets**: Version controlled
- **Configuration**: Infrastructure as Code

## Monitoring & Observability

### 1. Metrics
- API response times
- Event processing latency
- Database query performance
- Error rates
- Resource utilization

### 2. Logging
- Structured JSON logging
- Centralized log aggregation
- Log levels: DEBUG, INFO, WARN, ERROR
- Request tracing with correlation IDs

### 3. Alerting
- Performance degradation
- Error rate thresholds
- Service unavailability
- Security events

## Development Workflow

### 1. New App Development
1. Define entities and operations
2. Create Communication Sheet
3. Register with Hub
4. Receive API credentials
5. Implement API endpoints
6. Publish/Subscribe to events
7. Test integration
8. Deploy

### 2. Schema Evolution
1. Add new fields (optional)
2. Update Communication Sheet version
3. Deploy new app version
4. Old versions continue working
5. Deprecate after migration period

### 3. Deployment

#### Docker Development Workflow
```bash
# 1. Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# 2. Make changes (hot reload active)

# 3. Test in container
docker-compose exec hub npm test

# 4. Build production image
docker-compose build hub

# 5. Deploy
docker-compose up -d
```

#### Production Deployment
1. Build Docker images
2. Push to container registry
3. CI/CD pipeline validation
4. Automated testing
5. Canary deployment
6. Health check verification
7. Full rollout
8. Rollback capability

## Future Enhancements

### Phase 2: Advanced Features
- GraphQL API layer
- Real-time WebSocket support
- Distributed tracing (Jaeger)
- Service mesh (Istio)

### Phase 3: Analytics & ML
- Data warehouse integration
- Real-time analytics
- Machine learning pipeline
- Predictive insights

### Phase 4: Enterprise Features
- Multi-tenancy support
- Geographic distribution
- Advanced caching (Redis)
- Message queue (RabbitMQ/Kafka)

## Technology Stack Summary

### Hub
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Authentication**: JWT + API Keys
- **API**: REST (v1)

### Micro-Apps
- **Flexibility**: Any language/framework
- **Requirements**: REST API, Webhooks
- **Communication**: HTTP/HTTPS
- **Format**: JSON

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Docker Swarm / Kubernetes (future)
- **CI/CD**: GitHub Actions / Jenkins
- **Monitoring**: Prometheus + Grafana (future)
- **Registry**: Docker Hub / Private Registry

## Getting Started

### Prerequisites
**Option 1: Docker (Recommended)**
- Docker Desktop or Docker Engine 20+
- Docker Compose 2.0+

**Option 2: Local Development**
- Node.js 18+
- PostgreSQL 15+
- npm 9+

### Quick Start with Docker
```bash
# 1. Clone repository
git clone https://github.com/your-org/a64core.git
cd a64core

# 2. Configure environment
cp .env.docker .env
# Edit .env - IMPORTANT: Change JWT_SECRET

# 3. Start all services
docker-compose up -d

# 4. Create test admin user
docker-compose exec -T postgres psql -U postgres -d a64core_hub < database/create-test-admin.sql

# 5. Check health
docker-compose ps
curl http://localhost:3000/health

# 6. View logs
docker-compose logs -f hub

# Access Points:
# - Hub API: http://localhost:3000
# - Dashboard: http://localhost:8080
# - pgAdmin: http://localhost:5050
# - PostgreSQL: localhost:5432

# Test Admin Credentials:
# Username: admin
# Password: admin123
# Organization: admin-org
```

### Quick Start (Local)
```bash
# 1. Clone repository
git clone https://github.com/your-org/a64core.git
cd a64core

# 2. Install dependencies
npm install

# 3. Configure environment
cp config/.env.example .env
# Edit .env with your settings

# 4. Initialize database
npm run db:init

# 5. Start Hub
npm run dev
```

### Register Your First App
```bash
curl -X POST http://localhost:3000/api/v1/apps/register \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d @communication-sheet.json
```

## Documentation

- [Docker Setup Guide](../../DOCKER.md) - Complete Docker deployment guide
- [Claude Development Guide](../../CLAUDE.md) - Development patterns and conventions
- [API Standards](../standards/API_STANDARDS.md)
- [Data Standards](../standards/DATA_STANDARDS.md)
- [Communication Sheet Schema](../standards/communication-sheet-schema.json)
- [Communication Sheet Template](../standards/communication-sheet-template.yaml)
- [Database Schema](../../database/schemas/)

## Support

- **Documentation**: [docs.a64core.com](https://docs.a64core.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/a64core/issues)
- **Community**: [Discord](https://discord.gg/a64core)
- **Email**: support@a64core.com
