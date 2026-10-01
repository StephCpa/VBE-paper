import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildPaperOneScopeExploratoryReport } from "./analyze-paper1-scope-exploratory.ts";
import type { SemanticBoundaryReport } from "./welfare-semantic-boundary.ts";

const input = process.argv[2] ?? "src/data/welfare-semantic-boundary.json";
const output = process.argv[3] ?? "../figures/VBE-paper1-exploratory.svg";
const stored = JSON.parse(readFileSync(input, "utf8")) as SemanticBoundaryReport;
const report = buildPaperOneScopeExploratoryReport(stored);

const arms = [
  { id: "neutral", short: "Neutral", color: "#64748b", width: 3 },
  { id: "gift-exact", short: "Gift exact", color: "#0f766e", width: 5 },
  { id: "gift-easy-only", short: "Easy only", color: "#94a3b8", width: 3 },
  { id: "gift-any-holder", short: "Any holder", color: "#14b8a6", width: 3 },
  { id: "gift-hard-partner-only", short: "Hard partner", color: "#7c3aed", width: 3 },
  { id: "money-exact", short: "Money exact", color: "#d97706", width: 3 },
  { id: "easy-easy-negative", short: "Harmful E–E", color: "#dc2626", width: 4 },
] as const;

const esc = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const parts: string[] = [];
const push = (value: string) => parts.push(value);
const text = (x: number, y: number, value: string, cls: string, anchor = "start") =>
  push(`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`);
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1, dash = "") =>
  push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
const rect = (x: number, y: number, width: number, height: number, fill: string, rx = 0, stroke = "none") =>
  push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`);
const circle = (cx: number, cy: number, r: number, fill: string, stroke = "#ffffff") =>
  push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);

push(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="760" viewBox="0 0 1600 760" role="img" aria-labelledby="title desc">`);
push(`<title id="title">Exploratory adoption dynamics and account distribution</title>`);
push(`<desc id="desc">Hard-Hard swap rates in four-round bins for seven public-message arms, plus descriptive gift-versus-neutral account outcomes.</desc>`);
push(`<style>
  .title{font:700 32px Inter,Arial,sans-serif;fill:#0f172a}.subtitle{font:400 17px Inter,Arial,sans-serif;fill:#475569}
  .panel{font:700 23px Inter,Arial,sans-serif;fill:#0f172a}.axis{font:500 14px Inter,Arial,sans-serif;fill:#64748b}
  .legend{font:600 14px Inter,Arial,sans-serif;fill:#334155}.metric{font:700 25px Inter,Arial,sans-serif;fill:#0f172a}
  .metricLabel{font:500 15px Inter,Arial,sans-serif;fill:#475569}.note{font:500 14px Inter,Arial,sans-serif;fill:#475569}
  .small{font:600 13px Inter,Arial,sans-serif;fill:#334155}.badge{font:700 14px Inter,Arial,sans-serif;fill:#ffffff}
</style>`);
rect(0, 0, 1600, 760, "#ffffff");
text(70, 58, "Figure 2. Frozen-trace exploratory diagnostics", "title");
text(70, 88, "Descriptive only: no additional hypotheses or independent meeting-level units", "subtitle");

