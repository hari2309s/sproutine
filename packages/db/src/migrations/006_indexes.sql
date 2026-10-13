-- Indexes for common query patterns not covered by 001_initial.sql

-- chat_messages: loaded on every chat page open ordered by created_at
create index if not exists idx_chat_messages_user_created
  on chat_messages(user_id, created_at desc);

-- anomalies: queried by user ordered by detected_at in both chat and insights routes
create index if not exists idx_anomalies_user_detected
  on anomalies(user_id, detected_at desc);
