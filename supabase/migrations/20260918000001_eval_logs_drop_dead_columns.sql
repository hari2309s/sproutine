-- expected_intent/actual_intent/judge_score/flagged were never populated:
-- intent and quality scoring now live in Langfuse (dataset "agent-golden" for
-- intent accuracy; the "response-quality" evaluator + CI gate for quality),
-- not in this operational request log. See packages/ai/evals/.
ALTER TABLE eval_logs
  DROP COLUMN IF EXISTS expected_intent,
  DROP COLUMN IF EXISTS actual_intent,
  DROP COLUMN IF EXISTS judge_score,
  DROP COLUMN IF EXISTS flagged;
