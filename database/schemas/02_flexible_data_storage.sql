-- =====================================================
-- Flexible Data Storage Tables
-- Version: 1.0.0
-- Description: Schema-less storage for micro-app data
-- =====================================================

-- =====================================================
-- Micro-app Data Storage
-- =====================================================
CREATE TABLE app_data (
    data_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    schema_version VARCHAR(20) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE(app_id, entity_type, entity_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_app_data_app_entity ON app_data(app_id, entity_type);
CREATE INDEX idx_app_data_entity_id ON app_data(entity_id);
CREATE INDEX idx_app_data_data_gin ON app_data USING GIN (data);
CREATE INDEX idx_app_data_updated_at ON app_data(updated_at DESC);
CREATE INDEX idx_app_data_created_at ON app_data(created_at DESC);
CREATE INDEX idx_app_data_deleted ON app_data(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_app_data_schema_version ON app_data(app_id, entity_type, schema_version);

-- =====================================================
-- Cross-App Relationships
-- =====================================================
CREATE TABLE data_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    source_entity_type VARCHAR(100) NOT NULL,
    source_entity_id VARCHAR(255) NOT NULL,
    target_app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    target_entity_type VARCHAR(100) NOT NULL,
    target_entity_id VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    UNIQUE(source_app_id, source_entity_type, source_entity_id, target_app_id, target_entity_type, target_entity_id, relationship_type)
);

CREATE INDEX idx_data_rel_source ON data_relationships(source_app_id, source_entity_type, source_entity_id);
CREATE INDEX idx_data_rel_target ON data_relationships(target_app_id, target_entity_type, target_entity_id);
CREATE INDEX idx_data_rel_type ON data_relationships(relationship_type);
CREATE INDEX idx_data_rel_active ON data_relationships(is_active);

-- =====================================================
-- Data Sync Status
-- =====================================================
CREATE TABLE data_sync_status (
    sync_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    last_sync_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('success', 'failed', 'in_progress', 'partial')),
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    next_sync_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sync_status_app ON data_sync_status(app_id);
CREATE INDEX idx_sync_status_entity ON data_sync_status(entity_type);
CREATE INDEX idx_sync_status_last_sync ON data_sync_status(last_sync_at DESC);

-- =====================================================
-- Data Validation Errors
-- =====================================================
CREATE TABLE data_validation_errors (
    error_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID REFERENCES apps(app_id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    schema_version VARCHAR(20),
    error_type VARCHAR(50) NOT NULL, -- schema_violation, constraint_error, business_rule
    error_field VARCHAR(255),
    error_message TEXT NOT NULL,
    data_snapshot JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(user_id),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_validation_errors_app ON data_validation_errors(app_id);
CREATE INDEX idx_validation_errors_entity ON data_validation_errors(entity_type);
CREATE INDEX idx_validation_errors_created ON data_validation_errors(created_at DESC);
CREATE INDEX idx_validation_errors_unresolved ON data_validation_errors(resolved_at) WHERE resolved_at IS NULL;

-- =====================================================
-- Aggregated Views (Materialized for performance)
-- =====================================================

-- View: Active app data count by entity type
CREATE MATERIALIZED VIEW mv_app_data_stats AS
SELECT
    app_id,
    entity_type,
    schema_version,
    COUNT(*) as record_count,
    MAX(updated_at) as last_updated,
    MIN(created_at) as first_created
FROM app_data
WHERE is_deleted = false
GROUP BY app_id, entity_type, schema_version;

CREATE UNIQUE INDEX idx_mv_app_data_stats ON mv_app_data_stats(app_id, entity_type, schema_version);

-- View: Relationship graph statistics
CREATE MATERIALIZED VIEW mv_relationship_stats AS
SELECT
    source_app_id,
    target_app_id,
    relationship_type,
    COUNT(*) as relationship_count,
    MAX(updated_at) as last_updated
FROM data_relationships
WHERE is_active = true
GROUP BY source_app_id, target_app_id, relationship_type;

CREATE UNIQUE INDEX idx_mv_relationship_stats ON mv_relationship_stats(source_app_id, target_app_id, relationship_type);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function: Soft delete app data
CREATE OR REPLACE FUNCTION soft_delete_app_data(
    p_app_id UUID,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE app_data
    SET is_deleted = true,
        deleted_at = CURRENT_TIMESTAMP
    WHERE app_id = p_app_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND is_deleted = false;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Get entity with relationships
CREATE OR REPLACE FUNCTION get_entity_with_relationships(
    p_app_id UUID,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'entity', (
            SELECT row_to_json(ad)
            FROM app_data ad
            WHERE ad.app_id = p_app_id
              AND ad.entity_type = p_entity_type
              AND ad.entity_id = p_entity_id
              AND ad.is_deleted = false
        ),
        'relationships', (
            SELECT jsonb_agg(row_to_json(dr))
            FROM data_relationships dr
            WHERE (dr.source_app_id = p_app_id
                   AND dr.source_entity_type = p_entity_type
                   AND dr.source_entity_id = p_entity_id)
               OR (dr.target_app_id = p_app_id
                   AND dr.target_entity_type = p_entity_type
                   AND dr.target_entity_id = p_entity_id)
              AND dr.is_active = true
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate data against schema
CREATE OR REPLACE FUNCTION validate_app_data() RETURNS TRIGGER AS $$
DECLARE
    schema_def JSONB;
BEGIN
    -- Get the active schema definition
    SELECT schema_definition INTO schema_def
    FROM schema_versions
    WHERE app_id = NEW.app_id
      AND entity_name = NEW.entity_type
      AND version = NEW.schema_version
      AND is_active = true;

    IF schema_def IS NULL THEN
        RAISE EXCEPTION 'No active schema found for app_id: %, entity_type: %, version: %',
            NEW.app_id, NEW.entity_type, NEW.schema_version;
    END IF;

    -- Note: Actual JSON Schema validation would require pg_jsonschema extension
    -- or external validation service

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_app_data_before_insert
    BEFORE INSERT ON app_data
    FOR EACH ROW
    EXECUTE FUNCTION validate_app_data();

-- =====================================================
-- Trigger for updated_at
-- =====================================================
CREATE TRIGGER update_app_data_updated_at BEFORE UPDATE ON app_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_rel_updated_at BEFORE UPDATE ON data_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Refresh materialized views (call periodically)
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_app_data_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_app_data_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_relationship_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE app_data IS 'Flexible JSONB storage for all micro-app data';
COMMENT ON TABLE data_relationships IS 'Cross-app entity relationships and references';
COMMENT ON TABLE data_sync_status IS 'Track synchronization status between apps and Hub';
COMMENT ON TABLE data_validation_errors IS 'Log of data validation failures for monitoring';
COMMENT ON MATERIALIZED VIEW mv_app_data_stats IS 'Aggregated statistics of app data by entity type';
COMMENT ON MATERIALIZED VIEW mv_relationship_stats IS 'Statistics on cross-app relationships';
