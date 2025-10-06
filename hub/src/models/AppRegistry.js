/**
 * App Registry Model
 * Manages micro-app registration and lifecycle
 */

class AppRegistry {
  constructor(db) {
    this.db = db;
  }

  /**
   * Register a new micro-app
   * @param {Object} appData - App registration data
   * @returns {Promise<Object>} Registered app
   */
  async registerApp(appData) {
    const { app_name, app_version, communication_sheet, metadata = {} } = appData;

    // Validate communication sheet
    await this.validateCommunicationSheet(communication_sheet);

    const query = `
      INSERT INTO apps (app_name, app_version, status, communication_sheet_version, metadata)
      VALUES ($1, $2, 'active', $3, $4)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      app_name,
      app_version,
      communication_sheet.app_metadata.communication_sheet_version,
      JSON.stringify(metadata)
    ]);

    // Store communication sheet
    await this.storeCommunicationSheet(result.rows[0].app_id, communication_sheet);

    return result.rows[0];
  }

  /**
   * Update app heartbeat
   * @param {string} appId - App ID
   * @returns {Promise<void>}
   */
  async updateHeartbeat(appId) {
    const query = `
      UPDATE apps
      SET last_heartbeat = CURRENT_TIMESTAMP
      WHERE app_id = $1
    `;
    await this.db.query(query, [appId]);
  }

  /**
   * Get app by ID
   * @param {string} appId - App ID
   * @returns {Promise<Object>} App data
   */
  async getApp(appId) {
    const query = `
      SELECT * FROM apps WHERE app_id = $1
    `;
    const result = await this.db.query(query, [appId]);
    return result.rows[0];
  }

  /**
   * List all apps with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of apps
   */
  async listApps(filters = {}) {
    let query = 'SELECT * FROM apps WHERE 1=1';
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY registered_at DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Update app status
   * @param {string} appId - App ID
   * @param {string} status - New status (active, suspended, deprecated)
   * @returns {Promise<Object>} Updated app
   */
  async updateStatus(appId, status) {
    const query = `
      UPDATE apps
      SET status = $1
      WHERE app_id = $2
      RETURNING *
    `;
    const result = await this.db.query(query, [status, appId]);
    return result.rows[0];
  }

  /**
   * Store communication sheet
   * @param {string} appId - App ID
   * @param {Object} sheet - Communication sheet
   * @returns {Promise<Object>} Stored sheet
   */
  async storeCommunicationSheet(appId, sheet) {
    const crypto = require('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(sheet))
      .digest('hex');

    const query = `
      INSERT INTO communication_sheets (app_id, version, sheet_content, checksum)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (app_id, version)
      DO UPDATE SET sheet_content = $3, checksum = $4, registered_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      appId,
      sheet.app_metadata.version,
      JSON.stringify(sheet),
      checksum
    ]);

    return result.rows[0];
  }

  /**
   * Get communication sheet for an app
   * @param {string} appId - App ID
   * @param {string} version - Optional version
   * @returns {Promise<Object>} Communication sheet
   */
  async getCommunicationSheet(appId, version = null) {
    let query = `
      SELECT * FROM communication_sheets
      WHERE app_id = $1 AND is_active = true
    `;
    const params = [appId];

    if (version) {
      params.push(version);
      query += ` AND version = $${params.length}`;
    }

    query += ' ORDER BY registered_at DESC LIMIT 1';

    const result = await this.db.query(query, params);
    return result.rows[0]?.sheet_content;
  }

  /**
   * Validate communication sheet against schema
   * @param {Object} sheet - Communication sheet
   * @returns {Promise<boolean>} Validation result
   */
  async validateCommunicationSheet(sheet) {
    const Ajv = require('ajv');
    const addFormats = require('ajv-formats');
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const schema = require('../../../docs/standards/communication-sheet-schema.json');

    const validate = ajv.compile(schema);
    const valid = validate(sheet);

    if (!valid) {
      throw new Error(`Invalid communication sheet: ${JSON.stringify(validate.errors)}`);
    }

    return true;
  }

  /**
   * Search entities across all apps
   * @param {string} entityName - Entity name to search for
   * @returns {Promise<Array>} List of apps with this entity
   */
  async searchEntity(entityName) {
    const query = `
      SELECT
        a.app_id,
        a.app_name,
        cs.sheet_content->'entities' as entities
      FROM apps a
      JOIN communication_sheets cs ON a.app_id = cs.app_id
      WHERE cs.is_active = true
        AND cs.sheet_content @> jsonb_build_object('entities', jsonb_build_array(jsonb_build_object('entity_name', $1)))
      ORDER BY a.app_name
    `;

    const result = await this.db.query(query, [entityName]);
    return result.rows;
  }

  /**
   * Store display sheet
   * @param {string} appId - App ID
   * @param {Object} sheet - Display sheet
   * @returns {Promise<Object>} Stored sheet
   */
  async storeDisplaySheet(appId, sheet) {
    // Validate app exists
    const app = await this.getApp(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    // Validate display sheet
    await this.validateDisplaySheet(sheet);

    // Verify app_id matches
    if (sheet.app_metadata.app_id !== appId) {
      throw new Error('Display sheet app_id does not match provided appId');
    }

    const crypto = require('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(sheet))
      .digest('hex');

    const query = `
      INSERT INTO display_sheets (app_id, version, sheet_content, checksum)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (app_id, version)
      DO UPDATE SET sheet_content = $3, checksum = $4, registered_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      appId,
      sheet.app_metadata.version,
      JSON.stringify(sheet),
      checksum
    ]);

    return result.rows[0];
  }

  /**
   * Get display sheet for an app
   * @param {string} appId - App ID
   * @param {string} version - Optional version
   * @returns {Promise<Object>} Display sheet
   */
  async getDisplaySheet(appId, version = null) {
    let query = `
      SELECT * FROM display_sheets
      WHERE app_id = $1 AND is_active = true
    `;
    const params = [appId];

    if (version) {
      params.push(version);
      query += ` AND version = $${params.length}`;
    }

    query += ' ORDER BY registered_at DESC LIMIT 1';

    const result = await this.db.query(query, params);
    return result.rows[0]?.sheet_content;
  }

  /**
   * Validate display sheet against schema
   * @param {Object} sheet - Display sheet
   * @returns {Promise<boolean>} Validation result
   */
  async validateDisplaySheet(sheet) {
    const Ajv = require('ajv');
    const addFormats = require('ajv-formats');
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const schema = require('../../../docs/standards/display-sheet-schema.json');

    const validate = ajv.compile(schema);
    const valid = validate(sheet);

    if (!valid) {
      throw new Error(`Invalid display sheet: ${JSON.stringify(validate.errors)}`);
    }

    return true;
  }
}

module.exports = AppRegistry;
