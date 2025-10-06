/**
 * Hub Server - Main Entry Point
 * Central API Gateway and Orchestration Layer
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

// Models
const AppRegistry = require('./src/models/AppRegistry');
const DataStore = require('./src/models/DataStore');
const EventManager = require('./src/models/EventManager');
const AuthManager = require('./src/models/AuthManager');
const OrganizationManager = require('./src/models/OrganizationManager');

// Middleware
const AuthMiddleware = require('./src/middleware/auth');
const AuditMiddleware = require('./src/middleware/audit');

// Routes
const { initializeRoutes } = require('./src/api/routes');
const initializeAuthRoutes = require('./src/api/auth.routes');
const initializeOrganizationRoutes = require('./src/api/organization.routes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'a20core_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✓ Database connected successfully');
});

// Initialize models
const appRegistry = new AppRegistry(pool);
const dataStore = new DataStore(pool);
const eventManager = new EventManager(pool);
const authManager = new AuthManager(pool);
const orgManager = new OrganizationManager(pool);

// Initialize middleware
const authMiddleware = new AuthMiddleware(pool);
const auditMiddleware = new AuditMiddleware(pool);

// Global middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // JSON body parser
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// API Routes
const router = initializeRoutes({
  appRegistry,
  dataStore,
  eventManager,
  authMiddleware,
  auditMiddleware
});

// Authentication routes
const authRoutes = initializeAuthRoutes(authManager, orgManager, authMiddleware);

// Organization routes
const orgRoutes = initializeOrganizationRoutes(orgManager, authMiddleware);

// Mount routes
app.use('/api/v1', router);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organization', orgRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'A20 Core Hub',
    version: process.env.HUB_VERSION || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      organization: '/api/v1/organization',
      apps: '/api/v1/apps',
      data: '/api/v1/data',
      events: '/api/v1/events',
      documentation: '/api/v1/docs'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Background jobs
const startBackgroundJobs = () => {
  // Event processing loop
  setInterval(async () => {
    try {
      const pendingEvents = await eventManager.getPendingEvents(10);
      for (const event of pendingEvents) {
        await eventManager.deliverEvent(event.event_id);
      }
    } catch (error) {
      console.error('Event processing error:', error);
    }
  }, 5000); // Every 5 seconds

  // Refresh materialized views
  setInterval(async () => {
    try {
      await pool.query('SELECT refresh_app_data_stats()');
      console.log('✓ Materialized views refreshed');
    } catch (error) {
      console.error('View refresh error:', error);
    }
  }, 300000); // Every 5 minutes
};

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        A20 Core Hub Started            ║
╚════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📊 API Version: v1
🔗 Base URL: http://localhost:${PORT}

Endpoints:
  GET  /                      - API Info
  GET  /api/v1/health         - Health Check

  Apps:
  POST   /api/v1/apps/register      - Register App
  GET    /api/v1/apps               - List Apps
  GET    /api/v1/apps/:id           - Get App
  PATCH  /api/v1/apps/:id/status    - Update Status

  Data:
  POST   /api/v1/data                - Store Data
  GET    /api/v1/data/:type/:id      - Get Data
  DELETE /api/v1/data/:type/:id      - Delete Data

  Events:
  POST   /api/v1/events              - Publish Event
  POST   /api/v1/events/subscribe    - Subscribe
  GET    /api/v1/events/history      - Event History

Ready to accept connections...
  `);

  // Start background jobs
  startBackgroundJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

module.exports = app;
