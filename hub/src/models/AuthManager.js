/**
 * Authentication Manager
 * Handles user registration, login, and session management
 */

const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  isValidEmail,
} = require('../utils/auth');

class AuthManager {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Unique username
   * @param {string} userData.email - Unique email
   * @param {string} userData.password - Password
   * @param {string} userData.full_name - Full name
   * @returns {Promise<Object>} Created user (without password)
   */
  async registerUser({ username, email, password, full_name }) {
    // Validate email
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with pending status
    const result = await this.pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, status, is_active)
       VALUES ($1, $2, $3, $4, 'pending', true)
       RETURNING user_id, username, email, full_name, status, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, full_name]
    );

    return result.rows[0];
  }

  /**
   * Login user and create session
   * @param {string} username - Username or email
   * @param {string} password - Password
   * @param {string} orgName - Organization to log into (optional)
   * @param {Object} metadata - Session metadata (ip, user_agent)
   * @returns {Promise<Object>} { user, token, organization }
   */
  async login(username, password, orgName, metadata = {}) {
    // Find user by username or email
    const userResult = await this.pool.query(
      `SELECT * FROM users
       WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
       AND is_active = true`,
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check user status
    if (user.status === 'suspended') {
      throw new Error('User account is suspended');
    }

    // Get user's organizations
    const orgsResult = await this.pool.query(
      `SELECT o.org_id, o.org_name, o.display_name, om.role, om.status
       FROM organizations o
       JOIN organization_members om ON o.org_id = om.org_id
       WHERE om.user_id = $1 AND o.status = 'active'
       ORDER BY om.role DESC, om.joined_at ASC`,
      [user.user_id]
    );

    const organizations = orgsResult.rows;

    // Determine which organization to log into
    let selectedOrg = null;
    if (orgName) {
      selectedOrg = organizations.find(
        (o) => o.org_name === orgName && o.status === 'active'
      );
      if (!selectedOrg) {
        throw new Error('You do not have access to this organization');
      }
    } else if (organizations.length > 0) {
      // Use first active organization
      selectedOrg = organizations.find((o) => o.status === 'active');
    }

    if (!selectedOrg && user.status !== 'active') {
      throw new Error('Account pending approval');
    }

    // Generate JWT token
    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      org_id: selectedOrg?.org_id,
      org_name: selectedOrg?.org_name,
      role: selectedOrg?.role,
    };

    const token = generateToken(tokenPayload);
    const tokenHash = hashToken(token);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.pool.query(
      `INSERT INTO user_sessions
        (user_id, org_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.user_id,
        selectedOrg?.org_id || null,
        tokenHash,
        metadata.ip_address || null,
        metadata.user_agent || null,
        expiresAt,
      ]
    );

    // Update last login
    await this.pool.query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [user.user_id]
    );

    // Return user without password hash
    delete user.password_hash;

    // Check if user needs to change password
    const force_password_change = user.metadata?.force_password_change || false;

    return {
      user,
      token,
      organization: selectedOrg,
      organizations,
      force_password_change,
    };
  }

  /**
   * Verify session token
   * @param {string} token - JWT token
   * @returns {Promise<Object|null>} Token payload or null
   */
  async verifySession(token) {
    const tokenHash = hashToken(token);

    const result = await this.pool.query(
      `SELECT s.*, u.username, u.email, u.status as user_status
       FROM user_sessions s
       JOIN users u ON s.user_id = u.user_id
       WHERE s.token_hash = $1
       AND s.is_active = true
       AND s.revoked_at IS NULL
       AND s.expires_at > CURRENT_TIMESTAMP
       AND u.is_active = true`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  /**
   * Logout user (revoke session)
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} True if session revoked
   */
  async logout(token) {
    const tokenHash = hashToken(token);

    const result = await this.pool.query(
      `UPDATE user_sessions
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1`,
      [tokenHash]
    );

    return result.rowCount > 0;
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User (without password)
   */
  async getUserById(userId) {
    const result = await this.pool.query(
      `SELECT user_id, username, email, full_name, status, is_active, created_at, last_login
       FROM users
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user by username or email
   * @param {string} identifier - Username or email
   * @returns {Promise<Object|null>} User (without password)
   */
  async getUserByIdentifier(identifier) {
    const result = await this.pool.query(
      `SELECT user_id, username, email, full_name, status, is_active, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [identifier]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if username is available
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} True if available
   */
  async isUsernameAvailable(username) {
    const result = await this.pool.query(
      `SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    return result.rows.length === 0;
  }

  /**
   * Check if email is available
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if available
   */
  async isEmailAvailable(email) {
    const result = await this.pool.query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return result.rows.length === 0;
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password changed
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Get current password hash
    const userResult = await this.pool.query(
      `SELECT password_hash FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await verifyPassword(oldPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await this.pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    // Revoke all existing sessions for security
    await this.pool.query(
      `UPDATE user_sessions
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    return true;
  }

  /**
   * Force password change (no old password required)
   * Used when user logs in with temporary password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password changed
   */
  async forcePasswordChange(userId, newPassword) {
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and remove force_password_change flag
    await this.pool.query(
      `UPDATE users
       SET password_hash = $1,
           metadata = jsonb_set(COALESCE(metadata, '{}'), '{force_password_change}', 'false'),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    // Revoke all existing sessions for security
    await this.pool.query(
      `UPDATE user_sessions
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    return true;
  }
}

module.exports = AuthManager;
