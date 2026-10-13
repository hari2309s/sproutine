CREATE TABLE IF NOT EXISTS daily_llm_usage (
  date                DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  groq_requests       INT  DEFAULT 0,
  gemini_requests     INT  DEFAULT 0,
  cerebras_requests   INT  DEFAULT 0,
  openrouter_requests INT  DEFAULT 0,
  mistral_requests    INT  DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
