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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
