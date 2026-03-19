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
      alignment_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          likes_count: number
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      daily_reveals: {
        Row: {
          created_at: string
          id: string
          reveal_date: string
          revealed_user_id: string
          user_id: string
          viewed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          reveal_date?: string
          revealed_user_id: string
          user_id: string
          viewed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          reveal_date?: string
          revealed_user_id?: string
          user_id?: string
          viewed?: boolean
        }
        Relationships: []
      }
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
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          message_type: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          message_type?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_verifications: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          selfie_url: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          selfie_url: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          selfie_url?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "alignment_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_max: number | null
          age_min: number | null
          astro_summary: string | null
          avatar_url: string | null
          bio_prompt_1: string | null
          bio_prompt_1_answer: string | null
          bio_prompt_2: string | null
          bio_prompt_2_answer: string | null
          bio_prompt_3: string | null
          bio_prompt_3_answer: string | null
          birth_date: string | null
          birth_latitude: number | null
          birth_longitude: number | null
          birth_place: string | null
          birth_time: string | null
          birthday_number: number | null
          boost_until: string | null
          compatibility_tags: string[] | null
          created_at: string
          current_city: string | null
          current_latitude: number | null
          current_longitude: number | null
          display_name: string | null
          drinking: string | null
          gender: string | null
          gene_keys_evolution: string | null
          gene_keys_life_purpose: string | null
          gene_keys_radiance: string | null
          gene_keys_summary: string | null
          growth_commitment: string | null
          human_design_authority: string | null
          human_design_profile: string | null
          human_design_strategy: string | null
          human_design_summary: string | null
          human_design_type: string | null
          id: string
          interests: string[] | null
          is_incognito: boolean
          is_paused: boolean
          kids_preference: string | null
          life_path_number: number | null
          max_distance_km: number | null
          moon_sign: string | null
          numerology_summary: string | null
          onboarding_complete: boolean | null
          personal_year_number: number | null
          preferred_elements: string[] | null
          preferred_genders: string[] | null
          preferred_hd_types: string[] | null
          relationship_goal: string | null
          rising_sign: string | null
          smoking: string | null
          social_energy: number | null
          spiritual_practice: string | null
          substances: string | null
          sun_sign: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          astro_summary?: string | null
          avatar_url?: string | null
          bio_prompt_1?: string | null
          bio_prompt_1_answer?: string | null
          bio_prompt_2?: string | null
          bio_prompt_2_answer?: string | null
          bio_prompt_3?: string | null
          bio_prompt_3_answer?: string | null
          birth_date?: string | null
          birth_latitude?: number | null
          birth_longitude?: number | null
          birth_place?: string | null
          birth_time?: string | null
          birthday_number?: number | null
          boost_until?: string | null
          compatibility_tags?: string[] | null
          created_at?: string
          current_city?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          display_name?: string | null
          drinking?: string | null
          gender?: string | null
          gene_keys_evolution?: string | null
          gene_keys_life_purpose?: string | null
          gene_keys_radiance?: string | null
          gene_keys_summary?: string | null
          growth_commitment?: string | null
          human_design_authority?: string | null
          human_design_profile?: string | null
          human_design_strategy?: string | null
          human_design_summary?: string | null
          human_design_type?: string | null
          id?: string
          interests?: string[] | null
          is_incognito?: boolean
          is_paused?: boolean
          kids_preference?: string | null
          life_path_number?: number | null
          max_distance_km?: number | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          relationship_goal?: string | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          spiritual_practice?: string | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          astro_summary?: string | null
          avatar_url?: string | null
          bio_prompt_1?: string | null
          bio_prompt_1_answer?: string | null
          bio_prompt_2?: string | null
          bio_prompt_2_answer?: string | null
          bio_prompt_3?: string | null
          bio_prompt_3_answer?: string | null
          birth_date?: string | null
          birth_latitude?: number | null
          birth_longitude?: number | null
          birth_place?: string | null
          birth_time?: string | null
          birthday_number?: number | null
          boost_until?: string | null
          compatibility_tags?: string[] | null
          created_at?: string
          current_city?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          display_name?: string | null
          drinking?: string | null
          gender?: string | null
          gene_keys_evolution?: string | null
          gene_keys_life_purpose?: string | null
          gene_keys_radiance?: string | null
          gene_keys_summary?: string | null
          growth_commitment?: string | null
          human_design_authority?: string | null
          human_design_profile?: string | null
          human_design_strategy?: string | null
          human_design_summary?: string | null
          human_design_type?: string | null
          id?: string
          interests?: string[] | null
          is_incognito?: boolean
          is_paused?: boolean
          kids_preference?: string | null
          life_path_number?: number | null
          max_distance_km?: number | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          relationship_goal?: string | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          spiritual_practice?: string | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
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
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_login_date: string | null
          longest_streak: number
          total_logins: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          total_logins?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          total_logins?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
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
