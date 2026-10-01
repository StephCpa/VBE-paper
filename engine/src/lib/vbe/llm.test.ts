import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLlmConfig } from "./llm.ts";

describe("LLM provider configuration", () => {
  it("selects DeepSeek V4 Flash and disables thinking", () => {
    assert.deepEqual(resolveLlmConfig({ LLM_PROVIDER: "deepseek" }), {
      provider: "deepseek",
      model: "deepseek-v4-flash",
      url: "https://api.deepseek.com/chat/completions",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      thinking: "disabled",
    });
  });

  it("preserves the xAI compatibility path", () => {
    assert.deepEqual(resolveLlmConfig({ LLM_PROVIDER: "xai" }), {
      provider: "xai",
      model: "grok-4.5",
      url: "https://api.x.ai/v1/chat/completions",
      apiKeyEnv: "XAI_API_KEY",
      thinking: "low",
    });
  });

  it("rejects an unknown provider", () => {
    assert.throws(
      () => resolveLlmConfig({ LLM_PROVIDER: "unknown" }),
      /unsupported LLM_PROVIDER/,
    );
  });
});
