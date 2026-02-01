export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          brand_config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          brand_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand_config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          role: 'super_admin' | 'admin' | 'client'
          tenant_id: string | null
          auth_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'super_admin' | 'admin' | 'client'
          tenant_id?: string | null
          auth_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'super_admin' | 'admin' | 'client'
          tenant_id?: string | null
          auth_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          industry: string | null
          status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          industry?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          industry?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          created_at?: string
          updated_at?: string
        }
      }
      voice_agents: {
        Row: {
          id: string
          tenant_id: string
          name: string
          script: string
          settings: Json
          phone_number: string | null
          status: 'active' | 'inactive' | 'paused'
          retell_agent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          script: string
          settings: Json
          phone_number?: string | null
          status?: 'active' | 'inactive' | 'paused'
          retell_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          script?: string
          settings?: Json
          phone_number?: string | null
          status?: 'active' | 'inactive' | 'paused'
          retell_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          agent_id: string
          tenant_id: string
          phone_number: string
          duration: number
          transcript: string | null
          status: 'completed' | 'missed' | 'failed'
          recording_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          tenant_id: string
          phone_number: string
          duration: number
          transcript?: string | null
          status?: 'completed' | 'missed' | 'failed'
          recording_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          tenant_id?: string
          phone_number?: string
          duration?: number
          transcript?: string | null
          status?: 'completed' | 'missed' | 'failed'
          recording_url?: string | null
          created_at?: string
        }
      }
      phone_numbers: {
        Row: {
          id: string
          agent_id: string
          number: string
          status: 'active' | 'inactive' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          number: string
          status?: 'active' | 'inactive' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          number?: string
          status?: 'active' | 'inactive' | 'pending'
          created_at?: string
          updated_at?: string
        }
      }
      user_tenants: {
        Row: {
          user_id: string
          tenant_id: string
          role: 'admin' | 'member'
          created_at: string
        }
        Insert: {
          user_id: string
          tenant_id: string
          role?: 'admin' | 'member'
          created_at?: string
        }
        Update: {
          user_id?: string
          tenant_id?: string
          role?: 'admin' | 'member'
          created_at?: string
        }
      }
      calendar_providers: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          provider: 'google' | 'outlook' | 'custom'
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          provider_email: string | null
          calendar_id: string | null
          sync_enabled: boolean
          sync_token: string | null
          last_synced_at: string | null
          settings: Json
          status: 'active' | 'inactive' | 'error' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          provider: 'google' | 'outlook' | 'custom'
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          provider_email?: string | null
          calendar_id?: string | null
          sync_enabled?: boolean
          sync_token?: string | null
          last_synced_at?: string | null
          settings?: Json
          status?: 'active' | 'inactive' | 'error' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          provider?: 'google' | 'outlook' | 'custom'
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          provider_email?: string | null
          calendar_id?: string | null
          sync_enabled?: boolean
          sync_token?: string | null
          last_synced_at?: string | null
          settings?: Json
          status?: 'active' | 'inactive' | 'error' | 'expired'
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          calendar_provider_id: string | null
          external_event_id: string | null
          sync_source: 'internal' | 'google' | 'outlook'
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string
          timezone: string
          all_day: boolean
          recurrence_rule: string | null
          status: 'tentative' | 'confirmed' | 'cancelled'
          booked_by: 'voice_agent' | 'user' | 'external'
          agent_id: string | null
          call_id: string | null
          attendees: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          calendar_provider_id?: string | null
          external_event_id?: string | null
          sync_source?: 'internal' | 'google' | 'outlook'
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          timezone?: string
          all_day?: boolean
          recurrence_rule?: string | null
          status?: 'tentative' | 'confirmed' | 'cancelled'
          booked_by?: 'voice_agent' | 'user' | 'external'
          agent_id?: string | null
          call_id?: string | null
          attendees?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          calendar_provider_id?: string | null
          external_event_id?: string | null
          sync_source?: 'internal' | 'google' | 'outlook'
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          timezone?: string
          all_day?: boolean
          recurrence_rule?: string | null
          status?: 'tentative' | 'confirmed' | 'cancelled'
          booked_by?: 'voice_agent' | 'user' | 'external'
          agent_id?: string | null
          call_id?: string | null
          attendees?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      availability_rules: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          description: string | null
          schedule: Json
          timezone: string
          date_overrides: Json
          min_booking_notice: number
          max_booking_notice: number
          slot_duration: number
          buffer_before: number
          buffer_after: number
          is_default: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          description?: string | null
          schedule: Json
          timezone?: string
          date_overrides?: Json
          min_booking_notice?: number
          max_booking_notice?: number
          slot_duration?: number
          buffer_before?: number
          buffer_after?: number
          is_default?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          description?: string | null
          schedule?: Json
          timezone?: string
          date_overrides?: Json
          min_booking_notice?: number
          max_booking_notice?: number
          slot_duration?: number
          buffer_before?: number
          buffer_after?: number
          is_default?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      booking_settings: {
        Row: {
          id: string
          tenant_id: string
          agent_id: string | null
          assignable_users: Json
          event_type_config: Json
          distribution_strategy: 'round_robin' | 'least_busy' | 'priority' | 'specific_user'
          notifications: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          agent_id?: string | null
          assignable_users?: Json
          event_type_config?: Json
          distribution_strategy?: 'round_robin' | 'least_busy' | 'priority' | 'specific_user'
          notifications?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          agent_id?: string | null
          assignable_users?: Json
          event_type_config?: Json
          distribution_strategy?: 'round_robin' | 'least_busy' | 'priority' | 'specific_user'
          notifications?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_slot_availability: {
        Args: {
          p_user_id: string
          p_start_time: string
          p_end_time: string
          p_exclude_event_id?: string
        }
        Returns: boolean
      }
      get_next_available_user: {
        Args: {
          p_tenant_id: string
          p_agent_id: string
          p_start_time: string
          p_end_time: string
        }
        Returns: string
      }
    }
    Enums: {
      calendar_provider_type: 'google' | 'outlook' | 'custom'
      calendar_provider_status: 'active' | 'inactive' | 'error' | 'expired'
      event_sync_source: 'internal' | 'google' | 'outlook'
      event_status: 'tentative' | 'confirmed' | 'cancelled'
      event_booked_by: 'voice_agent' | 'user' | 'external'
      distribution_strategy: 'round_robin' | 'least_busy' | 'priority' | 'specific_user'
    }
  }
}
