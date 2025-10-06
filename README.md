# A20 Core - Microservices Hub

> A modular, event-driven microservices architecture with a central hub for orchestration, data aggregation, and inter-app communication.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp config/.env.example .env
# Edit .env with your database credentials

# Initialize database
npm run db:init

# Start the Hub
npm run dev
```

The Hub will be running at `http://localhost:3000`

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Development](#development)

## 🎯 Overview

A20 Core provides a solid backbone for building modular microservices applications. It features:

- **Central Hub**: API Gateway and orchestration layer
- **Flexible Data Storage**: JSONB-based schema-less storage
- **Event-Driven Architecture**: Asynchronous communication between apps
- **Communication Sheets**: Self-documenting API contracts
- **Schema Registry**: Version-controlled entity schemas
- **Built-in Security**: JWT and API key authentication
- **Comprehensive Audit**: Full audit trail for compliance

## 🏗 Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   Central Hub                       │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ API      │  │  Event   │  │  Data           │  │
│  │ Gateway  │  │  Manager │  │  Aggregation    │  │
│  └──────────┘  └──────────┘  └─────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │   Auth   │  │  Audit   │  │  Schema         │  │
│  │          │  │  Logger  │  │  Registry       │  │
│  └──────────┘  └──────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼────┐    ┌────▼────┐    ┌────▼────┐
    │ Prod.  │    │ Finance │    │ Invent. │
    │ Mgr    │    │ Mgr     │    │ Mgr     │
    └────────┘    └─────────┘    └─────────┘
    Micro-Apps (Independent & Modular)
```

### Communication Flow

1. **Synchronous**: REST API for real-time operations
2. **Asynchronous**: Event-driven for data sync and notifications
3. **Data Storage**: Centralized JSONB storage for all app data

## ✨ Core Features

### 1. App Registry
- Self-registration via Communication Sheets
- Health monitoring and heartbeat tracking
- Version management
- Status control (active, suspended, deprecated)

### 2. Flexible Data Storage
- Schema-less JSONB storage
- Cross-app relationships
- Query by any field
- Soft delete support

### 3. Event System
- Publish/Subscribe pattern
- Event queue with retry logic
- Webhook delivery
- Event filtering and routing

### 4. Communication Sheets
- JSON Schema-based contracts
- Entity definitions
- API endpoint documentation
- Event specifications
- Dependency declarations

### 5. Security
- JWT authentication for users
- API key authentication for apps
- Role-based permissions
- Resource-level access control

### 6. Audit & Compliance
- Complete audit trail
- Before/after state tracking
- User/App attribution
- Performance metrics

## 📁 Project Structure

```
A20Core/
├── hub/                          # Central Hub
│   ├── src/
│   │   ├── api/
│   │   │   └── routes.js         # API endpoints
│   │   ├── models/
│   │   │   ├── AppRegistry.js    # App management
│   │   │   ├── DataStore.js      # Data operations
│   │   │   └── EventManager.js   # Event handling
│   │   └── middleware/
│   │       ├── auth.js           # Authentication
│   │       └── audit.js          # Audit logging
│   └── server.js                 # Main entry point
│
├── database/
│   └── schemas/
│       ├── 01_core_tables.sql    # Core infrastructure
│       └── 02_flexible_data_storage.sql
│
├── docs/
│   ├── standards/
│   │   ├── API_STANDARDS.md      # API conventions
│   │   ├── DATA_STANDARDS.md     # Data formats
│   │   ├── communication-sheet-schema.json
│   │   └── communication-sheet-template.yaml
│   └── architecture/
│       └── SYSTEM_OVERVIEW.md    # Architecture guide
│
├── micro-apps/
│   └── examples/
│       └── production-manager-communication-sheet.yaml
│
├── config/
│   └── .env.example              # Environment template
│
├── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd A20Core
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp config/.env.example .env
   # Edit .env with your settings
   ```

4. **Initialize database**
   ```bash
   # Create database
   createdb a20core_hub

   # Run schema
   psql -d a20core_hub -f database/schemas/01_core_tables.sql
   psql -d a20core_hub -f database/schemas/02_flexible_data_storage.sql
   ```

5. **Start the Hub**
   ```bash
   npm run dev
   ```

### Register Your First App

```bash
curl -X POST http://localhost:3000/api/v1/apps/register \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d @micro-apps/examples/production-manager-communication-sheet.yaml
```

## 📚 Documentation

### Standards & Guidelines
- [API Standards](docs/standards/API_STANDARDS.md) - REST API conventions
- [Data Standards](docs/standards/DATA_STANDARDS.md) - Data formats and types
- [Communication Sheet Schema](docs/standards/communication-sheet-schema.json) - Contract definition
- [Communication Sheet Template](docs/standards/communication-sheet-template.yaml) - Template for new apps

### Architecture
- [System Overview](docs/architecture/SYSTEM_OVERVIEW.md) - Complete architecture guide

### Database
- [Core Tables](database/schemas/01_core_tables.sql) - Infrastructure schema
- [Flexible Storage](database/schemas/02_flexible_data_storage.sql) - App data schema

## 🛠 Development

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server (with nodemon)
npm test           # Run tests
npm run lint       # Check code style
npm run lint:fix   # Fix code style issues
npm run format     # Format code with Prettier
```

### Creating a New Micro-App

1. **Define your entities** (data models)
2. **Create Communication Sheet** using template
3. **Register with Hub** to get API credentials
4. **Implement REST API** according to standards
5. **Publish/Subscribe to events** as needed
6. **Test integration** with Hub

### API Endpoints

#### Apps
- `POST /api/v1/apps/register` - Register new app
- `GET /api/v1/apps` - List all apps
- `GET /api/v1/apps/:appId` - Get app details
- `PATCH /api/v1/apps/:appId/status` - Update app status
- `POST /api/v1/apps/:appId/heartbeat` - Send heartbeat

#### Data
- `POST /api/v1/data` - Store/update data
- `GET /api/v1/data/:entityType/:entityId` - Get data by ID
- `GET /api/v1/data/:entityType` - Query data
- `DELETE /api/v1/data/:entityType/:entityId` - Delete data

#### Events
- `POST /api/v1/events` - Publish event
- `POST /api/v1/events/subscribe` - Subscribe to events
- `DELETE /api/v1/events/subscribe/:subscriptionId` - Unsubscribe
- `GET /api/v1/events/history` - Get event history

#### Relationships
- `POST /api/v1/relationships` - Create relationship
- `GET /api/v1/relationships/:entityType/:entityId` - Get relationships

## 🔒 Security

- **Authentication**: JWT tokens (users) and API keys (apps)
- **Authorization**: Role-based access control
- **Encryption**: HTTPS in production, encrypted sensitive data
- **Audit**: Complete audit trail of all operations
- **Rate Limiting**: Configurable per app
- **CORS**: Configured for cross-origin requests

## 🎯 Roadmap

### Phase 1 ✅ (Current)
- [x] Core Hub infrastructure
- [x] Database schema
- [x] Communication Sheet framework
- [x] REST API
- [x] Event system
- [x] Authentication & Authorization
- [x] Audit logging

### Phase 2 (Next)
- [ ] GraphQL API layer
- [ ] Real-time WebSocket support
- [ ] Distributed tracing
- [ ] Advanced caching (Redis)
- [ ] Message queue (RabbitMQ/Kafka)

### Phase 3 (Future)
- [ ] Multi-tenancy support
- [ ] Data warehouse integration
- [ ] Machine learning pipeline
- [ ] Service mesh integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/a20core/issues)
- **Email**: support@a20core.com

## 🙏 Acknowledgments

- Built with Node.js and PostgreSQL
- Inspired by microservices best practices
- Designed for scalability and modularity

---

**Built with ❤️ by the A20 Core Team**
