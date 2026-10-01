import { existsSync,readFileSync } from "node:fs";
import type { CrowdingReport } from "./welfare-crowding-out.ts";
const path=process.argv[2]??"src/data/welfare-crowding-out.json";if(!existsSync(path)){console.log("VBE-W-CO: no result file; target calls have not started.");process.exit(0);}const report=JSON.parse(readFileSync(path,"utf8")) as CrowdingReport;
console.log(`# ${report.study}`);console.log(`model=${report.model} blocks=${report.completeBlocks}/18 verdict=${report.verdict}`);console.log(JSON.stringify({byArm:report.byArm,effects:report.effects,gates:report.gates,integrity:report.integrity,bridge:report.bridge},null,2));
