-- Calendar System Migration
-- Creates tables for custom calendar integration with Google Calendar sync

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE calendar_provider_type AS ENUM ('google', 'outlook', 'custom');
CREATE TYPE calendar_provider_status AS ENUM ('active', 'inactive', 'error', 'expired');
CREATE TYPE event_sync_source AS ENUM ('internal', 'google', 'outlook');
CREATE TYPE event_status AS ENUM ('tentative', 'confirmed', 'cancelled');
CREATE TYPE event_booked_by AS ENUM ('voice_agent', 'user', 'external');
CREATE TYPE distribution_strategy AS ENUM ('round_robin', 'least_busy', 'priority', 'specific_user');

-- ============================================================================
-- TABLE: calendar_providers
-- Stores OAuth credentials and settings for external calendar integrations
-- ============================================================================

CREATE TABLE calendar_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider calendar_provider_type NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  provider_email VARCHAR(255),
  calendar_id VARCHAR(255),
  sync_enabled BOOLEAN DEFAULT true,
  sync_token TEXT, -- For incremental sync
  last_synced_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb, -- {timezone, default_duration, buffer_before, buffer_after}
  status calendar_provider_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: calendar_events
-- All calendar events (synced from external calendars and internal bookings)
-- ============================================================================

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for shared events
  calendar_provider_id UUID REFERENCES calendar_providers(id) ON DELETE SET NULL,
  external_event_id VARCHAR(500), -- Google Calendar event ID or other provider ID
  sync_source event_sync_source DEFAULT 'internal',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  location VARCHAR(500),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  all_day BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format for recurring events
  status event_status DEFAULT 'confirmed',
  booked_by event_booked_by DEFAULT 'user',
  agent_id UUID REFERENCES voice_agents(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  attendees JSONB DEFAULT '[]'::jsonb, -- [{name, email, phone, status}]
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional custom data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_external_event UNIQUE (calendar_provider_id, external_event_id)
);

-- ============================================================================
-- TABLE: availability_rules
-- User working hours and booking rules
-- ============================================================================

CREATE TABLE availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Weekly schedule: {monday: [{start: "09:00", end: "17:00"}], tuesday: [...], ...}
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  timezone VARCHAR(100) DEFAULT 'UTC',
  -- Date-specific overrides: [{date: "2024-12-25", available: false, reason: "Holiday"}]
  date_overrides JSONB DEFAULT '[]'::jsonb,
  min_booking_notice INTEGER DEFAULT 60, -- Minutes
  max_booking_notice INTEGER DEFAULT 43200, -- Minutes (30 days default)
  slot_duration INTEGER DEFAULT 30, -- Minutes
  buffer_before INTEGER DEFAULT 0, -- Minutes
  buffer_after INTEGER DEFAULT 0, -- Minutes
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one default rule per user
  CONSTRAINT unique_default_rule UNIQUE (user_id, is_default) WHERE is_default = true
);

-- ============================================================================
-- TABLE: booking_settings
-- Tenant/agent booking configuration for voice agent appointments
-- ============================================================================

