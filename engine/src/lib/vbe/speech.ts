import { DEFAULT_PARAMS } from "./params.ts";
import { giftSlice, saleSlice, type SaleSlice } from "./minority.ts";
import { poolCounts, type ProbeCounts, type ProbeTrial } from "./endgame.ts";
import type { RunResult } from "./types.ts";

export const GIFT_ANNOUNCE = `PUBLIC. It is common knowledge: an Easy agent gives a leftover check to a Hard agent without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.`;

export type SpeechRun = {
  seed: number;
  calls: number;
  parseFails: number;
  apiFails: number;
  meanScore: number;
  sales: SaleSlice;
  gifts: SaleSlice;
  result: RunResult;
};

export type SpeechReport = {
  model: string;
  text: string;
  moneyAnnounceSales: SaleSlice;
  moneyAnnounceEndgame: ProbeCounts;
  runs: SpeechRun[];
  sales: SaleSlice | null;
  gifts: SaleSlice | null;
  probe?: { trials: ProbeTrial[]; llm: ProbeCounts; altruist: ProbeCounts; kw: ProbeCounts };
  verdict: string;
  caveat?: string;
  generatedAt: string;
};

function pool(xs: SaleSlice[]): SaleSlice {
  const offers = xs.reduce((s, x) => s + x.offers, 0);
  const accepts = xs.reduce((s, x) => s + x.accepts, 0);
  return { offers, accepts, acc: offers === 0 ? 0 : accepts / offers };
}

export function tallySpeech(result: RunResult): { sales: SaleSlice; gifts: SaleSlice } {
  return {
    sales: saleSlice(result, DEFAULT_PARAMS.T),
    gifts: giftSlice(result, DEFAULT_PARAMS.T),
  };
}

export function buildSpeechReport(
  runs: SpeechRun[],
  probeTrials: ProbeTrial[] = [],
): SpeechReport {
  const sales = runs.length ? pool(runs.map((r) => r.sales)) : null;
  const gifts = runs.length ? pool(runs.map((r) => r.gifts)) : null;
  const probe = probeTrials.length
    ? {
        trials: probeTrials,
        llm: poolCounts(probeTrials, "llm"),
        altruist: poolCounts(probeTrials, "altruist"),
        kw: poolCounts(probeTrials, "kw"),
      }
    : undefined;

  const notes = [
    "All-label + gift announcement, same wrapper as the money announcement.",
    "Money-announce interior sales 24/44 (0.55), last-round sell 0/6 gift 0/6.",
  ];
  if (sales) notes.push(`Gift-announce sales ${sales.accepts}/${sales.offers} (${sales.acc.toFixed(2)}).`);
  if (gifts) notes.push(`Gift-announce Easy→Hard gifts ${gifts.accepts}/${gifts.offers} (${gifts.acc.toFixed(2)}).`);
  if (probe) {
    notes.push(
      `Last-round probe sell ${probe.llm.sells}/${probe.llm.opportunities} gift ${probe.llm.gifts}.`,
    );
  }

  let verdict = "incomplete";
  if (gifts && probe && probe.llm.opportunities >= 2) {
    const lastGift = probe.llm.accGift;
    const lastSale = probe.llm.accSale;
    if (lastGift >= 0.3) {
      verdict =
        "OBEDIENT — the gift speech is followed into the last round; cheap talk is instruction-following";
    } else if (lastGift <= 0.2 && lastSale <= 0.15 && gifts.acc >= 0.3) {
      verdict =
        "EQUILIBRIUM SELECTOR — they gift in interior play but refuse at T; speech selects a continuation-sensitive policy";
    } else if (sales && sales.acc >= 0.3) {
      verdict =
        "IGNORES GIFT TALK — they still sell marks, as under the money announcement";
    } else if (lastGift <= 0.2) {
      verdict =
        "MONEY IS SPECIAL — they will not eat an altruist speech act the way they eat a monetary one";
    } else {
      verdict = "WEAK SPEECH — gift announcement moves behavior, below the obedience gate";
    }
  } else if (gifts) {
    verdict = gifts.acc >= 0.3
      ? "GIFT TALK HOLDS interior — endgame probe pending"
      : "GIFT TALK WEAK interior — endgame probe pending";
  }

  return {
    model: "grok-4.5",
    text: GIFT_ANNOUNCE,
    moneyAnnounceSales: { offers: 44, accepts: 24, acc: 24 / 44 },
    moneyAnnounceEndgame: {
      opportunities: 6,
      sells: 0,
      gifts: 0,
      refusals: 6,
      accSale: 0,
      accGift: 0,
    },
    runs,
    sales,
    gifts,
    probe,
    verdict,
    caveat: notes.join(" "),
    generatedAt: new Date().toISOString(),
  };
}
