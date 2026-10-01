# VBE W-MER Transport Amendment 1

**Recorded:** 2026-09-14T17:23:01Z  
**Applies to:** frozen W-MER protocol v1.0 and manifest SHA-256 `2baaa3c2f011a6a54a15563f482630f97c12c534590c893455e65e592998f62b`  
**Status at amendment:** pre-flight complete and healthy; 26/50 target cells atomically retained.

## Event

The runner stopped producing output while executing the next prespecified cell, `13577|gift-bilateral`. The HTTP adapter has no request-level timeout. After more than three minutes without a completed cell or an error response, the process was interrupted manually.

The stored result ends at `13577|money-bilateral` and contains 26 complete cells. No partial `13577|gift-bilateral` result was written. Because cell-local call progress is not checkpointed, the number of logical calls initiated inside the discarded attempt is not recoverable. It lies between 1 and 90; between 0 and 89 responses may have returned before the final hanging request. They are permanently excluded from every result, statistic, gate, and call count.

## Prospective handling before restart

1. Resume with the unchanged frozen runner.
2. Restart the same prespecified `13577|gift-bilateral` cell from its initial state and seed.
3. Do not modify its arm position, prompt, environment, threshold, analysis, or verdict tree.
4. Retain only a complete atomically written cell. If the same failure recurs, stop and report the study incomplete rather than alter frozen code during target execution.
5. Interpret `3,930 target calls` as retained complete-cell logical calls. The total number of provider requests attempted in the workflow is no longer exactly identifiable and must not be reported as `3,958`.
6. The post-flight bracket still encloses all retained and discarded target-period calls and remains mandatory.

This amendment handles transport and accounting only. It does not change the estimand or authorize outcome-contingent repair.

