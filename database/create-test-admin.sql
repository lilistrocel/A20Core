-- Create Test Admin User for A20 Core
-- Password: admin123
-- Use this for testing and development only

DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Delete existing admin user if exists
    DELETE FROM organization_members WHERE user_id IN (SELECT user_id FROM users WHERE username = 'admin');
    DELETE FROM users WHERE username = 'admin';
    DELETE FROM organizations WHERE org_name = 'admin-org';

    -- Create admin organization
    INSERT INTO organizations (org_name, display_name, status)
    VALUES ('admin-org', 'Admin Organization', 'active')
    RETURNING org_id INTO v_org_id;

    -- Create admin user with bcrypt hash for "admin123"
    -- Generated with: bcrypt.hash('admin123', 10)
    INSERT INTO users (username, email, password_hash, full_name, status, is_active, metadata)
    VALUES (
        'admin',
        'admin@a64core.local',
        '$2b$10$6Pxaa2JM4SHV3kZUNOr0z.Kp8aGqc0Bw/fuT7nZNhF2eH9tGUFIwi',
        'System Administrator',
        'active',
        true,
        '{}'::jsonb
    )
    RETURNING user_id INTO v_user_id;

    -- Add admin user to admin organization as owner
    INSERT INTO organization_members (org_id, user_id, role, status, approved_at)
    VALUES (
        v_org_id,
        v_user_id,
        'owner',
        'active',
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE 'Test admin user created successfully';
    RAISE NOTICE 'Username: admin';
    RAISE NOTICE 'Password: admin123';
    RAISE NOTICE 'Organization: admin-org';
END $$;

-- Verify
SELECT
    u.username,
    u.email,
    u.full_name,
    u.status,
    o.org_name,
    om.role,
    om.status as membership_status
FROM users u
JOIN organization_members om ON u.user_id = om.user_id
JOIN organizations o ON om.org_id = o.org_id
WHERE u.username = 'admin';
