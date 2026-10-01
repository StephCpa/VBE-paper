# VBE Study W-MER: Incomplete Engaged-Money Repair Report

**Study ID:** `VBE-W-MER-ENGAGED-MONEY-REPAIR`  
**Frozen protocol:** v1.0, manifest SHA-256 `2baaa3c2f011a6a54a15563f482630f97c12c534590c893455e65e592998f62b`  
**Execution date:** 2026-09-14  
**Formal verdict:** `INCOMPLETE`  
**Evidential consequence:** no priced-semantic conclusion and no Paper 1 result upgrade.

## 1. What completed

The 14-call pre-flight bracket was healthy and matched the established V4.1 Flash era baseline on catalog, requested and returned model, fingerprint, and all provider-health prompt hashes. External controls were 4/4 exact; dominant-positive controls bought 4/4; dominant-negative controls bought 0/4; raw-response entropy was 2.325 bits.

The resumable target runner atomically retained 26 of 50 planned cells, containing 2,100 complete-cell logical model calls. Five seeds completed all five arms. The sixth seed completed only its first prespecified arm, `money-bilateral`. All retained runs pass schema, notice, call-count, recomputed schedule-hash, recomputed mean-score, and mechanism checks.

## 2. Transport interruption and accounting

The next cell, `13577|gift-bilateral`, stopped returning progress. The frozen HTTP adapter has no request-level timeout. After more than three minutes, the process was interrupted with no partial cell written. A restart at the same frozen cell stalled again and was stopped under [Transport Amendment 1](VBE-welfare-money-engagement-repair-amendment-1.md).

The incomplete attempts may contain unretained successful responses whose exact count is unrecoverable. They are excluded permanently. Consequently, `3,930` remains the planned and complete-study retained target count, not the actual number attempted in this incomplete workflow.

A post-flight attempt then failed at the model-catalog request with `ConnectionRefused`, before a complete post bracket could be written. The provider-health artifact therefore contains a healthy pre bracket only. The target window is not identity-closed.

## 3. Partial diagnostics, not results

The following values are reported solely to make the stopped run auditable. Inferential gates require all ten paired seeds and are false by construction.

Across the five complete blocks:

| Arm | Mean score | H–H swaps | Named engagement |
|---|---:|---:|---:|
| neutral | 53.5125 | 8/51 | 0 sales; 0 gift intentions |
| gift-exact | 55.8875 | 42/51 | 8/97 Easy gift intentions |
| money-exact | 53.2750 | 6/51 | 0/49 mark sales |
| gift-bilateral | 53.1000 | 10/51 | 1/97 Easy gift intentions |
| money-bilateral | 53.5875 | 5/51 | 2/42 mark sales |

The complete-block money-sale effect is only `+0.0364` in seed-level sale rate, far below the frozen `+0.25` engagement MRES. The matched gift package also shows only `+0.0111` gift-intention rate over neutral. Exact gift remains descriptively active, but five pairs cannot pass the frozen Holm family and the missing post bracket independently prevents interpretation.

These partial patterns suggest that making both roles explicit did not solve the manipulation and may have changed the successful gift package adversely. That observation is hypothesis-generating only. It does not establish either a priced-semantic boundary or the absence of one.

## 4. Decision

W-MER will not be resumed under protocol v1.0. The second identical-cell stall satisfies the amendment's stop condition, and a later post-flight would not restore the interrupted target window. No wording, timeout behavior, seed, threshold, or verdict is modified after outcome observation.

Paper 1 proceeds on W-RG and W-SGB. Its existing statement remains the correct one: the current exact-money control is unengaged and sets no priced-semantic boundary. Any future money study must be a new protocol in a newly bracketed era, with transport timeouts frozen before calls and with the current explicit-bilateral packages treated as observed failed manipulations rather than reusable pilots.

## 5. Immutable artifacts

- Retained result: `vbe-engine/src/data/welfare-money-engagement-repair.json`, SHA-256 `54a704627347b631592ea34e624604f8ffc6dbb4b44da896d8ae5010a052bb13`.
- Healthy pre-flight only: `vbe-engine/src/data/provider-health-welfare-money-engagement-repair.json`, SHA-256 `9ac102ed0bdfc0980b767711fa388054f1ce7986e8e47e7584e7a8b9bbca2aae`.
- Transport amendment: `VBE-welfare-money-engagement-repair-amendment-1.md`, SHA-256 `9a0c80d017d77da0726dcfe7598f90c232904f4cf41167051c2a3f93d155e94a`.

