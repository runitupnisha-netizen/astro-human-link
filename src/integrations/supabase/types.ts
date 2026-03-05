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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      matches: {
        Row: {
          compatibility_score: number | null
          compatibility_summary: string | null
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          compatibility_score?: number | null
          compatibility_summary?: string | null
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          compatibility_score?: number | null
          compatibility_summary?: string | null
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          astro_summary: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_latitude: number | null
          birth_longitude: number | null
          birth_place: string | null
          birth_time: string | null
          compatibility_tags: string[] | null
          created_at: string
          display_name: string | null
          drinking: string | null
          gene_keys_evolution: string | null
          gene_keys_life_purpose: string | null
          gene_keys_radiance: string | null
          gene_keys_summary: string | null
          human_design_authority: string | null
          human_design_profile: string | null
          human_design_strategy: string | null
          human_design_summary: string | null
          human_design_type: string | null
          id: string
          interests: string[] | null
          kids_preference: string | null
          life_path_number: number | null
          moon_sign: string | null
          onboarding_complete: boolean | null
          rising_sign: string | null
          smoking: string | null
          social_energy: number | null
          substances: string | null
          sun_sign: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          astro_summary?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_latitude?: number | null
          birth_longitude?: number | null
          birth_place?: string | null
          birth_time?: string | null
          compatibility_tags?: string[] | null
          created_at?: string
          display_name?: string | null
          drinking?: string | null
          gene_keys_evolution?: string | null
          gene_keys_life_purpose?: string | null
          gene_keys_radiance?: string | null
          gene_keys_summary?: string | null
          human_design_authority?: string | null
          human_design_profile?: string | null
          human_design_strategy?: string | null
          human_design_summary?: string | null
          human_design_type?: string | null
          id?: string
          interests?: string[] | null
          kids_preference?: string | null
          life_path_number?: number | null
          moon_sign?: string | null
          onboarding_complete?: boolean | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          astro_summary?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_latitude?: number | null
          birth_longitude?: number | null
          birth_place?: string | null
          birth_time?: string | null
          compatibility_tags?: string[] | null
          created_at?: string
          display_name?: string | null
          drinking?: string | null
          gene_keys_evolution?: string | null
          gene_keys_life_purpose?: string | null
          gene_keys_radiance?: string | null
          gene_keys_summary?: string | null
          human_design_authority?: string | null
          human_design_profile?: string | null
          human_design_strategy?: string | null
          human_design_summary?: string | null
          human_design_type?: string | null
          id?: string
          interests?: string[] | null
          kids_preference?: string | null
          life_path_number?: number | null
          moon_sign?: string | null
          onboarding_complete?: boolean | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          created_at: string
          id: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          target_user_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
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
