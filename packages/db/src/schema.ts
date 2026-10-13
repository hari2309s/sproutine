export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          description: string
          category: string
          merchant: string | null
          date: string
          is_recurring: boolean
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          description: string
          category: string
          merchant?: string | null
          date: string
          is_recurring?: boolean
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          amount?: number
          currency?: string
          description?: string
          category?: string
          merchant?: string | null
          date?: string
          is_recurring?: boolean
          embedding?: number[] | null
        }
      }
      monthly_snapshots: {
        Row: {
          id: string
          user_id: string
          month: string
          data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          data: Record<string, unknown>
          created_at?: string
        }
        Update: {
          data?: Record<string, unknown>
        }
      }
      anomalies: {
        Row: {
          id: string
          user_id: string
          transaction_id: string
          type: string
          severity: string
          description: string
          dismissed: boolean
          detected_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id: string
          type: string
          severity: string
          description: string
          dismissed?: boolean
          detected_at?: string
        }
        Update: {
          dismissed?: boolean
        }
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          saved_amount: number
          deadline: string | null
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          saved_amount?: number
          deadline?: string | null
          emoji?: string
          created_at?: string
        }
        Update: {
          name?: string
          target_amount?: number
          saved_amount?: number
          deadline?: string | null
          emoji?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          role: string
          content: string
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          content: string
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
      savings_habits: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          frequency: string
          emoji: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          frequency: string
          emoji?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          amount?: number
          frequency?: string
          emoji?: string
          is_active?: boolean
        }
      }
      habit_contributions: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          period: string
          amount: number
          logged_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          period: string
          amount: number
          logged_at?: string
        }
        Update: {
          amount?: number
        }
      }
    }
  }
}
