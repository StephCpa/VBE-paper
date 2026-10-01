import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  persistenceNotice,
  replacementOrder,
} from "./persistence.ts";

describe("institution persistence", () => {
  it("replaces every controller exactly once", () => {
    const order = replacementOrder(17);
    assert.equal(order.length, 8);
    assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(replacementOrder(17), order);
  });

  it("private memory disappears only for replaced controllers", () => {
    const replaced = new Set([2]);
    assert.match(persistenceNotice("private-memory", 10, 1, replaced), /PRIVATE RETAINED/);
    assert.match(persistenceNotice("private-memory", 10, 2, replaced), /replacement controller/);
    assert.doesNotMatch(persistenceNotice("private-memory", 10, 2, replaced), /PUBLIC INSTITUTION PROPOSAL/);
  });

  it("public ledger and contract survive replacement", () => {
    const replaced = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
    assert.match(persistenceNotice("public-ledger", 20, 3, replaced), /PERSISTENT VERIFIED PUBLIC LEDGER/);
    assert.match(persistenceNotice("contract", 20, 3, replaced), /EXECUTABLE CONTRACT/);
  });
});

