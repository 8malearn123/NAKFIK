export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_subscriptions: {
        Row: {
          account_id: string
          account_type: string
          amount: number
          billing_cycle: string
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          currency: string
          current_period_end: string
          current_period_start: string
          events_quota: number
          events_used: number
          expires_at: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string | null
        }
        Insert: {
          account_id: string
          account_type?: string
          amount?: number
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end: string
          current_period_start?: string
          events_quota?: number
          events_used?: number
          expires_at?: string | null
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          account_type?: string
          amount?: number
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end?: string
          current_period_start?: string
          events_quota?: number
          events_used?: number
          expires_at?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_team_members: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          invite_status: string
          invited_by: string | null
          permissions: string[]
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          invite_status?: string
          invited_by?: string | null
          permissions?: string[]
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          invite_status?: string
          invited_by?: string | null
          permissions?: string[]
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          starts_at: string | null
          status: string
          target_audience: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          starts_at?: string | null
          status?: string
          target_audience?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          starts_at?: string | null
          status?: string
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendee_points: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          points: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          points?: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          points?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_points_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendee_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_templates: {
        Row: {
          background_color: string
          created_at: string
          elements: Json | null
          event_id: string
          height_mm: number
          id: string
          logo_url: string | null
          printer_connection: string | null
          printer_ip: string | null
          printer_type: string
          text_color: string
          ticket_type_styles: Json | null
          updated_at: string
          width_mm: number
        }
        Insert: {
          background_color?: string
          created_at?: string
          elements?: Json | null
          event_id: string
          height_mm?: number
          id?: string
          logo_url?: string | null
          printer_connection?: string | null
          printer_ip?: string | null
          printer_type?: string
          text_color?: string
          ticket_type_styles?: Json | null
          updated_at?: string
          width_mm?: number
        }
        Update: {
          background_color?: string
          created_at?: string
          elements?: Json | null
          event_id?: string
          height_mm?: number
          id?: string
          logo_url?: string | null
          printer_connection?: string | null
          printer_ip?: string | null
          printer_type?: string
          text_color?: string
          ticket_type_styles?: Json | null
          updated_at?: string
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "badge_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_design_recipients: {
        Row: {
          certificate_design_id: string
          created_at: string
          id: string
          issued_at: string
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          verification_token: string
        }
        Insert: {
          certificate_design_id: string
          created_at?: string
          id?: string
          issued_at?: string
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          verification_token?: string
        }
        Update: {
          certificate_design_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_design_recipients_certificate_design_id_fkey"
            columns: ["certificate_design_id"]
            isOneToOne: false
            referencedRelation: "certificate_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_designs: {
        Row: {
          accent_color: string
          background_color: string
          background_image_url: string | null
          body_font: string
          body_text: string | null
          created_at: string
          event_id: string | null
          heading_font: string
          id: string
          issuer_name: string | null
          layout_style: string
          logo_url: string | null
          organization_id: string
          ornament_style: string
          signature_name: string | null
          signature_title: string | null
          status: string
          subtitle: string | null
          template_key: string
          text_color: string
          theme_color: string
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          background_image_url?: string | null
          body_font?: string
          body_text?: string | null
          created_at?: string
          event_id?: string | null
          heading_font?: string
          id?: string
          issuer_name?: string | null
          layout_style?: string
          logo_url?: string | null
          organization_id: string
          ornament_style?: string
          signature_name?: string | null
          signature_title?: string | null
          status?: string
          subtitle?: string | null
          template_key?: string
          text_color?: string
          theme_color?: string
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          background_image_url?: string | null
          body_font?: string
          body_text?: string | null
          created_at?: string
          event_id?: string | null
          heading_font?: string
          id?: string
          issuer_name?: string | null
          layout_style?: string
          logo_url?: string | null
          organization_id?: string
          ornament_style?: string
          signature_name?: string | null
          signature_title?: string | null
          status?: string
          subtitle?: string | null
          template_key?: string
          text_color?: string
          theme_color?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_designs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_designs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          attendee_id: string
          certificate_url: string | null
          event_id: string
          id: string
          issued_at: string | null
          registration_id: string | null
          template_used: string | null
        }
        Insert: {
          attendee_id: string
          certificate_url?: string | null
          event_id: string
          id?: string
          issued_at?: string | null
          registration_id?: string | null
          template_used?: string | null
        }
        Update: {
          attendee_id?: string
          certificate_url?: string | null
          event_id?: string
          id?: string
          issued_at?: string | null
          registration_id?: string | null
          template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoint_hourly_stats: {
        Row: {
          checkpoint_id: string
          event_id: string
          hour_bucket: string
          id: string
          scan_count: number
          unique_attendees: number
          updated_at: string
        }
        Insert: {
          checkpoint_id: string
          event_id: string
          hour_bucket: string
          id?: string
          scan_count?: number
          unique_attendees?: number
          updated_at?: string
        }
        Update: {
          checkpoint_id?: string
          event_id?: string
          hour_bucket?: string
          id?: string
          scan_count?: number
          unique_attendees?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_hourly_stats_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoint_hourly_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          capacity: number | null
          checkpoint_type: string
          color: string
          created_at: string
          display_order: number
          event_id: string
          id: string
          is_active: boolean
          name_ar: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          checkpoint_type?: string
          color?: string
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          is_active?: boolean
          name_ar: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          checkpoint_type?: string
          color?: string
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoints_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          rate_percent: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          rate_percent?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          rate_percent?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      event_featured_cards: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          event_id: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          role_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          event_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          role_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          event_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          role_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_featured_cards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guests: {
        Row: {
          companions_allowed: number
          companions_used: number
          confirmed_at: string | null
          created_at: string | null
          data_collected_at: string | null
          event_id: string
          extra_data: Json
          guest_email: string | null
          guest_name: string
          guest_phone: string
          id: string
          import_batch_id: string | null
          imported_by: string
          invite_send_error: string | null
          invite_send_status: string | null
          invite_sent_at: string | null
          invite_sent_channels: string[] | null
          parent_guest_id: string | null
          rsvp_status: string
          rsvp_token: string
          ticket_id: string | null
          updated_at: string | null
          whatsapp_opened_at: string | null
        }
        Insert: {
          companions_allowed?: number
          companions_used?: number
          confirmed_at?: string | null
          created_at?: string | null
          data_collected_at?: string | null
          event_id: string
          extra_data?: Json
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          id?: string
          import_batch_id?: string | null
          imported_by: string
          invite_send_error?: string | null
          invite_send_status?: string | null
          invite_sent_at?: string | null
          invite_sent_channels?: string[] | null
          parent_guest_id?: string | null
          rsvp_status?: string
          rsvp_token?: string
          ticket_id?: string | null
          updated_at?: string | null
          whatsapp_opened_at?: string | null
        }
        Update: {
          companions_allowed?: number
          companions_used?: number
          confirmed_at?: string | null
          created_at?: string | null
          data_collected_at?: string | null
          event_id?: string
          extra_data?: Json
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          id?: string
          import_batch_id?: string | null
          imported_by?: string
          invite_send_error?: string | null
          invite_send_status?: string | null
          invite_sent_at?: string | null
          invite_sent_channels?: string[] | null
          parent_guest_id?: string | null
          rsvp_status?: string
          rsvp_token?: string
          ticket_id?: string | null
          updated_at?: string | null
          whatsapp_opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "guest_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_parent_guest_id_fkey"
            columns: ["parent_guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          cover_image_url: string | null
          created_at: string | null
          created_by: string
          current_attendees_count: number
          description_ar: string | null
          description_en: string | null
          end_date: string | null
          id: string
          invite_channels: string[]
          invite_message_template: string | null
          invite_send_mode: string
          is_free: boolean
          is_online: boolean
          max_attendees: number | null
          online_link: string | null
          organization_id: string
          private_link: string | null
          referral_points: number
          registration_deadline: string | null
          rejection_reason: string | null
          share_points: number
          social_hashtags: string | null
          social_share_enabled: boolean
          social_share_text: string | null
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
          title_ar: string
          title_en: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string | null
          venue_address: string | null
          venue_map_url: string | null
          venue_name: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_category"]
          cover_image_url?: string | null
          created_at?: string | null
          created_by: string
          current_attendees_count?: number
          description_ar?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          invite_channels?: string[]
          invite_message_template?: string | null
          invite_send_mode?: string
          is_free?: boolean
          is_online?: boolean
          max_attendees?: number | null
          online_link?: string | null
          organization_id: string
          private_link?: string | null
          referral_points?: number
          registration_deadline?: string | null
          rejection_reason?: string | null
          share_points?: number
          social_hashtags?: string | null
          social_share_enabled?: boolean
          social_share_text?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
          title_ar: string
          title_en?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string
          current_attendees_count?: number
          description_ar?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          invite_channels?: string[]
          invite_message_template?: string | null
          invite_send_mode?: string
          is_free?: boolean
          is_online?: boolean
          max_attendees?: number | null
          online_link?: string | null
          organization_id?: string
          private_link?: string | null
          referral_points?: number
          registration_deadline?: string | null
          rejection_reason?: string | null
          share_points?: number
          social_hashtags?: string | null
          social_share_enabled?: boolean
          social_share_text?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
          title_ar?: string
          title_en?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number
          duration: string | null
          features: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price_unit: string | null
          starting_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_unit?: string | null
          starting_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_unit?: string | null
          starting_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      guest_import_batches: {
        Row: {
          created_at: string | null
          error_report_url: string | null
          event_id: string
          file_name: string
          id: string
          imported_by: string
          skipped_rows: number
          status: string
          total_rows: number
          valid_rows: number
        }
        Insert: {
          created_at?: string | null
          error_report_url?: string | null
          event_id: string
          file_name: string
          id?: string
          imported_by: string
          skipped_rows?: number
          status?: string
          total_rows?: number
          valid_rows?: number
        }
        Update: {
          created_at?: string | null
          error_report_url?: string | null
          event_id?: string
          file_name?: string
          id?: string
          imported_by?: string
          skipped_rows?: number
          status?: string
          total_rows?: number
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_import_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_list_contacts: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          list_id: string
          notes: string | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          list_id: string
          notes?: string | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          list_id?: string
          notes?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_lists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          email: string | null
          event_id: string
          id: string
          invited_by: string
          phone: string | null
          responded_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          email?: string | null
          event_id: string
          id?: string
          invited_by: string
          phone?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          email?: string | null
          event_id?: string
          id?: string
          invited_by?: string
          phone?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_connections: {
        Row: {
          event_id: string | null
          id: string
          scanned_at: string
          scanned_id: string
          scanner_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          scanned_at?: string
          scanned_id: string
          scanner_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          scanned_at?: string
          scanned_id?: string
          scanner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "networking_connections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "networking_connections_scanned_id_fkey"
            columns: ["scanned_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "networking_connections_scanner_id_fkey"
            columns: ["scanner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_profiles: {
        Row: {
          bg_color_from: string | null
          bg_color_to: string | null
          bio: string | null
          card_logo_url: string | null
          company: string | null
          connect_code: string
          created_at: string
          email_public: string | null
          expertise: string[]
          id: string
          instagram_handle: string | null
          job_title: string | null
          linkedin_url: string | null
          looking_for: string[] | null
          privacy_level: string
          ring_color: string | null
          snapchat_handle: string | null
          tier_label: string | null
          twitter_handle: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          bg_color_from?: string | null
          bg_color_to?: string | null
          bio?: string | null
          card_logo_url?: string | null
          company?: string | null
          connect_code?: string
          created_at?: string
          email_public?: string | null
          expertise?: string[]
          id?: string
          instagram_handle?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string[] | null
          privacy_level?: string
          ring_color?: string | null
          snapchat_handle?: string | null
          tier_label?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          bg_color_from?: string | null
          bg_color_to?: string | null
          bio?: string | null
          card_logo_url?: string | null
          company?: string | null
          connect_code?: string
          created_at?: string
          email_public?: string | null
          expertise?: string[]
          id?: string
          instagram_handle?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string[] | null
          privacy_level?: string
          ring_color?: string | null
          snapchat_handle?: string | null
          tier_label?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networking_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          name: string
          params: Json | null
          template_name: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          name: string
          params?: Json | null
          template_name: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          name?: string
          params?: Json | null
          template_name?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          error_message: string | null
          id: string
          message: string | null
          recipient_name: string | null
          recipient_phone: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          recipient_name?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          bank_account_holder: string | null
          bank_name: string | null
          billing_address: string | null
          billing_name: string | null
          billing_tax_number: string | null
          brand_color: string | null
          commercial_register: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          iban: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          linkedin_url: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          privacy_policy: string | null
          public_email: string | null
          refund_policy: string | null
          snapchat_url: string | null
          subscription_expires_at: string | null
          subscription_plan: string
          tax_number: string | null
          terms_text: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account_holder?: string | null
          bank_name?: string | null
          billing_address?: string | null
          billing_name?: string | null
          billing_tax_number?: string | null
          brand_color?: string | null
          commercial_register?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          privacy_policy?: string | null
          public_email?: string | null
          refund_policy?: string | null
          snapchat_url?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string
          tax_number?: string | null
          terms_text?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account_holder?: string | null
          bank_name?: string | null
          billing_address?: string | null
          billing_name?: string | null
          billing_tax_number?: string | null
          brand_color?: string | null
          commercial_register?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          privacy_policy?: string | null
          public_email?: string | null
          refund_policy?: string | null
          snapchat_url?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string
          tax_number?: string | null
          terms_text?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      partner_brands: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_code: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          display_order: number
          expires_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          terms: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_code: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          display_order?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          terms?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_code?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          display_order?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          terms?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          account_holder_name: string | null
          account_id: string
          account_type: string
          amount: number
          bank_name: string | null
          created_at: string | null
          currency: string
          iban: string | null
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["payout_status"]
          total_commission: number | null
          total_sales: number | null
          transactions_count: number | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_id: string
          account_type?: string
          amount: number
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          iban?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          total_commission?: number | null
          total_sales?: number | null
          transactions_count?: number | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_id?: string
          account_type?: string
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          currency?: string
          iban?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          total_commission?: number | null
          total_sales?: number | null
          transactions_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      private_invitation_guests: {
        Row: {
          checked_in_at: string | null
          companions_count: number
          confirmed_at: string | null
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          invitation_id: string
          invite_sent_at: string | null
          notes: string | null
          rsvp_status: string
          token: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          companions_count?: number
          confirmed_at?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          invitation_id: string
          invite_sent_at?: string | null
          notes?: string | null
          rsvp_status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          companions_count?: number
          confirmed_at?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          invitation_id?: string
          invite_sent_at?: string | null
          notes?: string | null
          rsvp_status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_invitation_guests_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "private_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      private_invitations: {
        Row: {
          accent_color: string
          allow_companions: boolean
          background_image_url: string | null
          body_font: string
          category: string
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          custom_message: string | null
          custom_template_url: string | null
          dress_code: string | null
          event_date: string
          font_family: string
          formality: string
          gift_account_holder: string | null
          gift_bank_name: string | null
          gift_iban: string | null
          gift_notes: string | null
          host_name: string | null
          id: string
          layout_style: string
          max_attendees: number | null
          max_companions: number
          name_overlay: Json
          organization_id: string
          ornament_style: string
          scope: string
          status: string
          template_key: string | null
          text_color: string
          theme_color: string
          title: string
          updated_at: string
          use_custom_template: boolean
          venue_address: string | null
          venue_map_url: string | null
          venue_name: string | null
        }
        Insert: {
          accent_color?: string
          allow_companions?: boolean
          background_image_url?: string | null
          body_font?: string
          category?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          custom_message?: string | null
          custom_template_url?: string | null
          dress_code?: string | null
          event_date: string
          font_family?: string
          formality?: string
          gift_account_holder?: string | null
          gift_bank_name?: string | null
          gift_iban?: string | null
          gift_notes?: string | null
          host_name?: string | null
          id?: string
          layout_style?: string
          max_attendees?: number | null
          max_companions?: number
          name_overlay?: Json
          organization_id: string
          ornament_style?: string
          scope?: string
          status?: string
          template_key?: string | null
          text_color?: string
          theme_color?: string
          title: string
          updated_at?: string
          use_custom_template?: boolean
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
        }
        Update: {
          accent_color?: string
          allow_companions?: boolean
          background_image_url?: string | null
          body_font?: string
          category?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          custom_message?: string | null
          custom_template_url?: string | null
          dress_code?: string | null
          event_date?: string
          font_family?: string
          formality?: string
          gift_account_holder?: string | null
          gift_bank_name?: string | null
          gift_iban?: string | null
          gift_notes?: string | null
          host_name?: string | null
          id?: string
          layout_style?: string
          max_attendees?: number | null
          max_companions?: number
          name_overlay?: Json
          organization_id?: string
          ornament_style?: string
          scope?: string
          status?: string
          template_key?: string | null
          text_color?: string
          theme_color?: string
          title?: string
          updated_at?: string
          use_custom_template?: boolean
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          job_title: string | null
          linkedin_url: string | null
          org_name: string | null
          phone: string | null
          profile_completed: boolean
          updated_at: string | null
          x_handle: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          org_name?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string | null
          x_handle?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          org_name?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string | null
          x_handle?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          event_id: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          amount_paid: number | null
          attendee_id: string
          checked_in_at: string | null
          event_id: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          qr_code: string
          registered_at: string | null
          status: Database["public"]["Enums"]["registration_status"]
          ticket_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          attendee_id: string
          checked_in_at?: string | null
          event_id: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          qr_code?: string
          registered_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          ticket_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          attendee_id?: string
          checked_in_at?: string | null
          event_id?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          qr_code?: string
          registered_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          booking_reference: string
          booking_type: string
          cancellation_reason: string | null
          confirmed_by: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean
          end_time: string
          guest_email: string | null
          guest_name: string
          guest_phone: string
          id: string
          party_size: number
          payment_status: Database["public"]["Enums"]["reservation_payment_status"]
          reservation_date: string
          section_id: string | null
          special_requests: string | null
          start_time: string
          status: Database["public"]["Enums"]["reservation_status"]
          table_id: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          booking_reference: string
          booking_type?: string
          cancellation_reason?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean
          end_time: string
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          id?: string
          party_size?: number
          payment_status?: Database["public"]["Enums"]["reservation_payment_status"]
          reservation_date: string
          section_id?: string | null
          special_requests?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_id?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          booking_reference?: string
          booking_type?: string
          cancellation_reason?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean
          end_time?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          id?: string
          party_size?: number
          payment_status?: Database["public"]["Enums"]["reservation_payment_status"]
          reservation_date?: string
          section_id?: string | null
          special_requests?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_id?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "venue_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "venue_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          attendee_id: string
          comment: string | null
          created_at: string | null
          event_id: string
          id: string
          rating: number
          session_id: string | null
        }
        Insert: {
          attendee_id: string
          comment?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          session_id?: string | null
        }
        Update: {
          attendee_id?: string
          comment?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          attendee_id: string | null
          checkpoint_id: string | null
          event_id: string
          id: string
          registration_id: string | null
          scan_type: string
          scanned_at: string
          scanned_by: string | null
        }
        Insert: {
          attendee_id?: string | null
          checkpoint_id?: string | null
          event_id: string
          id?: string
          registration_id?: string | null
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
        }
        Update: {
          attendee_id?: string | null
          checkpoint_id?: string | null
          event_id?: string
          id?: string
          registration_id?: string | null
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_events_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          admin_notes: string | null
          attendees_count: number | null
          city: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          event_date: string | null
          id: string
          notes: string | null
          service_id: string
          status: Database["public"]["Enums"]["service_booking_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          attendees_count?: number | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          event_date?: string | null
          id?: string
          notes?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["service_booking_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          attendees_count?: number | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          event_date?: string | null
          id?: string
          notes?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["service_booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "featured_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_provider_categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          admin_notes: string | null
          business_name: string
          category_id: string | null
          city: string | null
          contact_name: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["provider_status"]
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          business_name: string
          category_id?: string | null
          city?: string | null
          contact_name: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          business_name?: string
          category_id?: string | null
          city?: string | null
          contact_name?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_provider_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          admin_notes: string | null
          assigned_provider_id: string | null
          budget: number | null
          category_id: string | null
          city: string | null
          contact_phone: string | null
          created_at: string
          description: string
          event_date: string | null
          id: string
          organizer_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_provider_id?: string | null
          budget?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          description: string
          event_date?: string | null
          id?: string
          organizer_id: string
          status?: Database["public"]["Enums"]["service_request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_provider_id?: string | null
          budget?: number | null
          category_id?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string
          event_date?: string | null
          id?: string
          organizer_id?: string
          status?: Database["public"]["Enums"]["service_request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_provider_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          event_id: string
          id: string
          location: string | null
          session_order: number | null
          speaker_avatar_url: string | null
          speaker_bio: string | null
          speaker_name: string | null
          start_time: string | null
          title_ar: string
          title_en: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          location?: string | null
          session_order?: number | null
          speaker_avatar_url?: string | null
          speaker_bio?: string | null
          speaker_name?: string | null
          start_time?: string | null
          title_ar: string
          title_en?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          location?: string | null
          session_order?: number | null
          speaker_avatar_url?: string | null
          speaker_bio?: string | null
          speaker_name?: string | null
          start_time?: string | null
          title_ar?: string
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          badge_color: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean
          max_attendees_per_event: number | null
          max_events: number | null
          max_reservations_per_month: number | null
          max_total_attendees: number | null
          name_ar: string
          name_en: string | null
          price: number
          price_monthly: number
          price_per_event: number
          price_yearly: number
          target_type: string
          updated_at: string | null
          validity_months: number
          whatsapp_quota: number | null
        }
        Insert: {
          badge_color?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_attendees_per_event?: number | null
          max_events?: number | null
          max_reservations_per_month?: number | null
          max_total_attendees?: number | null
          name_ar: string
          name_en?: string | null
          price?: number
          price_monthly?: number
          price_per_event?: number
          price_yearly?: number
          target_type?: string
          updated_at?: string | null
          validity_months?: number
          whatsapp_quota?: number | null
        }
        Update: {
          badge_color?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_attendees_per_event?: number | null
          max_events?: number | null
          max_reservations_per_month?: number | null
          max_total_attendees?: number | null
          name_ar?: string
          name_en?: string | null
          price?: number
          price_monthly?: number
          price_per_event?: number
          price_yearly?: number
          target_type?: string
          updated_at?: string | null
          validity_months?: number
          whatsapp_quota?: number | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          email: string | null
          full_name: string | null
          id: string
          invite_status: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          permissions: string[]
          phone: string | null
          role: Database["public"]["Enums"]["team_role"]
          user_id: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string
          invite_status?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          permissions?: string[]
          phone?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string
          invite_status?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          permissions?: string[]
          phone?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          allow_companions: boolean
          attachments: Json
          badge_color: string | null
          badge_logo_url: string | null
          badge_symbol: string | null
          badge_tier_label: string | null
          created_at: string | null
          currency: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          is_for_sale: boolean
          max_companions: number
          name_ar: string
          name_en: string | null
          price: number | null
          quantity_sold: number
          quantity_total: number
          sale_end: string | null
          sale_start: string | null
          type: Database["public"]["Enums"]["ticket_type"]
          visibility: string
        }
        Insert: {
          allow_companions?: boolean
          attachments?: Json
          badge_color?: string | null
          badge_logo_url?: string | null
          badge_symbol?: string | null
          badge_tier_label?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_for_sale?: boolean
          max_companions?: number
          name_ar: string
          name_en?: string | null
          price?: number | null
          quantity_sold?: number
          quantity_total?: number
          sale_end?: string | null
          sale_start?: string | null
          type?: Database["public"]["Enums"]["ticket_type"]
          visibility?: string
        }
        Update: {
          allow_companions?: boolean
          attachments?: Json
          badge_color?: string | null
          badge_logo_url?: string | null
          badge_symbol?: string | null
          badge_tier_label?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_for_sale?: boolean
          max_companions?: number
          name_ar?: string
          name_en?: string | null
          price?: number | null
          quantity_sold?: number
          quantity_total?: number
          sale_end?: string | null
          sale_start?: string | null
          type?: Database["public"]["Enums"]["ticket_type"]
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          account_type: string
          amount: number
          buyer_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          currency: string
          description_ar: string | null
          description_en: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          net_amount: number | null
          payment_method: string | null
          payment_reference: string | null
          payout_id: string | null
          registration_id: string | null
          reservation_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          subscription_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          account_id: string
          account_type?: string
          amount?: number
          buyer_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_id?: string | null
          registration_id?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subscription_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          account_type?: string
          amount?: number
          buyer_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_id?: string | null
          registration_id?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subscription_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venue_blackout_dates: {
        Row: {
          date: string
          id: string
          reason_ar: string | null
          venue_id: string
        }
        Insert: {
          date: string
          id?: string
          reason_ar?: string | null
          venue_id: string
        }
        Update: {
          date?: string
          id?: string
          reason_ar?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_blackout_dates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_operating_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string | null
          venue_id: string
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string | null
          venue_id: string
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_operating_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_sections: {
        Row: {
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_indoor: boolean
          name_ar: string
          name_en: string | null
          venue_id: string
        }
        Insert: {
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          name_ar: string
          name_en?: string | null
          venue_id: string
        }
        Update: {
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          name_ar?: string
          name_en?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_sections_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_slot_config: {
        Row: {
          advance_booking_hours: number
          allow_table_selection: boolean
          auto_confirm: boolean
          buffer_minutes: number
          deposit_amount: number | null
          id: string
          max_party_size: number
          min_party_size: number
          realtime_updates: boolean | null
          requires_deposit: boolean
          show_special_requests: boolean
          slot_duration_minutes: number
          venue_id: string
        }
        Insert: {
          advance_booking_hours?: number
          allow_table_selection?: boolean
          auto_confirm?: boolean
          buffer_minutes?: number
          deposit_amount?: number | null
          id?: string
          max_party_size?: number
          min_party_size?: number
          realtime_updates?: boolean | null
          requires_deposit?: boolean
          show_special_requests?: boolean
          slot_duration_minutes?: number
          venue_id: string
        }
        Update: {
          advance_booking_hours?: number
          allow_table_selection?: boolean
          auto_confirm?: boolean
          buffer_minutes?: number
          deposit_amount?: number | null
          id?: string
          max_party_size?: number
          min_party_size?: number
          realtime_updates?: boolean | null
          requires_deposit?: boolean
          show_special_requests?: boolean
          slot_duration_minutes?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_slot_config_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_staff: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["venue_staff_role"]
          user_id: string
          venue_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["venue_staff_role"]
          user_id: string
          venue_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["venue_staff_role"]
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_staff_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_tables: {
        Row: {
          id: string
          is_available: boolean
          max_capacity: number
          min_capacity: number
          notes_ar: string | null
          position_x: number | null
          position_y: number | null
          section_id: string
          table_number: string
          venue_id: string
        }
        Insert: {
          id?: string
          is_available?: boolean
          max_capacity?: number
          min_capacity?: number
          notes_ar?: string | null
          position_x?: number | null
          position_y?: number | null
          section_id: string
          table_number: string
          venue_id: string
        }
        Update: {
          id?: string
          is_available?: boolean
          max_capacity?: number
          min_capacity?: number
          notes_ar?: string | null
          position_x?: number | null
          position_y?: number | null
          section_id?: string
          table_number?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_tables_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "venue_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_tables_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          about_text_ar: string | null
          about_text_en: string | null
          address_ar: string | null
          address_en: string | null
          auto_cancel_after_minutes: number | null
          booking_advance_days: number
          booking_mode: string | null
          booking_page_color: string | null
          booking_window_days: number | null
          city: string | null
          cover_photo_url: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          district: string | null
          floor_plan_json: Json | null
          gallery_photos: Json | null
          id: string
          instagram_url: string | null
          is_active: boolean
          last_slot_before_close_minutes: number | null
          logo_url: string | null
          maps_url: string | null
          menu_photos: Json | null
          min_advance_minutes: number | null
          mini_website_enabled: boolean | null
          name_ar: string
          name_en: string | null
          owner_id: string
          phone: string | null
          rejection_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["venue_status"]
          subscription_expires_at: string | null
          subscription_plan: string
          updated_at: string | null
          venue_type: Database["public"]["Enums"]["venue_type"]
          welcome_message_ar: string | null
          welcome_message_en: string | null
          whatsapp: string | null
        }
        Insert: {
          about_text_ar?: string | null
          about_text_en?: string | null
          address_ar?: string | null
          address_en?: string | null
          auto_cancel_after_minutes?: number | null
          booking_advance_days?: number
          booking_mode?: string | null
          booking_page_color?: string | null
          booking_window_days?: number | null
          city?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          floor_plan_json?: Json | null
          gallery_photos?: Json | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          last_slot_before_close_minutes?: number | null
          logo_url?: string | null
          maps_url?: string | null
          menu_photos?: Json | null
          min_advance_minutes?: number | null
          mini_website_enabled?: boolean | null
          name_ar: string
          name_en?: string | null
          owner_id: string
          phone?: string | null
          rejection_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["venue_status"]
          subscription_expires_at?: string | null
          subscription_plan?: string
          updated_at?: string | null
          venue_type?: Database["public"]["Enums"]["venue_type"]
          welcome_message_ar?: string | null
          welcome_message_en?: string | null
          whatsapp?: string | null
        }
        Update: {
          about_text_ar?: string | null
          about_text_en?: string | null
          address_ar?: string | null
          address_en?: string | null
          auto_cancel_after_minutes?: number | null
          booking_advance_days?: number
          booking_mode?: string | null
          booking_page_color?: string | null
          booking_window_days?: number | null
          city?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          district?: string | null
          floor_plan_json?: Json | null
          gallery_photos?: Json | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          last_slot_before_close_minutes?: number | null
          logo_url?: string | null
          maps_url?: string | null
          menu_photos?: Json | null
          min_advance_minutes?: number | null
          mini_website_enabled?: boolean | null
          name_ar?: string
          name_en?: string | null
          owner_id?: string
          phone?: string | null
          rejection_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["venue_status"]
          subscription_expires_at?: string | null
          subscription_plan?: string
          updated_at?: string | null
          venue_type?: Database["public"]["Enums"]["venue_type"]
          welcome_message_ar?: string | null
          welcome_message_en?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          account_id: string
          account_type: string
          auth_method: string | null
          auth_value: string | null
          body_template: Json | null
          connection_type: string
          created_at: string | null
          endpoint_url: string | null
          id: string
          instance_id: string | null
          is_active: boolean
          is_verified: boolean
          last_tested_at: string | null
          provider_name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          account_type?: string
          auth_method?: string | null
          auth_value?: string | null
          body_template?: Json | null
          connection_type?: string
          created_at?: string | null
          endpoint_url?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean
          is_verified?: boolean
          last_tested_at?: string | null
          provider_name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          account_type?: string
          auth_method?: string | null
          auth_value?: string | null
          body_template?: Json | null
          connection_type?: string
          created_at?: string | null
          endpoint_url?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean
          is_verified?: boolean
          last_tested_at?: string | null
          provider_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          account_id: string
          account_type: string
          cost_sar: number | null
          created_at: string | null
          delivered_at: string | null
          failed_reason: string | null
          id: string
          is_overage: boolean
          message_body: string | null
          method: string
          related_id: string | null
          related_to: string | null
          sent_at: string | null
          status: string
          to_phone: string
        }
        Insert: {
          account_id: string
          account_type?: string
          cost_sar?: number | null
          created_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          id?: string
          is_overage?: boolean
          message_body?: string | null
          method: string
          related_id?: string | null
          related_to?: string | null
          sent_at?: string | null
          status?: string
          to_phone: string
        }
        Update: {
          account_id?: string
          account_type?: string
          cost_sar?: number | null
          created_at?: string | null
          delivered_at?: string | null
          failed_reason?: string | null
          id?: string
          is_overage?: boolean
          message_body?: string | null
          method?: string
          related_id?: string | null
          related_to?: string | null
          sent_at?: string | null
          status?: string
          to_phone?: string
        }
        Relationships: []
      }
      whatsapp_quota: {
        Row: {
          account_id: string
          account_type: string
          created_at: string | null
          credit_balance_sar: number
          id: string
          messages_used_this_month: number
          overage_rate_sar: number
          plan_monthly_quota: number
          reset_date: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          account_type?: string
          created_at?: string | null
          credit_balance_sar?: number
          id?: string
          messages_used_this_month?: number
          overage_rate_sar?: number
          plan_monthly_quota?: number
          reset_date?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          account_type?: string
          created_at?: string | null
          credit_balance_sar?: number
          id?: string
          messages_used_this_month?: number
          overage_rate_sar?: number
          plan_monthly_quota?: number
          reset_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_topups: {
        Row: {
          account_id: string
          account_type: string
          amount_sar: number
          id: string
          paid_at: string | null
          payment_reference: string | null
        }
        Insert: {
          account_id: string
          account_type?: string
          amount_sar: number
          id?: string
          paid_at?: string | null
          payment_reference?: string | null
        }
        Update: {
          account_id?: string
          account_type?: string
          amount_sar?: number
          id?: string
          paid_at?: string | null
          payment_reference?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_invitation_rsvp: {
        Args: { _companions?: number; _status: string; _token: string }
        Returns: Json
      }
      expire_old_subscriptions: { Args: never; Returns: number }
      get_active_subscription: {
        Args: { _user_id: string }
        Returns: {
          account_id: string
          account_type: string
          amount: number
          billing_cycle: string
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          currency: string
          current_period_end: string
          current_period_start: string
          events_quota: number
          events_used: number
          expires_at: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "account_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_connect_card: {
        Args: { _code: string }
        Returns: {
          avatar_url: string
          bg_color_from: string
          bg_color_to: string
          bio: string
          card_logo_url: string
          company: string
          email_public: string
          expertise: string[]
          full_name: string
          instagram_handle: string
          job_title: string
          linkedin_url: string
          looking_for: string[]
          privacy_level: string
          ring_color: string
          snapchat_handle: string
          tier_label: string
          twitter_handle: string
          user_id: string
          website_url: string
          whatsapp: string
        }[]
      }
      get_invitation_by_token: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_list_to_invitation: {
        Args: { _invitation_id: string; _list_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "super_admin" | "organizer" | "venue_owner"
      discount_type: "percent" | "fixed"
      event_category: "conference" | "workshop" | "seminar" | "meetup" | "other"
      event_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "published"
        | "rejected"
        | "cancelled"
        | "completed"
      event_type: "public" | "private"
      invitation_status: "sent" | "accepted" | "declined"
      notification_channel: "whatsapp" | "in_app" | "email"
      notification_status: "pending" | "sent" | "failed"
      notification_type:
        | "event_reminder"
        | "registration_confirmation"
        | "custom_message"
      payment_status: "free" | "paid" | "refunded"
      payout_status: "pending" | "processing" | "completed" | "failed"
      provider_status: "pending" | "approved" | "rejected"
      registration_status: "pending" | "confirmed" | "cancelled" | "checked_in"
      reservation_payment_status:
        | "not_required"
        | "pending"
        | "paid"
        | "refunded"
      reservation_status:
        | "pending"
        | "confirmed"
        | "seated"
        | "completed"
        | "cancelled"
        | "no_show"
      service_booking_status:
        | "new"
        | "contacted"
        | "confirmed"
        | "completed"
        | "cancelled"
      service_request_status:
        | "new"
        | "in_review"
        | "assigned"
        | "closed"
        | "cancelled"
      subscription_status:
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
        | "trialing"
      team_role: "admin" | "event_manager" | "checkin_staff" | "reporter"
      ticket_type: "free" | "paid" | "vip"
      transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      transaction_type:
        | "ticket_sale"
        | "ticket_refund"
        | "subscription_payment"
        | "payout"
        | "commission"
        | "deposit"
      venue_staff_role: "manager" | "host" | "viewer"
      venue_status: "pending_review" | "approved" | "suspended" | "rejected"
      venue_type: "cafe" | "restaurant" | "lounge" | "coworking" | "other"
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
      app_role: ["super_admin", "organizer", "venue_owner"],
      discount_type: ["percent", "fixed"],
      event_category: ["conference", "workshop", "seminar", "meetup", "other"],
      event_status: [
        "draft",
        "pending_review",
        "approved",
        "published",
        "rejected",
        "cancelled",
        "completed",
      ],
      event_type: ["public", "private"],
      invitation_status: ["sent", "accepted", "declined"],
      notification_channel: ["whatsapp", "in_app", "email"],
      notification_status: ["pending", "sent", "failed"],
      notification_type: [
        "event_reminder",
        "registration_confirmation",
        "custom_message",
      ],
      payment_status: ["free", "paid", "refunded"],
      payout_status: ["pending", "processing", "completed", "failed"],
      provider_status: ["pending", "approved", "rejected"],
      registration_status: ["pending", "confirmed", "cancelled", "checked_in"],
      reservation_payment_status: [
        "not_required",
        "pending",
        "paid",
        "refunded",
      ],
      reservation_status: [
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no_show",
      ],
      service_booking_status: [
        "new",
        "contacted",
        "confirmed",
        "completed",
        "cancelled",
      ],
      service_request_status: [
        "new",
        "in_review",
        "assigned",
        "closed",
        "cancelled",
      ],
      subscription_status: [
        "active",
        "past_due",
        "cancelled",
        "expired",
        "trialing",
      ],
      team_role: ["admin", "event_manager", "checkin_staff", "reporter"],
      ticket_type: ["free", "paid", "vip"],
      transaction_status: [
        "pending",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      transaction_type: [
        "ticket_sale",
        "ticket_refund",
        "subscription_payment",
        "payout",
        "commission",
        "deposit",
      ],
      venue_staff_role: ["manager", "host", "viewer"],
      venue_status: ["pending_review", "approved", "suspended", "rejected"],
      venue_type: ["cafe", "restaurant", "lounge", "coworking", "other"],
    },
  },
} as const
