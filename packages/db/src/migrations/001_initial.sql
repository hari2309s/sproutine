-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  currency text default 'EUR' not null,
  description text not null,
  category text not null,
  merchant text,
  date date not null,
  is_recurring boolean default false not null,
  embedding vector(384),
  created_at timestamptz default now() not null
);

-- Monthly snapshots (cached, recomputed on demand)
create table if not exists monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null, -- YYYY-MM
  data jsonb not null, -- MonthlySnapshot type
  created_at timestamptz default now() not null,
  unique(user_id, month)
);

-- Anomalies
create table if not exists anomalies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  transaction_id uuid references transactions(id) on delete cascade,
  type text not null,
  severity text not null,
  description text not null,
  dismissed boolean default false not null,
  detected_at timestamptz default now() not null
);

-- Chat history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null,
  content text not null,
  audio_url text,
  created_at timestamptz default now() not null
);

-- RLS policies
alter table transactions enable row level security;
create policy "users see own transactions" on transactions
  for all using (auth.uid() = user_id);

alter table monthly_snapshots enable row level security;
create policy "users see own snapshots" on monthly_snapshots
  for all using (auth.uid() = user_id);

alter table anomalies enable row level security;
create policy "users see own anomalies" on anomalies
  for all using (auth.uid() = user_id);

alter table chat_messages enable row level security;
create policy "users see own messages" on chat_messages
  for all using (auth.uid() = user_id);

-- Index for fast transaction queries by user + date
create index if not exists transactions_user_date on transactions(user_id, date desc);
create index if not exists transactions_user_category on transactions(user_id, category);
