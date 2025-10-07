/**
 * Organization Manager
 * Handles organization creation, membership, and app licensing
 */

const { hashLicenseKey, getLicenseKeyPrefix, normalizeOrgName } = require('../utils/auth');

class OrganizationManager {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new organization with first user as owner
   * @param {Object} orgData - Organization data
   * @param {string} orgData.org_name - Unique organization name
   * @param {string} orgData.display_name - Display name
   * @param {string} userId - First user (becomes owner)
   * @returns {Promise<Object>} Created organization
   */
  async createOrganization({ org_name, display_name }, userId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Normalize organization name
      const normalizedOrgName = normalizeOrgName(org_name);

      // Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (org_name, display_name, status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [normalizedOrgName, display_name || org_name]
      );
      const organization = orgResult.rows[0];

      // Add user as owner with active status
      await client.query(
        `INSERT INTO organization_members (org_id, user_id, role, status, approved_at)
         VALUES ($1, $2, 'owner', 'active', CURRENT_TIMESTAMP)`,
        [organization.org_id, userId]
      );

      // Update user status to active
      await client.query(
        `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');
      return organization;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get organization by name
   * @param {string} orgName - Organization name
   * @returns {Promise<Object|null>} Organization or null
   */
  async getOrganizationByName(orgName) {
    const normalizedOrgName = normalizeOrgName(orgName);
    const result = await this.pool.query(
      `SELECT * FROM organizations
       WHERE org_name = $1 AND status != 'deleted'`,
      [normalizedOrgName]
    );
    return result.rows[0] || null;
  }

  /**
   * Get organization by ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object|null>} Organization or null
   */
  async getOrganizationById(orgId) {
    const result = await this.pool.query(
      `SELECT * FROM organizations
       WHERE org_id = $1 AND status != 'deleted'`,
      [orgId]
    );
    return result.rows[0] || null;
  }

  /**
   * Request to join organization (creates pending membership)
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Membership record
   */
  async requestMembership(orgId, userId) {
    const result = await this.pool.query(
      `INSERT INTO organization_members (org_id, user_id, role, status)
       VALUES ($1, $2, 'member', 'pending')
       ON CONFLICT (org_id, user_id)
       DO UPDATE SET status = 'pending'
       RETURNING *`,
      [orgId, userId]
    );
    return result.rows[0];
  }

  /**
   * Approve pending membership
   * @param {string} membershipId - Membership ID
   * @param {string} approvedBy - Admin user ID
   * @returns {Promise<Object>} Updated membership
   */
  async approveMembership(membershipId, approvedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update membership
      const membershipResult = await client.query(
        `UPDATE organization_members
         SET status = 'active', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE membership_id = $2
         RETURNING *`,
        [approvedBy, membershipId]
      );

      if (membershipResult.rows.length === 0) {
        throw new Error('Membership not found');
      }

      const membership = membershipResult.rows[0];

      // Update user status to active
      await client.query(
        `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [membership.user_id]
      );

      await client.query('COMMIT');
      return membership;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending members for organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Pending members with user details
   */
  async getPendingMembers(orgId) {
    const result = await this.pool.query(
      `SELECT
        om.membership_id,
        om.joined_at,
        u.user_id,
        u.username,
        u.email,
        u.full_name
       FROM organization_members om
       JOIN users u ON om.user_id = u.user_id
       WHERE om.org_id = $1 AND om.status = 'pending'
       ORDER BY om.joined_at ASC`,
      [orgId]
    );
    return result.rows;
  }

  /**
   * Get all members for organization (active and suspended)
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Members with user details
   */
  async getOrganizationMembers(orgId) {
    const result = await this.pool.query(
      `SELECT
        om.membership_id,
        om.role,
        om.status,
        om.joined_at,
        om.approved_at,
        u.user_id,
        u.username,
        u.email,
        u.full_name,
        u.last_login
       FROM organization_members om
       JOIN users u ON om.user_id = u.user_id
       WHERE om.org_id = $1 AND om.status IN ('active', 'suspended')
       ORDER BY
         CASE om.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'member' THEN 3
         END,
         om.joined_at ASC`,
      [orgId]
    );
    return result.rows;
  }

  /**
   * Revoke/suspend member access
   * @param {string} membershipId - Membership ID
   * @param {string} revokedBy - User ID who revoked
   * @returns {Promise<Object>} Updated membership
   */
  async revokeMembership(membershipId, revokedBy) {
    const result = await this.pool.query(
      `UPDATE organization_members
       SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
       WHERE membership_id = $1 AND role != 'owner'
       RETURNING *`,
      [membershipId]
    );

    if (result.rows.length === 0) {
      throw new Error('Cannot revoke owner access or membership not found');
    }

    return result.rows[0];
  }

  /**
   * Reactivate suspended member
   * @param {string} membershipId - Membership ID
   * @param {string} reactivatedBy - User ID who reactivated
   * @returns {Promise<Object>} Updated membership
   */
  async reactivateMembership(membershipId, reactivatedBy) {
    const result = await this.pool.query(
      `UPDATE organization_members
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE membership_id = $1 AND status = 'suspended'
       RETURNING *`,
      [membershipId]
    );

    if (result.rows.length === 0) {
      throw new Error('Membership not found or not suspended');
    }

    return result.rows[0];
  }

