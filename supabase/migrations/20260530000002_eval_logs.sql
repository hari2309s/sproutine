CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS eval_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  provider        TEXT        NOT NULL,
  task            TEXT        NOT NULL,
  input           TEXT        NOT NULL,
  output          TEXT        NOT NULL,
  latency_ms      INT,
  tokens_used     INT,
  expected_intent TEXT,
  actual_intent   TEXT,
  judge_score     INT         CHECK (judge_score BETWEEN 1 AND 5),
  flagged         BOOLEAN     DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_eval_logs_provider_task ON eval_logs (provider, task);
CREATE INDEX IF NOT EXISTS idx_eval_logs_created_at   ON eval_logs (created_at DESC);
