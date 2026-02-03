-- Free Trial System Migration
-- This migration adds subscription and trial tracking capabilities

-- Add subscription columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'expired'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'trial'
    CHECK (subscription_plan IN ('trial', 'starter', 'growth', 'business'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Trial allowances (based on Option B)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_minutes_allowed INTEGER DEFAULT 50;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_minutes_used INTEGER DEFAULT 0;

-- Paid plan allowances (will be set based on plan)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_minutes_allowed INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_minutes_used INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_minutes_reset_date TIMESTAMP WITH TIME ZONE;

-- Feature flags
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "max_agents": 1,
  "custom_voice_cloning": false,
  "advanced_analytics": false,
  "crm_integration": false,
  "api_access": false,
  "priority_support": false,
  "availability_24_7": false,
  "team_members_allowed": 1
}'::jsonb;

-- Billing information
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add converted_from_trial to track conversion
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS converted_from_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMP WITH TIME ZONE;

-- Create subscriptions table for detailed tracking
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('trial', 'starter', 'growth', 'business')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),

    -- Pricing
    amount INTEGER NOT NULL DEFAULT 0, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),

    -- Dates
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,

    -- External IDs
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    UNIQUE(tenant_id, start_date)
);

-- Create usage_tracking table for detailed call minute tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

    -- Usage details
    minutes_used INTEGER NOT NULL DEFAULT 0,
    usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN ('trial', 'paid', 'overage')),

    -- Period tracking
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trial_events table for tracking trial lifecycle
CREATE TABLE IF NOT EXISTS trial_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'trial_started',
        'trial_ended',
        'trial_converted',
        'trial_expired',
        'reminder_sent_day_7',
        'reminder_sent_day_12',
        'reminder_sent_day_14'
    )),

    -- Event details
    event_data JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_subscription_plan ON tenants(subscription_plan);
CREATE INDEX idx_tenants_trial_end_date ON tenants(trial_end_date);
CREATE INDEX idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE INDEX idx_usage_tracking_tenant_id ON usage_tracking(tenant_id);
CREATE INDEX idx_usage_tracking_created_at ON usage_tracking(created_at);

CREATE INDEX idx_trial_events_tenant_id ON trial_events(tenant_id);
CREATE INDEX idx_trial_events_event_type ON trial_events(event_type);
CREATE INDEX idx_trial_events_created_at ON trial_events(created_at);

-- Add triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize trial for new tenant
CREATE OR REPLACE FUNCTION initialize_trial()
RETURNS TRIGGER AS $$
BEGIN
    -- Set trial dates (14 days from now)
    NEW.trial_start_date = TIMEZONE('utc'::text, NOW());
    NEW.trial_end_date = TIMEZONE('utc'::text, NOW()) + INTERVAL '14 days';

    -- Set trial status
    NEW.subscription_status = 'trial';
    NEW.subscription_plan = 'trial';

    -- Set trial allowances (Option B: 50 minutes)
    NEW.trial_minutes_allowed = 50;
    NEW.trial_minutes_used = 0;

    -- Set trial features
    NEW.features = '{
        "max_agents": 1,
        "max_phone_numbers": 1,
        "custom_voice_cloning": false,
        "advanced_analytics": false,
        "crm_integration": false,
        "api_access": false,
        "priority_support": false,
        "availability_24_7": false,
        "team_members_allowed": 1,
        "voice_options": 3,
        "calendar_integration": "basic",
        "webhook_support": true,
        "email_notifications": true
    }'::jsonb;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize trial on tenant creation
DROP TRIGGER IF EXISTS initialize_trial_on_tenant_create ON tenants;
CREATE TRIGGER initialize_trial_on_tenant_create
    BEFORE INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION initialize_trial();

