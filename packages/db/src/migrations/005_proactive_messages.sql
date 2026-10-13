-- Add proactive nudge support to chat_messages
alter table chat_messages
  add column if not exists is_proactive boolean not null default false,
  add column if not exists read_at timestamptz,
  add column if not exists nudge_key text; -- e.g. 'anomaly:txn-uuid' or 'goal:uuid:50'

-- Fast lookup for unread badge count
create index if not exists chat_messages_unread_proactive
  on chat_messages(user_id, is_proactive, read_at)
  where is_proactive = true;

-- Prevent duplicate nudges for the same event
create unique index if not exists chat_messages_nudge_key_unique
  on chat_messages(user_id, nudge_key)
  where nudge_key is not null;
