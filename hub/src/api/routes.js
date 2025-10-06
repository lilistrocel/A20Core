/**
 * Hub API Routes
 * Defines all REST API endpoints
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize routes with dependencies
 * @param {Object} deps - Dependencies (models, middleware, etc.)
 */
function initializeRoutes(deps) {
  const { appRegistry, dataStore, eventManager, authMiddleware, auditMiddleware } = deps;

  // =====================================================
  // Health & Status
  // =====================================================
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.HUB_VERSION || '1.0.0'
    });
  });

  // =====================================================
  // App Registry Routes
  // =====================================================

  // Register new app
  // TODO: Re-enable authentication in production
  router.post('/apps/register', async (req, res) => {
    try {
      const app = await appRegistry.registerApp(req.body);
      res.status(201).json({
        success: true,
        data: app
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // List all apps
  // TODO: Re-enable authentication in production
  router.get('/apps', async (req, res) => {
    try {
      const apps = await appRegistry.listApps(req.query);
      res.json({
        success: true,
        data: apps,
        count: apps.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get app by ID
  router.get('/apps/:appId', authMiddleware.authenticate, async (req, res) => {
    try {
      const app = await appRegistry.getApp(req.params.appId);
      if (!app) {
        return res.status(404).json({
          success: false,
          error: 'App not found'
        });
      }
      res.json({
        success: true,
        data: app
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update app status
  router.patch('/apps/:appId/status', authMiddleware.requireAdmin, auditMiddleware.log, async (req, res) => {
    try {
      const app = await appRegistry.updateStatus(req.params.appId, req.body.status);
      res.json({
        success: true,
        data: app
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // App heartbeat
  router.post('/apps/:appId/heartbeat', authMiddleware.authenticateApp, async (req, res) => {
    try {
      await appRegistry.updateHeartbeat(req.params.appId);
      res.json({
        success: true,
        message: 'Heartbeat received'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // =====================================================
  // Communication Sheet Routes
  // =====================================================

  // Get app communication sheet
  router.get('/apps/:appId/communication-sheet', authMiddleware.authenticate, async (req, res) => {
    try {
      const sheet = await appRegistry.getCommunicationSheet(req.params.appId, req.query.version);
      if (!sheet) {
        return res.status(404).json({
          success: false,
          error: 'Communication sheet not found'
        });
      }
      res.json({
        success: true,
        data: sheet
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Upload/Update Display Sheet
  // TODO: Re-enable authentication in production
  router.post('/apps/:appId/display-sheet', async (req, res) => {
    try {
      const displaySheet = await appRegistry.storeDisplaySheet(req.params.appId, req.body);
      res.status(201).json({
        success: true,
        data: displaySheet
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get app display sheet
  router.get('/apps/:appId/display-sheet', async (req, res) => {
    try {
      const sheet = await appRegistry.getDisplaySheet(req.params.appId, req.query.version);
      if (!sheet) {
        return res.status(404).json({
          success: false,
          error: 'Display sheet not found'
        });
      }
      res.json({
        success: true,
        data: sheet
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Search entities across apps
  router.get('/entities', authMiddleware.authenticate, async (req, res) => {
    try {
      const { entity_name } = req.query;
      if (!entity_name) {
        return res.status(400).json({
          success: false,
          error: 'entity_name query parameter required'
        });
      }
      const results = await appRegistry.searchEntity(entity_name);
      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // =====================================================
  // Data Storage Routes
  // =====================================================

  // Store/Update data
  // TODO: Re-enable authentication in production
  router.post('/data', async (req, res) => {
    try {
      const data = await dataStore.upsertData(req.body);
      res.status(201).json({
        success: true,
        data: data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get data by ID
  // TODO: Re-enable authentication in production
  router.get('/data/:entityType/:entityId', async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { app_id } = req.query;

      if (!app_id) {
        return res.status(400).json({
          success: false,
          error: 'app_id query parameter required'
        });
      }

      const data = await dataStore.getData(app_id, entityType, entityId);
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Data not found'
        });
      }

      res.json({
        success: true,
        data: data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Query data
  // TODO: Re-enable authentication in production
  router.get('/data/:entityType', async (req, res) => {
    try {
      const { entityType } = req.params;
      const { app_id, ...filters } = req.query;

      if (!app_id) {
        return res.status(400).json({
          success: false,
          error: 'app_id query parameter required'
        });
      }

      const data = await dataStore.queryData({
        app_id,
        entity_type: entityType,
        filters: filters.filter ? JSON.parse(filters.filter) : {},
        sort: filters.sort || 'updated_at',
        order: filters.order || 'DESC',
        limit: parseInt(filters.limit) || 50,
        offset: parseInt(filters.offset) || 0
      });

      res.json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Delete data
  router.delete('/data/:entityType/:entityId', authMiddleware.authenticateApp, auditMiddleware.log, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const success = await dataStore.deleteData(req.app.app_id, entityType, entityId);

      res.json({
        success: success,
        message: success ? 'Data deleted' : 'Data not found'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // =====================================================
  // Relationship Routes
  // =====================================================

  // Create relationship
  router.post('/relationships', authMiddleware.authenticateApp, auditMiddleware.log, async (req, res) => {
    try {
      const relationship = await dataStore.createRelationship(req.body);
      res.status(201).json({
        success: true,
        data: relationship
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get relationships
  router.get('/relationships/:entityType/:entityId', authMiddleware.authenticate, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { app_id, direction = 'both' } = req.query;

      if (!app_id) {
        return res.status(400).json({
          success: false,
          error: 'app_id query parameter required'
        });
      }

      const relationships = await dataStore.getRelationships(app_id, entityType, entityId, direction);

      res.json({
        success: true,
        data: relationships,
        count: relationships.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // =====================================================
  // Event Routes
  // =====================================================

  // Publish event
  router.post('/events', authMiddleware.authenticateApp, auditMiddleware.log, async (req, res) => {
    try {
      const event = await eventManager.publishEvent({
        ...req.body,
        source_app_id: req.app.app_id
      });

      res.status(201).json({
        success: true,
        data: event
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Subscribe to event
  router.post('/events/subscribe', authMiddleware.authenticateApp, auditMiddleware.log, async (req, res) => {
    try {
      const subscription = await eventManager.subscribe({
        ...req.body,
        app_id: req.app.app_id
      });

      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // Unsubscribe from event
  router.delete('/events/subscribe/:subscriptionId', authMiddleware.authenticateApp, auditMiddleware.log, async (req, res) => {
    try {
      const success = await eventManager.unsubscribe(req.params.subscriptionId);

      res.json({
        success: success,
        message: success ? 'Unsubscribed successfully' : 'Subscription not found'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get event history
  router.get('/events/history', authMiddleware.authenticate, async (req, res) => {
    try {
      const events = await eventManager.getEventHistory(req.query);

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // =====================================================
  // Statistics & Monitoring
  // =====================================================

  // Get data statistics
  router.get('/stats/data/:appId', authMiddleware.authenticate, async (req, res) => {
    try {
      const stats = await dataStore.getDataStats(req.params.appId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

module.exports = { initializeRoutes };
