/**
 * Exhaustive local validation of the frozen engine (env.ts) and the W-RG
 * execution filters, as requested in the second review round. Every role
 * pair, inventory combination, and proposal combination is enumerated; the
 * engine is never modified.
 */
import assert from "node:assert/strict";
import { it } from "node:test";
import { applyMeetings, resolveMeeting } from "./env.ts";
import { DEFAULT_PARAMS } from "./params.ts";
import type { AgentState, AgentType, Proposal } from "./types.ts";
import { executeRoleChannel } from "./welfare-role-channel.ts";
import { realizedAgentDelta } from "./welfare-review-x1.ts";

const P = DEFAULT_PARAMS;
const TYPES: AgentType[] = ["H", "E"];
const PROPOSALS: Proposal[] = [];
for (const giveCheck of [false, true]) for (const giveChits of [0, 1]) for (const requireChit of [false, true]) {
  PROPOSALS.push({ giveCheck, giveChits, requireChit });
}

function agent(id: number, type: AgentType, checks: number, chits: number): AgentState {
  return { id, type, checks, chits, score: type === "E" ? P.R : 0, solved: type === "E", receivedFrom: null, memory: [] };
}

type Case = { iType: AgentType; jType: AgentType; iChecks: number; jChecks: number; iChits: number; jChits: number; pi: Proposal; pj: Proposal };

function* cases(): Generator<Case> {
  for (const iType of TYPES) for (const jType of TYPES)
    for (const iChecks of [0, 1]) for (const jChecks of [0, 1])
      for (const iChits of [0, 1]) for (const jChits of [0, 1])
        for (const pi of PROPOSALS) for (const pj of PROPOSALS)
          yield { iType, jType, iChecks, jChecks, iChits, jChits, pi, pj };
}

it("enumerates 4,096 local meeting cases", () => {
  assert.equal([...cases()].length, 4 * 4 * 4 * 64);
});

it("conserves checks and marks, keeps inventories non-negative, and matches each resolution kind", () => {
  for (const c of cases()) {
    const i = agent(0, c.iType, c.iChecks, c.iChits), j = agent(1, c.jType, c.jChecks, c.jChits);
    const res = resolveMeeting(i, j, c.pi, c.pj);
    const iGave = c.iChecks - i.checks, jGave = c.jChecks - j.checks;
    const iGot = i.receivedFrom !== null, jGot = j.receivedFrom !== null;
    const label = JSON.stringify(c);
    assert.ok(i.checks >= 0 && j.checks >= 0 && i.chits >= 0 && j.chits >= 0, `negative inventory ${label}`);
    assert.ok(iGave === 0 || iGave === 1, label); assert.ok(jGave === 0 || jGave === 1, label);
    // A check leaves a giver only if that giver held one and proposed to give it.
    if (iGave) assert.ok(c.iChecks === 1 && c.pi.giveCheck, `i gave without holding/proposing ${label}`);
    if (jGave) assert.ok(c.jChecks === 1 && c.pj.giveCheck, `j gave without holding/proposing ${label}`);
    // Every check that leaves one agent is received by the other.
    assert.equal(iGave, Number(jGot), `check not received by j ${label}`);
    assert.equal(jGave, Number(iGot), `check not received by i ${label}`);
    // Marks are conserved and only move between the two parties.
    assert.equal(i.chits + j.chits, c.iChits + c.jChits, `marks not conserved ${label}`);
    switch (res.kind) {
      case "swap":
        assert.ok(iGave && jGave && !c.pi.requireChit && !c.pj.requireChit, label);
        assert.equal(i.chits, c.iChits, label); assert.equal(j.chits, c.jChits, label);
        break;
      case "chit-for-check": {
        const seller = res.seller === 0 ? { gave: iGave, before: c.iChits, after: i.chits, p: c.pi } : { gave: jGave, before: c.jChits, after: j.chits, p: c.pj };
        const buyer = res.buyer === 0 ? { got: iGot, before: c.iChits, after: i.chits } : { got: jGot, before: c.jChits, after: j.chits };
        assert.ok(seller.gave && seller.p.requireChit && buyer.got, label);
        assert.equal(seller.after - seller.before, 1, label);
        assert.equal(buyer.before - buyer.after, 1, label);
        break;
      }
      case "gift": {
        const giverIsI = res.seller === 0;
        assert.ok(giverIsI ? iGave && jGot && !jGave : jGave && iGot && !iGave, label);
        break;
      }
      case "none":
        assert.ok(!iGave && !jGave && !iGot && !jGot, label);
        assert.equal(i.chits, c.iChits, label); assert.equal(j.chits, c.jChits, label);
        break;
    }
  }
});

