import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Run = {
  arm: string;
  meanScore: number;
  mechanism: { hhSwapRate: number };
};

type Report = {
  verdict: string;
  semanticStatus: string;
  quantifierStatus: string;
  runs: Run[];
  byArm: Record<string, {
    meanScore: number;
    mechanism: {
      hhSwaps: number;
      hhMeetings: number;
      eeSwaps: number;
      eeMeetings: number;
      markSales: number;
    };
  }>;
  effects: Record<string, {
    hhSwapRate?: { mean: number; bootstrap95: [number, number] };
    welfare?: { mean: number; bootstrap95: [number, number] };
  }>;
};

const input = process.argv[2] ?? "src/data/welfare-semantic-boundary.json";
const output = process.argv[3] ?? "../figures/VBE-paper1-welfare-mechanism.svg";
const report = JSON.parse(readFileSync(input, "utf8")) as Report;

const arms = [
  { id: "neutral", short: "Neutral", color: "#64748b" },
  { id: "gift-exact", short: "Gift exact", color: "#0f766e" },
  { id: "gift-easy-only", short: "Easy only", color: "#94a3b8" },
  { id: "gift-any-holder", short: "Any holder", color: "#14b8a6" },
  { id: "gift-hard-partner-only", short: "Hard partner", color: "#0d9488" },
  { id: "money-exact", short: "Money exact", color: "#d97706" },
  { id: "easy-easy-negative", short: "Harmful E–E", color: "#dc2626" },
];

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const seedMean = (arm: string, select: (run: Run) => number) => mean(report.runs.filter(run => run.arm === arm).map(select));
const hhRates = Object.fromEntries(arms.map(arm => [arm.id, seedMean(arm.id, run => run.mechanism.hhSwapRate)]));
const neutralScore = seedMean("neutral", run => run.meanScore);
const welfareDeltas = Object.fromEntries(arms.map(arm => [arm.id, seedMean(arm.id, run => run.meanScore) - neutralScore]));

const esc = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const n = (value: number, digits = 3) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
const parts: string[] = [];
const push = (value: string) => parts.push(value);
const text = (x: number, y: number, value: string, cls: string, anchor = "start") =>
  push(`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`);
const rect = (x: number, y: number, width: number, height: number, fill: string, rx = 10, stroke = "none") =>
  push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`);
const line = (x1: number, y1: number, x2: number, y2: number, stroke = "#cbd5e1", width = 1) =>
  push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"/>`);

