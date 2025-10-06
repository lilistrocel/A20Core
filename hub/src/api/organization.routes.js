/**
 * Organization Routes
 * Organization management, membership approval, and app licensing
 */

const express = require('express');
const router = express.Router();

function initializeOrganizationRoutes(orgManager, authMiddleware) {
  // All organization routes require authentication
  router.use(authMiddleware.authenticateUser);

  /**
   * Get current organization details
   * GET /api/v1/organization
   */
  router.get('/', async (req, res) => {
    try {
      if (!req.org_id) {
        return res.status(400).json({
          success: false,
          error: 'No organization selected',
        });
      }

      const org = await orgManager.getOrganizationById(req.org_id);

      res.json({
        success: true,
        data: org,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get pending members (admin only)
   * GET /api/v1/organization/pending-members
   */
  router.get('/pending-members', authMiddleware.requireOrgAdmin, async (req, res) => {
    try {
      const pendingMembers = await orgManager.getPendingMembers(req.org_id);

      res.json({
        success: true,
        data: pendingMembers,
        count: pendingMembers.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Approve pending member (admin only)
   * POST /api/v1/organization/approve-member/:membershipId
   */
  router.post(
    '/approve-member/:membershipId',
    authMiddleware.requireOrgAdmin,
    async (req, res) => {
      try {
        const membership = await orgManager.approveMembership(
          req.params.membershipId,
          req.user.user_id
        );

        res.json({
          success: true,
          message: 'Member approved successfully',
          data: membership,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * Get organization apps
   * GET /api/v1/organization/apps
   */
  router.get('/apps', async (req, res) => {
    try {
      const apps = await orgManager.getOrganizationApps(req.org_id);

      res.json({
        success: true,
        data: apps,
        count: apps.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Activate app with license key (admin only)
   * POST /api/v1/organization/activate-app
   */
  router.post('/activate-app', authMiddleware.requireOrgAdmin, async (req, res) => {
    try {
      const { app_id, license_key } = req.body;

      if (!app_id || !license_key) {
        return res.status(400).json({
          success: false,
          error: 'app_id and license_key are required',
        });
      }

      // Verify license key
      const verification = await orgManager.verifyLicenseKey(license_key, app_id);

      if (!verification) {
        return res.status(400).json({
          success: false,
          error: 'Invalid license key for this application',
        });
      }

      // Check if license is already used by another organization
      if (verification.org_id && verification.org_id !== req.org_id) {
        return res.status(400).json({
          success: false,
          error: 'License key already in use by another organization',
        });
      }

      // Add app to organization
      const orgApp = await orgManager.addLicensedApp(
        req.org_id,
        app_id,
        license_key,
        req.user.user_id
      );

      res.json({
        success: true,
        message: 'Application activated successfully',
        data: orgApp,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = initializeOrganizationRoutes;
