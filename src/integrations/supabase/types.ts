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
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      assessment_feedback: {
        Row: {
          assessment_id: string
          comment: string | null
          corrected_value: string | null
          created_at: string
          id: string
          langfuse_trace_id: string | null
          original_value: string | null
          target_key: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          comment?: string | null
          corrected_value?: string | null
          created_at?: string
          id?: string
          langfuse_trace_id?: string | null
          original_value?: string | null
          target_key: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          comment?: string | null
          corrected_value?: string | null
          created_at?: string
          id?: string
          langfuse_trace_id?: string | null
          original_value?: string | null
          target_key?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_feedback_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          action_items: Json | null
          company: string | null
          company_intel: Json | null
          created_at: string
          fit_label: string | null
          fit_score: number | null
          fit_summary: string | null
          id: string
          intent_to_apply: boolean
          job_decoder: Json | null
          job_description: string
          langfuse_assess_trace_id: string | null
          requirements: Json | null
          role_title: string | null
          screening_risks: Json | null
          status: string
          tailored_cv: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          company?: string | null
          company_intel?: Json | null
          created_at?: string
          fit_label?: string | null
          fit_score?: number | null
          fit_summary?: string | null
          id?: string
          intent_to_apply?: boolean
          job_decoder?: Json | null
          job_description: string
          langfuse_assess_trace_id?: string | null
          requirements?: Json | null
          role_title?: string | null
          screening_risks?: Json | null
          status?: string
          tailored_cv?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          company?: string | null
          company_intel?: Json | null
          created_at?: string
          fit_label?: string | null
          fit_score?: number | null
          fit_summary?: string | null
          id?: string
          intent_to_apply?: boolean
          job_decoder?: Json | null
          job_description?: string
          langfuse_assess_trace_id?: string | null
          requirements?: Json | null
          role_title?: string | null
          screening_risks?: Json | null
          status?: string
          tailored_cv?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      claude_logs: {
        Row: {
          created_at: string | null
          error: string | null
          function_name: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          response: string | null
          system_prompt: string | null
          user_prompt: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          function_name?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          response?: string | null
          system_prompt?: string | null
          user_prompt?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          function_name?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          response?: string | null
          system_prompt?: string | null
          user_prompt?: string | null
        }
        Relationships: []
      }
      eval_cases: {
        Row: {
          created_at: string
          id: string
          job_description: string
          notes: string | null
          profile: Json
          source: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_description: string
          notes?: string | null
          profile: Json
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_description?: string
          notes?: string | null
          profile?: Json
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      eval_review_queue: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          prompt_fix_note: string | null
          reason: string
          reviewed_at: string | null
          run_id: string | null
          status: string
          updated_at: string
          verdict: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          prompt_fix_note?: string | null
          reason: string
          reviewed_at?: string | null
          run_id?: string | null
          status?: string
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          prompt_fix_note?: string | null
          reason?: string
          reviewed_at?: string | null
          run_id?: string | null
          status?: string
          updated_at?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eval_review_queue_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eval_review_queue_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "eval_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_runs: {
        Row: {
          case_id: string | null
          created_at: string
          error: string | null
          id: string
          langfuse_trace_id: string | null
          latency_ms: number | null
          model: string | null
          output: Json | null
          prompt_label: string | null
          prompt_version: number | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          langfuse_trace_id?: string | null
          latency_ms?: number | null
          model?: string | null
          output?: Json | null
          prompt_label?: string | null
          prompt_version?: number | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          langfuse_trace_id?: string | null
          latency_ms?: number | null
          model?: string | null
          output?: Json | null
          prompt_label?: string | null
          prompt_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eval_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "eval_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_scores: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          name: string
          passed: boolean | null
          run_id: string
          scorer: string
          value: number | null
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          name: string
          passed?: boolean | null
          run_id: string
          scorer: string
          value?: number | null
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          name?: string
          passed?: boolean | null
          run_id?: string
          scorer?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eval_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "eval_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          cv_file_path: string | null
          id: string
          languages: Json | null
          name: string | null
          outcomes: Json | null
          preferences: Json
          raw_text: string | null
          roles: Json | null
          seniority_signals: Json | null
          skills: Json | null
          title: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          cv_file_path?: string | null
          id?: string
          languages?: Json | null
          name?: string | null
          outcomes?: Json | null
          preferences?: Json
          raw_text?: string | null
          roles?: Json | null
          seniority_signals?: Json | null
          skills?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          cv_file_path?: string | null
          id?: string
          languages?: Json | null
          name?: string | null
          outcomes?: Json | null
          preferences?: Json
          raw_text?: string | null
          roles?: Json | null
          seniority_signals?: Json | null
          skills?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
