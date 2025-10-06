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
