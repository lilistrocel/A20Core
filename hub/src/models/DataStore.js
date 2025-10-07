/**
 * Data Store Model
 * Manages flexible data storage for micro-apps
 */

class DataStore {
  constructor(db) {
    this.db = db;
  }

  /**
   * Store or update app data
   * @param {Object} data - Data to store
   * @returns {Promise<Object>} Stored data
   */
  async upsertData(data) {
    const { app_id, entity_type, entity_id, schema_version, data: payload, metadata = {}, org_id } = data;

    // Enforce organization isolation
    if (!org_id) {
      throw new Error('org_id is required for data operations');
    }

    const query = `
      INSERT INTO app_data (app_id, entity_type, entity_id, schema_version, data, metadata, org_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (app_id, entity_type, entity_id)
      DO UPDATE SET
        data = $5,
        schema_version = $4,
        metadata = $6,
        org_id = $7,
        updated_at = CURRENT_TIMESTAMP,
        is_deleted = false
      RETURNING *
    `;

    const result = await this.db.query(query, [
      app_id,
      entity_type,
      entity_id,
      schema_version,
      JSON.stringify(payload),
      JSON.stringify(metadata),
      org_id
    ]);

    return result.rows[0];
  }

  /**
   * Get data by ID
   * @param {string} appId - App ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} orgId - Organization ID (required for isolation)
   * @returns {Promise<Object>} Data object
   */
  async getData(appId, entityType, entityId, orgId) {
    // Enforce organization isolation
    if (!orgId) {
      throw new Error('org_id is required for data operations');
    }

    const query = `
      SELECT * FROM app_data
      WHERE app_id = $1
        AND entity_type = $2
        AND entity_id = $3
        AND org_id = $4
        AND is_deleted = false
    `;

    const result = await this.db.query(query, [appId, entityType, entityId, orgId]);
    return result.rows[0];
  }

  /**
   * Query data with filters
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Array>} List of data objects
   */
  async queryData(queryParams) {
    const {
      app_id,
      entity_type,
      filters = {},
      sort = 'updated_at',
      order = 'DESC',
      limit = 50,
      offset = 0,
      org_id
    } = queryParams;

    // Enforce organization isolation
    if (!org_id) {
      throw new Error('org_id is required for data operations');
    }

    let query = `
      SELECT * FROM app_data
      WHERE app_id = $1 AND entity_type = $2 AND org_id = $3 AND is_deleted = false
    `;
    const params = [app_id, entity_type, org_id];

    // Add JSONB filters
    Object.entries(filters).forEach(([field, value]) => {
      params.push(value);
      query += ` AND data->>'${field}' = $${params.length}`;
    });

    // Add sorting and pagination
    query += ` ORDER BY ${sort} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Soft delete data
   * @param {string} appId - App ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} orgId - Organization ID (required for isolation)
   * @returns {Promise<boolean>} Success status
   */
  async deleteData(appId, entityType, entityId, orgId) {
    // Enforce organization isolation
    if (!orgId) {
      throw new Error('org_id is required for data operations');
    }

    // Use direct query instead of function to include org_id check
    const query = `
      UPDATE app_data
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
      WHERE app_id = $1 AND entity_type = $2 AND entity_id = $3 AND org_id = $4
      RETURNING data_id
    `;

    const result = await this.db.query(query, [appId, entityType, entityId, orgId]);
    return result.rowCount > 0;
  }

  /**
   * Create relationship between entities
   * @param {Object} relationship - Relationship data
   * @returns {Promise<Object>} Created relationship
   */
  async createRelationship(relationship) {
    const {
      source_app_id,
      source_entity_type,
      source_entity_id,
      target_app_id,
      target_entity_type,
      target_entity_id,
      relationship_type,
      metadata = {}
    } = relationship;

    const query = `
      INSERT INTO data_relationships (
        source_app_id, source_entity_type, source_entity_id,
        target_app_id, target_entity_type, target_entity_id,
        relationship_type, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (source_app_id, source_entity_type, source_entity_id, target_app_id, target_entity_type, target_entity_id, relationship_type)
      DO UPDATE SET
        is_active = true,
        metadata = $8,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      source_app_id,
      source_entity_type,
      source_entity_id,
      target_app_id,
      target_entity_type,
      target_entity_id,
      relationship_type,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Get entity with all relationships
   * @param {string} appId - App ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Entity with relationships
   */
  async getEntityWithRelationships(appId, entityType, entityId) {
    const query = `
      SELECT get_entity_with_relationships($1, $2, $3) as result
    `;

    const result = await this.db.query(query, [appId, entityType, entityId]);
    return result.rows[0].result;
  }

  /**
   * Get relationships for an entity
   * @param {string} appId - App ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} direction - 'source' | 'target' | 'both'
   * @returns {Promise<Array>} List of relationships
   */
  async getRelationships(appId, entityType, entityId, direction = 'both') {
    let query = `
      SELECT * FROM data_relationships
      WHERE is_active = true
    `;
    const params = [];

    if (direction === 'source' || direction === 'both') {
      params.push(appId, entityType, entityId);
      query += ` AND (source_app_id = $1 AND source_entity_type = $2 AND source_entity_id = $3`;
      if (direction === 'both') {
        query += ' OR ';
      } else {
        query += ')';
      }
    }

    if (direction === 'target' || direction === 'both') {
      if (direction === 'target') {
        params.push(appId, entityType, entityId);
        query += ` AND (target_app_id = $1 AND target_entity_type = $2 AND target_entity_id = $3)`;
      } else {
        query += `target_app_id = $1 AND target_entity_type = $2 AND target_entity_id = $3)`;
      }
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Track data sync status
   * @param {Object} syncStatus - Sync status data
   * @returns {Promise<Object>} Sync status record
   */
  async updateSyncStatus(syncStatus) {
    const {
      app_id,
      entity_type,
      sync_status,
      records_synced = 0,
      records_failed = 0,
      error_message = null,
      next_sync_at = null,
      metadata = {}
    } = syncStatus;

    const query = `
      INSERT INTO data_sync_status (
        app_id, entity_type, sync_status, records_synced,
        records_failed, error_message, next_sync_at, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      app_id,
      entity_type,
      sync_status,
      records_synced,
      records_failed,
      error_message,
      next_sync_at,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Log validation error
   * @param {Object} error - Validation error data
   * @returns {Promise<Object>} Error record
   */
  async logValidationError(error) {
    const {
      app_id,
      entity_type,
      entity_id,
      schema_version,
      error_type,
      error_field,
      error_message,
      data_snapshot = {}
    } = error;

    const query = `
      INSERT INTO data_validation_errors (
        app_id, entity_type, entity_id, schema_version,
        error_type, error_field, error_message, data_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      app_id,
      entity_type,
      entity_id,
      schema_version,
      error_type,
      error_field,
      error_message,
      JSON.stringify(data_snapshot)
    ]);

    return result.rows[0];
  }

  /**
   * Get data statistics
   * @param {string} appId - App ID
   * @returns {Promise<Array>} Statistics by entity type
   */
  async getDataStats(appId) {
    const query = `
      SELECT * FROM mv_app_data_stats
      WHERE app_id = $1
      ORDER BY entity_type
    `;

    const result = await this.db.query(query, [appId]);
    return result.rows;
  }
}

module.exports = DataStore;
