import { StateGraph, END, START, Annotation } from '@langchain/langgraph'
import type {
  MonthlySnapshot,
  Transaction,
  Anomaly,
  QueryIntent,
  SavingsGoal,
} from '@truffle/types'
import { routeIntent } from './agents/intentRouter'
import { analyseSpending } from './agents/spendingAnalyst'
import { forecastSpending } from './agents/forecaster'
import { checkAffordability } from './agents/affordabilityChecker'
import { reviewAnomalies } from './agents/anomalyReviewer'
import { adviseSavingsGoals } from './agents/savingsGoalAdvisor'
import { queryTransactions } from './vectorStore'
import { currentYearMonth } from './date'

export const GraphAnnotation = Annotation.Root({
  userQuery: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  agentResponse: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  intent: Annotation<QueryIntent>({
    reducer: (x, y) => y ?? x,
    default: () => 'general_advice' as QueryIntent,
  }),
  transactions: Annotation<Transaction[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
  // Populated once by ragRetrievalNode; all agent nodes read from here instead of querying separately
  retrievedTransactions: Annotation<Transaction[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  anomalies: Annotation<Anomaly[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
  savingsGoals: Annotation<SavingsGoal[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  currentMonth: Annotation<MonthlySnapshot | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
})

type GraphState = typeof GraphAnnotation.State

function emptySnapshot(): MonthlySnapshot {
  return {
    month: currentYearMonth(),
    totalIncome: 0,
    totalExpenses: 0,
    byCategory: {} as MonthlySnapshot['byCategory'],
    savingsRate: 0,
    balance: 0,
  }
}

// Runs once per request — fetches relevant transactions via RAG and stores them
// in state so downstream agent nodes never call queryTransactions independently.
async function ragRetrievalNode(state: GraphState): Promise<Partial<GraphState>> {
  const userId = state.transactions[0]?.userId ?? ''
  if (!userId || !state.userQuery) return {}
  const retrieved = await queryTransactions(userId, state.userQuery, 20).catch(() => [])
  return { retrievedTransactions: retrieved.length > 0 ? retrieved : state.transactions }
}

async function intentRouterNode(state: GraphState): Promise<Partial<GraphState>> {
  const intent = await routeIntent(state.userQuery)
  return { intent }
}

async function spendingAnalystNode(state: GraphState): Promise<Partial<GraphState>> {
  const transactions =
    state.retrievedTransactions.length > 0 ? state.retrievedTransactions : state.transactions
  const analysis = await analyseSpending(
    state.userQuery,
    transactions,
    state.currentMonth ?? emptySnapshot()
  )
  return { agentResponse: analysis }
}

async function forecasterNode(state: GraphState): Promise<Partial<GraphState>> {
  const transactions =
    state.retrievedTransactions.length > 0 ? state.retrievedTransactions : state.transactions
  const response = await forecastSpending(
    state.userQuery,
    transactions,
    state.currentMonth ?? emptySnapshot()
  )
  return { agentResponse: response }
}

async function affordabilityCheckerNode(state: GraphState): Promise<Partial<GraphState>> {
  const transactions =
    state.retrievedTransactions.length > 0 ? state.retrievedTransactions : state.transactions
  const response = await checkAffordability(
    state.userQuery,
    transactions,
    state.currentMonth ?? emptySnapshot()
  )
  return { agentResponse: response }
}

async function anomalyReviewerNode(state: GraphState): Promise<Partial<GraphState>> {
  const transactions =
    state.retrievedTransactions.length > 0 ? state.retrievedTransactions : state.transactions
  const response = await reviewAnomalies(state.userQuery, transactions, state.anomalies)
  return { agentResponse: response }
}

async function savingsGoalAdvisorNode(state: GraphState): Promise<Partial<GraphState>> {
  const response = await adviseSavingsGoals(
    state.userQuery,
    state.savingsGoals,
    state.currentMonth ?? emptySnapshot()
  )
  return { agentResponse: response }
}

function routeAfterIntent(state: GraphState): string {
  switch (state.intent) {
    case 'spending_summary':
    case 'category_breakdown':
      return 'spendingAnalyst'
    case 'forecast_request':
      return 'forecaster'
    case 'affordability_check':
      return 'affordabilityChecker'
    case 'anomaly_review':
      return 'anomalyReviewer'
    case 'savings_goal_check':
      return 'savingsGoalAdvisor'
    default:
      return 'spendingAnalyst'
  }
}

export function buildTruffleGraph() {
  return new StateGraph(GraphAnnotation)
    .addNode('ragRetrieval', ragRetrievalNode)
    .addNode('intentRouter', intentRouterNode)
    .addNode('spendingAnalyst', spendingAnalystNode)
    .addNode('forecaster', forecasterNode)
    .addNode('affordabilityChecker', affordabilityCheckerNode)
    .addNode('anomalyReviewer', anomalyReviewerNode)
    .addNode('savingsGoalAdvisor', savingsGoalAdvisorNode)
    .addEdge(START, 'ragRetrieval')
    .addEdge('ragRetrieval', 'intentRouter')
    .addConditionalEdges('intentRouter', routeAfterIntent, {
      spendingAnalyst: 'spendingAnalyst',
      forecaster: 'forecaster',
      affordabilityChecker: 'affordabilityChecker',
      anomalyReviewer: 'anomalyReviewer',
      savingsGoalAdvisor: 'savingsGoalAdvisor',
    })
    .addEdge('spendingAnalyst', END)
    .addEdge('forecaster', END)
    .addEdge('affordabilityChecker', END)
    .addEdge('anomalyReviewer', END)
    .addEdge('savingsGoalAdvisor', END)
    .compile()
}
