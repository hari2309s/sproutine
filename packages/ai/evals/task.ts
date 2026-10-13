import type { ExperimentTaskParams } from '@langfuse/client'
import { routeIntent } from '../src/agents/intentRouter'
import { checkAffordability } from '../src/agents/affordabilityChecker'
import { forecastSpending } from '../src/agents/forecaster'
import { analyseSpending } from '../src/agents/spendingAnalyst'
import { adviseSavingsGoals } from '../src/agents/savingsGoalAdvisor'
import { adviseHabit } from '../src/agents/habitAdvisor'
import { reviewAnomalies } from '../src/agents/anomalyReviewer'
import { HARI_TRANSACTIONS, HARI_SNAPSHOT, HARI_GOALS, HARI_ANOMALIES } from './fixtures'
import type { EvalItemInput, EvalItemMetadata } from './dataset-items'

// Dispatches a dataset item to the real production agent function it names,
// against the fixed Hari fixture set. Output is either a QueryIntent label
// (router items) or free text (every other agent) — evaluators.ts branches
// on `input.agent` to score each shape appropriately.
export async function runAgentItem(
  params: ExperimentTaskParams<EvalItemInput, undefined, EvalItemMetadata>
): Promise<string> {
  // The SDK's ExperimentItem type is `{ input?: Input } | DatasetItem`, so
  // `input` widens to `unknown` at the call site — cast back to the shape we
  // control end-to-end (dataset-items.ts -> sync-dataset.ts -> Langfuse).
  const input = params.input as EvalItemInput

  switch (input.agent) {
    case 'intentRouter':
      return routeIntent(input.query)
    case 'affordabilityChecker':
      return checkAffordability(input.query, HARI_TRANSACTIONS, HARI_SNAPSHOT)
    case 'forecaster':
      return forecastSpending(input.query, HARI_TRANSACTIONS, HARI_SNAPSHOT)
    case 'spendingAnalyst':
      return analyseSpending(input.query, HARI_TRANSACTIONS, HARI_SNAPSHOT)
    case 'savingsGoalAdvisor':
      return adviseSavingsGoals(input.query, HARI_GOALS, HARI_SNAPSHOT)
    case 'habitAdvisor':
      return adviseHabit(input.query)
    case 'anomalyReviewer':
      return reviewAnomalies(input.query, HARI_TRANSACTIONS, HARI_ANOMALIES)
    default:
      throw new Error(`Unknown eval agent: ${(input as EvalItemInput).agent}`)
  }
}
