# VBE Central Null-Result Serving Contamination Audit

**Date:** 2026-09-13  
**Method:** read-only over existing artifacts, zero model calls  
**Verdict:** E-BIS and E-CI were not produced under the Flash single-constant collapse observed on September 13; C-M is a pure robot causal intervention, unrelated to hosted-model serving.

## 1. Time Boundaries

| Artifact | `generatedAt` (UTC) | Observation |
|---|---|---|
| C-M | 2026-09-05 00:47:18 | 512 seeds, zero API |
| E-BIS | 2026-09-05 01:06:50 | 299 LLM calls |
| E-CI | 2026-09-05 02:01:17 | 2,091 LLM calls |
| E-BUY-WRAP-D | 2026-09-08 06:04:40 | Later healthy anchor: exact narrow 12/12, exact public-hard 0/12 |
| E-BUY-EV-L | 2026-09-13 15:26:28 | 72/72 identical parsed proposal |

E-BIS/E-CI not only predate the known collapse window but also the September 8 serving anchor that clearly distinguishes interface from action. Therefore, if the Flash serving identity later switched, the supportable time interval is "after the September 8 healthy anchor, before EV-L completed on September 13." Since the older studies have no per-call timestamps, returned models, or fingerprints, this is not weight-identity proof.

## 2. E-BIS

The 299 LLM proposals have 4 action patterns, with empirical entropy 1.478 bits; merging actions with the available belief fields, the 299 parsed outputs have 11 patterns, entropy 2.491 bits. This is therefore not a global single-constant output.

The belief results themselves remain concentrated: of 216 reports, 204 are `(0.5,0.5)`, with 8 `(0.9,0.9)`, 3 `(0.93,0.93)`, and 1 `(1,1)`; 216/216 make `pAccept=pSecond`. This preserves the original narrow conclusion: the repaired explicit-belief channel remains insensitive across different targets, without proving the absence of latent belief.

**Audit verdict:** `NOT CONTAMINATED BY THE OBSERVED FLASH CONSTANT COLLAPSE — ORIGINAL NARROW INTERPRETATION STANDS`.

## 3. E-CI

The 2,091 LLM proposals have 4 action patterns, total entropy 1.490 bits. More importantly, the 0/2/4 credential-dose arms each have 697 calls, and within each arm all 4 proposal patterns appear, with entropies 1.455, 1.415, and 1.581 bits respectively. Per-arm seller-intent counts span 1–6, buyer-intent spans 0–3, and trade spans 0–3.

Thus E-CI's `NO MATERIAL ACTION ITT` is not an instrument spurious-null of the "the model outputs the same value for everything" kind. The model produces clear action variation within every treatment arm, while the frozen 4−0 ITT still fails the magnitude and randomization-inference gates.

**Audit verdict:** `DISCRIMINATING ACTION OUTPUT CONFIRMED — ITT NULL REMAINS INTERPRETABLE`.

## 4. C-M

C-M's runner only calls `runMarkConcentrationArm`, and execution uses `runPopulationAsyncPaired` with the frozen `kw` robot policy; the path has no `grokChat`, `observedChat`, `fetch`, API key, or LLM config. Data are 512 seed blocks and 6,656 robot population-runs, with 0 model calls.

**Audit verdict:** `IMMUNE TO HOSTED-MODEL SERVING COLLAPSE`.

## 5. Boundaries

- E-BIS/E-CI did not save raw response strings, so this is parsed-output entropy, not raw-token entropy.
- They have no per-call timestamps, returned models, or fingerprints, so historical backend weight identity cannot be reconstructed.
- `generatedAt` is the study-completion boundary, not a per-call timestamp.

Structured audit at `vbe-engine/src/data/central-null-contamination-audit.json`.