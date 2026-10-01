import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  disassemblyUnrewardedBeliefInstruction,
  disassemblyPrompt,
  validateDisassemblyResponse,
} from "./epistemic-disassembly-execution.ts";
import { epistemicBeliefInstructionForK } from "./epistemic.ts";
import type { ReactivityReplayContext } from "./epistemic-reactivity-execution.ts";
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

describe("Study E-D prompt and response contracts", () => {
  it("separates action, schema, belief, and reward components", () => {
    const action = disassemblyPrompt(context, { delivery: "public", mode: "action-only" });
    const schema = disassemblyPrompt(context, {
      delivery: "public",
      mode: "schema-control",
    });
    const unrew = disassemblyPrompt(context, {
      delivery: "public",
      mode: "belief-unrewarded",
    });
    const rewarded = disassemblyPrompt(context, {
      delivery: "public",
      mode: "belief-rewarded",
    });
    assert.equal(action.includes("formatA"), false);
    assert.equal(action.includes("pAccept"), false);
    assert.equal(schema.includes("formatA"), true);
    assert.equal(schema.includes("pAccept"), false);
    assert.equal(unrew.includes("pAccept"), true);
    assert.equal(unrew.includes("receive no accuracy payment"), true);
    assert.equal(unrew.includes("quadratic accuracy score"), false);
    assert.equal(rewarded.includes("quadratic accuracy score"), true);
  });

  it("enforces mode-specific exact fields", () => {
    assert.equal(
      validateDisassemblyResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false}',
        "action-only",
      ),
      null,
    );
    assert.equal(
      validateDisassemblyResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"formatA":0.5,"formatB":0.5}',
        "schema-control",
      ),
      null,
    );
    assert.match(
      validateDisassemblyResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"formatA":0.4,"formatB":0.5}',
        "schema-control",
      ) ?? "",
      /must both equal 0.5/,
    );
    assert.equal(
      validateDisassemblyResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":0.4,"pSecond":0.6}',
        "belief-unrewarded",
      ),
      null,
    );
    assert.match(
      validateDisassemblyResponse(
        '{"giveCheck":false,"giveChits":0,"requireChit":false,"pAccept":0.4,"pSecond":0.6,"formatA":0.5}',
        "belief-rewarded",
      ) ?? "",
      /do not match contract/,
    );
  });

  it("keeps belief semantics fixed across the reward transition", () => {
    const marker = "These reports are not shown to any other agent before the run ends.";
    const rewarded = epistemicBeliefInstructionForK(2);
    const unrewarded = disassemblyUnrewardedBeliefInstruction();
    assert.equal(rewarded.slice(0, rewarded.indexOf(marker)), unrewarded.slice(0, unrewarded.indexOf(marker)));
    assert.equal(rewarded.includes("pAccept"), true);
    assert.equal(unrewarded.includes("pAccept"), true);
    assert.equal(rewarded.includes("pSecond"), true);
    assert.equal(unrewarded.includes("pSecond"), true);
    assert.equal(rewarded.includes("quadratic accuracy score"), true);
    assert.equal(unrewarded.includes("receive no accuracy payment"), true);
  });
});
