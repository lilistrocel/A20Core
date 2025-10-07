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
   * Get all organization members (admin only)
   * GET /api/v1/organization/members
   */
  router.get('/members', authMiddleware.requireOrgAdmin, async (req, res) => {
    try {
      const members = await orgManager.getOrganizationMembers(req.org_id);

      res.json({
        success: true,
        data: members,
        count: members.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Revoke/suspend member (admin only)
   * POST /api/v1/organization/revoke-member/:membershipId
   */
  router.post(
    '/revoke-member/:membershipId',
    authMiddleware.requireOrgAdmin,
    async (req, res) => {
      try {
        const membership = await orgManager.revokeMembership(
          req.params.membershipId,
          req.user.user_id
        );

        res.json({
          success: true,
          message: 'Member access revoked successfully',
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
   * Reactivate suspended member (admin only)
   * POST /api/v1/organization/reactivate-member/:membershipId
   */
  router.post(
    '/reactivate-member/:membershipId',
    authMiddleware.requireOrgAdmin,
    async (req, res) => {
      try {
        const membership = await orgManager.reactivateMembership(
          req.params.membershipId,
          req.user.user_id
        );

        res.json({
          success: true,
          message: 'Member access reactivated successfully',
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
   * Create user with temporary password (admin only)
   * POST /api/v1/organization/create-user
   */
  router.post('/create-user', authMiddleware.requireOrgAdmin, async (req, res) => {
    try {
      const { username, email, full_name } = req.body;

      if (!username || !email || !full_name) {
        return res.status(400).json({
          success: false,
          error: 'username, email, and full_name are required',
        });
      }

      const result = await orgManager.createUserWithTempPassword(
        { username, email, full_name },
        req.org_id,
        req.user.user_id
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

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
