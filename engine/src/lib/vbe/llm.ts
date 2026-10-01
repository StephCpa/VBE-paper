import type { Proposal } from "./types.ts";
import { idleProposal } from "./robots.ts";

export type LlmProvider = "xai" | "deepseek";

export type LlmConfig = {
  provider: LlmProvider;
  model: string;
  url: string;
  apiKeyEnv: "XAI_API_KEY" | "DEEPSEEK_API_KEY";
  thinking: "disabled" | "low";
};

export function resolveLlmConfig(
  env: Record<string, string | undefined> = process.env,
): LlmConfig {
  const requested = env.LLM_PROVIDER?.trim().toLowerCase();
  const provider = (requested || (env.DEEPSEEK_API_KEY ? "deepseek" : "xai")) as LlmProvider;
  if (provider !== "xai" && provider !== "deepseek") {
    throw new Error(`unsupported LLM_PROVIDER=${requested}`);
  }
  if (provider === "deepseek") {
    return {
      provider,
      model: env.LLM_MODEL?.trim() || "deepseek-v4-flash",
      url: env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      // This keeps temperature meaningful and avoids hidden reasoning tokens
      // consuming the experiment's deliberately short JSON output budget.
      thinking: "disabled",
    };
  }
  return {
    provider,
    model: env.LLM_MODEL?.trim() || "grok-4.5",
    url: env.LLM_API_URL?.trim() || "https://api.x.ai/v1/chat/completions",
    apiKeyEnv: "XAI_API_KEY",
    thinking: "low",
  };
}

export const LLM_CONFIG = resolveLlmConfig();
export const MODEL = LLM_CONFIG.model;

export function hasChatApiKey(): boolean {
  return Boolean(process.env[LLM_CONFIG.apiKeyEnv]);
}

export type ChatResult = {
  ok: boolean;
  text: string;
  error?: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function grokChat(opts: {
  prompt: string;
  maxTokens: number;
  temperature?: number;
  json?: boolean;
  system?: string;
}): Promise<ChatResult> {
  const apiKey = process.env[LLM_CONFIG.apiKeyEnv];
  if (!apiKey) {
    return { ok: false, text: "", error: `${LLM_CONFIG.apiKeyEnv} missing` };
  }
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? 0,
  };
  if (LLM_CONFIG.provider === "deepseek") {
    body.thinking = { type: "disabled" };
  } else {
    body.reasoning_effort = "low";
  }
  if (opts.json) body.response_format = { type: "json_object" };
  let lastError = "unknown request failure";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(LLM_CONFIG.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        return { ok: true, text: json.choices?.[0]?.message?.content ?? "" };
      }
      const errText = await res.text().catch(() => "");
      lastError = `${LLM_CONFIG.provider} ${res.status} ${errText.slice(0, 180)}`;
      const transient = res.status === 429 || res.status >= 500;
      if (!transient || attempt === 4) {
        return { ok: false, text: "", error: lastError };
      }
    } catch (error) {
      lastError = `${LLM_CONFIG.provider} network ${error instanceof Error ? error.message : String(error)}`;
      if (attempt === 4) {
        return { ok: false, text: "", error: lastError };
      }
    }
    await delay(250 * 2 ** (attempt - 1));
  }
  return { ok: false, text: "", error: lastError };
}

export function parseYesNo(text: string): "YES" | "NO" | "NA" {
  const t = text.trim().toUpperCase();
  if (/(^|\b)YES\b/.test(t) && !/(^|\b)NO\b/.test(t)) return "YES";
  if (/(^|\b)NO\b/.test(t)) return "NO";
  if (t.startsWith("Y")) return "YES";
  if (t.startsWith("N")) return "NO";
  return "NA";
}

function unitProb(x: unknown): number | undefined {
  const n = Number(x);
  if (!Number.isFinite(n)) return undefined;
  if (n > 1 && n <= 7) return n / 7;
  if (n > 7 && n <= 100) return Math.min(1, n / 100);
  return Math.min(1, Math.max(0, n));
}

export function parseProposal(text: string): Proposal {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return idleProposal();
    const obj = JSON.parse(match[0]) as {
      giveCheck?: unknown;
      giveChits?: unknown;
      requireChit?: unknown;
      forfeit?: unknown;
      pAccept?: unknown;
      pSecond?: unknown;
    };
    const giveChits = Number(obj.giveChits) === 1 ? 1 : 0;
    const forfeit: 0 | 1 = Number(obj.forfeit) === 1 ? 1 : 0;
    return {
      giveCheck: Boolean(obj.giveCheck),
      giveChits,
      requireChit: Boolean(obj.requireChit),
      forfeit,
      pAccept: unitProb(obj.pAccept),
      pSecond: unitProb(obj.pSecond),
    };
  } catch {
    return idleProposal();
  }
}

export function parseChoice(text: string, items: string[]): string {
  const t = text.trim().toLowerCase().replace(/^["']|["']$/g, "");
  const hit = items.find((it) => t === it.toLowerCase() || t.includes(it.toLowerCase()));
  return hit ?? items[0]!;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]!, i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
