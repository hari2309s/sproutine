// Hand-maintained to match supabase/migrations. Regenerate with
// `supabase gen types typescript --linked` once the project is linked.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          display_name: string
          diet: string
          allergies: string[]
          dislikes: string[]
          budget_weekly_cents: number | null
          goals: string[]
          quit_date: string | null
          locale: string
          voice_id: string
          safety_mode: boolean
          consent_health_at: string
          llm_pseudonym: string
          timezone: string
          created_at: string
          water_goal_ml: number
          water_glass_ml: number
          kcal_goal: number | null
          protein_goal_g: number | null
          carbs_goal_g: number | null
          fat_goal_g: number | null
          updated_at: string
        }
        Insert: {
          user_id: string
          display_name: string
          diet?: string
          allergies?: string[]
          dislikes?: string[]
          budget_weekly_cents?: number | null
          goals?: string[]
          quit_date?: string | null
          locale?: string
          voice_id?: string
          consent_health_at: string
          timezone?: string
          water_goal_ml?: number
          water_glass_ml?: number
          kcal_goal?: number | null
          protein_goal_g?: number | null
          carbs_goal_g?: number | null
          fat_goal_g?: number | null
        }
        Update: {
          display_name?: string
          diet?: string
          allergies?: string[]
          dislikes?: string[]
          budget_weekly_cents?: number | null
          goals?: string[]
          quit_date?: string | null
          locale?: string
          voice_id?: string
          safety_mode?: boolean
          timezone?: string
          water_goal_ml?: number
          water_glass_ml?: number
          kcal_goal?: number | null
          protein_goal_g?: number | null
          carbs_goal_g?: number | null
          fat_goal_g?: number | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: string
          content: string
          is_proactive: boolean
          read_at: string | null
          nudge_key: string | null
          safety: 'crisis' | 'ed_risk' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          content: string
          is_proactive?: boolean
          nudge_key?: string | null
          safety?: 'crisis' | 'ed_risk' | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
      }
      daily_llm_usage: {
        Row: {
          date: string
          groq_requests: number
          gemini_requests: number
          cerebras_requests: number
          openrouter_requests: number
          mistral_requests: number
          updated_at: string
        }
        Insert: { date?: string }
        Update: Record<string, never>
      }
      eval_logs: {
        Row: {
          id: string
          created_at: string
          provider: string
          task: string
          latency_ms: number | null
          tokens_used: number | null
          trace_id: string | null
        }
        Insert: {
          provider: string
          task: string
          latency_ms?: number | null
          tokens_used?: number | null
          trace_id?: string | null
        }
        Update: Record<string, never>
      }
      water_logs: {
        Row: {
          id: string
          user_id: string
          ml: number
          logged_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          ml: number
          logged_at?: string
        }
        Update: Record<string, never>
      }
      weight_logs: {
        Row: {
          id: string
          user_id: string
          weight_kg: number
          logged_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          weight_kg: number
          logged_at?: string
        }
        Update: {
          weight_kg?: number
          logged_at?: string
        }
      }
      calendar_feed_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          created_at: string
        }
        Insert: {
          user_id: string
        }
        Update: Record<string, never>
      }
      on_this_day_dismissals: {
        Row: {
          id: string
          user_id: string
          shown_at: string
          meal_log_id: string | null
          action: 'logged' | 'dismissed'
          created_at: string
        }
        Insert: {
          user_id: string
          shown_at?: string
          meal_log_id?: string | null
          action: 'logged' | 'dismissed'
        }
        Update: Record<string, never>
      }
    }
  }
}
