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
      blueprint_ai_cache: {
        Row: {
          cached_until: string | null
          content: string
          created_at: string
          generated_at: string
          id: string
          model: string | null
          section_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cached_until?: string | null
          content: string
          created_at?: string
          generated_at?: string
          id?: string
          model?: string | null
          section_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cached_until?: string | null
          content?: string
          created_at?: string
          generated_at?: string
          id?: string
          model?: string | null
          section_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      briefing_reflections: {
        Row: {
          briefing_id: string
          client_key: string | null
          created_at: string
          id: string
          reflection: string
          user_id: string
        }
        Insert: {
          briefing_id: string
          client_key?: string | null
          created_at?: string
          id?: string
          reflection: string
          user_id: string
        }
        Update: {
          briefing_id?: string
          client_key?: string | null
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
      call_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          participant_id: string | null
          payload: Json
          room_name: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          participant_id?: string | null
          payload?: Json
          room_name: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          participant_id?: string | null
          payload?: Json
          room_name?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_provisioning_errors: {
        Row: {
          created_at: string
          details: Json
          error_category: string
          http_status: number | null
          id: string
          match_id: string | null
          message: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          error_category: string
          http_status?: number | null
          id?: string
          match_id?: string | null
          message?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          error_category?: string
          http_status?: number | null
          id?: string
          match_id?: string | null
          message?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      call_rooms: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          expires_at: string
          id: string
          match_id: string
          room_name: string
          room_url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          expires_at: string
          id?: string
          match_id: string
          room_name: string
          room_url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          match_id?: string
          room_name?: string
          room_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_rooms_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_type: string
          created_at: string
          ended_at: string | null
          id: string
          match_id: string
          room_name: string
          started_at: string
          user_id: string
        }
        Insert: {
          call_type?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          match_id: string
          room_name: string
          started_at?: string
          user_id: string
        }
        Update: {
          call_type?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          match_id?: string
          room_name?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connection_checks: {
        Row: {
          compatibility_score: number | null
          created_at: string
          cross_aspects: Json | null
          friction_points: Json | null
          highlight: string | null
          id: string
          lessons: string | null
          strengths: Json | null
          summary: string | null
          synastry_overview: string | null
          their_birth_date: string
          their_birth_place: string
          their_birth_time: string | null
          their_moon_sign: string | null
          their_name: string | null
          their_rising_sign: string | null
          their_sun_sign: string | null
          user_id: string
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string
          cross_aspects?: Json | null
          friction_points?: Json | null
          highlight?: string | null
          id?: string
          lessons?: string | null
          strengths?: Json | null
          summary?: string | null
          synastry_overview?: string | null
          their_birth_date: string
          their_birth_place: string
          their_birth_time?: string | null
          their_moon_sign?: string | null
          their_name?: string | null
          their_rising_sign?: string | null
          their_sun_sign?: string | null
          user_id: string
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string
          cross_aspects?: Json | null
          friction_points?: Json | null
          highlight?: string | null
          id?: string
          lessons?: string | null
          strengths?: Json | null
          summary?: string | null
          synastry_overview?: string | null
          their_birth_date?: string
          their_birth_place?: string
          their_birth_time?: string | null
          their_moon_sign?: string | null
          their_name?: string | null
          their_rising_sign?: string | null
          their_sun_sign?: string | null
          user_id?: string
        }
        Relationships: []
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
      guide_conversations: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          last_message_at: string
          message_count: number
          seed_topic: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_message_at?: string
          message_count?: number
          seed_topic?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_message_at?: string
          message_count?: number
          seed_topic?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guide_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "guide_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      iap_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          environment: string
          expires_at: string | null
          id: string
          latest_transaction_id: string | null
          original_transaction_id: string
          platform: string
          product_id: string
          purchased_at: string | null
          raw: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          latest_transaction_id?: string | null
          original_transaction_id: string
          platform: string
          product_id: string
          purchased_at?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          environment?: string
          expires_at?: string | null
          id?: string
          latest_transaction_id?: string | null
          original_transaction_id?: string
          platform?: string
          product_id?: string
          purchased_at?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
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
      moderation_queue: {
        Row: {
          action_taken: string | null
          ai_categories: Json | null
          ai_flagged: boolean | null
          ai_provider: string | null
          ai_score: number | null
          content_id: string | null
          content_snapshot: string | null
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string | null
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          ai_categories?: Json | null
          ai_flagged?: boolean | null
          ai_provider?: string | null
          ai_score?: number | null
          content_id?: string | null
          content_snapshot?: string | null
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          ai_categories?: Json | null
          ai_flagged?: boolean | null
          ai_provider?: string | null
          ai_score?: number | null
          content_id?: string | null
          content_snapshot?: string | null
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      moon_journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_type: string
          id: string
          phase: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_type: string
          id?: string
          phase: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_type?: string
          id?: string
          phase?: string
          user_id?: string
        }
        Relationships: []
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
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          phone: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          phone: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          phone?: string
          used?: boolean
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
          bonus_pro_until: string | null
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
          daily_ritual_last_completed: string | null
          date_of_birth: string | null
          deletion_scheduled_at: string | null
          display_name: string | null
          drinking: string | null
          eula_accepted_at: string | null
          eula_version: string | null
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
          is_apple_reviewer: boolean
          is_incognito: boolean
          is_paused: boolean
          is_suspended: boolean
          kids_preference: string | null
          last_seen_at: string | null
          life_path_number: number | null
          lyra_message_count: number
          mars_sign: string | null
          max_distance_km: number | null
          mercury_sign: string | null
          moon_sign: string | null
          numerology_summary: string | null
          onboarding_complete: boolean | null
          personal_year_number: number | null
          phone: string | null
          preferred_elements: string[] | null
          preferred_genders: string[] | null
          preferred_hd_types: string[] | null
          preferred_language: string | null
          push_primer_shown: boolean
          recurring_themes: string | null
          referral_redeemed_at: string | null
          referred_by_code: string | null
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
          venus_sign: string | null
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
          bonus_pro_until?: string | null
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
          daily_ritual_last_completed?: string | null
          date_of_birth?: string | null
          deletion_scheduled_at?: string | null
          display_name?: string | null
          drinking?: string | null
          eula_accepted_at?: string | null
          eula_version?: string | null
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
          is_apple_reviewer?: boolean
          is_incognito?: boolean
          is_paused?: boolean
          is_suspended?: boolean
          kids_preference?: string | null
          last_seen_at?: string | null
          life_path_number?: number | null
          lyra_message_count?: number
          mars_sign?: string | null
          max_distance_km?: number | null
          mercury_sign?: string | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          phone?: string | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          push_primer_shown?: boolean
          recurring_themes?: string | null
          referral_redeemed_at?: string | null
          referred_by_code?: string | null
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
          venus_sign?: string | null
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
          bonus_pro_until?: string | null
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
          daily_ritual_last_completed?: string | null
          date_of_birth?: string | null
          deletion_scheduled_at?: string | null
          display_name?: string | null
          drinking?: string | null
          eula_accepted_at?: string | null
          eula_version?: string | null
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
          is_apple_reviewer?: boolean
          is_incognito?: boolean
          is_paused?: boolean
          is_suspended?: boolean
          kids_preference?: string | null
          last_seen_at?: string | null
          life_path_number?: number | null
          lyra_message_count?: number
          mars_sign?: string | null
          max_distance_km?: number | null
          mercury_sign?: string | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          phone?: string | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          push_primer_shown?: boolean
          recurring_themes?: string | null
          referral_redeemed_at?: string | null
          referred_by_code?: string | null
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
          venus_sign?: string | null
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
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          rewards_earned: number
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          rewards_earned?: number
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          rewards_earned?: number
          user_id?: string
          uses_count?: number
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
          content_id: string | null
          content_snapshot: string | null
          content_type: string | null
          created_at: string
          details: string | null
          id: string
          moderation_status: string
          reason: string
          reported_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id?: string | null
          content_snapshot?: string | null
          content_type?: string | null
          created_at?: string
          details?: string | null
          id?: string
          moderation_status?: string
          reason: string
          reported_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string | null
          content_snapshot?: string | null
          content_type?: string | null
          created_at?: string
          details?: string | null
          id?: string
          moderation_status?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      saved_insights: {
        Row: {
          content: string
          created_at: string
          id: string
          source: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          source: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      shadow_journal_entries: {
        Row: {
          created_at: string
          entry: string
          id: string
          prompt: string
          prompt_index: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry: string
          id?: string
          prompt: string
          prompt_index?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry?: string
          id?: string
          prompt?: string
          prompt_index?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          http_status: number | null
          id: string
          internal_error: string | null
          ip: string | null
          phone: string
          request_payload: Json | null
          response_payload: Json | null
          status: string
          twilio_error_code: string | null
          twilio_error_message: string | null
          twilio_sid: string | null
          twilio_status: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          http_status?: number | null
          id?: string
          internal_error?: string | null
          ip?: string | null
          phone: string
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          twilio_sid?: string | null
          twilio_status?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          http_status?: number | null
          id?: string
          internal_error?: string | null
          ip?: string | null
          phone?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          twilio_error_code?: string | null
          twilio_error_message?: string | null
          twilio_sid?: string | null
          twilio_status?: string | null
        }
        Relationships: []
      }
      soulmate_sketches: {
        Row: {
          generated_at: string
          id: string
          sketch_text: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          sketch_text: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          sketch_text?: string
          user_id?: string
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
      time_travel_moments: {
        Row: {
          created_at: string
          id: string
          label: string | null
          moment_date: string
          narrative_excerpt: string | null
          reflection: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          moment_date: string
          narrative_excerpt?: string | null
          reflection?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          moment_date?: string
          narrative_excerpt?: string | null
          reflection?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      public_profiles: {
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
          birth_place: string | null
          birthday_number: number | null
          boost_until: string | null
          compatibility_tags: string[] | null
          created_at: string | null
          current_city: string | null
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
          mars_sign: string | null
          max_distance_km: number | null
          mercury_sign: string | null
          moon_sign: string | null
          numerology_summary: string | null
          onboarding_complete: boolean | null
          personal_year_number: number | null
          preferred_elements: string[] | null
          preferred_genders: string[] | null
          preferred_hd_types: string[] | null
          preferred_language: string | null
          recurring_themes: string | null
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
          venus_sign: string | null
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
          birth_place?: string | null
          birthday_number?: number | null
          boost_until?: string | null
          compatibility_tags?: string[] | null
          created_at?: string | null
          current_city?: string | null
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
          mars_sign?: string | null
          max_distance_km?: number | null
          mercury_sign?: string | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          recurring_themes?: string | null
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
          venus_sign?: string | null
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
          birth_place?: string | null
          birthday_number?: number | null
          boost_until?: string | null
          compatibility_tags?: string[] | null
          created_at?: string | null
          current_city?: string | null
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
          mars_sign?: string | null
          max_distance_km?: number | null
          mercury_sign?: string | null
          moon_sign?: string | null
          numerology_summary?: string | null
          onboarding_complete?: boolean | null
          personal_year_number?: number | null
          preferred_elements?: string[] | null
          preferred_genders?: string[] | null
          preferred_hd_types?: string[] | null
          preferred_language?: string | null
          recurring_themes?: string | null
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
          venus_sign?: string | null
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
      cancel_account_deletion: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      distance_to_user: { Args: { target_user_id: string }; Returns: number }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      hard_delete_expired_accounts: { Args: never; Returns: number }
      has_active_iap: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_match_participant: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_referral_code: { Args: { _code: string }; Returns: Json }
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
      redeem_referral_code: { Args: { _code: string }; Returns: Json }
      request_account_deletion: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