text(70, 134, "A  Hard–Hard swap dynamics", "panel");
text(70, 160, "Pooled rate within four-round bins", "note");
const plot = { x: 95, y: 192, w: 870, h: 420 };
for (let tick = 0; tick <= 10; tick += 2) {
  const y = plot.y + plot.h - tick / 10 * plot.h;
  line(plot.x, y, plot.x + plot.w, y, "#e2e8f0");
  text(plot.x - 14, y + 5, (tick / 10).toFixed(1), "axis", "end");
}
const bins = report.hhSwapDynamics.neutral;
bins.forEach((bin, index) => {
  const x = plot.x + index / (bins.length - 1) * plot.w;
  line(x, plot.y, x, plot.y + plot.h, "#f1f5f9");
  text(x, plot.y + plot.h + 28, bin.rounds, "axis", "middle");
});
text(plot.x + plot.w / 2, plot.y + plot.h + 58, "Round", "axis", "middle");
for (const arm of arms) {
  const points = report.hhSwapDynamics[arm.id].map((bin, index) => ({
    x: plot.x + index / (bins.length - 1) * plot.w,
    y: plot.y + plot.h - bin.rate * plot.h,
  }));
  push(`<polyline points="${points.map(point => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${arm.color}" stroke-width="${arm.width}" stroke-linejoin="round" stroke-linecap="round"/>`);
  points.forEach(point => circle(point.x, point.y, arm.width > 3 ? 6 : 4.5, arm.color));
}

const legendX = 98;
arms.forEach((arm, index) => {
  const column = index < 4 ? 0 : 1;
  const row = index < 4 ? index : index - 4;
  const x = legendX + column * 230;
  const y = 666 + row * 24;
  line(x, y - 5, x + 30, y - 5, arm.color, arm.width);
  text(x + 40, y, arm.short, "legend");
});

text(1040, 134, "B  Gift exact vs neutral", "panel");
text(1040, 160, "Account trajectories under paired role schedules", "note");
const paired = report.giftMinusNeutralDistribution;
const stackX = 1040;
const stackY = 205;
const stackW = 480;
const stackH = 42;
const positiveW = stackW * paired.positive / paired.accountCount;
const zeroW = stackW * paired.zero / paired.accountCount;
rect(stackX, stackY, positiveW, stackH, "#0f766e", 7);
rect(stackX + positiveW, stackY, zeroW, stackH, "#94a3b8");
rect(stackX + positiveW + zeroW, stackY, stackW - positiveW - zeroW, stackH, "#dc2626", 7);
text(stackX + positiveW / 2, stackY + 28, `${paired.positive} improved`, "badge", "middle");
text(stackX + positiveW + zeroW / 2, stackY + 28, `${paired.zero} tied`, "badge", "middle");
text(stackX + positiveW + zeroW + (stackW - positiveW - zeroW) / 2, stackY + 28, `${paired.negative} worse`, "badge", "middle");
text(stackX, stackY + 70, `${paired.accountCount} persistent account trajectories; not independent units`, "note");

const neutral = report.accountDistribution.neutral;
const gift = report.accountDistribution["gift-exact"];
const cards = [
  { y: 318, value: `${neutral.meanMinimum.toFixed(2)} → ${gift.meanMinimum.toFixed(2)}`, label: `Mean seed-level minimum  (Δ ${paired.meanMinimumDelta >= 0 ? "+" : ""}${paired.meanMinimumDelta.toFixed(2)})` },
  { y: 415, value: `${neutral.meanWithinRunSd.toFixed(2)} → ${gift.meanWithinRunSd.toFixed(2)}`, label: `Mean within-run score SD  (Δ ${paired.meanWithinRunSdDelta.toFixed(2)})` },
  { y: 512, value: `${paired.hardExposurePearson?.toFixed(2) ?? "NA"}`, label: "Pearson r: Hard-role rounds vs score change" },
];
for (const card of cards) {
  rect(1040, card.y, 480, 78, "#f8fafc", 12, "#e2e8f0");
  text(1062, card.y + 34, card.value, "metric");
  text(1062, card.y + 61, card.label, "metricLabel");
}
rect(1040, 626, 480, 74, "#fff7ed", 12, "#fed7aa");
text(1062, 654, "Immediate, sustained response", "small");
text(1062, 678, "Gift exact: 0.824 in rounds 1–4; 0.850 in 21–24.", "note");
text(1062, 697, "No monotone build-up is visible at this binning.", "note");
push("</svg>");

const absoluteOutput = resolve(output);
mkdirSync(dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${parts.join("\n")}\n`);
console.log(absoluteOutput);
