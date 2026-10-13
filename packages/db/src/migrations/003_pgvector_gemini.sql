-- Resize embedding column from 384 (MiniLM) to 768 (Gemini embeddings, MRL-truncated)
-- Drop existing index and column, re-add with correct dimensions
alter table transactions drop column if exists embedding;
alter table transactions add column embedding vector(768);

-- HNSW index for fast approximate nearest-neighbour search
create index if not exists transactions_embedding_hnsw
  on transactions using hnsw (embedding vector_cosine_ops);

-- Similarity search function called from the app
create or replace function match_transactions(
  query_embedding vector(768),
  match_user_id uuid,
  match_count int default 20
)
returns table (
  id uuid,
  user_id uuid,
  amount numeric,
  currency text,
  description text,
  category text,
  merchant text,
  date date,
  is_recurring boolean,
  similarity float
)
language sql stable
as $$
  select
    id, user_id, amount, currency, description, category, merchant, date, is_recurring,
    1 - (embedding <=> query_embedding) as similarity
  from transactions
  where user_id = match_user_id
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
