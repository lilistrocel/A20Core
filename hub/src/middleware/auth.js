/**
 * Authentication Middleware
 * Handles user and app authentication
 */

const crypto = require('crypto');

class AuthMiddleware {
  constructor(db) {
    this.db = db;
  }

  /**
   * Authenticate request (user or app)
   */
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Authorization header required'
        });
      }

      // Check if it's a Bearer token or API key
      if (authHeader.startsWith('Bearer ')) {
        await this.authenticateUser(req, res, next);
      } else if (authHeader.startsWith('ApiKey ')) {
        await this.authenticateApp(req, res, next);
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid authorization format'
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Authenticate user with JWT token
   */
  authenticateUser = async (req, res, next) => {
    try {
      const token = req.headers.authorization.replace('Bearer ', '');
      const { verifyToken, hashToken } = require('../utils/auth');

      // Verify JWT token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Verify session is still active
      const tokenHash = hashToken(token);
      const sessionQuery = `
        SELECT s.*, u.username, u.email, u.full_name, u.status
        FROM user_sessions s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.token_hash = $1
        AND s.is_active = true
        AND s.revoked_at IS NULL
        AND s.expires_at > CURRENT_TIMESTAMP
        AND u.is_active = true
      `;

      const sessionResult = await this.db.query(sessionQuery, [tokenHash]);

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Session expired or invalid'
        });
      }

      const session = sessionResult.rows[0];

      // Attach user and organization to request
      req.user = {
        user_id: session.user_id,
        username: session.username,
        email: session.email,
        full_name: session.full_name,
        status: session.status,
      };

      req.org_id = session.org_id;

      // Get organization membership if org_id is set
      if (session.org_id) {
        const membershipQuery = `
          SELECT om.role, o.org_name, o.display_name
          FROM organization_members om
          JOIN organizations o ON om.org_id = o.org_id
          WHERE om.user_id = $1 AND om.org_id = $2 AND om.status = 'active'
        `;
        const membershipResult = await this.db.query(membershipQuery, [
          session.user_id,
          session.org_id,
        ]);

        if (membershipResult.rows.length > 0) {
          req.organization = membershipResult.rows[0];
        }
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  };

  /**
   * Authenticate micro-app with API key
   */
  authenticateApp = async (req, res, next) => {
    try {
      const apiKey = req.headers.authorization.replace('ApiKey ', '');

      // Hash the API key
      const apiKeyHash = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');

      // Get app credentials
      const query = `
        SELECT ac.*, a.*
        FROM api_credentials ac
        JOIN apps a ON ac.app_id = a.app_id
        WHERE ac.api_key_hash = $1
          AND ac.is_active = true
          AND a.status = 'active'
          AND (ac.expires_at IS NULL OR ac.expires_at > CURRENT_TIMESTAMP)
      `;

      const result = await this.db.query(query, [apiKeyHash]);

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired API key'
        });
      }

      // Update last_used_at
      await this.db.query(
        'UPDATE api_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE credential_id = $1',
        [result.rows[0].credential_id]
      );

      req.app = result.rows[0];
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  };

  /**
   * Require admin role
   */
  requireAdmin = async (req, res, next) => {
    await this.authenticate(req, res, async () => {
      if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Admin role required'
        });
      }
      next();
    });
  };

  /**
   * Require organization admin or owner role
   */
  requireOrgAdmin = async (req, res, next) => {
    try {
      if (!req.user || !req.organization) {
        return res.status(403).json({
          success: false,
          error: 'Organization admin role required'
        });
      }

      if (!['owner', 'admin'].includes(req.organization.role)) {
        return res.status(403).json({
          success: false,
          error: 'Organization admin role required'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Check if user/app has specific permission
   */
  checkPermission = (resource, action) => {
    return async (req, res, next) => {
      try {
        let query;
        let params;

        if (req.user) {
          // Check user permissions via roles
          query = `
            SELECT COUNT(*) as count
            FROM permissions p
            JOIN user_roles ur ON p.granted_to_role_id = ur.role_id
            WHERE ur.user_id = $1
              AND p.resource_type = $2
              AND p.action = $3
              AND (p.expires_at IS NULL OR p.expires_at > CURRENT_TIMESTAMP)
          `;
          params = [req.user.user_id, resource, action];
        } else if (req.app) {
          // Check app permissions
          query = `
            SELECT COUNT(*) as count
            FROM permissions p
            WHERE p.granted_to_app_id = $1
              AND p.resource_type = $2
              AND p.action = $3
              AND (p.expires_at IS NULL OR p.expires_at > CURRENT_TIMESTAMP)
          `;
          params = [req.app.app_id, resource, action];
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const result = await this.db.query(query, params);

        if (parseInt(result.rows[0].count) === 0) {
          return res.status(403).json({
            success: false,
            error: `Permission denied: ${resource}.${action}`
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    };
  };

  /**
   * Generate API key for an app
   */
  async generateApiKey(appId) {
    // Generate random API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    const apiKeyPrefix = apiKey.substring(0, 8);

    // Store in database
    const query = `
      INSERT INTO api_credentials (app_id, api_key_hash, api_key_prefix)
      VALUES ($1, $2, $3)
      RETURNING credential_id
    `;

    await this.db.query(query, [appId, apiKeyHash, apiKeyPrefix]);

    return apiKey; // Return only once, never stored in plain text
  }

  /**
   * Generate JWT token for user
   */
  async generateUserToken(userId) {
    const jwt = require('jsonwebtoken');

    const payload = {
      user_id: userId,
      issued_at: Date.now()
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    return token;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(credentialId) {
    const query = `
      UPDATE api_credentials
      SET is_active = false
      WHERE credential_id = $1
    `;

    await this.db.query(query, [credentialId]);
  }
}

module.exports = AuthMiddleware;
