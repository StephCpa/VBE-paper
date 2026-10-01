import { readFileSync } from "node:fs";
import { PEER_CONFLICT_ARMS, buildPeerConflictReport, type PeerConflictReport } from "./peer-probability-conflict.ts";

const path = process.argv[2] ?? "src/data/peer-probability-conflict.json";
const stored = JSON.parse(readFileSync(path, "utf8")) as PeerConflictReport;
const report = buildPeerConflictReport(stored.records, stored.model);
console.log("# Typed peer-probability conflict diagnostic\n");
console.log(`- Complete blocks: ${report.completeBlocks}/24`);
console.log(`- Retained calls: ${report.calls}/${report.integrity.expectedCalls}`);
console.log("\n| Arm | Sell rate | Reject rate |"); console.log("|---|---:|---:|");
for (const arm of PEER_CONFLICT_ARMS) { const item = report.byArm[arm]!; console.log(`| ${arm} | ${item.sellRate.toFixed(3)} | ${item.rejectRate.toFixed(3)} |`); }
console.log(`\n- Contradicted/high-control agreement: ${report.agreement.contradictedWithHighControl?.toFixed(3)}`);
console.log(`- Contradicted/history agreement: ${report.agreement.contradictedWithHistory?.toFixed(3)}`);
for (const [name, effect] of Object.entries(report.contrasts)) console.log(`- ${name}: ${effect?.mean.toFixed(3)} (${effect?.positive} positive, ${effect?.negative} negative, ${effect?.ties} tied; one-sided exact p=${effect?.exactUpperP?.toFixed(8) ?? "NA"})`);
console.log(`- Gates: ${JSON.stringify(report.gates)}`);
console.log(`- Integrity: ${JSON.stringify(report.integrity)}`);
console.log(`- Verdict: ${report.verdict}`);
