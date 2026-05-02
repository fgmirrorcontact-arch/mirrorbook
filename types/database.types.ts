export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          role: 'client' | 'admin' | 'employee'
          stripe_customer_id: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin' | 'employee'
          stripe_customer_id?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin' | 'employee'
          stripe_customer_id?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          profile_id: string
          display_name: string
          google_calendar_id: string | null
          color: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          display_name: string
          google_calendar_id?: string | null
          color?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          display_name?: string
          google_calendar_id?: string | null
          color?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employees_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          price_cents: number
          duration_minutes: number
          category: string | null
          stripe_price_id: string | null
          is_subscription: boolean
          stripe_sub_price_id: string | null
          tokens_per_renewal: number | null
          image_url: string | null
          is_active: boolean
          sort_order: number
          tax_rate: number
          deposit_percent: number | null
          min_lead_hours: number
          max_lead_days: number | null
          hide_duration: boolean
          commitment_months: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_cents: number
          duration_minutes: number
          category?: string | null
          stripe_price_id?: string | null
          is_subscription?: boolean
          stripe_sub_price_id?: string | null
          tokens_per_renewal?: number | null
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          tax_rate?: number
          deposit_percent?: number | null
          min_lead_hours?: number
          max_lead_days?: number | null
          hide_duration?: boolean
          commitment_months?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_cents?: number
          duration_minutes?: number
          category?: string | null
          stripe_price_id?: string | null
          is_subscription?: boolean
          stripe_sub_price_id?: string | null
          tokens_per_renewal?: number | null
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          tax_rate?: number
          deposit_percent?: number | null
          min_lead_hours?: number
          max_lead_days?: number | null
          hide_duration?: boolean
          commitment_months?: number | null
          created_at?: string
        }
        Relationships: []
      }
      service_addons: {
        Row: {
          id: string
          name: string
          description: string | null
          price_cents: number
          duration_minutes: number
          applicable_to: string[]
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_cents: number
          duration_minutes?: number
          applicable_to?: string[]
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_cents?: number
          duration_minutes?: number
          applicable_to?: string[]
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      service_commitment_tiers: {
        Row: {
          id: string
          service_id: string
          commitment_months: number
          price_cents: number
          stripe_price_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          commitment_months: number
          price_cents: number
          stripe_price_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          commitment_months?: number
          price_cents?: number
          stripe_price_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_commitment_tiers_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      availability_schedules: {
        Row: {
          id: string
          employee_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_minutes: number
          break_minutes: number
          is_active: boolean
        }
        Insert: {
          id?: string
          employee_id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_duration_minutes?: number
          break_minutes?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          employee_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          slot_duration_minutes?: number
          break_minutes?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'availability_schedules_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          }
        ]
      }
      availability_exceptions: {
        Row: {
          id: string
          employee_id: string
          exception_date: string
          is_unavailable: boolean
          custom_start: string | null
          custom_end: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          exception_date: string
          is_unavailable?: boolean
          custom_start?: string | null
          custom_end?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          exception_date?: string
          is_unavailable?: boolean
          custom_start?: string | null
          custom_end?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'availability_exceptions_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          }
        ]
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: 'percentage' | 'fixed_cents'
          discount_value: number
          min_purchase_cents: number | null
          max_uses: number | null
          uses_count: number
          applicable_service_ids: string[] | null
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          discount_type: 'percentage' | 'fixed_cents'
          discount_value: number
          min_purchase_cents?: number | null
          max_uses?: number | null
          uses_count?: number
          applicable_service_ids?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: 'percentage' | 'fixed_cents'
          discount_value?: number
          min_purchase_cents?: number | null
          max_uses?: number | null
          uses_count?: number
          applicable_service_ids?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_ref: string
          client_id: string
          employee_id: string
          service_id: string
          start_at: string
          end_at: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          payment_method: 'stripe_one_time' | 'subscription_token' | 'cash' | 'card_present'
          stripe_payment_intent_id: string | null
          token_id: string | null
          total_price_cents: number
          discount_cents: number
          promo_code_id: string | null
          notes: string | null
          internal_notes: string | null
          google_calendar_event_id: string | null
          created_at: string
          cancelled_at: string | null
          cancellation_reason: string | null
        }
        Insert: {
          id?: string
          booking_ref: string
          client_id: string
          employee_id: string
          service_id: string
          start_at: string
          end_at: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          payment_method?: 'stripe_one_time' | 'subscription_token' | 'cash' | 'card_present'
          stripe_payment_intent_id?: string | null
          token_id?: string | null
          total_price_cents: number
          discount_cents?: number
          promo_code_id?: string | null
          notes?: string | null
          internal_notes?: string | null
          google_calendar_event_id?: string | null
          created_at?: string
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
        Update: {
          id?: string
          booking_ref?: string
          client_id?: string
          employee_id?: string
          service_id?: string
          start_at?: string
          end_at?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          payment_method?: 'stripe_one_time' | 'subscription_token' | 'cash' | 'card_present'
          stripe_payment_intent_id?: string | null
          token_id?: string | null
          total_price_cents?: number
          discount_cents?: number
          promo_code_id?: string | null
          notes?: string | null
          internal_notes?: string | null
          google_calendar_event_id?: string | null
          created_at?: string
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      booking_addons: {
        Row: {
          id: string
          booking_id: string
          addon_id: string
          price_cents: number
        }
        Insert: {
          id?: string
          booking_id: string
          addon_id: string
          price_cents: number
        }
        Update: {
          id?: string
          booking_id?: string
          addon_id?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: 'booking_addons_booking_id_fkey'
            columns: ['booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'booking_addons_addon_id_fkey'
            columns: ['addon_id']
            isOneToOne: false
            referencedRelation: 'service_addons'
            referencedColumns: ['id']
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          client_id: string
          service_id: string
          stripe_subscription_id: string
          status: 'active' | 'past_due' | 'cancelled' | 'paused' | 'incomplete'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          stripe_subscription_id: string
          status?: 'active' | 'past_due' | 'cancelled' | 'paused' | 'incomplete'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          stripe_subscription_id?: string
          status?: 'active' | 'past_due' | 'cancelled' | 'paused' | 'incomplete'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subscriptions_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      subscription_tokens: {
        Row: {
          id: string
          subscription_id: string
          client_id: string
          service_id: string
          status: 'available' | 'used' | 'expired'
          stripe_invoice_id: string | null
          issued_at: string
          expires_at: string | null
          used_at: string | null
          booking_id: string | null
        }
        Insert: {
          id?: string
          subscription_id: string
          client_id: string
          service_id: string
          status?: 'available' | 'used' | 'expired'
          stripe_invoice_id?: string | null
          issued_at?: string
          expires_at?: string | null
          used_at?: string | null
          booking_id?: string | null
        }
        Update: {
          id?: string
          subscription_id?: string
          client_id?: string
          service_id?: string
          status?: 'available' | 'used' | 'expired'
          stripe_invoice_id?: string | null
          issued_at?: string
          expires_at?: string | null
          used_at?: string | null
          booking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'subscription_tokens_subscription_id_fkey'
            columns: ['subscription_id']
            isOneToOne: false
            referencedRelation: 'subscriptions'
            referencedColumns: ['id']
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          client_id: string
          booking_id: string | null
          subscription_id: string | null
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          amount_cents: number
          tax_cents: number
          pdf_storage_path: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          client_id: string
          booking_id?: string | null
          subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          amount_cents: number
          tax_cents?: number
          pdf_storage_path?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          client_id?: string
          booking_id?: string | null
          subscription_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          amount_cents?: number
          tax_cents?: number
          pdf_storage_path?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      promo_code_uses: {
        Row: {
          id: string
          promo_code_id: string
          client_id: string
          booking_id: string
          discount_applied_cents: number
          used_at: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          client_id: string
          booking_id: string
          discount_applied_cents: number
          used_at?: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          client_id?: string
          booking_id?: string
          discount_applied_cents?: number
          used_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      generate_booking_ref: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_employee: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'client' | 'admin' | 'employee'
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
      payment_method: 'stripe_one_time' | 'subscription_token' | 'cash' | 'card_present'
      subscription_status: 'active' | 'past_due' | 'cancelled' | 'paused' | 'incomplete'
      token_status: 'available' | 'used' | 'expired'
      discount_type: 'percentage' | 'fixed_cents'
    }
    CompositeTypes: Record<never, never>
  }
}
