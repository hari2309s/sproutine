import type { QueryIntent } from '@truffle/types'

export type EvalAgent =
  | 'intentRouter'
  | 'affordabilityChecker'
  | 'forecaster'
  | 'spendingAnalyst'
  | 'savingsGoalAdvisor'
  | 'habitAdvisor'
  | 'anomalyReviewer'

// Keys the numeric-faithfulness evaluator resolves against the fixtures at run
// time (see evaluators.ts) rather than a frozen number here — projectedBalance
// depends on "today", so freezing it in the dataset would drift out of sync
// with what the agent under test actually computes.
export type NumericCheckKey =
  | 'projectedBalance'
  | 'totalSpent'
  | 'totalIncome'
  | 'goalLaptopRemaining'
  | 'goalLaptopSaved'

export interface EvalItemInput {
  agent: EvalAgent
  query: string
  fixture: 'hari' | 'none'
}

export interface EvalItemMetadata {
  expectedIntent?: QueryIntent
  numericCheck?: NumericCheckKey
  notes?: string
}

export interface EvalItem {
  id: string
  input: EvalItemInput
  metadata: EvalItemMetadata
}

// Router: does routeIntent() classify the query the way a human would expect?
// Deterministic exact-match eval — no LLM judge involved (see evaluators.ts).
const ROUTER_ITEMS: EvalItem[] = [
  { id: 'router-01', input: { agent: 'intentRouter', query: 'How much did I spend on food last month?', fixture: 'none' }, metadata: { expectedIntent: 'spending_summary' } },
  { id: 'router-02', input: { agent: 'intentRouter', query: 'Can I afford a €200 jacket this month?', fixture: 'none' }, metadata: { expectedIntent: 'affordability_check' } },
  { id: 'router-03', input: { agent: 'intentRouter', query: "What's my biggest expense category?", fixture: 'none' }, metadata: { expectedIntent: 'spending_summary' } },
  { id: 'router-04', input: { agent: 'intentRouter', query: 'Am I on track to hit my savings goal?', fixture: 'none' }, metadata: { expectedIntent: 'savings_goal_check' } },
  { id: 'router-05', input: { agent: 'intentRouter', query: 'Did I spend more on dining out than last month?', fixture: 'none' }, metadata: { expectedIntent: 'anomaly_review' } },
  { id: 'router-06', input: { agent: 'intentRouter', query: 'What will my balance be at end of month?', fixture: 'none' }, metadata: { expectedIntent: 'forecast_request' } },
  { id: 'router-07', input: { agent: 'intentRouter', query: 'Show me my transport spending', fixture: 'none' }, metadata: { expectedIntent: 'category_breakdown' } },
  { id: 'router-08', input: { agent: 'intentRouter', query: 'Set up a €200 monthly saving habit', fixture: 'none' }, metadata: { expectedIntent: 'habit_setting' } },
  { id: 'router-09', input: { agent: 'intentRouter', query: 'Log a €45 grocery shop at Lidl', fixture: 'none' }, metadata: { expectedIntent: 'add_transaction' } },
  { id: 'router-10', input: { agent: 'intentRouter', query: 'Create a savings goal for a new laptop for €1200', fixture: 'none' }, metadata: { expectedIntent: 'goal_setting' } },
  { id: 'router-11', input: { agent: 'intentRouter', query: 'How are my finances looking overall?', fixture: 'none' }, metadata: { expectedIntent: 'spending_summary' } },
  { id: 'router-12', input: { agent: 'intentRouter', query: 'Any unusual spending this month?', fixture: 'none' }, metadata: { expectedIntent: 'anomaly_review' } },
  { id: 'router-13', input: { agent: 'intentRouter', query: 'When will I reach my emergency fund goal?', fixture: 'none' }, metadata: { expectedIntent: 'savings_goal_check' } },
  { id: 'router-14', input: { agent: 'intentRouter', query: 'How much have I spent on subscriptions?', fixture: 'none' }, metadata: { expectedIntent: 'category_breakdown' } },
  { id: 'router-15', input: { agent: 'intentRouter', query: 'Can I afford a weekend trip to Berlin for €300?', fixture: 'none' }, metadata: { expectedIntent: 'affordability_check' } },
]

// Per-agent: response-quality judge (mirrors the live "response-quality" Langfuse
// evaluator) on every item, plus a numeric-faithfulness check wherever the agent
// splices a pre-computed figure into its prompt — catching the model restating a
// different number, which a subjective 1-5 judge won't reliably flag.
const AGENT_ITEMS: EvalItem[] = [
  { id: 'afford-01', input: { agent: 'affordabilityChecker', query: 'Can I afford a €150 pair of shoes this month?', fixture: 'hari' }, metadata: { numericCheck: 'projectedBalance' } },
  { id: 'afford-02', input: { agent: 'affordabilityChecker', query: 'Could I afford a weekend trip to Hamburg for €300?', fixture: 'hari' }, metadata: { numericCheck: 'projectedBalance' } },

  { id: 'forecast-01', input: { agent: 'forecaster', query: 'What will my balance be at the end of the month?', fixture: 'hari' }, metadata: { numericCheck: 'projectedBalance' } },
  { id: 'forecast-02', input: { agent: 'forecaster', query: 'Am I going to run out of money before payday?', fixture: 'hari' }, metadata: { numericCheck: 'projectedBalance' } },

  { id: 'spend-01', input: { agent: 'spendingAnalyst', query: 'How much have I spent this month?', fixture: 'hari' }, metadata: { numericCheck: 'totalSpent' } },
  { id: 'spend-02', input: { agent: 'spendingAnalyst', query: "What's my income been this month?", fixture: 'hari' }, metadata: { numericCheck: 'totalIncome' } },

  { id: 'goal-01', input: { agent: 'savingsGoalAdvisor', query: 'How close am I to affording the new laptop?', fixture: 'hari' }, metadata: { numericCheck: 'goalLaptopRemaining' } },
  { id: 'goal-02', input: { agent: 'savingsGoalAdvisor', query: 'How much have I saved toward the laptop so far?', fixture: 'hari' }, metadata: { numericCheck: 'goalLaptopSaved' } },

  { id: 'habit-01', input: { agent: 'habitAdvisor', query: 'Help me set up a habit to save €200 every month.', fixture: 'none' }, metadata: { notes: 'No transaction context available to this agent — judge only.' } },
  { id: 'habit-02', input: { agent: 'habitAdvisor', query: 'I keep forgetting to log small purchases, what habit should I build?', fixture: 'none' }, metadata: {} },

  { id: 'anomaly-01', input: { agent: 'anomalyReviewer', query: 'Did I spend more than usual on food delivery this month?', fixture: 'hari' }, metadata: { notes: 'Fixture includes a food_delivery category_spike anomaly.' } },
  { id: 'anomaly-02', input: { agent: 'anomalyReviewer', query: 'Any unusual spending I should know about?', fixture: 'hari' }, metadata: {} },
]

export const EVAL_DATASET_ITEMS: EvalItem[] = [...ROUTER_ITEMS, ...AGENT_ITEMS]
