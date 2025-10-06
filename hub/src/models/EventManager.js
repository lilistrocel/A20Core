/**
 * Event Manager Model
 * Handles event queue and subscriptions
 */

class EventManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Publish an event to the queue
   * @param {Object} event - Event data
   * @returns {Promise<Object>} Published event
   */
  async publishEvent(event) {
    const {
      event_type,
      source_app_id,
      payload,
      scheduled_for = null,
      metadata = {}
    } = event;

    const query = `
      INSERT INTO event_queue (event_type, source_app_id, payload, scheduled_for, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      event_type,
      source_app_id,
      JSON.stringify(payload),
      scheduled_for,
      JSON.stringify(metadata)
    ]);

    const publishedEvent = result.rows[0];

    // Immediately trigger delivery for non-scheduled events
    if (!scheduled_for) {
      await this.deliverEvent(publishedEvent.event_id);
    }

    return publishedEvent;
  }

  /**
   * Subscribe to event type
   * @param {Object} subscription - Subscription data
   * @returns {Promise<Object>} Created subscription
   */
  async subscribe(subscription) {
    const {
      app_id,
      event_type,
      webhook_url,
      filter_criteria = null,
      delivery_mode = 'async',
      metadata = {}
    } = subscription;

    const query = `
      INSERT INTO event_subscriptions (
        app_id, event_type, webhook_url, filter_criteria, delivery_mode, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      app_id,
      event_type,
      webhook_url,
      filter_criteria ? JSON.stringify(filter_criteria) : null,
      delivery_mode,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Unsubscribe from event type
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribe(subscriptionId) {
    const query = `
      UPDATE event_subscriptions
      SET is_active = false
      WHERE subscription_id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [subscriptionId]);
    return result.rowCount > 0;
  }

  /**
   * Get subscriptions for an event type
   * @param {string} eventType - Event type
   * @returns {Promise<Array>} List of subscriptions
   */
  async getSubscriptions(eventType) {
    const query = `
      SELECT * FROM event_subscriptions
      WHERE event_type = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [eventType]);
    return result.rows;
  }

  /**
   * Deliver event to subscribers
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  async deliverEvent(eventId) {
    // Get event details
    const eventQuery = `
      SELECT * FROM event_queue WHERE event_id = $1
    `;
    const eventResult = await this.db.query(eventQuery, [eventId]);
    const event = eventResult.rows[0];

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Get active subscriptions
    const subscriptions = await this.getSubscriptions(event.event_type);

    // Update event status to processing
    await this.updateEventStatus(eventId, 'processing');

    // Deliver to each subscriber
    const deliveryPromises = subscriptions.map(sub =>
      this.deliverToSubscriber(event, sub)
    );

    try {
      await Promise.all(deliveryPromises);
      await this.updateEventStatus(eventId, 'completed');
    } catch (error) {
      await this.updateEventStatus(eventId, 'failed', error.message);
    }
  }

  /**
   * Deliver event to a single subscriber
   * @param {Object} event - Event object
   * @param {Object} subscription - Subscription object
   * @returns {Promise<void>}
   */
  async deliverToSubscriber(event, subscription) {
    // Check if event matches filter criteria
    if (subscription.filter_criteria) {
      const matches = this.matchesFilter(event.payload, subscription.filter_criteria);
      if (!matches) {
        return; // Skip delivery
      }
    }

    try {
      // Deliver via webhook
      const response = await this.sendWebhook(subscription.webhook_url, event);

      // Log successful delivery
      await this.logDelivery(event.event_id, subscription.subscription_id, 'success', {
        http_status_code: response.status,
        response_body: response.data
      });
    } catch (error) {
      // Log failed delivery
      await this.logDelivery(event.event_id, subscription.subscription_id, 'failed', {
        error_message: error.message
      });

      // Retry logic
      if (event.retry_count < event.max_retries) {
        await this.scheduleRetry(event);
      }
    }
  }

  /**
   * Send webhook request
   * @param {string} url - Webhook URL
   * @param {Object} event - Event data
   * @returns {Promise<Object>} Response
   */
  async sendWebhook(url, event) {
    const axios = require('axios');

    return await axios.post(url, {
      event_id: event.event_id,
      event_type: event.event_type,
      source_app_id: event.source_app_id,
      payload: event.payload,
      created_at: event.created_at
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Event-ID': event.event_id,
        'X-Hub-Event-Type': event.event_type
      }
    });
  }

  /**
   * Check if event matches filter criteria
   * @param {Object} payload - Event payload
   * @param {Object} criteria - Filter criteria
   * @returns {boolean} Match result
   */
  matchesFilter(payload, criteria) {
    // Simple object matching - can be enhanced
    return Object.entries(criteria).every(([key, value]) => {
      return payload[key] === value;
    });
  }

  /**
   * Update event status
   * @param {string} eventId - Event ID
   * @param {string} status - New status
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<void>}
   */
  async updateEventStatus(eventId, status, errorMessage = null) {
    const query = `
      UPDATE event_queue
      SET status = $1,
          processed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END,
          error_message = $2
      WHERE event_id = $3
    `;

    await this.db.query(query, [status, errorMessage, eventId]);
  }

  /**
   * Schedule event retry
   * @param {Object} event - Event object
   * @returns {Promise<void>}
   */
  async scheduleRetry(event) {
    const query = `
      UPDATE event_queue
      SET status = 'retrying',
          retry_count = retry_count + 1,
          scheduled_for = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
      WHERE event_id = $1
    `;

    await this.db.query(query, [event.event_id]);
  }

  /**
   * Log delivery attempt
   * @param {string} eventId - Event ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} status - Delivery status
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logDelivery(eventId, subscriptionId, status, details = {}) {
    const query = `
      INSERT INTO event_delivery_log (
        event_id, subscription_id, status,
        http_status_code, response_body, error_message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      eventId,
      subscriptionId,
      status,
      details.http_status_code || null,
      details.response_body ? JSON.stringify(details.response_body) : null,
      details.error_message || null,
      JSON.stringify(details.metadata || {})
    ]);
  }

  /**
   * Get pending events for processing
   * @param {number} limit - Max events to retrieve
   * @returns {Promise<Array>} List of pending events
   */
  async getPendingEvents(limit = 100) {
    const query = `
      SELECT * FROM event_queue
      WHERE status IN ('pending', 'retrying')
        AND (scheduled_for IS NULL OR scheduled_for <= CURRENT_TIMESTAMP)
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get event history
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Event history
   */
  async getEventHistory(filters = {}) {
    const {
      app_id,
      event_type,
      status,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = filters;

    let query = 'SELECT * FROM event_queue WHERE 1=1';
    const params = [];

    if (app_id) {
      params.push(app_id);
      query += ` AND source_app_id = $${params.length}`;
    }

    if (event_type) {
      params.push(event_type);
      query += ` AND event_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND created_at >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }
}

module.exports = EventManager;