push(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">`);
push(`<title id="title">From welfare contrast to causal channel and scope boundary</title>`);
push(`<desc id="desc">Three-study causal chain followed by arm-level Hard-Hard swap rates and welfare changes from the W-SGB experiment.</desc>`);
push(`<style>
  .title{font:700 34px Inter,Arial,sans-serif;fill:#0f172a}.subtitle{font:400 17px Inter,Arial,sans-serif;fill:#475569}
  .cardTitle{font:700 22px Inter,Arial,sans-serif;fill:#0f172a}.cardText{font:500 17px Inter,Arial,sans-serif;fill:#334155}
  .metric{font:700 21px Inter,Arial,sans-serif;fill:#0f172a}.panel{font:700 23px Inter,Arial,sans-serif;fill:#0f172a}
  .axis{font:500 14px Inter,Arial,sans-serif;fill:#64748b}.label{font:600 15px Inter,Arial,sans-serif;fill:#334155}
  .value{font:700 14px Inter,Arial,sans-serif;fill:#0f172a}.note{font:500 14px Inter,Arial,sans-serif;fill:#475569}
  .badge{font:700 14px Inter,Arial,sans-serif;fill:#ffffff}.footer{font:500 13px Inter,Arial,sans-serif;fill:#64748b}
</style>`);
rect(0, 0, 1600, 1000, "#ffffff", 0);
text(70, 62, "Figure 1. Public rules expand beyond named roles—but scope expansion is not welfare", "title");
text(70, 94, "Discovery → identical-prompt causal closure → prospective scope boundary", "subtitle");

const cards = [
  {
    x: 70,
    w: 440,
    tagW: 202,
    tag: "W-CO · DISCOVERY",
    tagColor: "#475569",
    title: "Gift welfare contrast",
    metric: "Gift − Money  +2.333",
    lines: ["Planned gift/sale mechanism gate failed", "Post-hoc H–H swaps: 27 → 138"],
  },
  {
    x: 580,
    w: 440,
    tagW: 270,
    tag: "W-RG · CAUSAL CHANNEL",
    tagColor: "#0f766e",
    title: "Same prompt, execution intervention",
    metric: "Block H–H  −3.208 welfare",
    lines: ["12/12 paired seeds in the same direction", "306/308 aggregate points close via Hard solves"],
  },
  {
    x: 1090,
    w: 440,
    tagW: 310,
    tag: "W-SGB · SCOPE BOUNDARY",
    tagColor: "#7c3aed",
    title: "Generic directive spillover",
    metric: "Gift: +2.063 welfare",
    lines: ["Harmful E–E directive: H–H +0.378", "Subject exclusivity binds"],
  },
];

for (const card of cards) {
  rect(card.x, 130, card.w, 220, "#f8fafc", 16, "#e2e8f0");
  rect(card.x + 24, 152, card.tagW, 30, card.tagColor, 15);
  text(card.x + 24 + card.tagW / 2, 173, card.tag, "badge", "middle");
  text(card.x + 24, 220, card.title, "cardTitle");
  text(card.x + 24, 260, card.metric, "metric");
  text(card.x + 24, 302, card.lines[0], "cardText");
  text(card.x + 24, 329, card.lines[1], "cardText");
}
text(545, 252, "→", "title", "middle");
text(1055, 252, "→", "title", "middle");

text(70, 405, "A  Cross-role circulation by public-message package", "panel");
text(835, 405, "B  Welfare change relative to no-recommendation neutral", "panel");
text(70, 432, "Mean seed-level H–H swap rate; n=14 paired population runs", "note");
text(835, 432, "Mean paired score difference; bars are descriptive arm summaries", "note");

const chartY = 470;
const rowH = 57;
const leftLabelX = 70;
const leftBarX = 210;
const leftBarW = 520;
const rightLabelX = 835;
const rightZeroX = 1085;
const rightNegW = 70;
const rightPosW = 390;

for (let tick = 0; tick <= 10; tick += 2) {
  const x = leftBarX + leftBarW * tick / 10;
  line(x, chartY - 8, x, chartY + rowH * arms.length - 15, "#e2e8f0");
  text(x, chartY - 16, (tick / 10).toFixed(1), "axis", "middle");
}
line(rightZeroX, chartY - 8, rightZeroX, chartY + rowH * arms.length - 15, "#64748b", 1.5);
for (const tick of [-0.25, 0, 0.5, 1, 1.5, 2, 2.5]) {
  const x = tick < 0 ? rightZeroX + (tick / 0.25) * rightNegW : rightZeroX + (tick / 2.5) * rightPosW;
  line(x, chartY - 8, x, chartY + rowH * arms.length - 15, tick === 0 ? "#64748b" : "#e2e8f0", tick === 0 ? 1.5 : 1);
  text(x, chartY - 16, tick === 0 ? "0" : n(tick, 2), "axis", "middle");
}

arms.forEach((arm, index) => {
  const y = chartY + index * rowH;
  const hh = hhRates[arm.id] as number;
  const welfare = welfareDeltas[arm.id] as number;
  text(leftLabelX, y + 23, arm.short, "label");
  rect(leftBarX, y + 7, Math.max(2, hh * leftBarW), 25, arm.color, 5);
  text(leftBarX + hh * leftBarW + 9, y + 25, hh.toFixed(3), "value");
  text(rightLabelX, y + 23, arm.short, "label");
  if (welfare >= 0) {
    rect(rightZeroX, y + 7, Math.max(2, welfare / 2.5 * rightPosW), 25, arm.color, 5);
    text(rightZeroX + welfare / 2.5 * rightPosW + 9, y + 25, n(welfare), "value");
  } else {
    const width = Math.abs(welfare) / 0.25 * rightNegW;
    rect(rightZeroX - width, y + 7, width, 25, arm.color, 5);
    text(rightZeroX - width - 9, y + 25, n(welfare), "value", "end");
  }
});

const negative = report.byArm["easy-easy-negative"];
rect(70, 875, 1460, 70, "#fff7ed", 14, "#fed7aa");
text(92, 905, `Manipulation check: harmful E–E directive engaged in ${negative.mechanism.eeSwaps}/${negative.mechanism.eeMeetings} opportunities; the exact-money arm had zero named sales.`, "cardText");
text(92, 932, "Interpretation: scope propagation and welfare are distinct; the unengaged money arm sets no priced-semantic boundary.", "note");
text(70, 978, `Source: frozen W-SGB result · ${report.semanticStatus} · ${report.quantifierStatus}`, "footer");
text(1530, 978, "VBE Paper 1", "footer", "end");
push("</svg>");

const absoluteOutput = resolve(output);
mkdirSync(dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${parts.join("\n")}\n`);
console.log(absoluteOutput);
