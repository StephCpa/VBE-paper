export { DEFAULT_PARAMS, type VbeParams } from "./params.ts";
export {
  runPopulation,
  runPopulationAsync,
  runPopulationAsyncPaired,
  runRound,
  finiteMean,
} from "./env.ts";
export { STRATEGIES, STRATEGY_LABELS, kw, barter, reciprocity, neverTrade, altruist } from "./robots.ts";
export { sweep, type CalibrationReport } from "./calibrate.ts";
export type { RunResult, RoundSnapshot, AgentState, StrategyName } from "./types.ts";
