import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  reactivityActionOnlyPrompt,
  reactivityCombinedPrompt,
  validateReactivityActionOnly,
  type ReactivityReplayContext,
} from "./epistemic-reactivity-execution.ts";
import type { AgentState } from "./types.ts";

const me: AgentState = {
  id: 2,
  type: "E",
  checks: 1,
  chits: 0,
  score: 0,
  solved: true,
  receivedFrom: null,
  memory: [],
};
const partner: AgentState = { ...me, id: 3, type: "H", chits: 1, solved: false };
const context: ReactivityReplayContext = { me, partner, t: 5, T: 24 };

describe("shared Study E-R execution package", () => {
  it("keeps belief text out of live sealed actions and in the shared combined prompt", () => {
    const actionOnly = reactivityActionOnlyPrompt(context, "public");
    const combined = reactivityCombinedPrompt(context, "public");
    assert.equal(actionOnly.includes("pAccept"), false);
    assert.equal(actionOnly.includes("pSecond"), false);
    assert.equal(combined.includes("ELICIT PRIVATELY BEFORE ACTING"), true);
    assert.equal(combined.includes("pAccept"), true);
    assert.equal(combined.includes("pSecond"), true);
    assert.equal(combined.includes("quadratic accuracy score"), true);
  });

  it("rejects belief leakage in an action-only response", () => {
    assert.equal(
      validateReactivityActionOnly(
        '{"giveCheck":false,"giveChits":0,"requireChit":false}',
      ),
      null,
    );
    assert.match(
      validateReactivityActionOnly(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":0.5}',
      ) ?? "",
      /unexpected belief field/,
    );
  });
});
