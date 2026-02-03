-- Create table for storing Google OAuth tokens
CREATE TABLE IF NOT EXISTS google_auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_auth_tokens_user_id ON google_auth_tokens(user_id);

-- Enable RLS
ALTER TABLE google_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own tokens
CREATE POLICY "Users can access their own Google tokens"
  ON google_auth_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy: Service role can access all tokens (for webhooks)
CREATE POLICY "Service role can access all Google tokens"
  ON google_auth_tokens
  FOR ALL
  USING (auth.role() = 'service_role');
