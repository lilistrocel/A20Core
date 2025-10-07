-- =====================================================
-- Organizations & Multi-Tenancy Schema
-- Version: 1.0.0
-- Description: Organization-based multi-tenancy with user approval
-- =====================================================

-- =====================================================
-- Organizations
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_organizations_name ON organizations(org_name);
CREATE INDEX idx_organizations_status ON organizations(status);

COMMENT ON TABLE organizations IS 'Organizations for multi-tenant isolation';
COMMENT ON COLUMN organizations.org_name IS 'Unique organization identifier (lowercase, no spaces)';
COMMENT ON COLUMN organizations.display_name IS 'Human-readable organization name';

-- =====================================================
-- Update Users Table for Organizations
-- =====================================================
-- Add new columns to existing users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'deleted'));

COMMENT ON COLUMN users.status IS 'User status: pending (awaiting approval), active, suspended, deleted';

-- =====================================================
-- Organization Memberships
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_members (
    membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    invited_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_status ON organization_members(status);
CREATE INDEX idx_org_members_role ON organization_members(role);

COMMENT ON TABLE organization_members IS 'User membership in organizations with approval workflow';
COMMENT ON COLUMN organization_members.role IS 'owner: first user, full control; admin: can approve users; member: regular user';
COMMENT ON COLUMN organization_members.status IS 'pending: awaiting admin approval; active: approved; suspended: temporarily disabled';

-- Trigger to auto-update updated_at on organization_members
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Organization Apps (Licensed Micro-Apps)
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_apps (
    org_app_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(app_id) ON DELETE CASCADE,
    license_key VARCHAR(255) NOT NULL,
    license_key_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_by UUID REFERENCES users(user_id),
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE(org_id, app_id),
    UNIQUE(license_key_hash)
);

CREATE INDEX idx_org_apps_org ON organization_apps(org_id);
CREATE INDEX idx_org_apps_app ON organization_apps(app_id);
CREATE INDEX idx_org_apps_status ON organization_apps(status);
CREATE INDEX idx_org_apps_license_hash ON organization_apps(license_key_hash);

COMMENT ON TABLE organization_apps IS 'Licensed micro-apps per organization';
COMMENT ON COLUMN organization_apps.license_key IS 'License key prefix for display (first 8 chars)';
COMMENT ON COLUMN organization_apps.license_key_hash IS 'Hashed license key for validation';

-- =====================================================
-- Update App Data for Multi-Tenancy
-- =====================================================
-- Add organization context to app_data table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_data') THEN
        ALTER TABLE app_data
        ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_app_data_org ON app_data(org_id);

        COMMENT ON COLUMN app_data.org_id IS 'Organization that owns this data (multi-tenant isolation)';
    END IF;
END $$;

-- =====================================================
-- User Sessions (for JWT token management)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_org ON user_sessions(org_id);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);

COMMENT ON TABLE user_sessions IS 'Active user sessions for JWT token validation and revocation';

-- =====================================================
-- Update Triggers for Organizations
-- =====================================================
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();

-- =====================================================
-- Insert Default Data
-- =====================================================

-- Create system roles if they don't exist
INSERT INTO roles (role_name, description, is_system_role)
VALUES
    ('org_owner', 'Organization owner with full control', true),
    ('org_admin', 'Organization administrator who can approve users', true),
    ('org_member', 'Organization member with standard access', true)
ON CONFLICT (role_name) DO NOTHING;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if user is org admin or owner
CREATE OR REPLACE FUNCTION is_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if organization name is available
CREATE OR REPLACE FUNCTION is_org_name_available(p_org_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM organizations
        WHERE LOWER(org_name) = LOWER(p_org_name)
        AND status != 'deleted'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    org_id UUID,
    org_name VARCHAR,
    display_name VARCHAR,
    role VARCHAR,
    membership_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.org_id,
        o.org_name,
        o.display_name,
        om.role,
        om.status as membership_status
    FROM organizations o
    INNER JOIN organization_members om ON o.org_id = om.org_id
    WHERE om.user_id = p_user_id
    AND o.status = 'active'
    ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql;
