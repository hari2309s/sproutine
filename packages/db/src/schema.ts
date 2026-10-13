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
          created_at: string
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
    }
  }
}