CREATE TABLE booking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES voice_agents(id) ON DELETE CASCADE,
  -- Assignable users: [{user_id, priority, calendar_provider_id}]
  assignable_users JSONB DEFAULT '[]'::jsonb,
  -- Event type config: {duration, title_template, description_template}
  event_type_config JSONB DEFAULT '{
    "duration": 30,
    "title_template": "Appointment with {{customer_name}}",
    "description_template": "Booked by voice agent\\nPhone: {{customer_phone}}\\nEmail: {{customer_email}}\\nNotes: {{notes}}"
  }'::jsonb,
  distribution_strategy distribution_strategy DEFAULT 'round_robin',
  -- Notifications: {send_email, send_sms, email_template, sms_template}
  notifications JSONB DEFAULT '{
    "send_email": true,
    "send_sms": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One setting per agent (or one tenant-wide if agent_id is null)
  CONSTRAINT unique_agent_settings UNIQUE (tenant_id, agent_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- calendar_providers indexes
CREATE INDEX idx_calendar_providers_tenant ON calendar_providers(tenant_id);
CREATE INDEX idx_calendar_providers_user ON calendar_providers(user_id);
CREATE INDEX idx_calendar_providers_status ON calendar_providers(status);
CREATE INDEX idx_calendar_providers_sync ON calendar_providers(sync_enabled, last_synced_at) WHERE sync_enabled = true;

-- calendar_events indexes
CREATE INDEX idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_time_range ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_provider ON calendar_events(calendar_provider_id);
CREATE INDEX idx_calendar_events_agent ON calendar_events(agent_id);
CREATE INDEX idx_calendar_events_call ON calendar_events(call_id);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_calendar_events_sync_source ON calendar_events(sync_source);
-- Composite index for availability queries
CREATE INDEX idx_calendar_events_availability ON calendar_events(tenant_id, user_id, start_time, end_time) WHERE status != 'cancelled';

-- availability_rules indexes
CREATE INDEX idx_availability_rules_tenant ON availability_rules(tenant_id);
CREATE INDEX idx_availability_rules_user ON availability_rules(user_id);
CREATE INDEX idx_availability_rules_active ON availability_rules(active) WHERE active = true;
CREATE INDEX idx_availability_rules_default ON availability_rules(user_id, is_default) WHERE is_default = true;

-- booking_settings indexes
CREATE INDEX idx_booking_settings_tenant ON booking_settings(tenant_id);
CREATE INDEX idx_booking_settings_agent ON booking_settings(agent_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE calendar_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

-- calendar_providers policies
CREATE POLICY "Users can view their own calendar providers"
  ON calendar_providers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own calendar providers"
  ON calendar_providers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar providers"
  ON calendar_providers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar providers"
  ON calendar_providers FOR DELETE
  USING (user_id = auth.uid());

-- calendar_events policies
CREATE POLICY "Users can view events in their tenant"
  ON calendar_events FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events in their tenant"
  ON calendar_events FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own events"
  ON calendar_events FOR UPDATE
  USING (
    user_id = auth.uid() OR
    -- Admins can update all tenant events
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND tenant_id = calendar_events.tenant_id
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own events"
  ON calendar_events FOR DELETE
  USING (
    user_id = auth.uid() OR
    -- Admins can delete all tenant events
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND tenant_id = calendar_events.tenant_id
      AND role = 'admin'
    )
  );

-- availability_rules policies
CREATE POLICY "Users can view availability rules in their tenant"
  ON availability_rules FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own availability rules"
  ON availability_rules FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own availability rules"
  ON availability_rules FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own availability rules"
  ON availability_rules FOR DELETE
  USING (user_id = auth.uid());

-- booking_settings policies
CREATE POLICY "Users can view booking settings in their tenant"
  ON booking_settings FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage booking settings"
  ON booking_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND tenant_id = booking_settings.tenant_id
      AND role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_calendar_providers_updated_at
  BEFORE UPDATE ON calendar_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_settings_updated_at
  BEFORE UPDATE ON booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to check if a time slot is available for a user
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_user_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping events
  SELECT COUNT(*) INTO conflict_count
  FROM calendar_events
  WHERE user_id = p_user_id
    AND status != 'cancelled'
    AND (id != p_exclude_event_id OR p_exclude_event_id IS NULL)
    AND (
      (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );

  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get next available user for booking (round-robin)
CREATE OR REPLACE FUNCTION get_next_available_user(
  p_tenant_id UUID,
  p_agent_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  v_settings RECORD;
  v_user_id UUID;
  v_assignable_users JSONB;
  v_user JSONB;
  v_last_booking TIMESTAMPTZ;
  v_selected_user_id UUID;
BEGIN
  -- Get booking settings for agent
  SELECT * INTO v_settings
  FROM booking_settings
  WHERE tenant_id = p_tenant_id
    AND (agent_id = p_agent_id OR agent_id IS NULL)
  ORDER BY agent_id NULLS LAST
  LIMIT 1;

  IF v_settings IS NULL THEN
    RETURN NULL;
  END IF;

  v_assignable_users := v_settings.assignable_users;

  -- Round-robin strategy
  IF v_settings.distribution_strategy = 'round_robin' THEN
    -- Find user with oldest last booking
    FOR v_user IN SELECT * FROM jsonb_array_elements(v_assignable_users)
    LOOP
      v_user_id := (v_user->>'user_id')::UUID;

      -- Check if user is available
      IF check_slot_availability(v_user_id, p_start_time, p_end_time) THEN
        SELECT MAX(created_at) INTO v_last_booking
        FROM calendar_events
        WHERE user_id = v_user_id
          AND booked_by = 'voice_agent';

        IF v_selected_user_id IS NULL OR v_last_booking < (
          SELECT MAX(created_at) FROM calendar_events WHERE user_id = v_selected_user_id
        ) THEN
          v_selected_user_id := v_user_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- TODO: Implement least_busy and priority strategies

  RETURN v_selected_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE calendar_providers IS 'OAuth credentials for external calendar integrations (Google, Outlook)';
COMMENT ON TABLE calendar_events IS 'All calendar events including synced from external calendars and internal bookings';
COMMENT ON TABLE availability_rules IS 'User working hours and booking rules';
COMMENT ON TABLE booking_settings IS 'Configuration for voice agent appointment bookings';

COMMENT ON FUNCTION check_slot_availability IS 'Check if a time slot is available for a user (no conflicts)';
COMMENT ON FUNCTION get_next_available_user IS 'Get next available user for booking based on distribution strategy';
