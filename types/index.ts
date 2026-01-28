// Database Types
export interface Tenant {
  id: string;
  name: string;
  brand_config: BrandConfig;
  created_at: string;
  updated_at: string;
}

export interface BrandConfig {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
  subdomain?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'client';
  tenant_id?: string;
  auth_id: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  industry?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface VoiceAgent {
  id: string;
  tenant_id: string;
  name: string;
  script: string;
  settings: AgentSettings;
  phone_number?: string;
  status: 'active' | 'inactive' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface AgentSettings {
  voice_model: string;
  language: string;
  accent?: string;
  response_speed: 'fast' | 'medium' | 'slow';
  personality: string;
  max_call_duration?: number;
  after_hours_mode?: boolean;
}

export interface Call {
  id: string;
  agent_id: string;
  tenant_id: string;
  phone_number: string;
  duration: number;
  transcript: string;
  status: 'completed' | 'missed' | 'failed';
  recording_url?: string;
  created_at: string;
}

export interface PhoneNumber {
  id: string;
  agent_id: string;
  number: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

// API Types
export interface CreateAgentInput {
  tenant_id: string;
  name: string;
  script: string;
  settings: AgentSettings;
}

export interface UpdateAgentInput {
  id: string;
  name?: string;
  script?: string;
  settings?: Partial<AgentSettings>;
  status?: 'active' | 'inactive' | 'paused';
}

export interface CreateLeadInput {
  name: string;
  email: string;
  company?: string;
  industry?: string;
}

// UI Types
export interface DashboardStats {
  total_agents: number;
  active_agents: number;
  total_calls: number;
  total_minutes: number;
}