-- Function to check trial expiration
CREATE OR REPLACE FUNCTION check_trial_expiration()
RETURNS void AS $$
BEGIN
    -- Update expired trials
    UPDATE tenants
    SET subscription_status = 'expired'
    WHERE subscription_status = 'trial'
    AND trial_end_date < TIMEZONE('utc'::text, NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to track call usage
CREATE OR REPLACE FUNCTION track_call_usage()
RETURNS TRIGGER AS $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Get tenant info
    SELECT * INTO tenant_record
    FROM tenants
    WHERE id = NEW.tenant_id;

    -- Calculate minutes from duration (assuming duration is in seconds)
    DECLARE
        minutes_consumed INTEGER := CEIL(NEW.duration / 60.0);
    BEGIN
        -- Update usage based on subscription status
        IF tenant_record.subscription_status = 'trial' THEN
            -- Update trial minutes
            UPDATE tenants
            SET trial_minutes_used = trial_minutes_used + minutes_consumed
            WHERE id = NEW.tenant_id;

            -- Track usage
            INSERT INTO usage_tracking (tenant_id, call_id, minutes_used, usage_type, period_start, period_end)
            VALUES (
                NEW.tenant_id,
                NEW.id,
                minutes_consumed,
                'trial',
                tenant_record.trial_start_date,
                tenant_record.trial_end_date
            );
        ELSE
            -- Update paid plan minutes
            UPDATE tenants
            SET plan_minutes_used = plan_minutes_used + minutes_consumed
            WHERE id = NEW.tenant_id;

            -- Track usage
            INSERT INTO usage_tracking (tenant_id, call_id, minutes_used, usage_type, period_start, period_end)
            VALUES (
                NEW.tenant_id,
                NEW.id,
                minutes_consumed,
                'paid',
                tenant_record.current_period_start,
                tenant_record.current_period_end
            );
        END IF;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track usage on call completion
DROP TRIGGER IF EXISTS track_usage_on_call ON calls;
CREATE TRIGGER track_usage_on_call
    AFTER INSERT ON calls
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION track_call_usage();

-- Function to get tenant usage stats
CREATE OR REPLACE FUNCTION get_tenant_usage(tenant_uuid UUID)
RETURNS TABLE (
    subscription_status VARCHAR,
    subscription_plan VARCHAR,
    is_trial BOOLEAN,
    trial_days_remaining INTEGER,
    trial_minutes_allowed INTEGER,
    trial_minutes_used INTEGER,
    trial_minutes_remaining INTEGER,
    plan_minutes_allowed INTEGER,
    plan_minutes_used INTEGER,
    plan_minutes_remaining INTEGER,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    can_make_calls BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.subscription_status,
        t.subscription_plan,
        (t.subscription_status = 'trial') as is_trial,
        CASE
            WHEN t.subscription_status = 'trial' THEN
                GREATEST(0, EXTRACT(DAY FROM (t.trial_end_date - TIMEZONE('utc'::text, NOW())))::INTEGER)
            ELSE 0
        END as trial_days_remaining,
        t.trial_minutes_allowed,
        t.trial_minutes_used,
        GREATEST(0, t.trial_minutes_allowed - t.trial_minutes_used) as trial_minutes_remaining,
        t.plan_minutes_allowed,
        t.plan_minutes_used,
        GREATEST(0, t.plan_minutes_allowed - t.plan_minutes_used) as plan_minutes_remaining,
        t.trial_end_date,
        CASE
            WHEN t.subscription_status = 'trial' THEN
                (t.trial_minutes_used < t.trial_minutes_allowed AND t.trial_end_date > TIMEZONE('utc'::text, NOW()))
            WHEN t.subscription_status = 'active' THEN
                (t.plan_minutes_used < t.plan_minutes_allowed)
            ELSE FALSE
        END as can_make_calls
    FROM tenants t
    WHERE t.id = tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert comment for documentation
COMMENT ON TABLE subscriptions IS 'Tracks subscription history and details for each tenant';
COMMENT ON TABLE usage_tracking IS 'Tracks detailed call minute usage per tenant';
COMMENT ON TABLE trial_events IS 'Tracks trial lifecycle events for analytics and automation';
COMMENT ON FUNCTION initialize_trial IS 'Automatically initializes 14-day trial with 50 minutes for new tenants';
COMMENT ON FUNCTION track_call_usage IS 'Automatically tracks call minutes and updates tenant usage counters';
COMMENT ON FUNCTION get_tenant_usage IS 'Returns comprehensive usage statistics for a tenant';
