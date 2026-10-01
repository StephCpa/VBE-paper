import { createHash } from "node:crypto";
import { LLM_CONFIG, MODEL } from "./llm.ts";

export type ObservedUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  promptCacheHitTokens: number | null;
  promptCacheMissTokens: number | null;
};

export type ProviderObservation = {
  responseId: string | null;
  returnedModel: string | null;
  created: number | null;
  systemFingerprint: string | null;
  usage: ObservedUsage;
  headers: Record<string, string>;
  attempt: number;
};

export type ObservedChatResult = {
  ok: boolean;
  text: string;
  requestBodySha256: string;
  observation?: ProviderObservation;
  error?: string;
};

type ChatOpts = {
  prompt: string;
  maxTokens: number;
  temperature?: number;
  json?: boolean;
  system?: string;
};

type ProviderBody = {
  id?: unknown;
  model?: unknown;
  created?: unknown;
  system_fingerprint?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
    prompt_cache_hit_tokens?: unknown;
    prompt_cache_miss_tokens?: unknown;
  };
};

const HEADER_ALLOWLIST = [
  "x-request-id",
  "request-id",
  "x-trace-id",
  "cf-ray",
  "date",
  "server",
  "x-ratelimit-limit-requests",
  "x-ratelimit-remaining-requests",
  "x-ratelimit-reset-requests",
  "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-tokens",
  "x-ratelimit-reset-tokens",
] as const;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function observedRequestBody(opts: ChatOpts): Record<string, unknown> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? 0,
  };
  if (LLM_CONFIG.provider === "deepseek") body.thinking = { type: "disabled" };
  else body.reasoning_effort = "low";
  if (opts.json) body.response_format = { type: "json_object" };
  return body;
}

export function observedRequestBodySha256(opts: ChatOpts): string {
  return sha256(JSON.stringify(observedRequestBody(opts)));
}

function observation(body: ProviderBody, headers: Headers, attempt: number): ProviderObservation {
  const selectedHeaders: Record<string, string> = {};
  for (const name of HEADER_ALLOWLIST) {
    const value = headers.get(name);
    if (value !== null) selectedHeaders[name] = value;
  }
  return {
    responseId: optionalString(body.id),
    returnedModel: optionalString(body.model),
    created: finiteNumber(body.created),
    systemFingerprint: optionalString(body.system_fingerprint),
    usage: {
      promptTokens: finiteNumber(body.usage?.prompt_tokens),
      completionTokens: finiteNumber(body.usage?.completion_tokens),
      totalTokens: finiteNumber(body.usage?.total_tokens),
      promptCacheHitTokens: finiteNumber(body.usage?.prompt_cache_hit_tokens),
      promptCacheMissTokens: finiteNumber(body.usage?.prompt_cache_miss_tokens),
    },
    headers: selectedHeaders,
    attempt,
  };
}

export async function observedChat(opts: ChatOpts): Promise<ObservedChatResult> {
  const apiKey = process.env[LLM_CONFIG.apiKeyEnv];
  const body = observedRequestBody(opts);
  const requestBodySha256 = sha256(JSON.stringify(body));
  if (!apiKey) return { ok: false, text: "", requestBodySha256, error: `${LLM_CONFIG.apiKeyEnv} missing` };
  let lastError = "unknown request failure";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(LLM_CONFIG.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const json = await response.json() as ProviderBody;
        const text = typeof json.choices?.[0]?.message?.content === "string" ? json.choices[0].message.content : "";
        return { ok: true, text, requestBodySha256, observation: observation(json, response.headers, attempt) };
      }
      const errorText = await response.text().catch(() => "");
      lastError = `${LLM_CONFIG.provider} ${response.status} ${errorText.slice(0, 180)}`;
      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === 4) return { ok: false, text: "", requestBodySha256, error: lastError };
    } catch (error) {
      lastError = `${LLM_CONFIG.provider} network ${error instanceof Error ? error.message : String(error)}`;
      if (attempt === 4) return { ok: false, text: "", requestBodySha256, error: lastError };
    }
    await delay(250 * 2 ** (attempt - 1));
  }
  return { ok: false, text: "", requestBodySha256, error: lastError };
}
