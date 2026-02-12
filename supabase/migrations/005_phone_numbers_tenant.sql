-- Add tenant-aware phone number tracking and bindings
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS inbound_agent_id UUID REFERENCES voice_agents(id) ON DELETE SET NULL;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS outbound_agent_id UUID REFERENCES voice_agents(id) ON DELETE SET NULL;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'purchased';
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE phone_numbers ALTER COLUMN agent_id DROP NOT NULL;

-- Backfill tenant_id and bindings from agent_id where possible
UPDATE phone_numbers pn
SET tenant_id = va.tenant_id,
    inbound_agent_id = pn.agent_id,
    outbound_agent_id = pn.agent_id
FROM voice_agents va
WHERE pn.agent_id = va.id
  AND pn.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_phone_numbers_tenant_id ON phone_numbers(tenant_id);

-- Update RLS policies for phone numbers to use tenant_id
DROP POLICY IF EXISTS "Users can view their tenant's phone numbers" ON phone_numbers;
DROP POLICY IF EXISTS "Super admins can view all phone numbers" ON phone_numbers;
DROP POLICY IF EXISTS "Service role can insert phone numbers" ON phone_numbers;
DROP POLICY IF EXISTS "Service role can update phone numbers" ON phone_numbers;

CREATE POLICY "Users can view their tenant's phone numbers"
    ON phone_numbers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.tenant_id = phone_numbers.tenant_id
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

CREATE POLICY "Users can insert their tenant phone numbers"
    ON phone_numbers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.tenant_id = phone_numbers.tenant_id
        )
    );

CREATE POLICY "Users can update their tenant phone numbers"
    ON phone_numbers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.tenant_id = phone_numbers.tenant_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.tenant_id = phone_numbers.tenant_id
        )
    );

CREATE POLICY "Users can delete their tenant phone numbers"
    ON phone_numbers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.tenant_id = phone_numbers.tenant_id
        )
    );
