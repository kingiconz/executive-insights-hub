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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_areas: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          business_area_id: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          business_area_id: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          business_area_id?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_business_area_id_fkey"
            columns: ["business_area_id"]
            isOneToOne: false
            referencedRelation: "business_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assigned_officer: string | null
          business_area_id: string
          created_at: string
          created_by: string
          description: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          institution_id: string
          last_engagement_date: string | null
          next_follow_up_date: string | null
          probability: number
          service_category: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_officer?: string | null
          business_area_id: string
          created_at?: string
          created_by: string
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          institution_id: string
          last_engagement_date?: string | null
          next_follow_up_date?: string | null
          probability?: number
          service_category?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_officer?: string | null
          business_area_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          institution_id?: string
          last_engagement_date?: string | null
          next_follow_up_date?: string | null
          probability?: number
          service_category?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_activities: {
        Row: {
          activity_date: string
          assigned_user: string | null
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          next_action: string | null
          next_action_date: string | null
          opportunity_id: string
          outcome: string | null
        }
        Insert: {
          activity_date?: string
          assigned_user?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          next_action?: string | null
          next_action_date?: string | null
          opportunity_id: string
          outcome?: string | null
        }
        Update: {
          activity_date?: string
          assigned_user?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          next_action?: string | null
          next_action_date?: string | null
          opportunity_id?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_proposals: {
        Row: {
          created_at: string
          created_by: string
          document_url: string | null
          id: string
          kind: Database["public"]["Enums"]["proposal_kind"]
          notes: string | null
          opportunity_id: string
          proposal_date: string
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
          value: number | null
          version: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["proposal_kind"]
          notes?: string | null
          opportunity_id: string
          proposal_date?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          value?: number | null
          version?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["proposal_kind"]
          notes?: string | null
          opportunity_id?: string
          proposal_date?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          value?: number | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          report_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          report_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "weekly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_business_areas: {
        Row: {
          assigned_at: string
          business_area_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          business_area_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          business_area_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_business_areas_business_area_id_fkey"
            columns: ["business_area_id"]
            isOneToOne: false
            referencedRelation: "business_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          action_register: string | null
          business_area_id: string
          business_prospect: string | null
          competitor_insight: string | null
          created_at: string
          follow_up_date: string | null
          id: string
          industry_insight: string | null
          institution_id: string
          last_comment_at: string | null
          last_seen_comment_at: string | null
          other_info: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          reporting_week: string
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          action_register?: string | null
          business_area_id: string
          business_prospect?: string | null
          competitor_insight?: string | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          industry_insight?: string | null
          institution_id: string
          last_comment_at?: string | null
          last_seen_comment_at?: string | null
          other_info?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          reporting_week: string
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          action_register?: string | null
          business_area_id?: string
          business_prospect?: string | null
          competitor_insight?: string | null
          created_at?: string
          follow_up_date?: string | null
          id?: string
          industry_insight?: string | null
          institution_id?: string
          last_comment_at?: string | null
          last_seen_comment_at?: string | null
          other_info?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          reporting_week?: string
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_business_area_id_fkey"
            columns: ["business_area_id"]
            isOneToOne: false
            referencedRelation: "business_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_business_area: {
        Args: { _ba_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_kind:
        | "call"
        | "meeting"
        | "email"
        | "site_visit"
        | "presentation"
        | "proposal_discussion"
        | "other"
      app_role: "admin" | "team_member"
      opportunity_status:
        | "open"
        | "active"
        | "won"
        | "lost"
        | "on_hold"
        | "cancelled"
      pipeline_stage:
        | "lead_generation"
        | "qualification"
        | "discovery"
        | "proposal"
        | "negotiation"
        | "delivery"
        | "expand_retain"
      priority_level: "low" | "medium" | "high" | "critical"
      proposal_kind:
        | "bespoke_sent"
        | "detailed_requested"
        | "detailed_submitted"
        | "accepted"
        | "rejected"
      proposal_status:
        | "draft"
        | "sent"
        | "under_review"
        | "accepted"
        | "rejected"
        | "withdrawn"
      report_status: "draft" | "submitted" | "reviewed" | "pending" | "overdue"
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
      activity_kind: [
        "call",
        "meeting",
        "email",
        "site_visit",
        "presentation",
        "proposal_discussion",
        "other",
      ],
      app_role: ["admin", "team_member"],
      opportunity_status: [
        "open",
        "active",
        "won",
        "lost",
        "on_hold",
        "cancelled",
      ],
      pipeline_stage: [
        "lead_generation",
        "qualification",
        "discovery",
        "proposal",
        "negotiation",
        "delivery",
        "expand_retain",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      proposal_kind: [
        "bespoke_sent",
        "detailed_requested",
        "detailed_submitted",
        "accepted",
        "rejected",
      ],
      proposal_status: [
        "draft",
        "sent",
        "under_review",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      report_status: ["draft", "submitted", "reviewed", "pending", "overdue"],
    },
  },
} as const
