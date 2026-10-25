// Generated to match supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript` once the project is linked, keeping this
// file as the source of truth for both apps in the meantime.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          name: string
          address: string | null
          email: string | null
          phone: string | null
          website: string | null
          tax_number: string | null
          logo_url: string | null
          bank_account_name: string | null
          bank_name: string | null
          bank_account_type: string | null
          bank_account_number: string | null
          bank_branch: string | null
          signature_url: string | null
          default_currency: string
          quote_terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          address?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          tax_number?: string | null
          logo_url?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bank_account_type?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          signature_url?: string | null
          default_currency?: string
          quote_terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          tax_number?: string | null
          logo_url?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bank_account_type?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          signature_url?: string | null
          default_currency?: string
          quote_terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          user_id: string | null
          name: string
          company_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          status: Database["public"]["Enums"]["client_status"]
          source: string | null
          estimated_value: number | null
          last_contacted_at: string | null
          industry: string | null
          website: string | null
          country: string | null
          notes: string | null
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          company_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          source?: string | null
          estimated_value?: number | null
          last_contacted_at?: string | null
          industry?: string | null
          website?: string | null
          country?: string | null
          notes?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          company_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          source?: string | null
          estimated_value?: number | null
          last_contacted_at?: string | null
          industry?: string | null
          website?: string | null
          country?: string | null
          notes?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          client_id: string
          type: string
          note: string
          deal_id: string | null
          contact_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          type?: string
          note: string
          deal_id?: string | null
          contact_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          type?: string
          note?: string
          deal_id?: string | null
          contact_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          user_id: string | null
          client_id: string | null
          project_id: string | null
          invoice_number: string
          date: string
          due_date: string | null
          items: Json
          subtotal: number
          total: number
          notes: string | null
          status: string
          payment_date: string | null
          payment_amount: number | null
          payment_reference: string | null
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          client_id?: string | null
          project_id?: string | null
          invoice_number: string
          date?: string
          due_date?: string | null
          items?: Json
          subtotal?: number
          total?: number
          notes?: string | null
          status?: string
          payment_date?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          client_id?: string | null
          project_id?: string | null
          invoice_number?: string
          date?: string
          due_date?: string | null
          items?: Json
          subtotal?: number
          total?: number
          notes?: string | null
          status?: string
          payment_date?: string | null
          payment_amount?: number | null
          payment_reference?: string | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          user_id: string | null
          payment_date: string
          amount: number
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          user_id?: string | null
          payment_date?: string
          amount: number
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          user_id?: string | null
          payment_date?: string
          amount?: number
          reference?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          client_id: string | null
          name: string
          description: string | null
          status: Database["public"]["Enums"]["project_status"]
          start_date: string | null
          due_date: string | null
          budget: number | null
          created_by: string | null
          created_at: string
          updated_at: string
          health: Database["public"]["Enums"]["project_health"]
          next_milestone: string | null
          waiting_on_client: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          name: string
          description?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          start_date?: string | null
          due_date?: string | null
          budget?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          health?: Database["public"]["Enums"]["project_health"]
          next_milestone?: string | null
          waiting_on_client?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          name?: string
          description?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          start_date?: string | null
          due_date?: string | null
          budget?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          health?: Database["public"]["Enums"]["project_health"]
          next_milestone?: string | null
          waiting_on_client?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: Database["public"]["Enums"]["task_status"]
          priority: Database["public"]["Enums"]["task_priority"]
          assignee: string | null
          due_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          contractor_id: string | null
          brief: string | null
          definition_of_done: string | null
          access_notes: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          priority?: Database["public"]["Enums"]["task_priority"]
          assignee?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          contractor_id?: string | null
          brief?: string | null
          definition_of_done?: string | null
          access_notes?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          priority?: Database["public"]["Enums"]["task_priority"]
          assignee?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          contractor_id?: string | null
          brief?: string | null
          definition_of_done?: string | null
          access_notes?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          client_id: string
          full_name: string
          job_title: string | null
          email: string | null
          phone: string | null
          is_primary: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          full_name: string
          job_title?: string | null
          email?: string | null
          phone?: string | null
          is_primary?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          full_name?: string
          job_title?: string | null
          email?: string | null
          phone?: string | null
          is_primary?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          id: string
          client_id: string
          contact_id: string | null
          title: string
          stage: Database["public"]["Enums"]["deal_stage"]
          value: number
          currency: string
          probability: number | null
          service_type: string | null
          source: string | null
          expected_close_date: string | null
          owner_id: string | null
          lost_reason: string | null
          closed_at: string | null
          project_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          contact_id?: string | null
          title: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          value?: number
          currency?: string
          probability?: number | null
          service_type?: string | null
          source?: string | null
          expected_close_date?: string | null
          owner_id?: string | null
          lost_reason?: string | null
          closed_at?: string | null
          project_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          contact_id?: string | null
          title?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          value?: number
          currency?: string
          probability?: number | null
          service_type?: string | null
          source?: string | null
          expected_close_date?: string | null
          owner_id?: string | null
          lost_reason?: string | null
          closed_at?: string | null
          project_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_changes: {
        Row: {
          id: string
          deal_id: string
          from_stage: Database["public"]["Enums"]["deal_stage"] | null
          to_stage: Database["public"]["Enums"]["deal_stage"]
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          from_stage?: Database["public"]["Enums"]["deal_stage"] | null
          to_stage: Database["public"]["Enums"]["deal_stage"]
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          from_stage?: Database["public"]["Enums"]["deal_stage"] | null
          to_stage?: Database["public"]["Enums"]["deal_stage"]
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_changes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          id: string
          client_id: string
          deal_id: string | null
          title: string
          due_date: string
          assigned_to: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          deal_id?: string | null
          title: string
          due_date: string
          assigned_to?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          deal_id?: string | null
          title?: string
          due_date?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          client_id: string
          deal_id: string | null
          contact_id: string | null
          title: string
          status: Database["public"]["Enums"]["quote_status"]
          issue_date: string
          valid_until: string | null
          currency: string
          items: Json
          subtotal: number
          discount: number
          tax_rate: number
          tax_amount: number
          total: number
          notes: string | null
          terms: string | null
          invoice_id: string | null
          sent_at: string | null
          decided_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_number?: string
          client_id: string
          deal_id?: string | null
          contact_id?: string | null
          title?: string
          status?: Database["public"]["Enums"]["quote_status"]
          issue_date?: string
          valid_until?: string | null
          currency?: string
          items?: Json
          subtotal?: number
          discount?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          notes?: string | null
          terms?: string | null
          invoice_id?: string | null
          sent_at?: string | null
          decided_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_number?: string
          client_id?: string
          deal_id?: string | null
          contact_id?: string | null
          title?: string
          status?: Database["public"]["Enums"]["quote_status"]
          issue_date?: string
          valid_until?: string | null
          currency?: string
          items?: Json
          subtotal?: number
          discount?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          notes?: string | null
          terms?: string | null
          invoice_id?: string | null
          sent_at?: string | null
          decided_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          id: string
          business_name: string
          website: string | null
          industry: string | null
          location: string | null
          contact_channel: string | null
          lead_source: string | null
          observed_problem: string | null
          evidence: string | null
          tier: string | null
          stage: Database["public"]["Enums"]["prospect_stage"]
          consent_basis: string | null
          next_action: string | null
          next_action_date: string | null
          last_contacted_at: string | null
          estimated_value: number | null
          currency: string
          notes: string | null
          site_check: Json | null
          site_checked_at: string | null
          disqualified_reason: string | null
          client_id: string | null
          deal_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name: string
          website?: string | null
          industry?: string | null
          location?: string | null
          contact_channel?: string | null
          lead_source?: string | null
          observed_problem?: string | null
          evidence?: string | null
          tier?: string | null
          stage?: Database["public"]["Enums"]["prospect_stage"]
          consent_basis?: string | null
          next_action?: string | null
          next_action_date?: string | null
          last_contacted_at?: string | null
          estimated_value?: number | null
          currency?: string
          notes?: string | null
          site_check?: Json | null
          site_checked_at?: string | null
          disqualified_reason?: string | null
          client_id?: string | null
          deal_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          website?: string | null
          industry?: string | null
          location?: string | null
          contact_channel?: string | null
          lead_source?: string | null
          observed_problem?: string | null
          evidence?: string | null
          tier?: string | null
          stage?: Database["public"]["Enums"]["prospect_stage"]
          consent_basis?: string | null
          next_action?: string | null
          next_action_date?: string | null
          last_contacted_at?: string | null
          estimated_value?: number | null
          currency?: string
          notes?: string | null
          site_check?: Json | null
          site_checked_at?: string | null
          disqualified_reason?: string | null
          client_id?: string | null
          deal_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          name: string
          category: string
          description: string | null
          deliverables: string | null
          exclusions: string | null
          price: number | null
          price_approved: boolean
          currency: string
          unit: string
          estimated_hours: number | null
          estimated_cost: number | null
          active: boolean
          sort_order: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string
          description?: string | null
          deliverables?: string | null
          exclusions?: string | null
          price?: number | null
          price_approved?: boolean
          currency?: string
          unit?: string
          estimated_hours?: number | null
          estimated_cost?: number | null
          active?: boolean
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          description?: string | null
          deliverables?: string | null
          exclusions?: string | null
          price?: number | null
          price_approved?: boolean
          currency?: string
          unit?: string
          estimated_hours?: number | null
          estimated_cost?: number | null
          active?: boolean
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          id: string
          week_ending: string
          metrics: Json
          hours_sales: number | null
          hours_delivery: number | null
          hours_admin: number | null
          completed: string | null
          blockers: string | null
          marketing: string | null
          notes: string | null
          priorities: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          week_ending: string
          metrics?: Json
          hours_sales?: number | null
          hours_delivery?: number | null
          hours_admin?: number | null
          completed?: string | null
          blockers?: string | null
          marketing?: string | null
          notes?: string | null
          priorities?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          week_ending?: string
          metrics?: Json
          hours_sales?: number | null
          hours_delivery?: number | null
          hours_admin?: number | null
          completed?: string | null
          blockers?: string | null
          marketing?: string | null
          notes?: string | null
          priorities?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          id: string
          name: string
          skills: string[]
          email: string | null
          phone: string | null
          location: string | null
          rate: number | null
          rate_unit: string
          currency: string
          agreement_signed_on: string | null
          confidentiality_signed: boolean
          ip_assignment_signed: boolean
          active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          skills?: string[]
          email?: string | null
          phone?: string | null
          location?: string | null
          rate?: number | null
          rate_unit?: string
          currency?: string
          agreement_signed_on?: string | null
          confidentiality_signed?: boolean
          ip_assignment_signed?: boolean
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          skills?: string[]
          email?: string | null
          phone?: string | null
          location?: string | null
          rate?: number | null
          rate_unit?: string
          currency?: string
          agreement_signed_on?: string | null
          confidentiality_signed?: boolean
          ip_assignment_signed?: boolean
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_systems: {
        Row: {
          id: string
          client_id: string | null
          kind: string
          name: string
          url: string | null
          provider: string | null
          status: string
          renews_on: string | null
          renewal_cost: number | null
          currency: string
          paid_by: string
          on_care_plan: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          kind: string
          name: string
          url?: string | null
          provider?: string | null
          status?: string
          renews_on?: string | null
          renewal_cost?: number | null
          currency?: string
          paid_by?: string
          on_care_plan?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          kind?: string
          name?: string
          url?: string | null
          provider?: string | null
          status?: string
          renews_on?: string | null
          renewal_cost?: number | null
          currency?: string
          paid_by?: string
          on_care_plan?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: number
          table_name: string
          record_id: string | null
          action: string
          changes: Json
          label: string | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: number
          table_name: string
          record_id?: string | null
          action: string
          changes?: Json
          label?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: number
          table_name?: string
          record_id?: string | null
          action?: string
          changes?: Json
          label?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_team_member: {
        Args: { _user_id: string }
        Returns: boolean
      }
      convert_quote_to_invoice: {
        Args: { _quote_id: string }
        Returns: string
      }
      win_deal: {
        Args: { _deal_id: string; _create_project?: boolean }
        Returns: string | null
      }
      convert_prospect: {
        Args: { _prospect_id: string; _deal_title?: string | null; _contact_name?: string | null }
        Returns: string
      }
      weekly_metrics: {
        Args: { _week_ending: string }
        Returns: Json
      }
      refresh_weekly_review: {
        Args: { _week_ending: string }
        Returns: string
      }
      social_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          content_id: string
          approval_id: string | null
          brand: string
          platform: string
          format: string
          status: string
          headline: string | null
          hook: string | null
          caption: string | null
          cta: string | null
          hashtags: string[]
          link_url: string | null
          revision: number
          feedback: string | null
          slot_at: string | null
          updated_at: string
        }[]
      }
      social_decide: {
        Args: { _approval_id: string; _decision: string; _feedback?: string | null }
        Returns: Json
      }
      team_members: {
        Args: Record<PropertyKey, never>
        Returns: { user_id: string; full_name: string | null; email: string | null; roles: string[]; joined_at: string | null }[]
      }
      set_member_role: {
        Args: { _user_id: string; _role: string | null }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "accountant"
      client_status: "lead" | "prospect" | "active" | "inactive"
      project_status: "planning" | "active" | "on_hold" | "completed"
      task_status: "todo" | "in_progress" | "done"
      task_priority: "low" | "medium" | "high"
      deal_stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired"
      prospect_stage: "researching" | "ready" | "contacted" | "follow_up_due" | "conversation_booked" | "nurture" | "converted" | "disqualified"
      project_health: "on_track" | "at_risk" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "accountant"],
      client_status: ["lead", "prospect", "active", "inactive"],
      project_status: ["planning", "active", "on_hold", "completed"],
      task_status: ["todo", "in_progress", "done"],
      task_priority: ["low", "medium", "high"],
      deal_stage: ["lead", "qualified", "proposal", "negotiation", "won", "lost"],
      quote_status: ["draft", "sent", "accepted", "declined", "expired"],
      prospect_stage: ["researching", "ready", "contacted", "follow_up_due", "conversation_booked", "nurture", "converted", "disqualified"],
      project_health: ["on_track", "at_risk", "blocked"],
    },
  },
} as const