it("never lets an agent that does not give a check lose a mark without receiving a check", () => {
  // This is the review's filter concern: after a W-RG filter sets giveCheck=false
  // and leaves giveChits/requireChit intact, can marks still be spent for nothing?
  for (const c of cases()) {
    const i = agent(0, c.iType, c.iChecks, c.iChits), j = agent(1, c.jType, c.jChecks, c.jChits);
    resolveMeeting(i, j, c.pi, c.pj);
    if (!c.pi.giveCheck && i.chits < c.iChits) assert.ok(i.receivedFrom !== null, JSON.stringify(c));
    if (!c.pj.giveCheck && j.chits < c.jChits) assert.ok(j.receivedFrom !== null, JSON.stringify(c));
  }
});

it("documents the one mark-for-nothing path: an unconditional giver may attach its own marks", () => {
  // giveCheck + giveChits without requireChit is a gift of both the check and the marks.
  const i = agent(0, "E", 1, 1), j = agent(1, "H", 1, 0);
  const res = resolveMeeting(i, j, { giveCheck: true, giveChits: 1, requireChit: false }, { giveCheck: false, giveChits: 0, requireChit: false });
  assert.equal(res.kind, "gift");
  assert.equal(i.chits, 0); assert.equal(j.chits, 1);
});

it("applies the W-RG filters only to eligible proposals and only to giveCheck", () => {
  for (const arm of ["gift-hh-blocked", "gift-eh-gift-blocked"] as const)
    for (const meType of TYPES) for (const partnerType of TYPES) for (const meChecks of [0, 1]) for (const original of PROPOSALS) {
      const out = executeRoleChannel(arm, meType, partnerType, meChecks, original);
      assert.equal(out.proposal.giveChits, original.giveChits);
      assert.equal(out.proposal.requireChit, original.requireChit);
      const shouldBlock = arm === "gift-hh-blocked"
        ? meType === "H" && partnerType === "H" && meChecks >= 1 && original.giveCheck
        : meType === "E" && partnerType === "H" && meChecks >= 1 && original.giveCheck && !original.requireChit;
      assert.equal(out.blocked, shouldBlock, `${arm} ${meType}>${partnerType} ${JSON.stringify(original)}`);
      assert.equal(out.proposal.giveCheck, shouldBlock ? false : original.giveCheck);
    }
});

it("leaves no executable H-H check transfer under the H-H filter and no unconditional E->H give under the E->H filter", () => {
  for (const c of cases()) {
    if (c.iChecks !== 1 || c.jChecks !== 1) continue;
    if (c.iType === "H" && c.jType === "H") {
      const pi = executeRoleChannel("gift-hh-blocked", "H", "H", 1, c.pi).proposal;
      const pj = executeRoleChannel("gift-hh-blocked", "H", "H", 1, c.pj).proposal;
      const i = agent(0, "H", 1, c.iChits), j = agent(1, "H", 1, c.jChits);
      const res = resolveMeeting(i, j, pi, pj);
      assert.equal(i.checks + j.checks, 2, `H-H transfer survived the filter ${JSON.stringify(c)}`);
      assert.equal(res.kind, "none");
    }
    if (c.iType === "E" && c.jType === "H") {
      const pi = executeRoleChannel("gift-eh-gift-blocked", "E", "H", 1, c.pi).proposal;
      const i = agent(0, "E", 1, c.iChits), j = agent(1, "H", 1, c.jChits);
      const res = resolveMeeting(i, j, pi, c.pj);
      if (i.checks === 0) assert.equal(res.kind, "chit-for-check", `unconditional E->H transfer survived ${JSON.stringify(c)}`);
    }
  }
});

it("settles every local case to the analytic realized-payoff identity used by the X1 accounting", () => {
  const cuts = [0, P.pHard, P.pPartner, 1];
  const mids = [1, 2, 3].map(k => (cuts[k - 1]! + cuts[k]!) / 2);
  for (const c of cases()) {
    if (c.iChecks !== 1 || c.jChecks !== 1) continue; // every account holds exactly one check at its meeting
    for (const di of mids) for (const dj of mids) {
      const i = agent(0, c.iType, 1, c.iChits), j = agent(1, c.jType, 1, c.jChits);
      const snap = applyMeetings([i, j], 1, { ...P, n: 2 }, () => { throw new Error("unexpected draw"); }, [{ i, j, pi: c.pi, pj: c.pj }], [di, dj]);
      const m = snap.meetings[0]!;
      const gave = (id: number) => m.kind === "swap" || (m.kind !== "none" && m.seller === id);
      const got = (id: number) => m.kind === "swap" || (m.kind !== "none" && m.buyer === id);
      const base = (t: AgentType, d: number) => (t === "E" ? P.R + P.v : d < P.pHard ? P.R : 0);
      assert.equal(snap.scores[0], base(c.iType, di) + realizedAgentDelta(c.iType, gave(0), got(0), di), JSON.stringify(c));
      assert.equal(snap.scores[1], base(c.jType, dj) + realizedAgentDelta(c.jType, gave(1), got(1), dj), JSON.stringify(c));
    }
  }
});
