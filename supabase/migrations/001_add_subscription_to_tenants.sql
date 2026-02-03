-- Add subscription fields to tenants table
ALTER TABLE tenants
ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free_trial',
ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN monthly_minutes_limit INTEGER DEFAULT 100,
ADD COLUMN minutes_used_current_period INTEGER DEFAULT 0,
ADD COLUMN period_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN period_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN concurrency_limit INTEGER DEFAULT 5;

-- Add comment for documentation
COMMENT ON COLUMN tenants.subscription_tier IS 'Subscription tier: free_trial, basic, pro, enterprise';
COMMENT ON COLUMN tenants.subscription_status IS 'Subscription status: active, expired, cancelled';
COMMENT ON COLUMN tenants.trial_ends_at IS '14 days from signup for free trial';
COMMENT ON COLUMN tenants.monthly_minutes_limit IS 'Total minutes allowed per billing period';
COMMENT ON COLUMN tenants.minutes_used_current_period IS 'Minutes used in current period';
COMMENT ON COLUMN tenants.period_starts_at IS 'Start of current billing period';
COMMENT ON COLUMN tenants.period_ends_at IS 'End of current billing period';
COMMENT ON COLUMN tenants.concurrency_limit IS 'Maximum concurrent calls allowed';

-- Create index for faster queries
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_trial_ends_at ON tenants(trial_ends_at);
