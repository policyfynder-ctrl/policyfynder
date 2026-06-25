export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          branch_id: string | null
          cancellation_reason: string | null
          confirmation_token: string | null
          created_at: string
          deleted_at: string | null
          end_time: string
          id: string
          lead_id: string
          notes: string | null
          rescheduled_from_id: string | null
          rm_id: string
          start_time: string
          status: Database['public']['Enums']['appointment_status']
          updated_at: string
        }
        Insert: {
          appointment_date: string
          branch_id?: string | null
          cancellation_reason?: string | null
          confirmation_token?: string | null
          created_at?: string
          deleted_at?: string | null
          end_time: string
          id?: string
          lead_id: string
          notes?: string | null
          rescheduled_from_id?: string | null
          rm_id: string
          start_time: string
          status?: Database['public']['Enums']['appointment_status']
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          branch_id?: string | null
          cancellation_reason?: string | null
          confirmation_token?: string | null
          created_at?: string
          deleted_at?: string | null
          end_time?: string
          id?: string
          lead_id?: string
          notes?: string | null
          rescheduled_from_id?: string | null
          rm_id?: string
          start_time?: string
          status?: Database['public']['Enums']['appointment_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_rescheduled_from_id_fkey'
            columns: ['rescheduled_from_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      branch_holidays: {
        Row: {
          branch_id: string | null
          created_at: string | null
          holiday_date: string
          id: string
          name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          holiday_date: string
          id?: string
          name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          holiday_date?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'branch_holidays_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_current: boolean
          lead_id: string
          method: Database['public']['Enums']['assignment_method']
          notes: string | null
          rm_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_current?: boolean
          lead_id: string
          method?: Database['public']['Enums']['assignment_method']
          notes?: string | null
          rm_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_current?: boolean
          lead_id?: string
          method?: Database['public']['Enums']['assignment_method']
          notes?: string | null
          rm_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lead_assignments_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_assignments_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_assignments_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          lead_id: string
          note: string | null
          rm_id: string
          scheduled_at: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          note?: string | null
          rm_id: string
          scheduled_at: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          note?: string | null
          rm_id?: string
          scheduled_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lead_follow_ups_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_follow_ups_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          lead_id: string
          note_type: Database['public']['Enums']['note_type']
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          lead_id: string
          note_type?: Database['public']['Enums']['note_type']
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          lead_id?: string
          note_type?: Database['public']['Enums']['note_type']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lead_notes_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_notes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      lead_sources: {
        Row: {
          channel_type: string
          cost_per_lead_cents: number
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          channel_type: string
          cost_per_lead_cents?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          channel_type?: string
          cost_per_lead_cents?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: Database['public']['Enums']['lead_status'] | null
          id: string
          lead_id: string
          reason: string | null
          to_stage: Database['public']['Enums']['lead_status']
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: Database['public']['Enums']['lead_status'] | null
          id?: string
          lead_id: string
          reason?: string | null
          to_stage: Database['public']['Enums']['lead_status']
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: Database['public']['Enums']['lead_status'] | null
          id?: string
          lead_id?: string
          reason?: string | null
          to_stage?: Database['public']['Enums']['lead_status']
        }
        Relationships: [
          {
            foreignKeyName: 'lead_stage_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_stage_history_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      leads: {
        Row: {
          assigned_rm_id: string | null
          branch_id: string | null
          city: string | null
          converted_value_cents: number | null
          country: string
          created_at: string
          customer_profile_id: string | null
          deleted_at: string | null
          email: string
          first_name: string
          follow_up_at: string | null
          id: string
          insurance_interest: string[]
          last_name: string
          lead_score: number
          lost_reason: string | null
          metadata: Json
          phone: string
          postal_code: string | null
          priority: number
          sla_deadline_at: string | null
          source: Database['public']['Enums']['lead_source']
          source_campaign: string | null
          source_content: string | null
          source_id: string | null
          source_medium: string | null
          state: string | null
          status: Database['public']['Enums']['lead_status']
          updated_at: string
        }
        Insert: {
          assigned_rm_id?: string | null
          branch_id?: string | null
          city?: string | null
          converted_value_cents?: number | null
          country?: string
          created_at?: string
          customer_profile_id?: string | null
          deleted_at?: string | null
          email: string
          first_name: string
          follow_up_at?: string | null
          id?: string
          insurance_interest?: string[]
          last_name: string
          lead_score?: number
          lost_reason?: string | null
          metadata?: Json
          phone: string
          postal_code?: string | null
          priority?: number
          sla_deadline_at?: string | null
          source: Database['public']['Enums']['lead_source']
          source_campaign?: string | null
          source_content?: string | null
          source_id?: string | null
          source_medium?: string | null
          state?: string | null
          status?: Database['public']['Enums']['lead_status']
          updated_at?: string
        }
        Update: {
          assigned_rm_id?: string | null
          branch_id?: string | null
          city?: string | null
          converted_value_cents?: number | null
          country?: string
          created_at?: string
          customer_profile_id?: string | null
          deleted_at?: string | null
          email?: string
          first_name?: string
          follow_up_at?: string | null
          id?: string
          insurance_interest?: string[]
          last_name?: string
          lead_score?: number
          lost_reason?: string | null
          metadata?: Json
          phone?: string
          postal_code?: string | null
          priority?: number
          sla_deadline_at?: string | null
          source?: Database['public']['Enums']['lead_source']
          source_campaign?: string | null
          source_content?: string | null
          source_id?: string | null
          source_medium?: string | null
          state?: string | null
          status?: Database['public']['Enums']['lead_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_assigned_rm_id_fkey'
            columns: ['assigned_rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_customer_profile_id_fkey'
            columns: ['customer_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'lead_sources'
            referencedColumns: ['id']
          },
        ]
      }
      notification_templates: {
        Row: {
          approved_at: string | null
          body_preview: string
          channel: Database['public']['Enums']['notification_channel']
          created_at: string | null
          external_template_id: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          required_variables: string[]
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          body_preview: string
          channel: Database['public']['Enums']['notification_channel']
          created_at?: string | null
          external_template_id?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          required_variables?: string[]
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          body_preview?: string
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string | null
          external_template_id?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          required_variables?: string[]
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          channel: Database['public']['Enums']['notification_channel']
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          max_retries: number
          next_retry_at: string | null
          payload: Json
          provider_message_id: string | null
          recipient_id: string
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: Database['public']['Enums']['notification_status']
          template_id: string | null
          template_ref_id: string | null
          type: Database['public']['Enums']['notification_type']
        }
        Insert: {
          appointment_id?: string | null
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient_id: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: Database['public']['Enums']['notification_status']
          template_id?: string | null
          template_ref_id?: string | null
          type: Database['public']['Enums']['notification_type']
        }
        Update: {
          appointment_id?: string | null
          channel?: Database['public']['Enums']['notification_channel']
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient_id?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: Database['public']['Enums']['notification_status']
          template_id?: string | null
          template_ref_id?: string | null
          type?: Database['public']['Enums']['notification_type']
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_template_ref_id_fkey'
            columns: ['template_ref_id']
            isOneToOne: false
            referencedRelation: 'notification_templates'
            referencedColumns: ['id']
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      relationship_managers: {
        Row: {
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          employee_id: string | null
          id: string
          is_active: boolean
          max_daily_appointments: number
          profile_id: string
          service_areas: string[]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean
          max_daily_appointments?: number
          profile_id: string
          service_areas?: string[]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean
          max_daily_appointments?: number
          profile_id?: string
          service_areas?: string[]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'relationship_managers_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'relationship_managers_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'relationship_managers_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      rm_leave: {
        Row: {
          approved_by: string | null
          created_at: string
          end_time: string | null
          id: string
          leave_date: string
          leave_type: Database['public']['Enums']['leave_type']
          reason: string | null
          rm_id: string
          start_time: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          leave_date: string
          leave_type?: Database['public']['Enums']['leave_type']
          reason?: string | null
          rm_id: string
          start_time?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          leave_date?: string
          leave_type?: Database['public']['Enums']['leave_type']
          reason?: string | null
          rm_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rm_leave_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rm_leave_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      rm_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string
          effective_until: string | null
          end_time: string
          id: string
          is_active: boolean
          rm_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_from?: string
          effective_until?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          rm_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_from?: string
          effective_until?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          rm_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rm_schedules_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      rm_specializations: {
        Row: {
          created_at: string
          product_id: string
          rm_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          rm_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          rm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rm_specializations_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'insurance_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rm_specializations_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          is_current: boolean
          joined_at: string
          left_at: string | null
          rm_id: string
          team_id: string
        }
        Insert: {
          id?: string
          is_current?: boolean
          joined_at?: string
          left_at?: string | null
          rm_id: string
          team_id: string
        }
        Update: {
          id?: string
          is_current?: boolean
          joined_at?: string
          left_at?: string | null
          rm_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_rm_id_fkey'
            columns: ['rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          branch_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          team_leader_rm_id: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          team_leader_rm_id?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          team_leader_rm_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'teams_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_team_leader_rm_id_fkey'
            columns: ['team_leader_rm_id']
            isOneToOne: false
            referencedRelation: 'relationship_managers'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          profile_id: string
          role_id: string
          scope_id: string | null
          scope_type: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          profile_id: string
          role_id: string
          scope_id?: string | null
          scope_type?: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          profile_id?: string
          role_id?: string
          scope_id?: string | null
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_granted_by_fkey'
            columns: ['granted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      working_hours_config: {
        Row: {
          branch_id: string | null
          created_at: string | null
          day_of_week: number
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean
          slot_duration_minutes: number
          slot_start: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          day_of_week: number
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          slot_start: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          day_of_week?: number
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          slot_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'working_hours_config_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_slot_availability: {
        Row: {
          available_spots: number | null
          branch_id: string | null
          slot_date: string | null
          slot_end: string | null
          slot_start: string | null
          total_capacity: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'working_hours_config_branch_id_fkey'
            columns: ['branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      get_accessible_branch_ids: { Args: never; Returns: string[] }
      get_accessible_rm_ids: { Args: never; Returns: string[] }
      get_rm_id: { Args: never; Returns: string }
      get_slot_availability: {
        Args: { p_branch_id?: string; p_date: string; p_start_time: string }
        Returns: number
      }
      get_slot_capacity: {
        Args: { p_branch_id?: string; p_date: string; p_start_time: string }
        Returns: number
      }
      get_user_permissions: { Args: never; Returns: string[] }
      has_permission: {
        Args: { p_action: string; p_resource: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_rm: { Args: never; Returns: boolean }
      log_system_activity: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status:
        | 'scheduled'
        | 'confirmed'
        | 'completed'
        | 'cancelled'
        | 'no_show'
        | 'rescheduled'
      assignment_method:
        | 'manual'
        | 'round_robin'
        | 'least_busy'
        | 'specialist'
        | 'geographic'
        | 'system'
      lead_source: 'instagram' | 'facebook' | 'google' | 'direct' | 'referral' | 'other'
      lead_status: 'new' | 'scheduled' | 'contacted' | 'proposal_sent' | 'converted' | 'lost'
      leave_type: 'full_day' | 'morning' | 'afternoon' | 'custom'
      note_type: 'general' | 'call' | 'meeting' | 'follow_up' | 'internal'
      notification_channel: 'email' | 'sms' | 'whatsapp' | 'in_app'
      notification_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
      notification_type:
        | 'appointment_confirmation'
        | 'appointment_reminder'
        | 'appointment_cancelled'
        | 'lead_assigned'
        | 'lead_updated'
        | 'follow_up'
      user_role: 'admin' | 'rm' | 'customer'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_status: [
        'scheduled',
        'confirmed',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
      ],
      assignment_method: [
        'manual',
        'round_robin',
        'least_busy',
        'specialist',
        'geographic',
        'system',
      ],
      lead_source: ['instagram', 'facebook', 'google', 'direct', 'referral', 'other'],
      lead_status: ['new', 'scheduled', 'contacted', 'proposal_sent', 'converted', 'lost'],
      leave_type: ['full_day', 'morning', 'afternoon', 'custom'],
      note_type: ['general', 'call', 'meeting', 'follow_up', 'internal'],
      notification_channel: ['email', 'sms', 'whatsapp', 'in_app'],
      notification_status: ['pending', 'sent', 'delivered', 'failed', 'read'],
      notification_type: [
        'appointment_confirmation',
        'appointment_reminder',
        'appointment_cancelled',
        'lead_assigned',
        'lead_updated',
        'follow_up',
      ],
      user_role: ['admin', 'rm', 'customer'],
    },
  },
} as const
