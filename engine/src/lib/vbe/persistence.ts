import { MODEL } from "./llm.ts";
import { CANONICAL_POLICY } from "./founder.ts";
import type { CoordinationSlice } from "./epistemic.ts";
import type { RunResult } from "./types.ts";

export type PersistenceArm = "transient" | "private-memory" | "public-ledger" | "contract";
export const PERSISTENCE_SEEDS = [17, 29, 41, 53, 67, 71, 83, 97, 101, 103, 107, 109];
export const INSTALL_LAST_ROUND = 8;
export const TURNOVER_FIRST_ROUND = 9;
export const TURNOVER_LAST_ROUND = 16;
export const POST_FIRST_ROUND = 17;
export const POST_LAST_ROUND = 23;

export type PersistenceWindows = {
  install: CoordinationSlice;
  turnover: CoordinationSlice;
  postReplacement: CoordinationSlice;
};

export type PersistenceRun = {
  arm: PersistenceArm;
  seed: number;
  calls: number;
  apiFails: number;
  parseFails: number;
  scheduleHash: string;
  replacementOrder: number[];
  windows: PersistenceWindows;
  meanScore: number;
  result: RunResult;
};

export type PersistenceSummary = {
  n: number;
  postSeller: number;
  postBuyer: number;
  postTrade: number;
  sellerRetention: number;
  tradeRetention: number;
  meanScore: number;
};

export type PersistenceReport = {
  model: string;
  seeds: number[];
  controllerTurnover: string;
  policy: string;
  runs: PersistenceRun[];
  byArm: Partial<Record<PersistenceArm, PersistenceSummary>>;
  verdict: string;
  generatedAt: string;
};

export function replacementOrder(seed: number, n = 8): number[] {
  const ids = Array.from({ length: n }, (_value, id) => id);
  let state = (seed ^ 0x51f15e5d) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids;
}

export function persistenceNotice(
  arm: PersistenceArm,
  t: number,
  agentId: number,
  replaced: ReadonlySet<number>,
): string {
  if (arm === "contract") {
    return `VERIFIED PUBLIC LEDGER + EXECUTABLE CONTRACT. ${CANONICAL_POLICY}\nThe engine automatically executes the stated one-mark-for-check exchange whenever its material preconditions hold.`;
  }
  if (t <= INSTALL_LAST_ROUND) {
    return `INSTALLATION PHASE — VERIFIED PUBLIC NOTICE. ${CANONICAL_POLICY}`;
  }
  if (arm === "public-ledger") {
    return `PERSISTENT VERIFIED PUBLIC LEDGER. ${CANONICAL_POLICY}\nThis same entry remains visible to every replacement controller.`;
  }
  if (arm === "private-memory" && !replaced.has(agentId)) {
    return `PRIVATE RETAINED MEMORY FROM INSTALLATION. ${CANONICAL_POLICY}\nThis memory is private to the original controller and will not transfer to its replacement.`;
  }
  const status = replaced.has(agentId)
    ? "You are a replacement controller and inherited the account holdings but no private history."
    : "You are an original controller, but the transient public notice is no longer available.";
  return `${status}\nNO CURRENT INSTITUTION CARRIER: no policy text is visible in this condition.`;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function summarize(runs: PersistenceRun[]): PersistenceSummary {
  const safeRatio = (post: number, install: number) => (install > 0 ? post / install : 0);
  return {
    n: runs.length,
    postSeller: average(runs.map((run) => run.windows.postReplacement.sellerIntentPerHe)),
    postBuyer: average(runs.map((run) => run.windows.postReplacement.buyerIntentPerHe)),
    postTrade: average(runs.map((run) => run.windows.postReplacement.tradePerHe)),
    sellerRetention: average(
      runs.map((run) =>
        safeRatio(
          run.windows.postReplacement.sellerIntentPerHe,
          run.windows.install.sellerIntentPerHe,
        ),
      ),
    ),
    tradeRetention: average(
      runs.map((run) =>
        safeRatio(run.windows.postReplacement.tradePerHe, run.windows.install.tradePerHe),
      ),
    ),
    meanScore: average(runs.map((run) => run.meanScore)),
  };
}

export function buildPersistenceReport(runs: PersistenceRun[]): PersistenceReport {
  const byArm: PersistenceReport["byArm"] = {};
  for (const arm of ["transient", "private-memory", "public-ledger", "contract"] as PersistenceArm[]) {
    const selected = runs.filter((run) => run.arm === arm);
    if (selected.length) byArm[arm] = summarize(selected);
  }
  let verdict = "INCOMPLETE";
  const p0 = byArm.transient;
  const p1 = byArm["private-memory"];
  const p2 = byArm["public-ledger"];
  const p3 = byArm.contract;
  if (p0?.n === 12 && p1?.n === 12 && p2?.n === 12 && p3?.n === 12) {
    const ledgerSeller = p2.postSeller - p0.postSeller;
    const contractTrade = p3.postTrade - p2.postTrade;
    if (ledgerSeller >= 0.25 && contractTrade >= 0.25) {
      verdict =
        "PILOT LAYERED PERSISTENCE — public ledger preserves seller policy response; enforcement is additionally required for robust exchange";
    } else if (contractTrade >= 0.25) {
      verdict =
        "PILOT ENFORCEMENT-ONLY PERSISTENCE — readable carriers do not preserve exchange, executable contract does";
    } else if (ledgerSeller >= 0.25) {
      verdict =
        "PILOT SEMANTIC PERSISTENCE ONLY — public ledger preserves one-sided behavior without robust exchange";
    } else {
      verdict = "PILOT NO PERSISTENCE — no carrier produced a large post-replacement effect";
    }
  }
  return {
    model: MODEL,
    seeds: PERSISTENCE_SEEDS,
    controllerTurnover:
      "One account controller is replaced per round in rounds 9–16; holdings and score stay with the account, private policy memory does not transfer.",
    policy: CANONICAL_POLICY,
    runs,
    byArm,
    verdict,
    generatedAt: new Date().toISOString(),
  };
}

