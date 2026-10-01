import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const vbeDir = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(vbeDir, "../../..");

function keylessEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => {
    if (/API_?KEY|TOKEN|SECRET|CREDENTIAL/i.test(name)) return false;
    if (["LLM_PROVIDER", "LLM_MODEL", "LLM_API_URL"].includes(name)) return false;
    return true;
  }));
}

test("every stored-result analyzer completes without credentials or ambient LLM config", { timeout: 120_000 }, () => {
  const analyzers = readdirSync(vbeDir)
    .filter((name) => /^analyze-.*\.ts$/.test(name))
    .sort();
  assert.ok(analyzers.length > 0, "expected at least one analyzer");

  const env = keylessEnvironment();
  assert.equal(Object.keys(env).some((name) => /API_?KEY|TOKEN|SECRET|CREDENTIAL/i.test(name)), false);

  const failures: string[] = [];
  for (const analyzer of analyzers) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", resolve(vbeDir, analyzer)], {
      cwd: engineRoot,
      env,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (result.status !== 0) {
      failures.push(`${analyzer}: status=${result.status} signal=${result.signal ?? "none"}\n${result.stderr || result.stdout}`);
    }
  }

  assert.deepEqual(failures, []);
});
