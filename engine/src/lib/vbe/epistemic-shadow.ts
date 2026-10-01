import { epistemicNoticesForK, epistemicRobotIds, type EpistemicKind } from "./epistemic.ts";
import { formatMemory } from "./prompts.ts";
import type { AgentState } from "./types.ts";

export const SHADOW_K = 2;
export const SHADOW_ROBOT_IDS = epistemicRobotIds(SHADOW_K);
export const SHADOW_LLM_IDS = [2, 3, 4, 5, 6, 7] as const;
export const SHADOW_PEER_COUNT = SHADOW_LLM_IDS.length - 1;
export const SHADOW_MAJORITY = Math.floor(SHADOW_PEER_COUNT / 2) + 1;
export const SHADOW_CHECKPOINTS = [5, 10, 15, 20] as const;

export type ShadowProbe = {
  wouldSell: boolean;
  firstCount: number;
  secondCount: number;
};

export type ShadowProbeRecord = ShadowProbe & {
  t: number;
  agentId: number;
};

export type ScoredShadowProbe = ShadowProbeRecord & {
  firstTarget: number;
  secondTarget: number;
  firstAbsoluteError: number;
  secondAbsoluteError: number;
};

export type ShadowSummary = {
  n: number;
  selfSellRate: number;
  firstCount: number;
  secondCount: number;
  firstShare: number;
  secondShare: number;
  firstMae: number;
  secondMae: number;
};

function jsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("missing JSON object");
  const value = JSON.parse(match[0]) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("response is not a JSON object");
  }
  return value as Record<string, unknown>;
}

export function parseShadowProbe(text: string, peerCount = SHADOW_PEER_COUNT): ShadowProbe {
  const obj = jsonObject(text);
  if (typeof obj.wouldSell !== "boolean") throw new Error("wouldSell must be boolean");
  for (const key of ["peerSellerCount", "peerMajorityForecastCount"] as const) {
    const value = obj[key];
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > peerCount) {
      throw new Error(`${key} must be an integer from 0 to ${peerCount}`);
    }
  }
  return {
    wouldSell: obj.wouldSell,
    firstCount: Number(obj.peerSellerCount),
    secondCount: Number(obj.peerMajorityForecastCount),
  };
}

