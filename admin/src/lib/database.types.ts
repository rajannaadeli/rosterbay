/**
 * Hand-written database types mirroring supabase/migrations exactly.
 *
 * MIRRORED FILE — an identical copy lives at mobile/lib/database.types.ts.
 * When the schema changes, update both copies in the same session (CLAUDE.md).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'supervisor' | 'worker';
export type CertStatus = 'valid' | 'expiring_soon' | 'expired';
export type ShiftStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type OfferStatus = 'open' | 'filled' | 'expired';
export type TimeEntryStatus = 'pending' | 'approved' | 'flagged' | 'rejected';
export type TimeEntryFlag = 'late' | 'out_of_zone' | 'missing_clock_out';

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string;
          role: Role;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          job_title: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          role: Role;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          role?: Role;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cert_types: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          code: string;
          validity_months: number | null;
          requires_document: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          code: string;
          validity_months?: number | null;
          requires_document?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          code?: string;
          validity_months?: number | null;
          requires_document?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      worker_certs: {
        Row: {
          id: string;
          company_id: string;
          worker_id: string;
          cert_type_id: string;
          issued_on: string;
          expires_on: string;
          file_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          worker_id: string;
          cert_type_id: string;
          issued_on: string;
          expires_on: string;
          file_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          worker_id?: string;
          cert_type_id?: string;
          issued_on?: string;
          expires_on?: string;
          file_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      job_sites: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          client_name: string | null;
          address: string;
          lat: number;
          lng: number;
          geofence_radius_m: number;
          required_cert_type_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          client_name?: string | null;
          address: string;
          lat: number;
          lng: number;
          geofence_radius_m?: number;
          required_cert_type_ids?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          client_name?: string | null;
          address?: string;
          lat?: number;
          lng?: number;
          geofence_radius_m?: number;
          required_cert_type_ids?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      task_templates: {
        Row: {
          id: string;
          company_id: string;
          site_id: string;
          title: string;
          requires_photo: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          site_id: string;
          title: string;
          requires_photo?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          site_id?: string;
          title?: string;
          requires_photo?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      shifts: {
        Row: {
          id: string;
          company_id: string;
          site_id: string;
          worker_id: string | null;
          starts_at: string;
          ends_at: string;
          role_required: string | null;
          status: ShiftStatus;
          notes: string | null;
          override_reason: string | null;
          override_by: string | null;
          override_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          site_id: string;
          worker_id?: string | null;
          starts_at: string;
          ends_at: string;
          role_required?: string | null;
          status?: ShiftStatus;
          notes?: string | null;
          override_reason?: string | null;
          override_by?: string | null;
          override_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          site_id?: string;
          worker_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          role_required?: string | null;
          status?: ShiftStatus;
          notes?: string | null;
          override_reason?: string | null;
          override_by?: string | null;
          override_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shift_offers: {
        Row: {
          id: string;
          company_id: string;
          shift_id: string;
          broadcast_at: string;
          status: OfferStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          shift_id: string;
          broadcast_at?: string;
          status?: OfferStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          shift_id?: string;
          broadcast_at?: string;
          status?: OfferStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      offer_responses: {
        Row: {
          id: string;
          company_id: string;
          offer_id: string;
          worker_id: string;
          responded_at: string;
          accepted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          offer_id: string;
          worker_id: string;
          responded_at?: string;
          accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          offer_id?: string;
          worker_id?: string;
          responded_at?: string;
          accepted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      shift_tasks: {
        Row: {
          id: string;
          company_id: string;
          shift_id: string;
          template_id: string | null;
          title: string;
          requires_photo: boolean;
          done: boolean;
          done_at: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          shift_id: string;
          template_id?: string | null;
          title: string;
          requires_photo?: boolean;
          done?: boolean;
          done_at?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          shift_id?: string;
          template_id?: string | null;
          title?: string;
          requires_photo?: boolean;
          done?: boolean;
          done_at?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          company_id: string;
          shift_id: string;
          worker_id: string;
          clock_in_at: string;
          clock_out_at: string | null;
          in_lat: number | null;
          in_lng: number | null;
          out_lat: number | null;
          out_lng: number | null;
          distance_from_site_m: number | null;
          within_geofence: boolean | null;
          flags: TimeEntryFlag[];
          status: TimeEntryStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          shift_id: string;
          worker_id: string;
          clock_in_at: string;
          clock_out_at?: string | null;
          in_lat?: number | null;
          in_lng?: number | null;
          out_lat?: number | null;
          out_lng?: number | null;
          distance_from_site_m?: number | null;
          within_geofence?: boolean | null;
          flags?: TimeEntryFlag[];
          status?: TimeEntryStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          shift_id?: string;
          worker_id?: string;
          clock_in_at?: string;
          clock_out_at?: string | null;
          in_lat?: number | null;
          in_lng?: number | null;
          out_lat?: number | null;
          out_lng?: number | null;
          distance_from_site_m?: number | null;
          within_geofence?: boolean | null;
          flags?: TimeEntryFlag[];
          status?: TimeEntryStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      issues: {
        Row: {
          id: string;
          company_id: string;
          shift_id: string;
          worker_id: string;
          note: string;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          shift_id: string;
          worker_id: string;
          note: string;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          shift_id?: string;
          worker_id?: string;
          note?: string;
          photo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          ref_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          kind: string;
          title: string;
          body?: string | null;
          ref_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          kind?: string;
          title?: string;
          body?: string | null;
          ref_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      worker_certs_with_status: {
        Row: {
          id: string;
          company_id: string;
          worker_id: string;
          cert_type_id: string;
          issued_on: string;
          expires_on: string;
          file_url: string | null;
          created_at: string;
          status: CertStatus;
          days_until_expiry: number;
        };
        Relationships: [];
      };
      worker_overview: {
        Row: {
          id: string;
          company_id: string;
          role: Role;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          job_title: string | null;
          created_at: string;
          compliance_status: CertStatus;
          shifts_this_week: number;
          last_clock_in_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      cert_status: {
        Args: { expires_on: string };
        Returns: CertStatus;
      };
      reset_demo: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
