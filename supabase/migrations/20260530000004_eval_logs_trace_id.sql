ALTER TABLE eval_logs
  ADD COLUMN IF NOT EXISTS trace_id TEXT;

CREATE INDEX IF NOT EXISTS idx_eval_logs_trace_id ON eval_logs (trace_id)
  WHERE trace_id IS NOT NULL;
