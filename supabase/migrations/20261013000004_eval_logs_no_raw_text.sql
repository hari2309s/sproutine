-- eval_logs held raw prompts and replies with no link to a user, so health
-- data in them (GDPR Art. 9) could neither be found nor erased on account
-- deletion. Content now lives only in Langfuse traces, keyed by the user's
-- llm_pseudonym; this table keeps operational metrics only.
ALTER TABLE public.eval_logs
  DROP COLUMN IF EXISTS input,
  DROP COLUMN IF EXISTS output;
