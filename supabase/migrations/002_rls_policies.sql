-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Tenants table policies
CREATE POLICY "Public tenants are viewable by everyone"
    ON tenants FOR SELECT
    USING (true);

CREATE POLICY "Super admins can insert tenants"
    ON tenants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can update tenants"
    ON tenants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Users table policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Super admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Tenant admins can view their tenant's users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
            AND users.tenant_id = users.tenant_id
        )
    );

CREATE POLICY "Super admins can insert users"
    ON users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Leads table policies (public read, service role insert/update)
CREATE POLICY "Service role can insert leads"
    ON leads FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update leads"
    ON leads FOR UPDATE
    USING (true);

CREATE POLICY "Service role can view leads"
    ON leads FOR SELECT
    USING (true);

-- Voice agents table policies
CREATE POLICY "Users can view their tenant's voice agents"
    ON voice_agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = voice_agents.tenant_id
        )
    );

CREATE POLICY "Super admins can view all voice agents"
    ON voice_agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Tenant admins can insert voice agents"
    ON voice_agents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
            AND users.tenant_id = tenant_id
        )
    );

CREATE POLICY "Tenant admins can update voice agents"
    ON voice_agents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
            AND users.tenant_id = tenant_id
        )
    );

CREATE POLICY "Tenant admins can delete voice agents"
    ON voice_agents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
            AND users.tenant_id = tenant_id
        )
    );

-- Calls table policies
CREATE POLICY "Users can view their tenant's calls"
    ON calls FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.tenant_id = calls.tenant_id
        )
    );

CREATE POLICY "Super admins can view all calls"
    ON calls FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Service role can insert calls"
    ON calls FOR INSERT
    WITH CHECK (true);

-- Phone numbers table policies
CREATE POLICY "Users can view their tenant's phone numbers"
    ON phone_numbers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM voice_agents
                WHERE voice_agents.id = phone_numbers.agent_id
                AND voice_agents.tenant_id = users.tenant_id
            )
        )
    );

CREATE POLICY "Super admins can view all phone numbers"
    ON phone_numbers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Service role can insert phone numbers"
    ON phone_numbers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update phone numbers"
    ON phone_numbers FOR UPDATE
    USING (true);
