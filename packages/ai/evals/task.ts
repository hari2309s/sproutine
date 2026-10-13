import type { ExperimentTaskParams } from '@langfuse/client'
import { routeIntent } from '../src/intent'
import { classifySafety } from '../src/safety'
import type { EvalItemInput, EvalItemMetadata } from './dataset-items'

// Dispatches a dataset item to the real production function it names.
// Output is the label the function returned; evaluators.ts scores it.
export async function runAgentItem(
  params: ExperimentTaskParams<EvalItemInput, undefined, EvalItemMetadata>
): Promise<string> {
  // The SDK widens `input` to unknown — cast back to the shape we control
  // end-to-end (dataset-items.ts -> sync-dataset.ts -> Langfuse).
  const input = params.input as EvalItemInput
  switch (input.agent) {
    case 'intentRouter':
      return routeIntent(input.query)
    case 'safetyGate':
      return (await classifySafety(input.query)).category
  }
}
