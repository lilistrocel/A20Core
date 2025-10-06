-- =====================================================
-- Hub Core Tables - Fixed Schema
-- Version: 1.0.0
-- Description: Core infrastructure tables for the Hub
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Apps Registry
-- =====================================================
CREATE TABLE apps (
    app_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_name VARCHAR(100) UNIQUE NOT NULL,
    app_version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended', 'deprecated')),
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP,
    communication_sheet_version VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apps_status ON apps(status);
CREATE INDEX idx_apps_name ON apps(app_name);

-- =====================================================
-- Users & Authentication
-- =====================================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);

-- =====================================================
-- API Credentials
-- =====================================================
CREATE TABLE api_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(20) NOT NULL, -- First chars for identification
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    scopes JSONB DEFAULT '[]', -- Array of permission scopes
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_api_creds_app ON api_credentials(app_id);
CREATE INDEX idx_api_creds_active ON api_credentials(is_active);
CREATE INDEX idx_api_creds_prefix ON api_credentials(api_key_prefix);

-- =====================================================
-- Roles
-- =====================================================
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- User Roles
-- =====================================================
CREATE TABLE user_roles (
    user_role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(user_id),
    expires_at TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- =====================================================
-- Permissions & Roles
-- =====================================================
CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('read', 'write', 'delete', 'execute', 'admin')),
    granted_to_app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    granted_to_role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(user_id),
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    CHECK (granted_to_app_id IS NOT NULL OR granted_to_role_id IS NOT NULL)
);

CREATE INDEX idx_permissions_app ON permissions(app_id);
CREATE INDEX idx_permissions_resource ON permissions(resource_type);
CREATE INDEX idx_permissions_granted_app ON permissions(granted_to_app_id);
CREATE INDEX idx_permissions_granted_role ON permissions(granted_to_role_id);

-- =====================================================
-- Schema Registry (Track schema evolution)
-- =====================================================
CREATE TABLE schema_versions (
    schema_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    entity_name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    schema_definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deprecated_at TIMESTAMP,
    deprecation_reason TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(app_id, entity_name, version)
);

CREATE INDEX idx_schema_versions_app ON schema_versions(app_id);
CREATE INDEX idx_schema_versions_entity ON schema_versions(entity_name);
CREATE INDEX idx_schema_versions_active ON schema_versions(is_active);
CREATE INDEX idx_schema_versions_app_entity ON schema_versions(app_id, entity_name);

-- =====================================================
-- Audit Log
-- =====================================================
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    app_id UUID REFERENCES apps(app_id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    before_state JSONB,
    after_state JSONB,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20), -- success, failure, error
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_app ON audit_log(app_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Partition audit_log by month for better performance
-- Note: Implement partitioning strategy based on retention policy

-- =====================================================
-- Event Queue
-- =====================================================
CREATE TABLE event_queue (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    source_app_id UUID REFERENCES apps(app_id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    scheduled_for TIMESTAMP, -- For delayed events
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_event_queue_status ON event_queue(status);
CREATE INDEX idx_event_queue_type ON event_queue(event_type);
CREATE INDEX idx_event_queue_created ON event_queue(created_at DESC);
CREATE INDEX idx_event_queue_scheduled ON event_queue(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_event_queue_pending ON event_queue(status, created_at) WHERE status = 'pending';

-- =====================================================
-- Event Subscriptions
-- =====================================================
CREATE TABLE event_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    filter_criteria JSONB, -- Optional filters for events
    webhook_url TEXT,
    delivery_mode VARCHAR(20) DEFAULT 'async' CHECK (delivery_mode IN ('sync', 'async', 'batch')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_event_subs_app ON event_subscriptions(app_id);
CREATE INDEX idx_event_subs_type ON event_subscriptions(event_type);
CREATE INDEX idx_event_subs_active ON event_subscriptions(is_active);

-- =====================================================
-- Event Delivery Log
-- =====================================================
CREATE TABLE event_delivery_log (
    delivery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES event_queue(event_id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES event_subscriptions(subscription_id) ON DELETE CASCADE,
    delivered_at TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
    http_status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_event_delivery_event ON event_delivery_log(event_id);
CREATE INDEX idx_event_delivery_subscription ON event_delivery_log(subscription_id);
CREATE INDEX idx_event_delivery_status ON event_delivery_log(status);

-- =====================================================
-- Communication Sheets Registry
-- =====================================================
CREATE TABLE communication_sheets (
    sheet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    sheet_content JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deprecated_at TIMESTAMP,
    checksum VARCHAR(64), -- SHA-256 hash for integrity verification
    metadata JSONB DEFAULT '{}',
    UNIQUE(app_id, version)
);

CREATE INDEX idx_comm_sheets_app ON communication_sheets(app_id);
CREATE INDEX idx_comm_sheets_active ON communication_sheets(is_active);
CREATE INDEX idx_comm_sheets_content ON communication_sheets USING GIN (sheet_content);

-- =====================================================
-- Display Sheets Registry
-- =====================================================
CREATE TABLE display_sheets (
    sheet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    sheet_content JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deprecated_at TIMESTAMP,
    checksum VARCHAR(64), -- SHA-256 hash for integrity verification
    metadata JSONB DEFAULT '{}',
    UNIQUE(app_id, version)
);

CREATE INDEX idx_display_sheets_app ON display_sheets(app_id);
CREATE INDEX idx_display_sheets_active ON display_sheets(is_active);
CREATE INDEX idx_display_sheets_content ON display_sheets USING GIN (sheet_content);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_subs_updated_at BEFORE UPDATE ON event_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE apps IS 'Registry of all micro-apps connected to the Hub';
COMMENT ON TABLE users IS 'User accounts with authentication details';
COMMENT ON TABLE api_credentials IS 'API keys and credentials for app-to-hub authentication';
COMMENT ON TABLE permissions IS 'Fine-grained permissions for apps and roles';
COMMENT ON TABLE schema_versions IS 'Version history of entity schemas from all apps';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail of all system actions';
COMMENT ON TABLE event_queue IS 'Event queue for asynchronous event processing';
COMMENT ON TABLE event_subscriptions IS 'App subscriptions to specific event types';
COMMENT ON TABLE communication_sheets IS 'Registry of app communication sheets (API contracts)';
COMMENT ON TABLE display_sheets IS 'Registry of app display sheets (UI/Dashboard definitions)';
