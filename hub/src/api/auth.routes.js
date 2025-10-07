/**
 * Authentication Routes
 * User registration, login, and session management
 */

const express = require('express');
const router = express.Router();

function initializeAuthRoutes(authManager, orgManager, authMiddleware) {
  // =====================================================
  // Public Routes (No Authentication Required)
  // =====================================================

  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  router.post('/register', async (req, res) => {
    try {
      const { username, email, password, full_name, organization } = req.body;

      // Validate required fields
      if (!username || !email || !password || !organization) {
        return res.status(400).json({
          success: false,
          error: 'Username, email, password, and organization are required',
        });
      }

      // Check if username is available
      const usernameAvailable = await authManager.isUsernameAvailable(username);
      if (!usernameAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
        });
      }

      // Check if email is available
      const emailAvailable = await authManager.isEmailAvailable(email);
      if (!emailAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Register user
      const user = await authManager.registerUser({
        username,
        email,
        password,
        full_name,
      });

      // Check if organization exists
      let org = await orgManager.getOrganizationByName(organization);

      if (!org) {
        // Create new organization with user as owner
        org = await orgManager.createOrganization(
          {
            org_name: organization,
            display_name: organization,
          },
          user.user_id
        );

        res.status(201).json({
          success: true,
          message: 'Organization created and user registered as owner',
          data: {
            user,
            organization: org,
            role: 'owner',
            status: 'active',
          },
        });
      } else {
        // Request membership in existing organization
        await orgManager.requestMembership(org.org_id, user.user_id);

        res.status(201).json({
          success: true,
          message: 'User registered. Membership pending admin approval.',
          data: {
            user,
            organization: org,
            role: 'member',
            status: 'pending',
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  router.post('/login', async (req, res) => {
    try {
      const { username, password, organization } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
      }

      // Get client metadata
      const metadata = {
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      };

      // Login
      const result = await authManager.login(username, password, organization, metadata);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          organization: result.organization,
          organizations: result.organizations,
          force_password_change: result.force_password_change,
          membership_status: result.membership_status,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Check username availability
   * GET /api/v1/auth/check-username/:username
   */
  router.get('/check-username/:username', async (req, res) => {
    try {
      const available = await authManager.isUsernameAvailable(req.params.username);
      res.json({
        success: true,
        available,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Check email availability
   * GET /api/v1/auth/check-email/:email
   */
  router.get('/check-email/:email', async (req, res) => {
    try {
      const available = await authManager.isEmailAvailable(req.params.email);
      res.json({
        success: true,
        available,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Check organization name availability
   * GET /api/v1/auth/check-organization/:orgName
   */
  router.get('/check-organization/:orgName', async (req, res) => {
    try {
      const org = await orgManager.getOrganizationByName(req.params.orgName);
      res.json({
        success: true,
        available: !org,
        exists: !!org,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // =====================================================
  // Protected Routes (Authentication Required)
  // =====================================================

  /**
   * Get current user info
   * GET /api/v1/auth/me
   */
  router.get('/me', authMiddleware.authenticateUser, async (req, res) => {
    try {
      const user = await authManager.getUserById(req.user.user_id);
      const organizations = await orgManager.getUserOrganizations(req.user.user_id);

      res.json({
        success: true,
        data: {
          user,
          current_organization: req.organization,
          organizations,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  router.post('/logout', authMiddleware.authenticateUser, async (req, res) => {
    try {
      const token = req.headers.authorization.replace('Bearer ', '');
      await authManager.logout(token);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  router.post('/change-password', authMiddleware.authenticateUser, async (req, res) => {
    try {
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password) {
        return res.status(400).json({
          success: false,
          error: 'Old and new passwords are required',
        });
      }

      await authManager.changePassword(req.user.user_id, old_password, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Force password change (for temporary passwords)
   * POST /api/v1/auth/force-password-change
   */
  router.post('/force-password-change', authMiddleware.authenticateUser, async (req, res) => {
    try {
      const { new_password } = req.body;

      if (!new_password) {
        return res.status(400).json({
          success: false,
          error: 'New password is required',
        });
      }

      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }

      await authManager.forcePasswordChange(req.user.user_id, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again with your new password.',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = initializeAuthRoutes;