  /**
   * Permanently delete a suspended member
   * Deletes the user account and all related data
   * Can only delete suspended members, not owners
   * @param {string} membershipId - Membership ID
   * @param {string} deletedBy - User ID who performed deletion
   * @returns {Promise<Object>} Deletion summary
   */
  async deleteMember(membershipId, deletedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get membership details first
      const membershipResult = await client.query(
        `SELECT om.*, u.username, u.email
         FROM organization_members om
         JOIN users u ON om.user_id = u.user_id
         WHERE om.membership_id = $1 AND om.status = 'suspended' AND om.role != 'owner'`,
        [membershipId]
      );

      if (membershipResult.rows.length === 0) {
        throw new Error('Can only delete suspended members (not owners)');
      }

      const membership = membershipResult.rows[0];
      const userId = membership.user_id;

      // Delete in order (respecting foreign key constraints):
      
      // 1. Delete user sessions
      await client.query(
        `DELETE FROM user_sessions WHERE user_id = $1`,
        [userId]
      );

      // 2. Delete organization memberships (all orgs this user is part of)
      await client.query(
        `DELETE FROM organization_members WHERE user_id = $1`,
        [userId]
      );

      // 3. Delete user account
      await client.query(
        `DELETE FROM users WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      return {
        deleted: true,
        user_id: userId,
        username: membership.username,
        email: membership.email,
        message: 'Member permanently deleted. Username and email are now available for reuse.',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create user with temporary password and add to organization
   * @param {Object} userData - User data
   * @param {string} orgId - Organization ID
   * @param {string} createdBy - User ID who created
   * @returns {Promise<Object>} User and temp password
   */
  async createUserWithTempPassword(userData, orgId, createdBy) {
    const { username, email, full_name } = userData;
    const { hashPassword } = require('../utils/auth');
    const crypto = require('crypto');

    // Generate random 12-character temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await hashPassword(tempPassword);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create user with force_password_change flag
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, full_name, status, metadata)
         VALUES ($1, $2, $3, $4, 'active', $5)
         RETURNING user_id, username, email, full_name, status`,
        [
          username.toLowerCase(),
          email.toLowerCase(),
          passwordHash,
          full_name,
          JSON.stringify({ force_password_change: true })
        ]
      );
      const user = userResult.rows[0];

      // Add to organization as member with active status
      await client.query(
        `INSERT INTO organization_members (org_id, user_id, role, status, approved_at, approved_by, invited_by)
         VALUES ($1, $2, 'member', 'active', CURRENT_TIMESTAMP, $3, $3)`,
        [orgId, user.user_id, createdBy]
      );

      await client.query('COMMIT');

      return {
        user,
        temporary_password: tempPassword,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's organizations
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Organizations with membership info
   */
  async getUserOrganizations(userId) {
    const result = await this.pool.query(
      `SELECT
        o.org_id,
        o.org_name,
        o.display_name,
        o.status as org_status,
        om.role,
        om.status as membership_status
       FROM organizations o
       JOIN organization_members om ON o.org_id = om.org_id
       WHERE om.user_id = $1 AND o.status = 'active'
       ORDER BY om.joined_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Check if user is admin or owner of organization
   * @param {string} userId - User ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<boolean>} True if user is admin/owner
   */
  async isOrgAdmin(userId, orgId) {
    const result = await this.pool.query(
      `SELECT 1 FROM organization_members
       WHERE user_id = $1 AND org_id = $2
       AND role IN ('owner', 'admin') AND status = 'active'`,
      [userId, orgId]
    );
    return result.rows.length > 0;
  }

  /**
   * Add licensed app to organization
   * @param {string} orgId - Organization ID
   * @param {string} appId - App ID
   * @param {string} licenseKey - License key
   * @param {string} activatedBy - User ID who activated
   * @returns {Promise<Object>} Organization app record
   */
  async addLicensedApp(orgId, appId, licenseKey, activatedBy) {
    const licenseKeyHash = hashLicenseKey(licenseKey);
    const licenseKeyPrefix = getLicenseKeyPrefix(licenseKey);

    const result = await this.pool.query(
      `INSERT INTO organization_apps
        (org_id, app_id, license_key, license_key_hash, status, activated_by)
       VALUES ($1, $2, $3, $4, 'active', $5)
       ON CONFLICT (org_id, app_id)
       DO UPDATE SET
         license_key = $3,
         license_key_hash = $4,
         status = 'active',
         activated_at = CURRENT_TIMESTAMP,
         activated_by = $5
       RETURNING *`,
      [orgId, appId, licenseKeyPrefix, licenseKeyHash, activatedBy]
    );
    return result.rows[0];
  }

  /**
   * Get organization's licensed apps
   * @param {string} orgId - Organization ID
   * @returns {Promise<Array>} Licensed apps
   */
  async getOrganizationApps(orgId) {
    const result = await this.pool.query(
      `SELECT
        oa.org_app_id,
        oa.license_key,
        oa.status as license_status,
        oa.activated_at,
        oa.expires_at,
        a.app_id,
        a.app_name,
        a.app_version,
        a.status as app_status
       FROM organization_apps oa
       JOIN apps a ON oa.app_id = a.app_id
       WHERE oa.org_id = $1 AND oa.status = 'active'
       ORDER BY oa.activated_at DESC`,
      [orgId]
    );
    return result.rows;
  }

  /**
   * Verify license key for app
   * @param {string} licenseKey - License key
   * @param {string} appId - App ID
   * @returns {Promise<Object|null>} Organization app record or null
   */
  async verifyLicenseKey(licenseKey, appId) {
    const licenseKeyHash = hashLicenseKey(licenseKey);

    const result = await this.pool.query(
      `SELECT oa.*, o.org_name, o.display_name
       FROM organization_apps oa
       JOIN organizations o ON oa.org_id = o.org_id
       WHERE oa.license_key_hash = $1
       AND oa.app_id = $2
       AND oa.status = 'active'
       AND o.status = 'active'`,
      [licenseKeyHash, appId]
    );
    return result.rows[0] || null;
  }
}

module.exports = OrganizationManager;
