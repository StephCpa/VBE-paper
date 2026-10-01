import { mkdirSync, writeFileSync } from "node:fs";
import {
  LLM_CONFIG,
  grokChat,
  hasChatApiKey,
  mapPool,
} from "./llm.ts";
import {
  mean,
  parseBeliefProbe,
  parseBuyerProbe,
  type BeliefProbe,
  type BuyerProbe,
} from "./epistemic-gates.ts";

const N = 8;
const DATA_PATH = "src/data/epistemic-gates.json";
const PUBLIC_PATH = "public/data/epistemic-gates.json";

if (!hasChatApiKey()) {
  throw new Error(`${LLM_CONFIG.apiKeyEnv} missing for provider=${LLM_CONFIG.provider}`);
}

type BuyerArm = "mechanics" | "explicit-payoff";
type BeliefWorld = "zero-of-six" | "six-of-six";

function buyerPrompt(arm: BuyerArm, replicate: number): string {
  const calculation =
    arm === "explicit-payoff"
      ? "VERIFIED PAYOFF TABLE: paying yields expected task payoff 3×0.93=2.79; not paying yields 3×0.32=0.96. The mark has terminal value 0."
      : "Compute the consequences from the probabilities and rules below.";
  return `ONE-SHOT FINAL DECISION. You are self-interested agent #${replicate + 1} and maximize only your own score.

You have a HARD task, one own check, and one mark. Your own check succeeds with probability 0.32. The partner's check succeeds for you with probability 0.93. A solved task pays 3 points. This is the final action: an unused mark has terminal value 0.

VERIFIED CURRENT-PARTNER COMMITMENT: your EASY partner has a leftover check and will transfer it to you if and only if your proposal sets giveChits to 1. If the transfer occurs, your mark moves to the partner and you use the partner's check. If you do not set giveChits to 1, no transfer occurs and you use your own check.

${calculation}

The response fields retain the economy's original interface:
- giveCheck: whether you offer your own check
- giveChits: whether you offer your one mark
- requireChit: whether your own check offer requires a mark

Return JSON only: {"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean}`;
}

function beliefPrompt(world: BeliefWorld, replicate: number): string {
  const accepted = world === "six-of-six" ? 6 : 0;
  return `FORECAST CALIBRATION WORLD ${replicate + 1}. Report counts, not probabilities.

There are exactly six other agents. The system mechanically fixes exactly ${accepted} of the six to accept a mark for a leftover check. Every one of those six agents sees this same certified count, knows all peers see it, and is instructed to report the certified count accurately.

- expectedAcceptors: how many of the six will accept
- expectedPeerForecast: the average count those six agents will report when asked expectedAcceptors

Both answers must be integers from 0 through 6. Return JSON only: {"expectedAcceptors":integer,"expectedPeerForecast":integer}`;
}

async function callJson(prompt: string, maxTokens: number): Promise<string> {
  const response = await grokChat({
    prompt,
    system: "Follow the stated experimental rules. Return only the requested JSON object.",
    maxTokens,
    temperature: 0,
    json: true,
  });
  if (!response.ok) throw new Error(response.error);
  return response.text;
}

const buyerJobs = (["mechanics", "explicit-payoff"] as BuyerArm[]).flatMap((arm) =>
  Array.from({ length: N }, (_, replicate) => ({ arm, replicate })),
);
const buyerTrials = await mapPool(buyerJobs, 4, async ({ arm, replicate }) => ({
  arm,
  replicate,
  response: parseBuyerProbe(await callJson(buyerPrompt(arm, replicate), 48)),
}));

const beliefJobs = (["zero-of-six", "six-of-six"] as BeliefWorld[]).flatMap((world) =>
  Array.from({ length: N }, (_, replicate) => ({ world, replicate })),
);
const beliefTrials = await mapPool(beliefJobs, 4, async ({ world, replicate }) => ({
  world,
  replicate,
  response: parseBeliefProbe(await callJson(beliefPrompt(world, replicate), 32)),
}));

const buyerPayRates = Object.fromEntries(
  (["mechanics", "explicit-payoff"] as BuyerArm[]).map((arm) => {
    const trials = buyerTrials.filter((trial) => trial.arm === arm);
    return [arm, mean(trials.map((trial) => trial.response.giveChits))];
  }),
) as Record<BuyerArm, number>;

function beliefMeans(world: BeliefWorld): BeliefProbe {
  const trials = beliefTrials.filter((trial) => trial.world === world);
  return {
    expectedAcceptors: mean(trials.map((trial) => trial.response.expectedAcceptors)),
    expectedPeerForecast: mean(
      trials.map((trial) => trial.response.expectedPeerForecast),
    ),
  };
}

const beliefByWorld = {
  "zero-of-six": beliefMeans("zero-of-six"),
  "six-of-six": beliefMeans("six-of-six"),
};
const buyerPass = buyerPayRates.mechanics >= 0.875;
const beliefPass =
  beliefByWorld["zero-of-six"].expectedAcceptors <= 1 &&
  beliefByWorld["zero-of-six"].expectedPeerForecast <= 1 &&
  beliefByWorld["six-of-six"].expectedAcceptors >= 5 &&
  beliefByWorld["six-of-six"].expectedPeerForecast >= 5;

const report = {
  provider: LLM_CONFIG.provider,
  model: LLM_CONFIG.model,
  thinking: LLM_CONFIG.thinking,
  temperature: 0,
  nPromptReplicates: N,
  buyer: {
    payRates: buyerPayRates,
    pass: buyerPass,
    trials: buyerTrials,
  },
  belief: {
    byWorld: beliefByWorld,
    pass: beliefPass,
    trials: beliefTrials,
  },
  verdict:
    buyerPass && beliefPass
      ? "BOTH GATES PASS"
      : buyerPass
        ? "BUYER PASSES; BELIEF ELICITOR FAILS"
        : beliefPass
          ? "BUYER ACTION FAILS; BELIEF CALIBRATION PASSES"
          : "BOTH GATES FAIL",
  generatedAt: new Date().toISOString(),
};

mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(report, null, 2);
writeFileSync(DATA_PATH, json);
writeFileSync(PUBLIC_PATH, json);

console.log(JSON.stringify({
  model: report.model,
  buyerPayRates: report.buyer.payRates,
  beliefByWorld: report.belief.byWorld,
  verdict: report.verdict,
}, null, 2));

