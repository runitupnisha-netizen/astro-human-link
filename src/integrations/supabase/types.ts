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
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          page: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          page?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          page?: string | null
          session_id?: string | null
          user_id?: string | null
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
      briefing_reflections: {
        Row: {
          briefing_id: string
          created_at: string
          id: string
          reflection: string
          user_id: string
        }
        Insert: {
          briefing_id: string
          created_at?: string
          id?: string
          reflection: string
          user_id: string
        }
        Update: {
          briefing_id?: string
          created_at?: string
          id?: string
          reflection?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_reflections_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "daily_briefings"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefings: {
        Row: {
          affirmation: string | null
          briefing_date: string
          cosmic_weather: string | null
          created_at: string
          energy_theme: string
          focus: string
          id: string
          journal_prompt: string
          lucky_window: string | null
          mood: string
          user_id: string
        }
        Insert: {
          affirmation?: string | null
          briefing_date?: string
          cosmic_weather?: string | null
          created_at?: string
          energy_theme: string
          focus: string
          id?: string
          journal_prompt: string
          lucky_window?: string | null
          mood: string
          user_id: string
        }
        Update: {
          affirmation?: string | null
          briefing_date?: string
          cosmic_weather?: string | null
          created_at?: string
          energy_theme?: string
          focus?: string
          id?: string
          journal_prompt?: string
          lucky_window?: string | null
          mood?: string
          user_id?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      pinned_matches: {
        Row: {
          created_at: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
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
      profile_views: {
        Row: {
          created_at: string
          id: string
          viewed_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          viewed_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          viewed_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
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
          briefing_email_reminder: boolean
          briefing_last_reminder_date: string | null
          briefing_push_reminder: boolean
          briefing_reminder_hour: number
          briefing_reminder_timezone: string
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
          last_seen_at: string | null
          life_path_number: number | null
          max_distance_km: number | null
          moon_sign: string | null
          numerology_summary: string | null
          onboarding_complete: boolean | null
          personal_year_number: number | null
          preferred_elements: string[] | null
          preferred_genders: string[] | null
          preferred_hd_types: string[] | null
          preferred_language: string | null
          relationship_goal: string | null
          rising_sign: string | null
          smoking: string | null
          social_energy: number | null
          spiritual_practice: string | null
          substances: string | null
          sun_sign: string | null
          updated_at: string
          user_id: string
          username: string | null
          voice_intro_url: string | null
        }
        Insert: {
          about_me?: string | null
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
          briefing_email_reminder?: boolean
          briefing_last_reminder_date?: string | null
          briefing_push_reminder?: boolean
          briefing_reminder_hour?: number
          briefing_reminder_timezone?: string
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
          last_seen_at?: string | null
          life_path_number?: number | null
          max_distance_km?: number | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          relationship_goal?: string | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          spiritual_practice?: string | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          voice_intro_url?: string | null
        }
        Update: {
          about_me?: string | null
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
          briefing_email_reminder?: boolean
          briefing_last_reminder_date?: string | null
          briefing_push_reminder?: boolean
          briefing_reminder_hour?: number
          briefing_reminder_timezone?: string
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
          last_seen_at?: string | null
          life_path_number?: number | null
          max_distance_km?: number | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          relationship_goal?: string | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          spiritual_practice?: string | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          voice_intro_url?: string | null
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
      rate_limits: {
        Row: {
          function_name: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          function_name: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          function_name?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
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
      spotify_connections: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          id: string
          refresh_token: string
          spotify_user_id: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          id?: string
          refresh_token: string
          spotify_user_id?: string | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          id?: string
          refresh_token?: string
          spotify_user_id?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      profiles_public: {
        Row: {
          about_me: string | null
          age: number | null
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
          birthday_number: number | null
          boost_until: string | null
          compatibility_tags: string[] | null
          created_at: string | null
          current_city: string | null
          current_latitude_approx: number | null
          current_longitude_approx: number | null
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
          id: string | null
          interests: string[] | null
          is_incognito: boolean | null
          is_paused: boolean | null
          kids_preference: string | null
          last_seen_at: string | null
          life_path_number: number | null
          max_distance_km: number | null
          moon_sign: string | null
          numerology_summary: string | null
          onboarding_complete: boolean | null
          personal_year_number: number | null
          preferred_elements: string[] | null
          preferred_genders: string[] | null
          preferred_hd_types: string[] | null
          preferred_language: string | null
          relationship_goal: string | null
          rising_sign: string | null
          smoking: string | null
          social_energy: number | null
          spiritual_practice: string | null
          substances: string | null
          sun_sign: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          voice_intro_url: string | null
        }
        Insert: {
          about_me?: string | null
          age?: never
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
          birthday_number?: number | null
          boost_until?: string | null
          compatibility_tags?: string[] | null
          created_at?: string | null
          current_city?: string | null
          current_latitude_approx?: never
          current_longitude_approx?: never
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
          id?: string | null
          interests?: string[] | null
          is_incognito?: boolean | null
          is_paused?: boolean | null
          kids_preference?: string | null
          last_seen_at?: string | null
          life_path_number?: number | null
          max_distance_km?: number | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          relationship_goal?: string | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          spiritual_practice?: string | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          voice_intro_url?: string | null
        }
        Update: {
          about_me?: string | null
          age?: never
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
          birthday_number?: number | null
          boost_until?: string | null
          compatibility_tags?: string[] | null
          created_at?: string | null
          current_city?: string | null
          current_latitude_approx?: never
          current_longitude_approx?: never
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
          id?: string | null
          interests?: string[] | null
          is_incognito?: boolean | null
          is_paused?: boolean | null
          kids_preference?: string | null
          last_seen_at?: string | null
          life_path_number?: number | null
          max_distance_km?: number | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          relationship_goal?: string | null
          rising_sign?: string | null
          smoking?: string | null
          social_energy?: number | null
          spiritual_practice?: string | null
          substances?: string | null
          sun_sign?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          voice_intro_url?: string | null
        }
        Relationships: []
      }
      verification_status: {
        Row: {
          status: string | null
          user_id: string | null
        }
        Insert: {
          status?: string | null
          user_id?: string | null
        }
        Update: {
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_rate_limits: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