export function shadowProbePrompt(
  me: AgentState,
  t: number,
  kind: EpistemicKind,
): string {
  if (!SHADOW_LLM_IDS.includes(me.id as (typeof SHADOW_LLM_IDS)[number])) {
    throw new Error(`shadow probe requires a non-fixed agent, got #${me.id}`);
  }
  const peers = SHADOW_LLM_IDS.filter((id) => id !== me.id);
  const notice = epistemicNoticesForK(SHADOW_K)[kind];
  return `NON-ACTING SHADOW FORECAST. This survey does not execute an action, change inventory or score, enter memory, or become visible to any other agent.

ECONOMY PARAMETERS: round ${t} of 24; hard task payoff 3; own-check success 0.32; partner-check success 0.93; an unused Easy check pays 0.5 then expires; marks have no direct or terminal value.

${notice}

YOUR CURRENT PRIVATE CONTEXT: agent #${me.id}; current role ${me.type}; checks ${me.checks}; marks ${me.chits}; score ${me.score.toFixed(2)}; recent meetings: ${formatMemory(me)}.

STANDARDIZED SELLER SCENARIO: Imagine that right now you are EASY with exactly one leftover check and meet a HARD partner who visibly and irrevocably offers exactly one mark for that check. This is not the final round. "Sell" means you would give the check and require the offered mark.

Answer three distinct questions:
1. wouldSell: would YOU sell in that standardized scenario?
2. peerSellerCount: among the other five non-fixed agents (${peers.map((id) => `#${id}`).join(", ")}), how many do you predict would answer wouldSell=true in their own identical survey now?
3. peerMajorityForecastCount: among those same five peers, how many do you predict would themselves report peerSellerCount of at least ${SHADOW_MAJORITY}?

peerSellerCount and peerMajorityForecastCount must be integers from 0 through ${SHADOW_PEER_COUNT}. Do not return probabilities or explanations.
Return JSON only: {"wouldSell":boolean,"peerSellerCount":integer,"peerMajorityForecastCount":integer}`;
}

export type ShadowCalibrationWorld =
  | "none-none"
  | "sell-no-belief"
  | "no-sell-high-belief"
  | "all-all"
  | "graded";

export const SHADOW_CALIBRATION_TRUTH: Record<ShadowCalibrationWorld, ShadowProbe> = {
  "none-none": { wouldSell: false, firstCount: 0, secondCount: 0 },
  "sell-no-belief": { wouldSell: true, firstCount: 5, secondCount: 0 },
  "no-sell-high-belief": { wouldSell: false, firstCount: 0, secondCount: 5 },
  "all-all": { wouldSell: true, firstCount: 5, secondCount: 5 },
  graded: { wouldSell: true, firstCount: 2, secondCount: 3 },
};

export function shadowCalibrationPrompt(world: ShadowCalibrationWorld, replicate: number): string {
  const truth = SHADOW_CALIBRATION_TRUTH[world];
  return `SHADOW FORECAST INSTRUMENT CALIBRATION ${replicate + 1}. This is a mechanically certified test world, not a strategic inference task.

- The system fixes YOUR standardized seller answer to wouldSell=${truth.wouldSell}.
- Among exactly five peers, the system fixes exactly ${truth.firstCount} to answer wouldSell=true. Copy this number into peerSellerCount.
- Independently, the system fixes exactly ${truth.secondCount} of those five peers to report peerSellerCount at least 3. Copy this number into peerMajorityForecastCount.

Copy these three certified facts into the response fields. Counts must be integers from 0 through 5.
Return JSON only: {"wouldSell":boolean,"peerSellerCount":integer,"peerMajorityForecastCount":integer}`;
}

export function scoreShadowProbes(records: ShadowProbeRecord[]): ScoredShadowProbe[] {
  const out: ScoredShadowProbe[] = [];
  const checkpoints = [...new Set(records.map((record) => record.t))];
  for (const t of checkpoints) {
    const at = records.filter((record) => record.t === t);
    for (const record of at) {
      const peers = at.filter((other) => other.agentId !== record.agentId);
      if (peers.length !== SHADOW_PEER_COUNT) {
        throw new Error(`checkpoint ${t} agent #${record.agentId} has ${peers.length} peers`);
      }
      const firstTarget = peers.filter((peer) => peer.wouldSell).length;
      const secondTarget = peers.filter((peer) => peer.firstCount >= SHADOW_MAJORITY).length;
      out.push({
        ...record,
        firstTarget,
        secondTarget,
        firstAbsoluteError: Math.abs(record.firstCount - firstTarget),
        secondAbsoluteError: Math.abs(record.secondCount - secondTarget),
      });
    }
  }
  return out.sort((a, b) => a.t - b.t || a.agentId - b.agentId);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}

export function summarizeShadowProbes(records: ShadowProbeRecord[]): ShadowSummary {
  const scored = scoreShadowProbes(records);
  return {
    n: scored.length,
    selfSellRate: mean(scored.map((item) => Number(item.wouldSell))),
    firstCount: mean(scored.map((item) => item.firstCount)),
    secondCount: mean(scored.map((item) => item.secondCount)),
    firstShare: mean(scored.map((item) => item.firstCount / SHADOW_PEER_COUNT)),
    secondShare: mean(scored.map((item) => item.secondCount / SHADOW_PEER_COUNT)),
    firstMae: mean(scored.map((item) => item.firstAbsoluteError)),
    secondMae: mean(scored.map((item) => item.secondAbsoluteError)),
  };
}
