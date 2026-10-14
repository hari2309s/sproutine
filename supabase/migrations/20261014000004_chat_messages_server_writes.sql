-- Chat history is written only by the server. It is replayed to the model as
-- context, so a client that could insert rows (assistant turns especially)
-- could put words in Rosie's mouth. The chat route now stores both the user's
-- message and Rosie's reply with the service role.
drop policy if exists "chat_messages: insert own" on public.chat_messages;
revoke insert on public.chat_messages from anon, authenticated;
