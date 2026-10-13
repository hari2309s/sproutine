CREATE OR REPLACE FUNCTION increment_llm_usage(p_date DATE, p_provider TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_llm_usage (date)
  VALUES (p_date)
  ON CONFLICT (date) DO NOTHING;

  EXECUTE format(
    'UPDATE daily_llm_usage SET %I = %I + 1, updated_at = NOW() WHERE date = $1',
    p_provider || '_requests',
    p_provider || '_requests'
  ) USING p_date;
END;
$$ LANGUAGE plpgsql;
