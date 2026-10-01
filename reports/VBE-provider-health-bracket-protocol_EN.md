# VBE Provider-Health Bracket Protocol

**Version:** 1.1  
**Date:** 2026-09-13  
**Nature:** generic service-health gate; not an experimental treatment and does not enter target estimands  
**Frozen dry-run SHA-256:** `1b96cff9ea31349a9b51c3c3b7ee3e5476e0a0c9ca692ffe1bbddb9569b9219d`
**Revision:** Baseline-only revision before the first bracket call; anchors, numeric gates, and dry run are unchanged.

## 1. Objective

Before the first target call and after the last target call of every provider-facing study, validate with the same set of frozen anchors: the account model catalog and identity mapping are stable; externally decidable JSON tasks behave normally; clearly positive and negative payoffs produce separated actions; raw responses are not in constant collapse. This gate distinguishes "service is healthy but historical VBE behavior changed" from "service/interface degradation."

## 2. Run-Level Frozen Plan

Every target study must freeze a `ProviderHealthPlan` in its own manifest, containing `studyId`, `servingEraId`, `eraBaselineMode`, `eraBaselinePath`, `requestedModel`, `allowedReturnedModels`, the complete `expectedCatalogModels`, whether a fingerprint is required, the historical-sentinel interpretation, and a unique output path. Pre-flight may run only after the plan is frozen; CLI ad-hoc parameters cannot substitute for this plan.

The first study in a new serving era uses `eraBaselineMode=establish`. Absence of a prior baseline is normal and is not compared with a historical model fingerprint. The runner creates the era baseline only after that study has healthy, identity-consistent pre and post brackets. Every later study uses `eraBaselineMode=compare`; its pre-flight catalog, requested name, returned-model set, fingerprint set, and prompt hashes must match the baseline before target calls are authorized. The baseline fixes observable serving identity, not immutable weights.

## 3. The 14 Anchors per Bracket

| Group | N | Purpose | Depends on historical VBE results |
|---|---:|---|---|
| External controls | 4 | Arithmetic, size comparison, character count, parity, mapped to four exact JSONs | No |
| Dominant positive | 4 | End immediately, buying scores for sure and the alternative scores 0 | No |
| Dominant negative | 4 | End immediately, buying scores 0 and holding scores for sure | No |
| Historical sentinels | 2 | Verbatim prompts of E-BUY-WRAP-D exact narrow and E-BUY high-guaranteed | Yes, but not into the health gate |

External controls use the same `RULES` system prefix and three-field schema, but the correct answers are externally decided by basic arithmetic/logic. Historical sentinels only record behavioral drift; their change alone cannot fail the health gate. Across models or provider-labeled eras, divergence from the old Flash results is expected and describes migration differences only; it is neither service-degradation evidence nor evidence of model equivalence.

## 4. Ex-Ante Numeric Gate

Each pre/post bracket must simultaneously satisfy:

- 14/14 calls succeed, with 14 unique anchor IDs;
- the account catalog exactly equals `expectedCatalogModels`;
- 14/14 prompt hashes equal the frozen builders; raw hashes are recomputable; response ID and returned model are nonempty;
- every returned model is in `allowedReturnedModels`;
- if the plan requires a fingerprint, 14/14 nonempty, and only one fingerprint within the bracket;
- external-control exact rate = 4/4;
- dominant-positive buy rate ≥ 0.75 (at least 3/4);
- dominant-negative buy rate ≤ 0.25 (at most 1/4);
- unique raw responses ≥ 4; raw-response entropy ≥ 1.25 bits.

If any item fails, the bracket is unhealthy, and no post-hoc manual override is allowed.

## 5. Decision Tree

1. **Pre-flight unhealthy:** target calls not allowed; retain the failure record.
2. **Pre healthy, post unhealthy:** retain the target calls but mark `POST-FLIGHT FAILED — NOT SUBSTANTIVELY INTERPRETABLE`; no re-runs.
3. **Both healthy, but prompt hashes, returned-model set, or fingerprint set changed:** mark `BRACKET IDENTITY CHANGED`; do not pool into the same stable window. The implementation explicitly compares pre and post fingerprint sets; this is the mid-study rollout guard.
4. **Both healthy and identity identical:** only `BRACKET HEALTHY` permits interpretation of the target contrasts.

Pre-flight must be immediately adjacent to the first target call, and post-flight immediately adjacent to the last target call; no other provider-facing study calls may be inserted between them.

## 6. Artifacts and Boundaries

Each run saves the catalog, raw response, prompt/request/raw hashes, response ID, returned model, fingerprint, usage, and allowlisted headers, without saving keys. A separate serving-era baseline is written only after the first healthy study and is machine-compared at later pre-flights. This gate does not prove weights unchanged, does not rule out hidden rollouts under the same fingerprint, and does not automatically treat historical behavior change as a service fault.

## 7. Operational Convention

The command is `run-provider-health.ts --plan <frozen-plan.json> --phase pre|post`. The example plan is only a schema template, not an authorized run plan: `vbe-engine/src/data/provider-health-plan.example.json`.
