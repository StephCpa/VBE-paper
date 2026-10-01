# VBE Study W-CO: Cross-Era Welfare Crowding-Out Replication Report

**Version:** 1.0 · 2026-09-14  
**Status:** complete; project-internal prospective replication, not externally registered  
**Formal verdict:** `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`  
**Model:** provider-labeled V4.1 Flash; canonical API name `deepseek-flash`

## 1. Conclusion

Gift talk produced a large and stable welfare gain relative to money talk, but did not replicate the historically suggested mechanism in which unconditional gifts replace mark sales. Seventeen of 18 paired seeds had a positive welfare difference. The mean gain was `+2.3333` points per account (bootstrap 95% `[+1.7292,+2.9306]`; zero-centered one-sided exact sign-flip `p=0.00001526`), clearing the frozen `+0.5` MRES.

The joint behavior gate failed. The interior Easy-to-Hard gift-rate increase was only `+0.03158`; although directionally nonzero (`p=0.001953`), it was far below the frozen `+0.25` MRES. Money talk and gift talk both produced `0/198` interior mark sales, so the sale-rate contrast was zero (`p=1`). The study therefore supports a welfare total effect of the two public speech packages, not the prespecified crowding-out substitution mechanism.

## 2. Execution and integrity

- Freeze-manifest SHA-256: `af55753acd49f570555c945ff515ed668e00216d5857e32b79ee0b6b82578f2d`; target, bridge, and bracket calls were all zero at freeze.
- Eighteen fresh seeds had zero overlap with 838 historical used seeds; arm order was balanced 9/9.
- All 36 target cells completed: 2,728/2,728 target calls, 12/12 shared-item bridge calls, and 14-call pre- and post-flight brackets.
- All 18 blocks matched structural-schedule hashes and within-seed call counts; there were zero API, schema, or parse failures, and every controller was an LLM.
- Private/public result mirrors are byte-identical, both with SHA-256 `f6438915387c05fc1eb1b4a94c9b70ba7ae4a77b0addd0e6bf1ed86d66779c96`.

The provider bracket was `BRACKET HEALTHY`. Both pre and post had 4/4 external controls, 4/4 dominant positives, 0/4 dominant negatives, six unique raw responses, and 2.3249 bits of entropy. The catalog, all 14 prompt hashes, returned model `deepseek-flash`, and fingerprint `aeb56401ca74e127821c4f9126dcb669` matched across brackets. This run therefore established the `deepseek-v4.1-flash-post-2026-09-14T04:00Z` serving-era baseline.

## 3. Frozen results

| Metric | Money talk | Gift talk | Paired contrast (prespecified direction) | Frozen judgment |
|---|---:|---:|---:|---|
| Mean score | 54.5417 | 56.8750 | gift−money `+2.3333` | passes MRES and exact gate |
| Interior Easy→Hard gifts | 0/364 | 11/364 | rate `+0.03158` | directionally nonzero, below +0.25 MRES |
| Interior mark sales | 0/198 | 0/198 | money−gift `0` | fails |

The primary welfare difference had median `+2.5313`, range `[−0.6875,+4.6875]`, and a positive seed share of `17/18`. Complete, integrity, provider-bracket, welfare-magnitude, and welfare-exact gates all passed. Gift substitution and sale substitution both failed.

## 4. Shared-item bridge

All 12 prompt byte strings matched their historical sources and instrumentation was complete. All eight historically positive items changed from buy to no-buy in the new era; the four historical negative exact-public-hard items remained no-buy. The transition matrix was:

- prior buy → current buy: 0;
- prior buy → current no-buy: 8;
- prior no-buy → current buy: 0;
- prior no-buy → current no-buy: 4.

Independent provider-health dominant-positive controls nevertheless bought 4/4. The bridge therefore indicates cross-era drift in the historical buyer interface, not global inaction or endpoint-health failure. By protocol it is descriptive only, does not enter the W-CO verdict, and cannot establish equivalence between model eras.

## 5. Post-hoc mechanism audit: welfare came from H–H check swaps

The frozen mechanism gate covered only prespecified Easy-to-Hard gifts and mark sales. A descriptive audit of the complete meeting traces found a different dominant path:

| Post-hoc metric (24 rounds) | Money talk | Gift talk | Gift−money |
|---|---:|---:|---:|
| H–H mutual check swaps | 27/154 (0.1753) | 138/154 (0.8961) | seed-rate `+0.7098` |
| Hard solved assignments | 600/1,728 (0.3472) | 723/1,728 (0.4184) | `+0.07118` |
| All non-none transfers | 41 | 378 | +337 |
| Easy→Hard gifts, including final round | 0 | 12 | +12 |
| Hard→Easy gifts | 0 | 146 | +146 |
| Easy→Easy gifts | 1 | 28 | +27 |

The H–H swap rate rose in all 18 seeds, with a descriptive mean difference of `+0.7098`. The Hard solve rate rose in 17/18, by a mean `+0.07118`. These are post-hoc metrics; their exact p-values are not confirmatory claims.

The welfare accounting closes mechanically. Gift talk produced 123 additional Hard solved assignments, worth `+369` total points at `R=3`. The observed total welfare gain across 18×8 accounts was `+336`; the remaining `−33` is the net loss in check salvage. The welfare effect was therefore driven almost entirely by additional Hard solutions, not by mark exchange.

The narrowest plausible interpretation is that the model generalized the public instruction to give checks beyond its stated role and pairing. In particular, two Hard agents submitted checks to one another, replacing low own-check success with high partner-check success. This is **instruction-induced cooperative check circulation / role generalization**, not identified monetary crowding out.

## 6. Claims supported and not supported

Supported wording:

> In a healthy and identity-stable V4.1 Flash serving bracket, the gift-talk package substantially increased welfare relative to the money-talk package, while the prespecified gift-for-money substitution failed to replicate. A post-hoc trace audit localized the welfare gain to cross-role generalization, H–H mutual check swaps, and a higher Hard solve rate.

The study does not show that money lowers welfare relative to a neutral/no-policy baseline, that gifts are an identified mediator, that an unconditional-giving institution formed, that the effect is model-equivalent to the historical result, or that public talk generally improves welfare.

## 7. Next step

The most informative follow-up is not another W-CO replication but a separately frozen role-generalization disassembly with neutral, original gift-talk, strict Easy-only gift (explicitly forbidding Hard check-giving), and H–H mutual-verification arms. This can separate the intended Easy-to-Hard path, the unexpected H–H swap path, and generic public-cooperation framing. It must use new seeds and treat the current H–H result as hypothesis-generating until prospectively confirmed.

Data and reproducible analysis: `vbe-engine/src/data/welfare-crowding-out.json`, `provider-health-welfare-crowding-out.json`, `provider-era-baseline-deepseek-v4.1-flash-post-20260914.json`, `src/lib/vbe/analyze-welfare-crowding-out.ts`, and `analyze-welfare-crowding-out-mechanism.ts`.
