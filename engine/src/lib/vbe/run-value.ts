import { DEFAULT_PARAMS } from "./params.ts";
import {
  coordinationWindow,
  finiteBreakEvenShare,
  finiteMarginalMarkValue,
  geometricBreakEvenShare,
  geometricMarginalMarkValue,
  markSpendGain,
  minimumCommittedCount,
  universalSpendOpportunity,
} from "./value.ts";

const horizons = [1, 2, 4, 6, 8, 12, 16, 24];

console.log("# VBE Gate-0 engine-aware marginal value report\n");
console.log(`Spend gain: ${markSpendGain(DEFAULT_PARAMS).toFixed(3)}`);
console.log(`Seller opportunity cost: ${DEFAULT_PARAMS.v.toFixed(3)}`);
console.log(
  `Universal per-round spend opportunity: ${universalSpendOpportunity(DEFAULT_PARAMS).toFixed(6)}\n`,
);
console.log("| Future rounds | Break-even share | Minimum committed k/7 | Value at k=2 |");
console.log("|---:|---:|---:|---:|");
for (const h of horizons) {
  const share = finiteBreakEvenShare(h, DEFAULT_PARAMS);
  const k = minimumCommittedCount(share, DEFAULT_PARAMS);
  const k2 = finiteMarginalMarkValue(h, 2 / 7, DEFAULT_PARAMS);
  console.log(
    `| ${h} | ${share === null ? "not feasible" : share.toFixed(3)} | ${k ?? "not feasible"} | ${k2.toFixed(3)} |`,
  );
}

const continuation = 0.95;
const geometricShare = geometricBreakEvenShare(continuation, DEFAULT_PARAMS);
const geometricK = minimumCommittedCount(geometricShare, DEFAULT_PARAMS);
const geometricK2 = geometricMarginalMarkValue(continuation, 2 / 7, DEFAULT_PARAMS);
console.log(`\nGeometric horizon δ=${continuation}:`);
console.log(`- Break-even share: ${geometricShare?.toFixed(3) ?? "not feasible"}`);
console.log(`- Minimum committed k/7: ${geometricK ?? "not feasible"}`);
console.log(`- Value at k=2: ${geometricK2.toFixed(3)}`);

const window = coordinationWindow(1, DEFAULT_PARAMS);
console.log("\nOne-committed-agent coordination window:");
console.log(
  window
    ? `- rounds ${window.firstRound}–${window.lastRound}: k=1 alone is insufficient, universal acceptance is sufficient`
    : "- no qualifying rounds",
);
