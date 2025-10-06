/**
 * Audit Middleware
 * Logs all API actions for compliance and monitoring
 */

class AuditMiddleware {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log API action
   */
  log = async (req, res, next) => {
    const startTime = Date.now();

    // Capture original res.json to log response
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const duration = Date.now() - startTime;

      // Log to audit_log table (async, don't block response)
      this.logToDatabase(req, res, body, duration).catch(error => {
        console.error('Audit logging failed:', error);
      });

      return originalJson(body);
    };

    next();
  };

  /**
   * Log to database
   */
  async logToDatabase(req, res, responseBody, duration) {
    const query = `
      INSERT INTO audit_log (
        app_id,
        user_id,
        action,
        resource_type,
        resource_id,
        before_state,
        after_state,
        ip_address,
        user_agent,
        status,
        error_message,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    const appId = req.app?.app_id || null;
    const userId = req.user?.user_id || null;
    const action = `${req.method} ${req.path}`;
    const resourceType = this.extractResourceType(req.path);
    const resourceId = this.extractResourceId(req.path, req.params);
    const beforeState = req.method !== 'POST' ? req.body : null;
    const afterState = responseBody?.data || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const status = responseBody?.success ? 'success' : 'failure';
    const errorMessage = responseBody?.error || null;
    const metadata = {
      method: req.method,
      path: req.path,
      query: req.query,
      duration_ms: duration,
      status_code: res.statusCode
    };

    await this.db.query(query, [
      appId,
      userId,
      action,
      resourceType,
      resourceId,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      ipAddress,
      userAgent,
      status,
      errorMessage,
      JSON.stringify(metadata)
    ]);
  }

  /**
   * Extract resource type from path
   */
  extractResourceType(path) {
    const parts = path.split('/').filter(p => p);
    if (parts.length > 1) {
      return parts[1]; // e.g., /api/apps -> 'apps'
    }
    return 'unknown';
  }

  /**
   * Extract resource ID from path or params
   */
  extractResourceId(path, params) {
    // Try to extract UUID or ID from params
    const idKeys = Object.keys(params).filter(k => k.includes('Id') || k === 'id');
    if (idKeys.length > 0) {
      return params[idKeys[0]];
    }

    // Try to extract from path
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = path.match(uuidRegex);
    return match ? match[0] : null;
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters = {}) {
    const {
      app_id,
      user_id,
      action,
      resource_type,
      status,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = filters;

    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (app_id) {
      params.push(app_id);
      query += ` AND app_id = $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND user_id = $${params.length}`;
    }

    if (action) {
      params.push(action);
      query += ` AND action LIKE $${params.length}`;
    }

    if (resource_type) {
      params.push(resource_type);
      query += ` AND resource_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filters = {}) {
    const { app_id, start_date, end_date } = filters;

    let query = `
      SELECT
        action,
        status,
        COUNT(*) as count,
        AVG((metadata->>'duration_ms')::numeric) as avg_duration_ms
      FROM audit_log
      WHERE 1=1
    `;
    const params = [];

    if (app_id) {
      params.push(app_id);
      query += ` AND app_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += ' GROUP BY action, status ORDER BY count DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }
}

module.exports = AuditMiddleware;
